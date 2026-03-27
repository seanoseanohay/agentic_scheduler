/**
 * Cancellation Recovery handler.
 *
 * When FSP reports a cancelled reservation, this handler:
 *  1. Creates a deduplication-protected WorkflowRun
 *  2. Fetches available slots from FSP
 *  3. Runs constraint checks on each candidate
 *  4. Ranks passing candidates
 *  5. Persists Suggestions for the operator queue
 *  6. Emits audit events
 *
 * Invariant: no suggestion is created if it fails any hard constraint.
 */

import type { FspReservation, TenantContext, Tenant } from '@oneshot/shared-types'
import type { IFspClient } from '@oneshot/fsp-adapter'
import { createSuggestion, writeAuditEvent } from '@oneshot/persistence'
import {
  evaluateCertificationConstraint,
  evaluateAvailabilityConstraint,
  buildConstraintReport,
} from '@oneshot/rules'
import { rankCandidates } from '@oneshot/ranking'
import type { RankingCandidate } from '@oneshot/ranking'
import { tenantLogger } from '@oneshot/observability'
import { prisma } from '@oneshot/persistence'
import { addHours } from '../utils/date.js'

export async function handleCancellation(
  ctx: TenantContext,
  cancelled: FspReservation,
  fsp: IFspClient,
  tenant: Tenant,
): Promise<void> {
  const log = tenantLogger(ctx.operatorId, 'cancellation_recovery')
  const triggerKey = `cancellation_recovery:${cancelled.reservationId}`

  // Idempotency guard — skip if already processed
  const existing = await prisma.workflowRun.findUnique({
    where: { tenantId_triggerKey: { tenantId: ctx.tenantId, triggerKey } },
  })
  if (existing) {
    log.info({ triggerKey }, 'Already processed, skipping')
    return
  }

  const run = await prisma.workflowRun.create({
    data: {
      tenantId: ctx.tenantId,
      operatorId: ctx.operatorId,
      workflowType: 'cancellation_recovery',
      status: 'running',
      triggerKey,
      triggerPayload: { reservationId: cancelled.reservationId },
    },
  })

  log.info({ runId: run.id, reservationId: cancelled.reservationId }, 'Processing cancellation')

  try {
    const searchStart = cancelled.startTime
    const searchEnd = addHours(cancelled.startTime, tenant.searchWindowDays * 24)

    const [availableSlots, instructors, aircraft, students] = await Promise.all([
      fsp.getAvailableSlots({ start: searchStart, end: searchEnd }),
      fsp.getInstructors(),
      fsp.getAircraft(),
      fsp.getStudents(),
    ])

    const instructorMap = new Map(instructors.map((i) => [i.instructorId, i]))
    const aircraftMap = new Map(aircraft.map((a) => [a.aircraftId, a]))

    const candidates: RankingCandidate[] = []

    for (const slot of availableSlots) {
      const instructor = instructorMap.get(slot.instructorId)
      const ac = aircraftMap.get(slot.aircraftId)
      if (!instructor || !ac) continue

      const certResult = evaluateCertificationConstraint(instructor, ac, cancelled.lessonType)
      const availResult = evaluateAvailabilityConstraint(
        {
          startTime: slot.startTime,
          endTime: slot.endTime,
          instructorId: slot.instructorId,
          aircraftId: slot.aircraftId,
        },
        availableSlots,
      )
      const report = buildConstraintReport([certResult, availResult])
      if (!report.allPassed) continue

      // Propose each eligible student for this slot
      for (const student of students) {
        candidates.push({
          studentId: student.studentId,
          instructorId: slot.instructorId,
          aircraftId: slot.aircraftId,
          locationId: slot.locationId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          lessonType: cancelled.lessonType,
          continuityInstructor: slot.instructorId === cancelled.instructorId,
          continuityAircraft:
            ac.aircraftType === (aircraftMap.get(cancelled.aircraftId)?.aircraftType ?? ''),
          student,
        })
      }
    }

    const ranked = rankCandidates(candidates, tenant.rankingWeights)
    const top = ranked.slice(0, 5) // surface top 5 options

    let suggestionsCreated = 0
    for (const c of top) {
      await createSuggestion(ctx, {
        workflowType: 'cancellation_recovery',
        status: 'pending',
        triggerReservationId: cancelled.reservationId,
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
          triggerSummary: `Cancellation of reservation ${cancelled.reservationId}`,
          constraintsSatisfied: ['certification', 'availability'],
          rankingReasons: c.rankingReasons,
          tradeoffs: c.tradeoffs,
        },
        score: c.score,
        expiresAt: addHours(new Date(), 24),
      })
      suggestionsCreated++
    }

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: 'completed', suggestionsCreated, completedAt: new Date() },
    })

    await writeAuditEvent(ctx, {
      eventType: 'suggestion.created',
      actorType: 'system',
      entityType: 'workflow_run',
      entityId: run.id,
      payload: { suggestionsCreated, triggerKey },
    })

    log.info({ runId: run.id, suggestionsCreated }, 'Cancellation recovery complete')
  } catch (err) {
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: 'failed', errorMessage: String(err), completedAt: new Date() },
    })
    throw err
  }
}
