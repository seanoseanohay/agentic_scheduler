/* eslint-disable @typescript-eslint/require-await */
/**
 * MockFspClient — deterministic test double for all FSP operations.
 *
 * Returns realistic seeded data so the constraint engine, ranking,
 * and workflows can be developed and tested without a live FSP connection.
 *
 * Phase 1 replaces this with LiveFspClient pointing at real FSP endpoints.
 */

import type {
  FspStudent,
  FspInstructor,
  FspAircraft,
  FspLocation,
  FspReservation,
  FspAvailabilitySlot,
  FspCivilTwilight,
  FspTrainingProgress,
  FspValidationResult,
  FspReservationCreateParams,
} from '@oneshot/shared-types'
import type { IFspClient } from './client.js'

export class MockFspClient implements IFspClient {
  constructor(private readonly operatorId: string) {}

  async getStudents(): Promise<FspStudent[]> {
    return [
      {
        studentId: 'stu-001',
        operatorId: this.operatorId,
        firstName: 'Alice',
        lastName: 'Nguyen',
        email: 'alice@example.com',
        totalFlightHours: 42,
        lastFlightDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        studentId: 'stu-002',
        operatorId: this.operatorId,
        firstName: 'Bob',
        lastName: 'Kowalski',
        email: 'bob@example.com',
        totalFlightHours: 18,
        lastFlightDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        studentId: 'stu-003',
        operatorId: this.operatorId,
        firstName: 'Carol',
        lastName: 'Park',
        email: 'carol@example.com',
        phone: '+15550001234',
        totalFlightHours: 65,
        lastFlightDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ]
  }

  async getStudent(studentId: string): Promise<FspStudent | null> {
    const all = await this.getStudents()
    return all.find((s) => s.studentId === studentId) ?? null
  }

  async getInstructors(): Promise<FspInstructor[]> {
    return [
      {
        instructorId: 'ins-001',
        operatorId: this.operatorId,
        firstName: 'Dave',
        lastName: 'Martinez',
        ratings: ['CFI', 'CFII', 'MEI'],
        qualifiedAircraftTypes: ['C172', 'PA28'],
      },
      {
        instructorId: 'ins-002',
        operatorId: this.operatorId,
        firstName: 'Eve',
        lastName: 'Thompson',
        ratings: ['CFI'],
        qualifiedAircraftTypes: ['C172'],
      },
    ]
  }

  async getInstructor(instructorId: string): Promise<FspInstructor | null> {
    const all = await this.getInstructors()
    return all.find((i) => i.instructorId === instructorId) ?? null
  }

  async getAircraft(): Promise<FspAircraft[]> {
    return [
      {
        aircraftId: 'ac-001',
        operatorId: this.operatorId,
        tailNumber: 'N12345',
        aircraftType: 'C172',
        category: 'ASEL',
      },
      {
        aircraftId: 'ac-002',
        operatorId: this.operatorId,
        tailNumber: 'N67890',
        aircraftType: 'PA28',
        category: 'ASEL',
      },
    ]
  }

  async getLocations(): Promise<FspLocation[]> {
    return [
      {
        locationId: 'loc-001',
        operatorId: this.operatorId,
        name: 'Main Airport',
        icao: 'KORD',
        timezone: 'America/Chicago',
      },
    ]
  }

  async getReservation(reservationId: string): Promise<FspReservation | null> {
    return {
      reservationId,
      operatorId: this.operatorId,
      studentId: 'stu-001',
      instructorId: 'ins-001',
      aircraftId: 'ac-001',
      locationId: 'loc-001',
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      lessonType: 'dual',
      status: 'confirmed',
    }
  }

  async getReservationsByDateRange(_start: Date, _end: Date): Promise<FspReservation[]> {
    return []
  }

  async getCancelledSince(since: Date): Promise<FspReservation[]> {
    // Simulate one cancellation for testing
    if (Date.now() - since.getTime() < 60_000) return []
    return [
      {
        reservationId: 'res-cancelled-001',
        operatorId: this.operatorId,
        studentId: 'stu-002',
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
        locationId: 'loc-001',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
        lessonType: 'dual',
        status: 'cancelled',
      },
    ]
  }

  async getAvailableSlots(opts: { start: Date; end: Date }): Promise<FspAvailabilitySlot[]> {
    const slots: FspAvailabilitySlot[] = []
    const cursor = new Date(opts.start)
    while (cursor < opts.end) {
      slots.push({
        startTime: new Date(cursor),
        endTime: new Date(cursor.getTime() + 2 * 60 * 60 * 1000),
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
        locationId: 'loc-001',
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    return slots
  }

  async getCivilTwilight(locationId: string, date: string): Promise<FspCivilTwilight> {
    const base = new Date(date)
    return {
      date,
      locationId,
      civilSunrise: new Date(base.setHours(6, 30, 0, 0)),
      civilSunset: new Date(new Date(date).setHours(20, 30, 0, 0)),
    }
  }

  async getTrainingProgress(studentId: string): Promise<FspTrainingProgress | null> {
    return {
      studentId,
      operatorId: this.operatorId,
      currentStage: 'pre-solo',
      nextRequiredLesson: 'solo-prep',
      completedLessons: ['intro', 'basic-maneuvers', 'slow-flight'],
      hoursRequired: 40,
      hoursFlown: studentId === 'stu-001' ? 42 : 18,
    }
  }

  async validateReservation(_params: FspReservationCreateParams): Promise<FspValidationResult> {
    return { valid: true, errors: [] }
  }

  async createReservation(
    params: FspReservationCreateParams,
    idempotencyKey: string,
  ): Promise<FspReservation> {
    return {
      reservationId: `mock-res-${idempotencyKey}`,
      operatorId: params.operatorId,
      studentId: params.studentId,
      instructorId: params.instructorId,
      aircraftId: params.aircraftId,
      locationId: params.locationId,
      startTime: params.startTime,
      endTime: params.endTime,
      lessonType: params.lessonType,
      status: 'confirmed',
    }
  }

  async createBatchReservations(
    params: FspReservationCreateParams[],
    idempotencyKey: string,
  ): Promise<FspReservation[]> {
    return Promise.all(params.map((p, i) => this.createReservation(p, `${idempotencyKey}-${i}`)))
  }
}
