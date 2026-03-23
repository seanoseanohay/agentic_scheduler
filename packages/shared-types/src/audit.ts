/**
 * Audit event types.
 *
 * All audit records are immutable. Once written they must not be updated or deleted.
 * Retention: minimum 1 year (constraints.md invariant 13).
 */

import type { TenantContext } from './tenant.js'

export type AuditEventType =
  | 'suggestion.created'
  | 'suggestion.approved'
  | 'suggestion.rejected'
  | 'suggestion.expired'
  | 'booking.attempted'
  | 'booking.succeeded'
  | 'booking.failed'
  | 'notification.sent'
  | 'notification.failed'
  | 'tenant.created'
  | 'tenant.updated'
  | 'admin.action'

export interface AuditEvent {
  id: string
  tenantContext: TenantContext
  eventType: AuditEventType
  actorId?: string
  actorType: 'system' | 'operator' | 'admin'
  entityType: string
  entityId: string
  payload: unknown
  createdAt: Date
}
