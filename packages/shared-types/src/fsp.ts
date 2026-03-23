/**
 * FSP (Flight Schedule Pro) domain types.
 *
 * These are the normalised representations of data returned by the FSP adapter.
 * FSP remains the source of truth — these types must not diverge from what FSP returns.
 */

export interface FspOperator {
  operatorId: string
  name: string
  timezone: string
}

export interface FspStudent {
  studentId: string
  operatorId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  totalFlightHours: number
  lastFlightDate?: Date
  nextScheduledFlightDate?: Date
}

export interface FspInstructor {
  instructorId: string
  operatorId: string
  firstName: string
  lastName: string
  /** FAA certificate ratings held */
  ratings: string[]
  /** Aircraft type codes the instructor is qualified to fly */
  qualifiedAircraftTypes: string[]
}

export interface FspAircraft {
  aircraftId: string
  operatorId: string
  tailNumber: string
  aircraftType: string
  /** FAA category/class (e.g. ASEL, AMEL) */
  category: string
}

export interface FspLocation {
  locationId: string
  operatorId: string
  name: string
  icao: string
  timezone: string
}

export interface FspReservation {
  reservationId: string
  operatorId: string
  studentId: string
  instructorId: string
  aircraftId: string
  locationId: string
  startTime: Date
  endTime: Date
  lessonType: string
  status: FspReservationStatus
}

export type FspReservationStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export interface FspAvailabilitySlot {
  startTime: Date
  endTime: Date
  instructorId: string
  aircraftId: string
  locationId: string
}

export interface FspCivilTwilight {
  date: string
  locationId: string
  civilSunrise: Date
  civilSunset: Date
}

export interface FspTrainingProgress {
  studentId: string
  operatorId: string
  currentStage: string
  nextRequiredLesson: string
  completedLessons: string[]
  hoursRequired: number
  hoursFlown: number
}

export interface FspValidationResult {
  valid: boolean
  errors: string[]
}

/** Parameters for creating a single reservation in FSP */
export interface FspReservationCreateParams {
  operatorId: string
  studentId: string
  instructorId: string
  aircraftId: string
  locationId: string
  startTime: Date
  endTime: Date
  lessonType: string
}
