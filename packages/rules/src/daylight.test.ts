import { describe, it, expect } from 'vitest'
import { evaluateDaylightConstraint } from './daylight.js'
import type { FspCivilTwilight } from '@oneshot/shared-types'

const makeTwilight = (sunriseHour: number, sunsetHour: number): FspCivilTwilight => ({
  date: '2026-06-15',
  locationId: 'loc-001',
  civilSunrise: new Date(`2026-06-15T${String(sunriseHour).padStart(2, '0')}:00:00Z`),
  civilSunset: new Date(`2026-06-15T${String(sunsetHour).padStart(2, '0')}:00:00Z`),
})

describe('evaluateDaylightConstraint', () => {
  const twilight = makeTwilight(6, 20) // 06:00–20:00 UTC

  it('passes when slot is entirely within civil twilight', () => {
    const result = evaluateDaylightConstraint(
      {
        startTime: new Date('2026-06-15T09:00:00Z'),
        endTime: new Date('2026-06-15T11:00:00Z'),
      },
      twilight,
    )
    expect(result.passed).toBe(true)
    expect(result.constraintName).toBe('daylight')
  })

  it('passes when slot starts exactly at civil sunrise', () => {
    const result = evaluateDaylightConstraint(
      {
        startTime: new Date('2026-06-15T06:00:00Z'),
        endTime: new Date('2026-06-15T08:00:00Z'),
      },
      twilight,
    )
    expect(result.passed).toBe(true)
  })

  it('passes when slot ends exactly at civil sunset', () => {
    const result = evaluateDaylightConstraint(
      {
        startTime: new Date('2026-06-15T18:00:00Z'),
        endTime: new Date('2026-06-15T20:00:00Z'),
      },
      twilight,
    )
    expect(result.passed).toBe(true)
  })

  it('fails when slot starts before civil sunrise', () => {
    const result = evaluateDaylightConstraint(
      {
        startTime: new Date('2026-06-15T05:00:00Z'),
        endTime: new Date('2026-06-15T07:00:00Z'),
      },
      twilight,
    )
    expect(result.passed).toBe(false)
    expect(result.explanation).toMatch(/before civil sunrise/)
  })

  it('fails when slot ends after civil sunset', () => {
    const result = evaluateDaylightConstraint(
      {
        startTime: new Date('2026-06-15T19:00:00Z'),
        endTime: new Date('2026-06-15T21:00:00Z'),
      },
      twilight,
    )
    expect(result.passed).toBe(false)
    expect(result.explanation).toMatch(/after civil sunset/)
  })

  it('fails when slot spans both sunrise violation and sunset violation', () => {
    const result = evaluateDaylightConstraint(
      {
        startTime: new Date('2026-06-15T04:00:00Z'),
        endTime: new Date('2026-06-15T22:00:00Z'),
      },
      twilight,
    )
    expect(result.passed).toBe(false)
    expect(result.explanation).toMatch(/before civil sunrise/)
    expect(result.explanation).toMatch(/after civil sunset/)
  })

  it('returns explanation with slot and twilight times', () => {
    const result = evaluateDaylightConstraint(
      {
        startTime: new Date('2026-06-15T10:00:00Z'),
        endTime: new Date('2026-06-15T12:00:00Z'),
      },
      twilight,
    )
    expect(result.explanation).toContain('10:00Z')
    expect(result.explanation).toContain('12:00Z')
  })
})
