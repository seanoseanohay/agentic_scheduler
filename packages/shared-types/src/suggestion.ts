/**
 * Suggestion domain types.
 *
 * A Suggestion is the core unit of the approval queue. It moves through a
 * deterministic state machine: pending → approved | rejected | expired.
 * No booking may occur without transitioning through 'approved'.
 */

import type { TenantContext } from './tenant.js'

export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'booked' | 'failed'

export type WorkflowType =
  | 'waitlist_fill'
  | 'cancellation_recovery'
  | 'discovery_flight'
  | 'next_lesson'

export interface Suggestion {
  id: string
  tenantContext: TenantContext
  workflowType: WorkflowType
  status: SuggestionStatus
  /** The FSP reservation that triggered this suggestion (if applicable) */
  triggerReservationId?: string
  /** Candidate slot being proposed */
  candidate: SuggestionCandidate
  /** Human-readable explanation for operator display */
  explanation: SuggestionExplanation
  /** Ranking score used to order suggestions in the queue */
  score: number
  /** Operator who acted on this suggestion */
  reviewedBy?: string
  reviewedAt?: Date
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface SuggestionCandidate {
  studentId: string
  instructorId: string
  aircraftId: string
  locationId: string
  startTime: Date
  endTime: Date
  lessonType: string
}

export interface SuggestionExplanation {
  triggerSummary: string
  constraintsSatisfied: string[]
  rankingReasons: string[]
  tradeoffs: string[]
}

/** Payload used when an operator approves a suggestion */
export interface ApprovalPayload {
  suggestionId: string
  operatorUserId: string
  notes?: string
}

/** Payload used when an operator rejects a suggestion */
export interface RejectionPayload {
  suggestionId: string
  operatorUserId: string
  reason?: string
}
