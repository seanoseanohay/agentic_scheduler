/**
 * Daylight constraint — FAA VFR currency rule.
 *
 * Discovery flights and certain solo operations must occur within civil twilight.
 * This is a hard constraint: no suggestion may be produced for a non-compliant slot.
 *
 * Constraint invariant (constraints.md #17): compliance-critical logic must be
 * deterministic, testable, and explainable.
 */

import type { FspCivilTwilight } from '@oneshot/shared-types'
import type { ConstraintResult } from './types.js'

/**
 * Returns whether a proposed slot falls entirely within civil twilight.
 *
 * @param slot - The proposed start/end times
 * @param twilight - Civil twilight data from FSP for the relevant date and location
 */
export function evaluateDaylightConstraint(
  slot: { startTime: Date; endTime: Date },
  twilight: FspCivilTwilight,
): ConstraintResult {
  const afterSunrise = slot.startTime >= twilight.civilSunrise
  const beforeSunset = slot.endTime <= twilight.civilSunset

  if (afterSunrise && beforeSunset) {
    return {
      passed: true,
      constraintName: 'daylight',
      explanation: `Slot ${fmt(slot.startTime)}–${fmt(slot.endTime)} is within civil twilight (${fmt(twilight.civilSunrise)}–${fmt(twilight.civilSunset)}).`,
    }
  }

  const violations: string[] = []
  if (!afterSunrise) {
    violations.push(`starts before civil sunrise (${fmt(twilight.civilSunrise)})`)
  }
  if (!beforeSunset) {
    violations.push(`ends after civil sunset (${fmt(twilight.civilSunset)})`)
  }

  return {
    passed: false,
    constraintName: 'daylight',
    explanation: `Slot ${fmt(slot.startTime)}–${fmt(slot.endTime)} violates daylight rule: ${violations.join('; ')}.`,
  }
}

function fmt(d: Date): string {
  return d.toISOString().substring(11, 16) + 'Z'
}
