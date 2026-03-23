/**
 * Tenant domain types.
 *
 * Every object in OneShot that crosses service boundaries must carry operatorId.
 * Tenant isolation is enforced by convention here and by query scoping in persistence.
 */

export interface Tenant {
  id: string
  /** FSP operator identifier — the canonical isolation key */
  operatorId: string
  name: string
  timezone: string
  rankingWeights: RankingWeights
  searchWindowDays: number
  continuityPreference: ContinuityPreference
  notificationPolicy: NotificationPolicy
  createdAt: Date
  updatedAt: Date
}

export interface RankingWeights {
  /** Hours since the student last flew (higher = prioritize students who have waited longer) */
  timeSinceLastFlight: number
  /** Hours until their next scheduled flight (higher = prioritize students with no upcoming flight) */
  timeUntilNextFlight: number
  /** Total logged flight hours (higher = prioritize lower-hours students for training continuity) */
  totalHours: number
  /** Weight given to booking the same instructor as before */
  instructorContinuity: number
  /** Weight given to booking the same aircraft type as before */
  aircraftContinuity: number
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  timeSinceLastFlight: 0.35,
  timeUntilNextFlight: 0.25,
  totalHours: 0.15,
  instructorContinuity: 0.15,
  aircraftContinuity: 0.1,
}

export type ContinuityPreference = 'strict' | 'preferred' | 'none'

export interface NotificationPolicy {
  emailEnabled: boolean
  smsEnabled: boolean
  offerExpiryHours: number
  /** Sender name shown to recipients */
  brandName: string
}

/** Thin tenant context object passed through every service call */
export interface TenantContext {
  tenantId: string
  operatorId: string
}
