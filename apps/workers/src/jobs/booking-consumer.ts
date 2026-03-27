/**
 * Booking job consumer.
 *
 * Runs a BRPOP loop on the 'oneshot:booking_jobs' Redis list.
 * Each job triggers the booking orchestrator for the given suggestion.
 *
 * Design invariants:
 *  - BRPOP is blocking — no busy-wait
 *  - Jobs are processed one at a time per consumer instance
 *  - Failed jobs are logged with full context; the suggestion remains in
 *    'approved' state so the reconciliation scanner can retry
 */

import { Redis } from 'ioredis'
import { orchestrateBooking } from '../booking/orchestrator.js'
import { getTenantByOperatorId } from '@oneshot/persistence'
import { logger } from '@oneshot/observability'
import type { BookingJobPayload } from './types.js'

const QUEUE_KEY = 'oneshot:booking_jobs'
const BLOCK_TIMEOUT_S = 5 // unblock every 5s to allow clean shutdown

export class BookingConsumer {
  private running = false
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null })
  }

  async start() {
    this.running = true
    logger.info('Booking consumer starting')
    while (this.running) {
      await this.processNext()
    }
  }

  stop() {
    this.running = false
    this.redis.disconnect()
  }

  private async processNext() {
    try {
      const result = await this.redis.brpop(QUEUE_KEY, BLOCK_TIMEOUT_S)
      if (!result) return // timeout — loop again

      const [, raw] = result
      const job = JSON.parse(raw) as BookingJobPayload

      await this.processJob(job)
    } catch (err) {
      if (this.running) {
        logger.error({ err }, 'Booking consumer error')
        await new Promise((r) => setTimeout(r, 1000)) // brief backoff on error
      }
    }
  }

  private async processJob(job: BookingJobPayload) {
    const log = logger.child({ suggestionId: job.suggestionId, operatorId: job.operatorId })
    log.info('Processing booking job')

    const tenant = await getTenantByOperatorId(job.operatorId)
    if (!tenant) {
      log.error('Tenant not found for booking job')
      return
    }

    const ctx = { tenantId: tenant.id, operatorId: job.operatorId }
    const result = await orchestrateBooking(ctx, job.suggestionId, job.approvedBy)

    if (result.success) {
      log.info({ fspReservationId: result.fspReservationId }, 'Booking job completed')
    } else {
      log.warn(
        { error: result.error, validationErrors: result.validationErrors },
        'Booking job failed',
      )
    }
  }
}
