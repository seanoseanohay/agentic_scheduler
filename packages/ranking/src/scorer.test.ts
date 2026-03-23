import { describe, it, expect } from 'vitest'
import { rankCandidates } from './scorer.js'
import type { RankingCandidate } from './scorer.js'
import { DEFAULT_RANKING_WEIGHTS } from '@oneshot/shared-types'

const now = new Date('2026-06-15T12:00:00Z')

const baseStudent = {
  studentId: 'stu-001',
  operatorId: 'op-001',
  firstName: 'Alice',
  lastName: 'Nguyen',
  email: 'alice@example.com',
  totalFlightHours: 20,
  lastFlightDate: new Date('2026-06-01T12:00:00Z'), // 14 days ago
}

const makeCandidate = (overrides: Partial<RankingCandidate> = {}): RankingCandidate => ({
  studentId: baseStudent.studentId,
  instructorId: 'ins-001',
  aircraftId: 'ac-001',
  locationId: 'loc-001',
  startTime: new Date('2026-06-20T10:00:00Z'),
  endTime: new Date('2026-06-20T12:00:00Z'),
  lessonType: 'dual',
  continuityInstructor: false,
  continuityAircraft: false,
  student: baseStudent,
  ...overrides,
})

describe('rankCandidates', () => {
  it('returns candidates sorted by score descending', () => {
    const candidates = [
      makeCandidate({ student: { ...baseStudent, totalFlightHours: 100 } }),
      makeCandidate({ student: { ...baseStudent, totalFlightHours: 5 } }),
      makeCandidate({ student: { ...baseStudent, totalFlightHours: 50 } }),
    ]
    const ranked = rankCandidates(candidates, DEFAULT_RANKING_WEIGHTS, now)
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(ranked[1]!.score)
    expect(ranked[1]!.score).toBeGreaterThanOrEqual(ranked[2]!.score)
  })

  it('gives higher score to student with no upcoming flight', () => {
    const withUpcoming = makeCandidate({
      student: { ...baseStudent, nextScheduledFlightDate: new Date('2026-06-17T10:00:00Z') },
    })
    const withoutUpcoming = makeCandidate({
      student: { ...baseStudent, nextScheduledFlightDate: undefined },
    })
    const ranked = rankCandidates([withUpcoming, withoutUpcoming], DEFAULT_RANKING_WEIGHTS, now)
    expect(ranked[0]!.studentId).toBe(withoutUpcoming.studentId)
  })

  it('gives higher score for instructor continuity', () => {
    const withContinuity = makeCandidate({ continuityInstructor: true })
    const withoutContinuity = makeCandidate({ continuityInstructor: false })
    const ranked = rankCandidates([withoutContinuity, withContinuity], DEFAULT_RANKING_WEIGHTS, now)
    expect(ranked[0]!.continuityInstructor).toBe(true)
  })

  it('gives higher score to student who flew longer ago', () => {
    const recentFlier = makeCandidate({
      student: { ...baseStudent, lastFlightDate: new Date('2026-06-14T12:00:00Z') },
    })
    const lapsedFlier = makeCandidate({
      student: { ...baseStudent, lastFlightDate: new Date('2026-05-01T12:00:00Z') },
    })
    const ranked = rankCandidates([recentFlier, lapsedFlier], DEFAULT_RANKING_WEIGHTS, now)
    expect(ranked[0]!.student.lastFlightDate!.getTime()).toBeLessThan(
      ranked[1]!.student.lastFlightDate!.getTime(),
    )
  })

  it('produces a score between 0 and 1', () => {
    const candidates = [
      makeCandidate({ continuityInstructor: true, continuityAircraft: true }),
    ]
    const ranked = rankCandidates(candidates, DEFAULT_RANKING_WEIGHTS, now)
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(0)
    expect(ranked[0]!.score).toBeLessThanOrEqual(1)
  })

  it('includes ranking reasons in output', () => {
    const candidate = makeCandidate({
      continuityInstructor: true,
      student: { ...baseStudent, nextScheduledFlightDate: undefined },
    })
    const ranked = rankCandidates([candidate], DEFAULT_RANKING_WEIGHTS, now)
    expect(ranked[0]!.rankingReasons.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty input', () => {
    expect(rankCandidates([], DEFAULT_RANKING_WEIGHTS, now)).toEqual([])
  })
})
