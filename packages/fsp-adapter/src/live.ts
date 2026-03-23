/**
 * LiveFspClient — stub for Phase 1 implementation.
 *
 * TODO (Phase 1):
 *  - Implement all IFspClient methods against real FSP REST endpoints
 *  - Add retry-with-backoff (use exponential backoff on 429/5xx)
 *  - Add Retry-After header handling for rate limits
 *  - Add idempotency key header on all mutation calls
 *  - Normalise FSP response shapes into shared-types
 *  - Add per-tenant throttle budget tracking
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

export class LiveFspClient implements IFspClient {
  constructor(private readonly config: FspClientConfig) {}

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.config.apiKey,
      'X-Operator-Id': this.config.operatorId,
    }
  }

  getStudents(): Promise<FspStudent[]> {
    throw new Error('LiveFspClient.getStudents not yet implemented — Phase 1')
  }
  getStudent(_studentId: string): Promise<FspStudent | null> {
    throw new Error('LiveFspClient.getStudent not yet implemented — Phase 1')
  }
  getInstructors(): Promise<FspInstructor[]> {
    throw new Error('LiveFspClient.getInstructors not yet implemented — Phase 1')
  }
  getInstructor(_instructorId: string): Promise<FspInstructor | null> {
    throw new Error('LiveFspClient.getInstructor not yet implemented — Phase 1')
  }
  getAircraft(): Promise<FspAircraft[]> {
    throw new Error('LiveFspClient.getAircraft not yet implemented — Phase 1')
  }
  getLocations(): Promise<FspLocation[]> {
    throw new Error('LiveFspClient.getLocations not yet implemented — Phase 1')
  }
  getReservation(_reservationId: string): Promise<FspReservation | null> {
    throw new Error('LiveFspClient.getReservation not yet implemented — Phase 1')
  }
  getReservationsByDateRange(_start: Date, _end: Date): Promise<FspReservation[]> {
    throw new Error('LiveFspClient.getReservationsByDateRange not yet implemented — Phase 1')
  }
  getCancelledSince(_since: Date): Promise<FspReservation[]> {
    throw new Error('LiveFspClient.getCancelledSince not yet implemented — Phase 1')
  }
  getAvailableSlots(_opts: {
    instructorId?: string
    aircraftId?: string
    locationId?: string
    start: Date
    end: Date
  }): Promise<FspAvailabilitySlot[]> {
    throw new Error('LiveFspClient.getAvailableSlots not yet implemented — Phase 1')
  }
  getCivilTwilight(_locationId: string, _date: string): Promise<FspCivilTwilight> {
    throw new Error('LiveFspClient.getCivilTwilight not yet implemented — Phase 1')
  }
  getTrainingProgress(_studentId: string): Promise<FspTrainingProgress | null> {
    throw new Error('LiveFspClient.getTrainingProgress not yet implemented — Phase 1')
  }
  validateReservation(_params: FspReservationCreateParams): Promise<FspValidationResult> {
    throw new Error('LiveFspClient.validateReservation not yet implemented — Phase 1')
  }
  createReservation(
    _params: FspReservationCreateParams,
    _idempotencyKey: string,
  ): Promise<FspReservation> {
    throw new Error('LiveFspClient.createReservation not yet implemented — Phase 1')
  }
  createBatchReservations(
    _params: FspReservationCreateParams[],
    _idempotencyKey: string,
  ): Promise<FspReservation[]> {
    throw new Error('LiveFspClient.createBatchReservations not yet implemented — Phase 1')
  }
}
