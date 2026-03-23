/**
 * Waitlist Fill handler — Phase 3 full implementation.
 *
 * Triggered on every poll cycle. Looks for open slots (no confirmed reservation)
 * within the tenant's search window, ranks eligible students against hard
 * constraints, and emits Suggestions for the operator queue.
 *
 * Idempotency: triggerKey per open slot so the same slot is not re-proposed
 * until the current suggestion expires or is resolved.
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
} from '@oneshot/persistence'
import {
  evaluateCertificationConstraint,
  evaluateAvailabilityConstraint,
  buildConstraintReport,
} from '@oneshot/rules'
import { rankCandidates } from '@oneshot/ranking'
import type { RankingCandidate } from '@oneshot/ranking'
import { tenantLogger } from '@oneshot/observability'
import { addHours } from '../utils/date.js'

const MAX_SUGGESTIONS_PER_SLOT = 3

export async function handleWaitlistFill(
  ctx: TenantContext,
  fsp: IFspClient,
  tenant: Tenant,
): Promise<void> {
  const log = tenantLogger(ctx.operatorId, 'waitlist_fill')

  const searchStart = new Date()
  const searchEnd = addHours(searchStart, tenant.searchWindowDays * 24)

  // Fetch all reference data concurrently
  const [availableSlots, instructors, aircraft, students, reservations] = await Promise.all([
    fsp.getAvailableSlots({ start: searchStart, end: searchEnd }),
    fsp.getInstructors(),
    fsp.getAircraft(),
    fsp.getStudents(),
    fsp.getReservationsByDateRange(searchStart, searchEnd),
  ])

  if (availableSlots.length === 0) return

  // Build set of confirmed booking keys to skip already-booked slots
  const bookedTimes = new Set(
    reservations
      .filter((r) => r.status === 'confirmed')
      .map((r) => `${r.instructorId}:${r.aircraftId}:${r.startTime.toISOString()}`),
  )

  const instructorMap = new Map(instructors.map((i) => [i.instructorId, i]))
  const aircraftMap = new Map(aircraft.map((a) => [a.aircraftId, a]))

  // Deduplicate open slots
  const openSlots = new Map<string, typeof availableSlots[0]>()
  for (const slot of availableSlots) {
    const key = `${slot.instructorId}:${slot.aircraftId}:${slot.startTime.toISOString()}`
    if (!bookedTimes.has(key)) openSlots.set(key, slot)
  }

  let totalCreated = 0

  for (const [slotKey, slot] of openSlots) {
    const slotDate = slot.startTime.toISOString().substring(0, 10)
    const triggerKey = `waitlist_fill:${slot.locationId}:${slotDate}:${slotKey.substring(0, 20)}`

    const { run, isNew } = await createWorkflowRun(ctx, {
      workflowType: 'waitlist_fill',
      triggerKey,
      triggerPayload: { slotKey, startTime: slot.startTime },
    })

    if (!isNew) continue

    try {
      const instructor = instructorMap.get(slot.instructorId)
      const ac = aircraftMap.get(slot.aircraftId)
      if (!instructor || !ac) {
        await skipWorkflowRun(run.id)
        continue
      }

      const candidates: RankingCandidate[] = []

      for (const student of students) {
        const certResult = evaluateCertificationConstraint(instructor, ac, 'dual')
        const availResult = evaluateAvailabilityConstraint(
          { startTime: slot.startTime, endTime: slot.endTime, instructorId: slot.instructorId, aircraftId: slot.aircraftId },
          availableSlots,
        )
        const report = buildConstraintReport([certResult, availResult])
        if (!report.allPassed) continue

        candidates.push({
          studentId: student.studentId,
          instructorId: slot.instructorId,
          aircraftId: slot.aircraftId,
          locationId: slot.locationId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          lessonType: 'dual',
          continuityInstructor: false,
          continuityAircraft: false,
          student,
        })
      }

      const ranked = rankCandidates(candidates, tenant.rankingWeights)
      const top = ranked.slice(0, MAX_SUGGESTIONS_PER_SLOT)
      let created = 0

      for (const c of top) {
        await createSuggestion(ctx, {
          workflowType: 'waitlist_fill',
          status: 'pending',
          candidate: {
            studentId: c.studentId,
            instructorId: c.instructorId,
            aircraftId: c.aircraftId,
            locationId: c.locationId,
            startTime: c.startTime,
            endTime: c.endTime,
            lessonType: c.lessonType,
          },
          explanation: {
            triggerSummary: `Open slot available on ${slotDate}`,
            constraintsSatisfied: ['certification', 'availability'],
            rankingReasons: c.rankingReasons,
            tradeoffs: c.tradeoffs,
          },
          score: c.score,
          expiresAt: addHours(new Date(), tenant.notificationPolicy.offerExpiryHours),
        })
        created++
        totalCreated++
      }

      await completeWorkflowRun(run.id, created)
    } catch (err) {
      await failWorkflowRun(run.id, String(err))
      log.error({ err, triggerKey }, 'Waitlist fill workflow failed for slot')
    }
  }

  if (totalCreated > 0) {
    await writeAuditEvent(ctx, {
      eventType: 'suggestion.created',
      actorType: 'system',
      entityType: 'waitlist_fill_batch',
      entityId: ctx.operatorId,
      payload: { totalCreated },
    })
    log.info({ totalCreated }, 'Waitlist fill complete')
  }
}
