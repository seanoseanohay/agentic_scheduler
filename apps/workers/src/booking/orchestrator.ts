/**
 * Booking Orchestrator.
 *
 * Executes the approve → validate → FSP book → notify → audit pipeline.
 *
 * This is called after an operator approves a suggestion. The orchestrator:
 *  1. Re-validates the suggestion is still pending (staleness check)
 *  2. Calls FSP reservation validation (constraints.md invariant #19)
 *  3. Creates the FSP reservation with an idempotency key
 *  4. Updates the suggestion to 'booked'
 *  5. Sends a booking confirmation notification
 *  6. Writes immutable audit events at each step
 *
 * Invariant: no reservation is created without explicit operator approval
 * (constraints.md #16) — callers must ensure approvedBy is a real operator user.
 */

import { createFspClient } from '@oneshot/fsp-adapter'
import {
  getSuggestionById,
  updateSuggestionStatus,
  writeAuditEvent,
  prisma,
} from '@oneshot/persistence'
import type { Suggestion, TenantContext } from '@oneshot/shared-types'
import { tenantLogger } from '@oneshot/observability'
import { dispatchNotification } from '../notifications/dispatcher.js'

export interface BookingResult {
  success: boolean
  fspReservationId?: string
  validationErrors?: string[]
  error?: string
}

export async function orchestrateBooking(
  ctx: TenantContext,
  suggestionId: string,
  approvedBy: string,
): Promise<BookingResult> {
  const log = tenantLogger(ctx.operatorId, 'booking_orchestrator')
  log.info({ suggestionId, approvedBy }, 'Starting booking orchestration')

  // ── 1. Staleness check ─────────────────────────────────────────────────
  const suggestion = await getSuggestionById(ctx, suggestionId)
  if (!suggestion) {
    return { success: false, error: 'Suggestion not found' }
  }
  if (suggestion.status !== 'approved') {
    return { success: false, error: `Suggestion is not in approved state: ${suggestion.status}` }
  }
  if (suggestion.expiresAt < new Date()) {
    await updateSuggestionStatus(ctx, suggestionId, 'expired', approvedBy)
    await writeAuditEvent(ctx, {
      eventType: 'suggestion.expired',
      actorId: approvedBy,
      actorType: 'system',
      entityType: 'suggestion',
      entityId: suggestionId,
      payload: { reason: 'expired_before_booking' },
    })
    return { success: false, error: 'Suggestion has expired' }
  }

  // ── 2. FSP reservation validation ─────────────────────────────────────
  const tenant = await prisma.tenant.findUnique({ where: { id: ctx.tenantId } })
  if (!tenant) return { success: false, error: 'Tenant not found' }

  const fsp = await createFspClient({
    baseUrl: process.env['FSP_BASE_URL'] ?? '',
    apiKey: process.env['FSP_API_KEY'] ?? '',
    operatorId: ctx.operatorId,
  })

  const createParams = {
    operatorId: ctx.operatorId,
    studentId: suggestion.candidate.studentId,
    instructorId: suggestion.candidate.instructorId,
    aircraftId: suggestion.candidate.aircraftId,
    locationId: suggestion.candidate.locationId,
    startTime: suggestion.candidate.startTime,
    endTime: suggestion.candidate.endTime,
    lessonType: suggestion.candidate.lessonType,
  }

  await writeAuditEvent(ctx, {
    eventType: 'booking.attempted',
    actorId: approvedBy,
    actorType: 'operator',
    entityType: 'suggestion',
    entityId: suggestionId,
    payload: { createParams },
  })

  const validation = await fsp.validateReservation(createParams)
  if (!validation.valid) {
    await updateSuggestionStatus(ctx, suggestionId, 'failed', approvedBy, 'FSP validation failed')
    await writeAuditEvent(ctx, {
      eventType: 'booking.failed',
      actorId: approvedBy,
      actorType: 'operator',
      entityType: 'suggestion',
      entityId: suggestionId,
      payload: { reason: 'fsp_validation_failed', errors: validation.errors },
    })
    log.warn({ suggestionId, errors: validation.errors }, 'FSP validation failed')
    return { success: false, validationErrors: validation.errors }
  }

  // ── 3. Create reservation in FSP ───────────────────────────────────────
  // Idempotency key scoped to suggestion so retries are safe
  const idempotencyKey = `booking:${ctx.operatorId}:${suggestionId}`
  let fspReservation
  try {
    fspReservation = await fsp.createReservation(createParams, idempotencyKey)
  } catch (err) {
    const error = String(err)
    await updateSuggestionStatus(ctx, suggestionId, 'failed', approvedBy, error)
    await writeAuditEvent(ctx, {
      eventType: 'booking.failed',
      actorId: approvedBy,
      actorType: 'operator',
      entityType: 'suggestion',
      entityId: suggestionId,
      payload: { reason: 'fsp_create_error', error },
    })
    log.error({ err, suggestionId }, 'FSP reservation creation failed')
    return { success: false, error }
  }

  // ── 4. Update suggestion to booked ────────────────────────────────────
  await updateSuggestionStatus(ctx, suggestionId, 'booked', approvedBy)

  await writeAuditEvent(ctx, {
    eventType: 'booking.succeeded',
    actorId: approvedBy,
    actorType: 'operator',
    entityType: 'suggestion',
    entityId: suggestionId,
    payload: { fspReservationId: fspReservation.reservationId },
  })

  // ── 5. Send booking confirmation notification ─────────────────────────
  await sendBookingNotification(ctx, suggestion, fspReservation.reservationId, tenant)

  log.info(
    { suggestionId, fspReservationId: fspReservation.reservationId },
    'Booking orchestration complete',
  )
  return { success: true, fspReservationId: fspReservation.reservationId }
}

async function sendBookingNotification(
  ctx: TenantContext,
  suggestion: Suggestion,
  _fspReservationId: string,
  tenant: { notificationPolicy: unknown },
) {
  const policy = tenant.notificationPolicy as {
    emailEnabled: boolean
    brandName: string
  }
  if (!policy.emailEnabled) return

  const fsp = await createFspClient({
    baseUrl: process.env['FSP_BASE_URL'] ?? '',
    apiKey: process.env['FSP_API_KEY'] ?? '',
    operatorId: ctx.operatorId,
  })

  const student = await fsp.getStudent(suggestion.candidate.studentId)
  if (!student) return

  const startDate = new Date(suggestion.candidate.startTime)

  await dispatchNotification(ctx, {
    suggestionId: suggestion.id,
    channel: 'email',
    recipient: student.email,
    templateKey: 'booking.confirmed',
    templateData: {
      firstName: student.firstName,
      date: startDate.toLocaleDateString(),
      time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    brandName: policy.brandName,
  })
}
