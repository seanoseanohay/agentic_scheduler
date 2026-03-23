/**
 * Certification constraint — instructor ratings and aircraft compatibility.
 *
 * Hard constraint: an instructor must hold the required rating for the lesson type
 * and must be qualified on the proposed aircraft type.
 */

import type { FspInstructor, FspAircraft } from '@oneshot/shared-types'
import type { ConstraintResult } from './types.js'

/** Maps lesson type to required FAA rating */
const LESSON_RATING_REQUIREMENTS: Record<string, string> = {
  dual: 'CFI',
  instrument: 'CFII',
  multi: 'MEI',
  solo: 'CFI', // CFI must have signed off solo endorsement
}

export function evaluateCertificationConstraint(
  instructor: FspInstructor,
  aircraft: FspAircraft,
  lessonType: string,
): ConstraintResult {
  const requiredRating = LESSON_RATING_REQUIREMENTS[lessonType]

  // Check rating requirement
  if (requiredRating && !instructor.ratings.includes(requiredRating)) {
    return {
      passed: false,
      constraintName: 'certification',
      explanation: `Instructor ${instructor.firstName} ${instructor.lastName} does not hold ${requiredRating} required for lesson type '${lessonType}'.`,
    }
  }

  // Check aircraft type qualification
  if (!instructor.qualifiedAircraftTypes.includes(aircraft.aircraftType)) {
    return {
      passed: false,
      constraintName: 'certification',
      explanation: `Instructor ${instructor.firstName} ${instructor.lastName} is not qualified on ${aircraft.aircraftType} (${aircraft.tailNumber}).`,
    }
  }

  return {
    passed: true,
    constraintName: 'certification',
    explanation: `Instructor ${instructor.firstName} ${instructor.lastName} holds ${requiredRating ?? 'required ratings'} and is qualified on ${aircraft.aircraftType}.`,
  }
}
