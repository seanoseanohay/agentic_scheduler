import { describe, it, expect } from 'vitest'
import { MockFspClient } from './mock.js'

const operatorId = 'test-operator'
const client = new MockFspClient(operatorId)

describe('MockFspClient', () => {
  it('returns students scoped to operatorId', async () => {
    const students = await client.getStudents()
    expect(students.length).toBeGreaterThan(0)
    for (const s of students) {
      expect(s.operatorId).toBe(operatorId)
    }
  })

  it('getStudent returns null for unknown id', async () => {
    const s = await client.getStudent('stu-UNKNOWN')
    expect(s).toBeNull()
  })

  it('getStudent returns student for known id', async () => {
    const s = await client.getStudent('stu-001')
    expect(s).not.toBeNull()
    expect(s?.studentId).toBe('stu-001')
  })

  it('returns instructors scoped to operatorId', async () => {
    const instructors = await client.getInstructors()
    expect(instructors.length).toBeGreaterThan(0)
    for (const i of instructors) {
      expect(i.operatorId).toBe(operatorId)
    }
  })

  it('getInstructor returns null for unknown id', async () => {
    const i = await client.getInstructor('ins-UNKNOWN')
    expect(i).toBeNull()
  })

  it('returns aircraft scoped to operatorId', async () => {
    const aircraft = await client.getAircraft()
    expect(aircraft.length).toBeGreaterThan(0)
    for (const a of aircraft) {
      expect(a.operatorId).toBe(operatorId)
    }
  })

  it('returns locations scoped to operatorId', async () => {
    const locations = await client.getLocations()
    expect(locations.length).toBeGreaterThan(0)
    for (const l of locations) {
      expect(l.operatorId).toBe(operatorId)
    }
  })

  it('getAvailableSlots returns hourly slots within window', async () => {
    const start = new Date('2026-06-20T00:00:00Z')
    const end = new Date('2026-06-22T00:00:00Z') // 2 days
    const slots = await client.getAvailableSlots({ start, end })
    expect(slots.length).toBeGreaterThan(0)
    for (const slot of slots) {
      expect(slot.startTime.getTime()).toBeGreaterThanOrEqual(start.getTime())
      expect(slot.startTime.getTime()).toBeLessThan(end.getTime())
    }
  })

  it('getCivilTwilight returns sunrise before sunset', async () => {
    const twilight = await client.getCivilTwilight('loc-001', '2026-06-15')
    expect(twilight.civilSunrise.getTime()).toBeLessThan(twilight.civilSunset.getTime())
    expect(twilight.locationId).toBe('loc-001')
  })

  it('getTrainingProgress returns progress for known student', async () => {
    const progress = await client.getTrainingProgress('stu-001')
    expect(progress).not.toBeNull()
    expect(progress?.studentId).toBe('stu-001')
    expect(progress?.operatorId).toBe(operatorId)
  })

  it('validateReservation returns valid:true', async () => {
    const result = await client.validateReservation({
      operatorId,
      studentId: 'stu-001',
      instructorId: 'ins-001',
      aircraftId: 'ac-001',
      locationId: 'loc-001',
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 3600_000),
      lessonType: 'dual',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('createReservation returns reservation with idempotency key in id', async () => {
    const params = {
      operatorId,
      studentId: 'stu-001',
      instructorId: 'ins-001',
      aircraftId: 'ac-001',
      locationId: 'loc-001',
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 3600_000),
      lessonType: 'dual',
    }
    const res = await client.createReservation(params, 'idem-key-123')
    expect(res.reservationId).toContain('idem-key-123')
    expect(res.status).toBe('confirmed')
    expect(res.operatorId).toBe(operatorId)
  })

  it('createBatchReservations returns one reservation per param', async () => {
    const params = [
      {
        operatorId,
        studentId: 'stu-001',
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
        locationId: 'loc-001',
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 3600_000),
        lessonType: 'dual',
      },
      {
        operatorId,
        studentId: 'stu-002',
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
        locationId: 'loc-001',
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 3600_000),
        lessonType: 'dual',
      },
    ]
    const results = await client.createBatchReservations(params, 'batch-idem-key')
    expect(results.length).toBe(2)
  })
})
