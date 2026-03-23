/**
 * Suggestion repository.
 * Every query is scoped to operatorId to enforce tenant isolation.
 */

import type { Suggestion as PrismaSuggestion, Prisma } from '@prisma/client'
import type { Suggestion, SuggestionStatus, TenantContext } from '@oneshot/shared-types'
import { prisma } from '../client.js'

export async function createSuggestion(
  ctx: TenantContext,
  data: Omit<Suggestion, 'id' | 'tenantContext' | 'createdAt' | 'updatedAt'>,
): Promise<Suggestion> {
  const row = await prisma.suggestion.create({
    data: {
      tenantId: ctx.tenantId,
      operatorId: ctx.operatorId,
      workflowType: data.workflowType,
      status: data.status,
      triggerReservationId: data.triggerReservationId,
      studentId: data.candidate.studentId,
      instructorId: data.candidate.instructorId,
      aircraftId: data.candidate.aircraftId,
      locationId: data.candidate.locationId,
      startTime: data.candidate.startTime,
      endTime: data.candidate.endTime,
      lessonType: data.candidate.lessonType,
      explanation: data.explanation as unknown as Prisma.InputJsonValue,
      score: data.score,
      expiresAt: data.expiresAt,
    },
  })
  return mapSuggestion(row, ctx)
}

export async function getSuggestionById(
  ctx: TenantContext,
  id: string,
): Promise<Suggestion | null> {
  const row = await prisma.suggestion.findFirst({
    where: { id, operatorId: ctx.operatorId },
  })
  return row ? mapSuggestion(row, ctx) : null
}

export async function listPendingSuggestions(ctx: TenantContext): Promise<Suggestion[]> {
  const rows = await prisma.suggestion.findMany({
    where: { operatorId: ctx.operatorId, status: 'pending' },
    orderBy: { score: 'desc' },
  })
  return rows.map((r) => mapSuggestion(r, ctx))
}

export async function updateSuggestionStatus(
  ctx: TenantContext,
  id: string,
  status: SuggestionStatus,
  reviewedBy?: string,
  reviewNotes?: string,
): Promise<Suggestion> {
  const row = await prisma.suggestion.update({
    where: { id },
    data: {
      status,
      ...(reviewedBy !== undefined ? { reviewedBy } : {}),
      ...(reviewNotes !== undefined ? { reviewNotes } : {}),
      ...(reviewedBy ? { reviewedAt: new Date() } : {}),
    },
  })
  // Enforce that updated suggestion belongs to this tenant
  if (row.operatorId !== ctx.operatorId) {
    throw new Error('Tenant isolation violation: suggestion does not belong to this operator')
  }
  return mapSuggestion(row, ctx)
}

export async function expireStaleSuggestions(before: Date): Promise<number> {
  const result = await prisma.suggestion.updateMany({
    where: { status: 'pending', expiresAt: { lt: before } },
    data: { status: 'expired' },
  })
  return result.count
}

function mapSuggestion(row: PrismaSuggestion, ctx: TenantContext): Suggestion {
  const base: Suggestion = {
    id: row.id,
    tenantContext: ctx,
    workflowType: row.workflowType as Suggestion['workflowType'],
    status: row.status as Suggestion['status'],
    candidate: {
      studentId: row.studentId,
      instructorId: row.instructorId,
      aircraftId: row.aircraftId,
      locationId: row.locationId,
      startTime: row.startTime,
      endTime: row.endTime,
      lessonType: row.lessonType,
    },
    explanation: row.explanation as unknown as Suggestion['explanation'],
    score: row.score,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
  if (row.triggerReservationId) base.triggerReservationId = row.triggerReservationId
  if (row.reviewedBy) base.reviewedBy = row.reviewedBy
  if (row.reviewedAt) base.reviewedAt = row.reviewedAt
  return base
}
