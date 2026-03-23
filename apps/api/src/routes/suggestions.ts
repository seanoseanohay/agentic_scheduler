/**
 * Suggestion queue routes.
 *
 * All routes enforce tenant context from request.tenantContext — operatorId
 * is never read from query params or body.
 */

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  listPendingSuggestions,
  updateSuggestionStatus,
  getSuggestionById,
  writeAuditEvent,
} from '@oneshot/persistence'

const approveBody = z.object({
  notes: z.string().optional(),
})

const rejectBody = z.object({
  reason: z.string().optional(),
})

export async function suggestionRoutes(app: FastifyInstance) {
  // GET /api/v1/suggestions — list pending suggestions for the operator queue
  app.get('/', async (request, reply) => {
    const ctx = request.tenantContext
    if (!ctx) return reply.unauthorized()

    const suggestions = await listPendingSuggestions(ctx)
    return { suggestions }
  })

  // GET /api/v1/suggestions/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const ctx = request.tenantContext
    if (!ctx) return reply.unauthorized()

    const suggestion = await getSuggestionById(ctx, request.params.id)
    if (!suggestion) return reply.notFound()
    return { suggestion }
  })

  // POST /api/v1/suggestions/:id/approve
  app.post<{ Params: { id: string } }>('/:id/approve', async (request, reply) => {
    const ctx = request.tenantContext
    if (!ctx) return reply.unauthorized()

    const parsed = approveBody.safeParse(request.body)
    if (!parsed.success) return reply.badRequest('Invalid request body')

    const actor = (request.user as { sub?: string }).sub ?? 'unknown'

    const suggestion = await updateSuggestionStatus(
      ctx,
      request.params.id,
      'approved',
      actor,
      parsed.data.notes,
    )

    await writeAuditEvent(ctx, {
      eventType: 'suggestion.approved',
      actorId: actor,
      actorType: 'operator',
      entityType: 'suggestion',
      entityId: request.params.id,
      payload: { notes: parsed.data.notes },
    })

    return { suggestion }
  })

  // POST /api/v1/suggestions/:id/reject
  app.post<{ Params: { id: string } }>('/:id/reject', async (request, reply) => {
    const ctx = request.tenantContext
    if (!ctx) return reply.unauthorized()

    const parsed = rejectBody.safeParse(request.body)
    if (!parsed.success) return reply.badRequest('Invalid request body')

    const actor = (request.user as { sub?: string }).sub ?? 'unknown'

    const suggestion = await updateSuggestionStatus(
      ctx,
      request.params.id,
      'rejected',
      actor,
      parsed.data.reason,
    )

    await writeAuditEvent(ctx, {
      eventType: 'suggestion.rejected',
      actorId: actor,
      actorType: 'operator',
      entityType: 'suggestion',
      entityId: request.params.id,
      payload: { reason: parsed.data.reason },
    })

    return { suggestion }
  })
}
