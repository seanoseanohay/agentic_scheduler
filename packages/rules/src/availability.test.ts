import { describe, it, expect } from 'vitest'
import { evaluateAvailabilityConstraint } from './availability.js'
import type { FspAvailabilitySlot } from '@oneshot/shared-types'

const baseSlot: FspAvailabilitySlot = {
  startTime: new Date('2026-06-15T09:00:00Z'),
  endTime: new Date('2026-06-15T11:00:00Z'),
  instructorId: 'ins-001',
  aircraftId: 'ac-001',
  locationId: 'loc-001',
}

describe('evaluateAvailabilityConstraint', () => {
  it('passes when FSP availability covers the proposed slot', () => {
    const result = evaluateAvailabilityConstraint(
      {
        startTime: new Date('2026-06-15T09:30:00Z'),
        endTime: new Date('2026-06-15T10:30:00Z'),
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
      },
      [baseSlot],
    )
    expect(result.passed).toBe(true)
  })

  it('passes when proposed time exactly matches FSP slot', () => {
    const result = evaluateAvailabilityConstraint(
      {
        startTime: baseSlot.startTime,
        endTime: baseSlot.endTime,
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
      },
      [baseSlot],
    )
    expect(result.passed).toBe(true)
  })

  it('fails when no FSP slot matches the instructor', () => {
    const result = evaluateAvailabilityConstraint(
      {
        startTime: new Date('2026-06-15T09:30:00Z'),
        endTime: new Date('2026-06-15T10:30:00Z'),
        instructorId: 'ins-WRONG',
        aircraftId: 'ac-001',
      },
      [baseSlot],
    )
    expect(result.passed).toBe(false)
    expect(result.explanation).toMatch(/ins-WRONG/)
  })

  it('fails when no FSP slot matches the aircraft', () => {
    const result = evaluateAvailabilityConstraint(
      {
        startTime: new Date('2026-06-15T09:30:00Z'),
        endTime: new Date('2026-06-15T10:30:00Z'),
        instructorId: 'ins-001',
        aircraftId: 'ac-WRONG',
      },
      [baseSlot],
    )
    expect(result.passed).toBe(false)
  })

  it('fails when proposed start is before FSP slot start', () => {
    const result = evaluateAvailabilityConstraint(
      {
        startTime: new Date('2026-06-15T08:00:00Z'),
        endTime: new Date('2026-06-15T10:00:00Z'),
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
      },
      [baseSlot],
    )
    expect(result.passed).toBe(false)
  })

  it('fails when proposed end is after FSP slot end', () => {
    const result = evaluateAvailabilityConstraint(
      {
        startTime: new Date('2026-06-15T10:00:00Z'),
        endTime: new Date('2026-06-15T12:00:00Z'),
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
      },
      [baseSlot],
    )
    expect(result.passed).toBe(false)
  })

  it('fails when available slots list is empty', () => {
    const result = evaluateAvailabilityConstraint(
      {
        startTime: new Date('2026-06-15T09:30:00Z'),
        endTime: new Date('2026-06-15T10:30:00Z'),
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
      },
      [],
    )
    expect(result.passed).toBe(false)
  })
})
