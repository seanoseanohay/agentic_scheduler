/**
 * Workflow run types.
 *
 * A WorkflowRun represents one execution of a trigger-to-suggestion pipeline.
 * Runs are idempotent — re-triggering with the same triggerKey produces no duplicate.
 */

import type { TenantContext } from './tenant.js'
import type { WorkflowType } from './suggestion.js'

export type WorkflowRunStatus = 'running' | 'completed' | 'failed' | 'skipped'

export interface WorkflowRun {
  id: string
  tenantContext: TenantContext
  workflowType: WorkflowType
  status: WorkflowRunStatus
  /** Deduplication key — e.g. "cancellation:{reservationId}" */
  triggerKey: string
  triggerPayload: unknown
  suggestionsCreated: number
  errorMessage?: string
  startedAt: Date
  completedAt?: Date
}
