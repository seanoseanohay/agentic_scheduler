/**
 * Audit repository — append-only.
 * No update or delete methods are exposed by design.
 */

import type { AuditEvent, TenantContext } from '@oneshot/shared-types'
import { prisma } from '../client.js'

export async function writeAuditEvent(
  ctx: TenantContext,
  event: Omit<AuditEvent, 'id' | 'tenantContext' | 'createdAt'>,
): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      operatorId: ctx.operatorId,
      eventType: event.eventType,
      actorId: event.actorId,
      actorType: event.actorType,
      entityType: event.entityType,
      entityId: event.entityId,
      payload: event.payload as unknown as import('@prisma/client').Prisma.InputJsonValue,
    },
  })
}

export async function listAuditEvents(
  ctx: TenantContext,
  opts: { entityType?: string; entityId?: string; limit?: number } = {},
): Promise<AuditEvent[]> {
  const rows = await prisma.auditEvent.findMany({
    where: {
      operatorId: ctx.operatorId,
      ...(opts.entityType ? { entityType: opts.entityType } : {}),
      ...(opts.entityId ? { entityId: opts.entityId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 100,
  })

  return rows.map((r) => ({
    id: r.id,
    tenantContext: ctx,
    eventType: r.eventType as AuditEvent['eventType'],
    actorId: r.actorId ?? undefined,
    actorType: r.actorType as AuditEvent['actorType'],
    entityType: r.entityType,
    entityId: r.entityId,
    payload: r.payload,
    createdAt: r.createdAt,
  }))
}
