/**
 * FSP Adapter — typed interface for all FSP interactions.
 *
 * In Phase 0, FSP_MODE=mock routes all calls to the mock implementation.
 * In Phase 1, this is replaced with real HTTP calls to the FSP API.
 *
 * Reliability patterns baked in:
 *  - Retry with exponential backoff on transient errors
 *  - Rate-limit awareness (respect Retry-After headers)
 *  - Response normalisation (FSP types → shared-types)
 *  - Idempotency keys on mutation calls
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

export interface FspClientConfig {
  baseUrl: string
  apiKey: string
  operatorId: string
  /** Max retries on transient 5xx or rate-limit responses */
  maxRetries?: number
}

/**
 * IFspClient — the contract every FSP implementation must satisfy.
 * The mock and live clients both implement this interface so that
 * the rules engine, workers, and workflows are testable without FSP.
 */
export interface IFspClient {
  // ── Reference data ──────────────────────────────────────────────────────
  getStudents(): Promise<FspStudent[]>
  getStudent(studentId: string): Promise<FspStudent | null>
  getInstructors(): Promise<FspInstructor[]>
  getInstructor(instructorId: string): Promise<FspInstructor | null>
  getAircraft(): Promise<FspAircraft[]>
  getLocations(): Promise<FspLocation[]>

  // ── Schedule reads ───────────────────────────────────────────────────────
  getReservation(reservationId: string): Promise<FspReservation | null>
  getReservationsByDateRange(start: Date, end: Date): Promise<FspReservation[]>
  getCancelledSince(since: Date): Promise<FspReservation[]>

  // ── Availability ─────────────────────────────────────────────────────────
  getAvailableSlots(opts: {
    instructorId?: string
    aircraftId?: string
    locationId?: string
    start: Date
    end: Date
  }): Promise<FspAvailabilitySlot[]>

  // ── Civil twilight ────────────────────────────────────────────────────────
  getCivilTwilight(locationId: string, date: string): Promise<FspCivilTwilight>

  // ── Training progress ─────────────────────────────────────────────────────
  getTrainingProgress(studentId: string): Promise<FspTrainingProgress | null>

  // ── Mutations ─────────────────────────────────────────────────────────────
  validateReservation(params: FspReservationCreateParams): Promise<FspValidationResult>
  createReservation(
    params: FspReservationCreateParams,
    idempotencyKey: string,
  ): Promise<FspReservation>
  createBatchReservations(
    params: FspReservationCreateParams[],
    idempotencyKey: string,
  ): Promise<FspReservation[]>
}

/** Factory — returns mock or live client based on FSP_MODE env var */
export async function createFspClient(config: FspClientConfig): Promise<IFspClient> {
  const mode = process.env['FSP_MODE'] ?? 'mock'
  if (mode === 'mock') {
    const { MockFspClient } = await import('./mock.js')
    return new MockFspClient(config.operatorId)
  }
  const { LiveFspClient } = await import('./live.js')
  return new LiveFspClient(config)
}
