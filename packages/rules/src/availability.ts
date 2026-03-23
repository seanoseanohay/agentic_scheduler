/**
 * Availability constraint — validates that student, instructor, and aircraft
 * are all available for a proposed slot according to FSP data.
 *
 * This check uses FSP as the source of truth — we never derive availability
 * from OneShot's own database.
 */

import type { FspAvailabilitySlot } from '@oneshot/shared-types'
import type { ConstraintResult } from './types.js'

export function evaluateAvailabilityConstraint(
  proposed: { startTime: Date; endTime: Date; instructorId: string; aircraftId: string },
  availableSlots: FspAvailabilitySlot[],
): ConstraintResult {
  const match = availableSlots.find(
    (s) =>
      s.instructorId === proposed.instructorId &&
      s.aircraftId === proposed.aircraftId &&
      s.startTime <= proposed.startTime &&
      s.endTime >= proposed.endTime,
  )

  if (match) {
    return {
      passed: true,
      constraintName: 'availability',
      explanation: `Instructor and aircraft are both available for the proposed slot according to FSP.`,
    }
  }

  return {
    passed: false,
    constraintName: 'availability',
    explanation: `No matching FSP availability for instructor ${proposed.instructorId} and aircraft ${proposed.aircraftId} at the proposed time.`,
  }
}
