/**
 * LiveFspClient — real HTTP implementation for Phase 1.
 *
 * URL conventions follow FSP REST API patterns. All mutations carry an
 * Idempotency-Key header so retries do not double-book.
 *
 * Reliability invariants (architecture.md FSP Integration Adapter):
 *  - Retry with exponential backoff on 429/5xx via fetchWithRetry
 *  - Retry-After header respected for rate limits
 *  - All responses normalised to shared-types before returning
 *  - Idempotency keys on all mutations
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
import type { FspClientConfig, IFspClient } from './client.js'
import { fetchWithRetry } from './retry.js'

export class LiveFspClient implements IFspClient {
  private readonly retryOpts: { maxRetries: number; baseDelayMs: number }

  constructor(private readonly config: FspClientConfig) {
    this.retryOpts = { maxRetries: config.maxRetries ?? 3, baseDelayMs: 500 }
  }

  private get base() {
    return `${this.config.baseUrl}/operators/${this.config.operatorId}`
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Api-Key': this.config.apiKey,
      'X-Operator-Id': this.config.operatorId,
    }
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.base}${path}`)
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    }
    const res = await fetchWithRetry(url.toString(), { headers: this.headers }, this.retryOpts)
    return res.json() as Promise<T>
  }

  private async post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
    const url = `${this.base}${path}`
    const headers: Record<string, string> = { ...this.headers }
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
    const res = await fetchWithRetry(
      url,
      { method: 'POST', headers, body: JSON.stringify(body) },
      this.retryOpts,
    )
    return res.json() as Promise<T>
  }

  // ── Reference data ──────────────────────────────────────────────────────

  async getStudents(): Promise<FspStudent[]> {
    const data = await this.get<{ students: RawStudent[] }>('/students')
    return data.students.map(normaliseStudent(this.config.operatorId))
  }

  async getStudent(studentId: string): Promise<FspStudent | null> {
    try {
      const data = await this.get<{ student: RawStudent }>(`/students/${studentId}`)
      return normaliseStudent(this.config.operatorId)(data.student)
    } catch (e) {
      if (isNotFound(e)) return null
      throw e
    }
  }

  async getInstructors(): Promise<FspInstructor[]> {
    const data = await this.get<{ instructors: RawInstructor[] }>('/instructors')
    return data.instructors.map(normaliseInstructor(this.config.operatorId))
  }

  async getInstructor(instructorId: string): Promise<FspInstructor | null> {
    try {
      const data = await this.get<{ instructor: RawInstructor }>(`/instructors/${instructorId}`)
      return normaliseInstructor(this.config.operatorId)(data.instructor)
    } catch (e) {
      if (isNotFound(e)) return null
      throw e
    }
  }

  async getAircraft(): Promise<FspAircraft[]> {
    const data = await this.get<{ aircraft: RawAircraft[] }>('/aircraft')
    return data.aircraft.map(normaliseAircraft(this.config.operatorId))
  }

  async getLocations(): Promise<FspLocation[]> {
    const data = await this.get<{ locations: RawLocation[] }>('/locations')
    return data.locations.map(normaliseLocation(this.config.operatorId))
  }

  // ── Schedule reads ──────────────────────────────────────────────────────

  async getReservation(reservationId: string): Promise<FspReservation | null> {
    try {
      const data = await this.get<{ reservation: RawReservation }>(`/reservations/${reservationId}`)
      return normaliseReservation(this.config.operatorId)(data.reservation)
    } catch (e) {
      if (isNotFound(e)) return null
      throw e
    }
  }

  async getReservationsByDateRange(start: Date, end: Date): Promise<FspReservation[]> {
    const data = await this.get<{ reservations: RawReservation[] }>('/reservations', {
      start: start.toISOString(),
      end: end.toISOString(),
    })
    return data.reservations.map(normaliseReservation(this.config.operatorId))
  }

  async getCancelledSince(since: Date): Promise<FspReservation[]> {
    const data = await this.get<{ reservations: RawReservation[] }>('/reservations/cancelled', {
      since: since.toISOString(),
    })
    return data.reservations.map(normaliseReservation(this.config.operatorId))
  }

  // ── Availability ────────────────────────────────────────────────────────

  async getAvailableSlots(opts: {
    instructorId?: string
    aircraftId?: string
    locationId?: string
    start: Date
    end: Date
  }): Promise<FspAvailabilitySlot[]> {
    const params: Record<string, string> = {
      start: opts.start.toISOString(),
      end: opts.end.toISOString(),
    }
    if (opts.instructorId) params['instructorId'] = opts.instructorId
    if (opts.aircraftId) params['aircraftId'] = opts.aircraftId
    if (opts.locationId) params['locationId'] = opts.locationId

    const data = await this.get<{ slots: RawSlot[] }>('/availability', params)
    return data.slots.map(normaliseSlot)
  }

  // ── Civil twilight ──────────────────────────────────────────────────────

  async getCivilTwilight(locationId: string, date: string): Promise<FspCivilTwilight> {
    const data = await this.get<{ civilTwilight: RawTwilight }>(
      `/locations/${locationId}/civil-twilight`,
      { date },
    )
    return normaliseTwilight(locationId, data.civilTwilight)
  }

  // ── Training progress ───────────────────────────────────────────────────

  async getTrainingProgress(studentId: string): Promise<FspTrainingProgress | null> {
    try {
      const data = await this.get<{ trainingProgress: RawProgress }>(
        `/students/${studentId}/training-progress`,
      )
      return normaliseProgress(this.config.operatorId, studentId, data.trainingProgress)
    } catch (e) {
      if (isNotFound(e)) return null
      throw e
    }
  }

  // ── Mutations ───────────────────────────────────────────────────────────

  async validateReservation(params: FspReservationCreateParams): Promise<FspValidationResult> {
    const data = await this.post<{ valid: boolean; errors: string[] }>(
      '/reservations/validate',
      serialiseCreateParams(params),
    )
    return { valid: data.valid, errors: data.errors ?? [] }
  }

  async createReservation(
    params: FspReservationCreateParams,
    idempotencyKey: string,
  ): Promise<FspReservation> {
    const data = await this.post<{ reservation: RawReservation }>(
      '/reservations',
      serialiseCreateParams(params),
      idempotencyKey,
    )
    return normaliseReservation(this.config.operatorId)(data.reservation)
  }

  async createBatchReservations(
    params: FspReservationCreateParams[],
    idempotencyKey: string,
  ): Promise<FspReservation[]> {
    const data = await this.post<{ reservations: RawReservation[] }>(
      '/reservations/batch',
      { reservations: params.map(serialiseCreateParams) },
      idempotencyKey,
    )
    return data.reservations.map(normaliseReservation(this.config.operatorId))
  }
}

// ── Raw FSP wire shapes ───────────────────────────────────────────────────────

interface RawStudent {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  totalFlightHours: number
  lastFlightDate?: string
  nextScheduledFlightDate?: string
}

interface RawInstructor {
  id: string
  firstName: string
  lastName: string
  ratings: string[]
  qualifiedAircraftTypes: string[]
}

interface RawAircraft {
  id: string
  tailNumber: string
  aircraftType: string
  category: string
}

interface RawLocation {
  id: string
  name: string
  icao: string
  timezone: string
}

interface RawReservation {
  id: string
  studentId: string
  instructorId: string
  aircraftId: string
  locationId: string
  startTime: string
  endTime: string
  lessonType: string
  status: string
}

interface RawSlot {
  startTime: string
  endTime: string
  instructorId: string
  aircraftId: string
  locationId: string
}

interface RawTwilight {
  civilSunrise: string
  civilSunset: string
}

interface RawProgress {
  currentStage: string
  nextRequiredLesson: string
  completedLessons: string[]
  hoursRequired: number
  hoursFlown: number
}

// ── Normalisers ───────────────────────────────────────────────────────────────

function normaliseStudent(operatorId: string) {
  return (r: RawStudent): FspStudent => ({
    studentId: r.id,
    operatorId,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    phone: r.phone,
    totalFlightHours: r.totalFlightHours,
    lastFlightDate: r.lastFlightDate ? new Date(r.lastFlightDate) : undefined,
    nextScheduledFlightDate: r.nextScheduledFlightDate
      ? new Date(r.nextScheduledFlightDate)
      : undefined,
  })
}

function normaliseInstructor(operatorId: string) {
  return (r: RawInstructor): FspInstructor => ({
    instructorId: r.id,
    operatorId,
    firstName: r.firstName,
    lastName: r.lastName,
    ratings: r.ratings,
    qualifiedAircraftTypes: r.qualifiedAircraftTypes,
  })
}

function normaliseAircraft(operatorId: string) {
  return (r: RawAircraft): FspAircraft => ({
    aircraftId: r.id,
    operatorId,
    tailNumber: r.tailNumber,
    aircraftType: r.aircraftType,
    category: r.category,
  })
}

function normaliseLocation(operatorId: string) {
  return (r: RawLocation): FspLocation => ({
    locationId: r.id,
    operatorId,
    name: r.name,
    icao: r.icao,
    timezone: r.timezone,
  })
}

function normaliseReservation(operatorId: string) {
  return (r: RawReservation): FspReservation => ({
    reservationId: r.id,
    operatorId,
    studentId: r.studentId,
    instructorId: r.instructorId,
    aircraftId: r.aircraftId,
    locationId: r.locationId,
    startTime: new Date(r.startTime),
    endTime: new Date(r.endTime),
    lessonType: r.lessonType,
    status: r.status as FspReservation['status'],
  })
}

function normaliseSlot(r: RawSlot): FspAvailabilitySlot {
  return {
    startTime: new Date(r.startTime),
    endTime: new Date(r.endTime),
    instructorId: r.instructorId,
    aircraftId: r.aircraftId,
    locationId: r.locationId,
  }
}

function normaliseTwilight(locationId: string, r: RawTwilight): FspCivilTwilight {
  return {
    date: r.civilSunrise.substring(0, 10),
    locationId,
    civilSunrise: new Date(r.civilSunrise),
    civilSunset: new Date(r.civilSunset),
  }
}

function normaliseProgress(
  operatorId: string,
  studentId: string,
  r: RawProgress,
): FspTrainingProgress {
  return {
    studentId,
    operatorId,
    currentStage: r.currentStage,
    nextRequiredLesson: r.nextRequiredLesson,
    completedLessons: r.completedLessons,
    hoursRequired: r.hoursRequired,
    hoursFlown: r.hoursFlown,
  }
}

function serialiseCreateParams(p: FspReservationCreateParams) {
  return {
    studentId: p.studentId,
    instructorId: p.instructorId,
    aircraftId: p.aircraftId,
    locationId: p.locationId,
    startTime: p.startTime.toISOString(),
    endTime: p.endTime.toISOString(),
    lessonType: p.lessonType,
  }
}

function isNotFound(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'status' in e &&
    (e as { status: number }).status === 404
  )
}
