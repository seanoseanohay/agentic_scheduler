import { describe, it, expect } from 'vitest'
import { evaluateCertificationConstraint } from './certification.js'
import type { FspInstructor, FspAircraft } from '@oneshot/shared-types'

const instructor: FspInstructor = {
  instructorId: 'ins-001',
  operatorId: 'op-001',
  firstName: 'Dave',
  lastName: 'Martinez',
  ratings: ['CFI', 'CFII', 'MEI'],
  qualifiedAircraftTypes: ['C172', 'PA28'],
}

const aircraft: FspAircraft = {
  aircraftId: 'ac-001',
  operatorId: 'op-001',
  tailNumber: 'N12345',
  aircraftType: 'C172',
  category: 'ASEL',
}

describe('evaluateCertificationConstraint', () => {
  it('passes for dual lesson with CFI-rated instructor on qualified aircraft', () => {
    const result = evaluateCertificationConstraint(instructor, aircraft, 'dual')
    expect(result.passed).toBe(true)
    expect(result.constraintName).toBe('certification')
  })

  it('passes for instrument lesson with CFII-rated instructor', () => {
    const result = evaluateCertificationConstraint(instructor, aircraft, 'instrument')
    expect(result.passed).toBe(true)
  })

  it('passes for multi-engine lesson with MEI-rated instructor', () => {
    const pa28: FspAircraft = { ...aircraft, aircraftType: 'PA28' }
    const result = evaluateCertificationConstraint(instructor, pa28, 'multi')
    expect(result.passed).toBe(true)
  })

  it('fails when instructor lacks required rating for lesson type', () => {
    const cfiOnly: FspInstructor = { ...instructor, ratings: ['CFI'] }
    const result = evaluateCertificationConstraint(cfiOnly, aircraft, 'instrument')
    expect(result.passed).toBe(false)
    expect(result.explanation).toMatch(/CFII/)
  })

  it('fails when instructor is not qualified on the aircraft type', () => {
    const cessna310: FspAircraft = { ...aircraft, aircraftType: 'C310' }
    const result = evaluateCertificationConstraint(instructor, cessna310, 'dual')
    expect(result.passed).toBe(false)
    expect(result.explanation).toMatch(/C310/)
  })

  it('fails when neither rating nor aircraft qualification is met', () => {
    const limitedInstructor: FspInstructor = {
      ...instructor,
      ratings: ['CFI'],
      qualifiedAircraftTypes: ['PA28'],
    }
    const result = evaluateCertificationConstraint(limitedInstructor, aircraft, 'instrument')
    expect(result.passed).toBe(false)
  })

  it('provides explanation identifying the instructor by name', () => {
    const result = evaluateCertificationConstraint(instructor, aircraft, 'dual')
    expect(result.explanation).toMatch(/Dave Martinez/)
  })
})
