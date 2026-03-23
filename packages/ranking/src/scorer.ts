/**
 * Ranking / Scoring service.
 *
 * Scores a set of compliant candidates using tenant-configured weights.
 * AI (Azure OpenAI) may assist with explanation drafting in Phase 2+,
 * but the numeric score is always deterministic and based on explicit weights.
 *
 * Invariant (constraints.md #18): AI assistance is advisory only and cannot
 * override the candidate list produced here.
 */

import type { FspStudent, RankingWeights } from '@oneshot/shared-types'

export interface RankingCandidate {
  studentId: string
  instructorId: string
  aircraftId: string
  locationId: string
  startTime: Date
  endTime: Date
  lessonType: string
  /** Was this the student's previous instructor? */
  continuityInstructor: boolean
  /** Was this the student's previous aircraft type? */
  continuityAircraft: boolean
  /** FSP student data needed for scoring */
  student: FspStudent
}

export interface ScoredCandidate extends RankingCandidate {
  score: number
  rankingReasons: string[]
  tradeoffs: string[]
}

const MS_PER_DAY = 86_400_000

export function rankCandidates(
  candidates: RankingCandidate[],
  weights: RankingWeights,
  now = new Date(),
): ScoredCandidate[] {
  return candidates
    .map((c) => score(c, weights, now))
    .sort((a, b) => b.score - a.score)
}

function score(c: RankingCandidate, w: RankingWeights, now: Date): ScoredCandidate {
  const reasons: string[] = []
  const tradeoffs: string[] = []
  let total = 0

  // Days since last flight (normalised to 0–1 over a 30-day window)
  if (c.student.lastFlightDate) {
    const daysSince = (now.getTime() - c.student.lastFlightDate.getTime()) / MS_PER_DAY
    const norm = Math.min(daysSince / 30, 1)
    total += norm * w.timeSinceLastFlight
    if (norm > 0.5) {
      reasons.push(`${Math.round(daysSince)} days since last flight`)
    }
  }

  // Days until next scheduled flight (0 = no upcoming flight = highest priority)
  if (!c.student.nextScheduledFlightDate) {
    total += w.timeUntilNextFlight
    reasons.push('No upcoming flight scheduled')
  } else {
    const daysUntil =
      (c.student.nextScheduledFlightDate.getTime() - now.getTime()) / MS_PER_DAY
    const norm = Math.max(0, 1 - daysUntil / 14)
    total += norm * w.timeUntilNextFlight
  }

  // Total hours (prioritise lower-hours students — training continuity)
  const hoursNorm = Math.max(0, 1 - c.student.totalFlightHours / 250)
  total += hoursNorm * w.totalHours
  reasons.push(`${c.student.totalFlightHours} total hours`)

  // Instructor continuity
  if (c.continuityInstructor) {
    total += w.instructorContinuity
    reasons.push('Same instructor as previous lesson')
  } else {
    tradeoffs.push('Different instructor from previous lesson')
  }

  // Aircraft continuity
  if (c.continuityAircraft) {
    total += w.aircraftContinuity
    reasons.push('Same aircraft type as previous lesson')
  }

  return { ...c, score: total, rankingReasons: reasons, tradeoffs }
}
