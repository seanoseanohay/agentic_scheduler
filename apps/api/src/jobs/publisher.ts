/**
 * Job publisher — pushes booking jobs onto the Redis queue consumed by workers.
 *
 * Using a Redis list (LPUSH/BRPOP) as a lightweight job queue keeps the
 * architecture simple for pilot scale without requiring a full queue broker.
 * The queue key is 'oneshot:booking_jobs'.
 */

import type { TenantContext } from '@oneshot/shared-types'
import { logger } from '@oneshot/observability'

export interface BookingJobPayload {
  tenantId: string
  operatorId: string
  suggestionId: string
  approvedBy: string
  enqueuedAt: string
}

const QUEUE_KEY = 'oneshot:booking_jobs'

export async function publishBookingJob(
  ctx: TenantContext,
  suggestionId: string,
  approvedBy: string,
): Promise<void> {
  const payload: BookingJobPayload = {
    tenantId: ctx.tenantId,
    operatorId: ctx.operatorId,
    suggestionId,
    approvedBy,
    enqueuedAt: new Date().toISOString(),
  }

  try {
    // Access the Redis client registered on the Fastify instance
    // The redis plugin decorates fastify with `fastify.redis`
    const { redis } = await import('../plugins/redis.js')
    await redis.lpush(QUEUE_KEY, JSON.stringify(payload))
    logger.info({ suggestionId, operatorId: ctx.operatorId }, 'Booking job enqueued')
  } catch (err) {
    // Non-fatal — log and continue. The suggestion is already in 'approved' state
    // so the worker can pick it up via a reconciliation scan.
    logger.error({ err, suggestionId }, 'Failed to publish booking job to Redis')
  }
}
