/**
 * Next-Lesson Sequencing handler — Phase 3.
 *
 * For each student, reads training progress from FSP and proposes the next
 * required lesson if:
 *  1. The student has completed the current stage's prerequisites
 *  2. The student has no upcoming lesson already scheduled
 *  3. A suitable instructor and aircraft are available in the search window
 *
 * Idempotency: triggerKey = "next_lesson:{studentId}:{nextRequiredLesson}"
 * so we don't re-suggest the same lesson type until it is resolved.
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
import { tenantLogger } from '@oneshot/observability'
import { addHours } from '../utils/date.js'

export async function handleNextLesson(
  ctx: TenantContext,
  fsp: IFspClient,
  tenant: Tenant,
): Promise<void> {
  const log = tenantLogger(ctx.operatorId, 'next_lesson')

  const [students, instructors, aircraft] = await Promise.all([
    fsp.getStudents(),
    fsp.getInstructors(),
    fsp.getAircraft(),
  ])

  const instructorMap = new Map(instructors.map((i) => [i.instructorId, i]))
  const aircraftMap = new Map(aircraft.map((a) => [a.aircraftId, a]))

  const searchStart = new Date()
  const searchEnd = addHours(searchStart, tenant.searchWindowDays * 24)
  const availableSlots = await fsp.getAvailableSlots({ start: searchStart, end: searchEnd })

  let totalCreated = 0

  for (const student of students) {
    const progress = await fsp.getTrainingProgress(student.studentId)
    if (!progress) continue

    // Skip students who already have an upcoming lesson scheduled
    if (student.nextScheduledFlightDate && student.nextScheduledFlightDate > new Date()) continue

    const nextLesson = progress.nextRequiredLesson
    if (!nextLesson) continue

    const triggerKey = `next_lesson:${student.studentId}:${nextLesson}`

    const { run, isNew } = await createWorkflowRun(ctx, {
      workflowType: 'next_lesson',
      triggerKey,
      triggerPayload: { studentId: student.studentId, nextLesson, stage: progress.currentStage },
    })

    if (!isNew) continue

    try {
      // Determine lesson type from the next required lesson name
      const lessonType = deriveLessonType(nextLesson)
      const candidates = []

      for (const slot of availableSlots) {
        const instructor = instructorMap.get(slot.instructorId)
        const ac = aircraftMap.get(slot.aircraftId)
        if (!instructor || !ac) continue

        const certResult = evaluateCertificationConstraint(instructor, ac, lessonType)
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

        candidates.push({
          studentId: student.studentId,
          instructorId: slot.instructorId,
          aircraftId: slot.aircraftId,
          locationId: slot.locationId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          lessonType,
          continuityInstructor: false,
          continuityAircraft: false,
          student,
        })
      }

      if (candidates.length === 0) {
        await skipWorkflowRun(run.id)
        continue
      }

      const ranked = rankCandidates(candidates, tenant.rankingWeights)
      const best = ranked[0]!

      await createSuggestion(ctx, {
        workflowType: 'next_lesson',
        status: 'pending',
        candidate: {
          studentId: best.studentId,
          instructorId: best.instructorId,
          aircraftId: best.aircraftId,
          locationId: best.locationId,
          startTime: best.startTime,
          endTime: best.endTime,
          lessonType: best.lessonType,
        },
        explanation: {
          triggerSummary: `Training progress: ${student.firstName} ${student.lastName} ready for ${nextLesson} (stage: ${progress.currentStage})`,
          constraintsSatisfied: ['certification', 'availability', 'training_progression'],
          rankingReasons: best.rankingReasons,
          tradeoffs: best.tradeoffs,
        },
        score: best.score,
        expiresAt: addHours(new Date(), tenant.notificationPolicy.offerExpiryHours),
      })
      totalCreated++

      await completeWorkflowRun(run.id, 1)
    } catch (err) {
      await failWorkflowRun(run.id, String(err))
      log.error({ err, studentId: student.studentId }, 'Next lesson workflow failed')
    }
  }

  if (totalCreated > 0) {
    await writeAuditEvent(ctx, {
      eventType: 'suggestion.created',
      actorType: 'system',
      entityType: 'next_lesson_batch',
      entityId: ctx.operatorId,
      payload: { totalCreated },
    })
    log.info({ totalCreated }, 'Next lesson sequencing complete')
  }
}

/** Map lesson name to FAA lesson type for constraint checks */
function deriveLessonType(nextRequiredLesson: string): string {
  const lower = nextRequiredLesson.toLowerCase()
  if (lower.includes('instrument') || lower.includes('ifr')) return 'instrument'
  if (lower.includes('multi') || lower.includes('me')) return 'multi'
  if (lower.includes('solo')) return 'solo'
  return 'dual'
}
