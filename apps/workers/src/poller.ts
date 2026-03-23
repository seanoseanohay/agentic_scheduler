/**
 * FSP Schedule Poller.
 *
 * Polls FSP on a configurable interval (default 30s per requirements.md §4).
 * Detects changes and dispatches to the appropriate workflow handler.
 *
 * Design:
 *  - One poller instance per tenant (safe for pilot scale; scale-out later)
 *  - Each poll tick is idempotent — re-running produces no duplicates (triggerKey uniqueness)
 *  - Errors in one tenant's poll do not affect other tenants
 */

import { listActiveTenants } from '@oneshot/persistence'
import { createFspClient } from '@oneshot/fsp-adapter'
import { tenantLogger } from '@oneshot/observability'
import type { Tenant, TenantContext } from '@oneshot/shared-types'
import { handleCancellation } from './handlers/cancellation.js'
import { handleWaitlistFill } from './handlers/waitlist.js'

const POLL_INTERVAL_MS = Number(process.env['POLL_INTERVAL_SECONDS'] ?? 30) * 1000

export class SchedulePoller {
  private timers: NodeJS.Timeout[] = []
  private lastPollAt: Map<string, Date> = new Map()

  async start() {
    const tenants = await listActiveTenants()
    const log = tenantLogger('system', 'poller')
    log.info({ tenantCount: tenants.length }, 'Starting schedule poller')

    for (const tenant of tenants) {
      // Stagger tenant polls by 500ms to avoid thundering herd
      const delay = this.timers.length * 500
      const timer = setTimeout(() => this.pollTenant(tenant), delay)
      this.timers.push(timer)
    }
  }

  stop() {
    for (const t of this.timers) clearTimeout(t)
    this.timers = []
  }

  private async pollTenant(tenant: Tenant) {
    const log = tenantLogger(tenant.operatorId, 'poller')
    const ctx: TenantContext = { tenantId: tenant.id, operatorId: tenant.operatorId }

    try {
      const fsp = await createFspClient({
        baseUrl: process.env['FSP_BASE_URL'] ?? '',
        apiKey: process.env['FSP_API_KEY'] ?? '',
        operatorId: tenant.operatorId,
      })

      const since = this.lastPollAt.get(tenant.id) ?? new Date(Date.now() - POLL_INTERVAL_MS)
      this.lastPollAt.set(tenant.id, new Date())

      // Detect cancellations
      const cancelled = await fsp.getCancelledSince(since)
      for (const reservation of cancelled) {
        await handleCancellation(ctx, reservation, fsp, tenant).catch((err) =>
          log.error({ err, reservationId: reservation.reservationId }, 'Cancellation handler failed'),
        )
      }

      // Check for open waitlist opportunities (simplified for Phase 0)
      await handleWaitlistFill(ctx, fsp, tenant).catch((err) =>
        log.error({ err }, 'Waitlist handler failed'),
      )
    } catch (err) {
      log.error({ err }, 'Tenant poll failed')
    } finally {
      // Schedule next poll regardless of success/failure
      const timer = setTimeout(() => this.pollTenant(tenant), POLL_INTERVAL_MS)
      this.timers.push(timer)
    }
  }
}
