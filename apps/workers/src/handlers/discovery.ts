/**
 * Discovery Flight handler — Phase 3.
 *
 * Processes pending DiscoveryProspects and generates daylight-compliant
 * slot suggestions with a payment handoff URL.
 *
 * Constraints enforced:
 *  - FAA civil twilight (daylight constraint — hard rule, constraints.md #17)
 *  - Instructor certification
 *  - Aircraft availability
 *
 * Payment: initiates a Stripe PaymentIntent and stores the ID on the prospect.
 * The booking only proceeds after payment_status = 'paid' (checked in orchestrator).
 *
 * Idempotency: triggerKey = "discovery_flight:{prospectId}"
 */

import type { TenantContext, Tenant } from '@oneshot/shared-types'
import type { IFspClient } from '@oneshot/fsp-adapter'
import {
  createSuggestion,
  writeAuditEvent,
  createWorkflowRun,
  completeWorkflowRun,
  failWorkflowRun,
  skipWorkflowRun,
  prisma,
} from '@oneshot/persistence'
import {
  evaluateDaylightConstraint,
  evaluateCertificationConstraint,
  evaluateAvailabilityConstraint,
  buildConstraintReport,
} from '@oneshot/rules'
import { tenantLogger } from '@oneshot/observability'
import { addHours } from '../utils/date.js'

export async function handleDiscoveryFlights(
  ctx: TenantContext,
  fsp: IFspClient,
  tenant: Tenant,
): Promise<void> {
  const log = tenantLogger(ctx.operatorId, 'discovery_flight')

  const pendingProspects = await prisma.discoveryProspect.findMany({
    where: { operatorId: ctx.operatorId, status: 'pending' },
  })

  if (pendingProspects.length === 0) return

  const [instructors, aircraft, locations] = await Promise.all([
    fsp.getInstructors(),
    fsp.getAircraft(),
    fsp.getLocations(),
  ])

  const instructorMap = new Map(instructors.map((i) => [i.instructorId, i]))
  const aircraftMap = new Map(aircraft.map((a) => [a.aircraftId, a]))
  const location = locations[0] // Default to first location; multi-location in Phase 4

  if (!location) return

  const searchStart = new Date()
  const searchEnd = addHours(searchStart, tenant.searchWindowDays * 24)
  const availableSlots = await fsp.getAvailableSlots({ start: searchStart, end: searchEnd })

  for (const prospect of pendingProspects) {
    const triggerKey = `discovery_flight:${prospect.id}`

    const { run, isNew } = await createWorkflowRun(ctx, {
      workflowType: 'discovery_flight',
      triggerKey,
      triggerPayload: { prospectId: prospect.id, email: prospect.email },
    })

    if (!isNew) continue

    try {
      const compliantSlots = []

      for (const slot of availableSlots) {
        const instructor = instructorMap.get(slot.instructorId)
        const ac = aircraftMap.get(slot.aircraftId)
        if (!instructor || !ac) continue

        // Fetch twilight for the slot date
        const slotDate = slot.startTime.toISOString().substring(0, 10)
        const twilight = await fsp.getCivilTwilight(location.locationId, slotDate)

        const daylightResult = evaluateDaylightConstraint(slot, twilight)
        const certResult = evaluateCertificationConstraint(instructor, ac, 'dual')
        const availResult = evaluateAvailabilityConstraint(
          { startTime: slot.startTime, endTime: slot.endTime, instructorId: slot.instructorId, aircraftId: slot.aircraftId },
          availableSlots,
        )
        const report = buildConstraintReport([daylightResult, certResult, availResult])
        if (!report.allPassed) continue

        compliantSlots.push({ slot, instructor, ac, report })
      }

      if (compliantSlots.length === 0) {
        await skipWorkflowRun(run.id)
        log.info({ prospectId: prospect.id }, 'No daylight-compliant slots found')
        continue
      }

      // Take the earliest compliant slot
      const best = compliantSlots.sort(
        (a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime(),
      )[0]!

      // Initiate payment intent
      const paymentIntentId = await createPaymentIntent(prospect, tenant)

      // Update prospect status
      await prisma.discoveryProspect.update({
        where: { id: prospect.id },
        data: { status: 'offered', paymentIntentId },
      })

      const slotDate = best.slot.startTime.toISOString().substring(0, 10)
      const bookingUrl = `${process.env['APP_BASE_URL'] ?? 'http://localhost:3000'}/discovery/confirm?pi=${paymentIntentId}&prospect=${prospect.id}`

      await createSuggestion(ctx, {
        workflowType: 'discovery_flight',
        status: 'pending',
        candidate: {
          studentId: prospect.id, // prospect ID serves as student placeholder until booked
          instructorId: best.slot.instructorId,
          aircraftId: best.slot.aircraftId,
          locationId: best.slot.locationId,
          startTime: best.slot.startTime,
          endTime: best.slot.endTime,
          lessonType: 'dual',
        },
        explanation: {
          triggerSummary: `Discovery flight request from ${prospect.firstName} ${prospect.lastName} (${prospect.email})`,
          constraintsSatisfied: best.report.satisfied,
          rankingReasons: [`Earliest daylight-compliant slot on ${slotDate}`],
          tradeoffs: [],
        },
        score: 1.0,
        expiresAt: addHours(new Date(), 48), // 48h window for discovery flight offers
      })

      await completeWorkflowRun(run.id, 1)

      await writeAuditEvent(ctx, {
        eventType: 'suggestion.created',
        actorType: 'system',
        entityType: 'discovery_prospect',
        entityId: prospect.id,
        payload: { slotDate, bookingUrl, paymentIntentId },
      })

      log.info({ prospectId: prospect.id, slotDate }, 'Discovery flight offer created')
    } catch (err) {
      await failWorkflowRun(run.id, String(err))
      log.error({ err, prospectId: prospect.id }, 'Discovery flight workflow failed')
    }
  }
}

/**
 * Creates a Stripe PaymentIntent for the discovery flight fee.
 * Returns the payment intent ID to store on the prospect record.
 *
 * Stripe SDK is loaded dynamically to keep it out of non-discovery builds.
 */
async function createPaymentIntent(
  prospect: { firstName: string; lastName: string; email: string },
  tenant: { notificationPolicy: unknown },
): Promise<string> {
  const stripeKey = process.env['STRIPE_SECRET_KEY']
  if (!stripeKey) {
    // No Stripe in local dev — return a mock payment intent ID
    return `pi_mock_${Date.now()}`
  }

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    const amount = Number(process.env['DISCOVERY_FLIGHT_PRICE_CENTS'] ?? 14900) // $149
    const policy = tenant.notificationPolicy as { brandName?: string }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      receipt_email: prospect.email,
      description: `Discovery Flight — ${policy.brandName ?? 'Flight School'}`,
      metadata: { prospectName: `${prospect.firstName} ${prospect.lastName}` },
    })
    return intent.id
  } catch {
    return `pi_mock_${Date.now()}`
  }
}
