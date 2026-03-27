/**
 * Suggestion queue routes.
 *
 * All routes enforce tenant context from request.tenantContext — operatorId
 * is never read from query params or body.
 *
 * Phase 1: approve triggers booking orchestration via Redis job queue.
 * Phase 2: bulk approve, queue filtering by workflowType/status.
 */

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  listSuggestions,
  updateSuggestionStatus,
  getSuggestionById,
  writeAuditEvent,
} from '@oneshot/persistence'
import { publishBookingJob } from '../jobs/publisher.js'

const approveBody = z.object({
  notes: z.string().optional(),
})

const rejectBody = z.object({
  reason: z.string().optional(),
})

const bulkApproveBody = z.object({
  ids: z.array(z.string()).min(1).max(50),
  notes: z.string().optional(),
})

const listQuery = z.object({
  workflowType: z
    .enum(['waitlist_fill', 'cancellation_recovery', 'discovery_flight', 'next_lesson'])
    .optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'expired', 'booked', 'failed']).optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
})

export async function suggestionRoutes(app: FastifyInstance) {
  // GET /api/v1/suggestions — filterable queue
  app.get('/', async (request, reply) => {
    const ctx = request.tenantContext
    if (!ctx) return reply.unauthorized()

    const parsed = listQuery.safeParse(request.query)
    if (!parsed.success) return reply.badRequest('Invalid query params')

    const suggestions = await listSuggestions(ctx, {
      workflowType: parsed.data.workflowType,
      status: parsed.data.status ?? 'pending',
      limit: parsed.data.limit ?? 100,
      offset: parsed.data.offset ?? 0,
    })
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

    // Enqueue booking orchestration — validates + books in FSP asynchronously
    await publishBookingJob(ctx, request.params.id, actor)

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

  // POST /api/v1/suggestions/bulk-approve
  // Each suggestion is independently validated — a single failure doesn't block the batch.
  app.post('/bulk-approve', async (request, reply) => {
    const ctx = request.tenantContext
    if (!ctx) return reply.unauthorized()

    const parsed = bulkApproveBody.safeParse(request.body)
    if (!parsed.success) return reply.badRequest('Invalid request body')

    const actor = (request.user as { sub?: string }).sub ?? 'unknown'
    const results: { id: string; status: 'approved' | 'error'; error?: string }[] = []

    for (const id of parsed.data.ids) {
      try {
        const suggestion = await getSuggestionById(ctx, id)
        if (!suggestion) {
          results.push({ id, status: 'error', error: 'not_found' })
          continue
        }
        if (suggestion.status !== 'pending') {
          results.push({ id, status: 'error', error: `not_pending:${suggestion.status}` })
          continue
        }
        if (suggestion.expiresAt < new Date()) {
          results.push({ id, status: 'error', error: 'expired' })
          continue
        }

        await updateSuggestionStatus(ctx, id, 'approved', actor, parsed.data.notes)
        await writeAuditEvent(ctx, {
          eventType: 'suggestion.approved',
          actorId: actor,
          actorType: 'operator',
          entityType: 'suggestion',
          entityId: id,
          payload: { notes: parsed.data.notes, bulk: true },
        })
        await publishBookingJob(ctx, id, actor)
        results.push({ id, status: 'approved' })
      } catch (err) {
        results.push({ id, status: 'error', error: String(err) })
      }
    }

    return { results }
  })
}
