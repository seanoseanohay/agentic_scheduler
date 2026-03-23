/**
 * FSP Schedule Poller.
 *
 * Polls FSP on a configurable interval (default 30s per requirements.md §4).
 * Detects changes and dispatches to all four workflow handlers:
 *  - cancellation_recovery: processes newly cancelled reservations
 *  - waitlist_fill: finds open slots and proposes eligible students
 *  - next_lesson: checks training progression and proposes next lessons
 *  - discovery_flight: processes pending discovery prospects
 *
 * Design invariants:
 *  - One poller instance per tenant (safe for pilot scale)
 *  - Each poll tick is idempotent — triggerKey uniqueness prevents duplicates
 *  - Errors in one tenant's poll do not affect other tenants
 *  - Feature flags gate per-workflow execution per tenant
 */

import { listActiveTenants, prisma } from '@oneshot/persistence'
import { createFspClient } from '@oneshot/fsp-adapter'
import { tenantLogger } from '@oneshot/observability'
import type { Tenant, TenantContext } from '@oneshot/shared-types'
import { handleCancellation } from './handlers/cancellation.js'
import { handleWaitlistFill } from './handlers/waitlist.js'
import { handleNextLesson } from './handlers/next-lesson.js'
import { handleDiscoveryFlights } from './handlers/discovery.js'

const POLL_INTERVAL_MS = Number(process.env['POLL_INTERVAL_SECONDS'] ?? 30) * 1000

export class SchedulePoller {
  private timers: NodeJS.Timeout[] = []
  private lastPollAt: Map<string, Date> = new Map()

  async start() {
    const tenants = await listActiveTenants()
    const log = tenantLogger('system', 'poller')
    log.info({ tenantCount: tenants.length }, 'Starting schedule poller')

    for (const tenant of tenants) {
      // Stagger tenant polls by 500ms to avoid thundering herd on startup
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

      // Load feature flags for this tenant
      const flags = await this.loadFlags(tenant.id)

      // ── Cancellation recovery ────────────────────────────────────────────
      if (flags.has('cancellation_recovery')) {
        const cancelled = await fsp.getCancelledSince(since)
        for (const reservation of cancelled) {
          await handleCancellation(ctx, reservation, fsp, tenant).catch((err) =>
            log.error({ err, reservationId: reservation.reservationId }, 'Cancellation handler failed'),
          )
        }
      }

      // ── Waitlist fill ────────────────────────────────────────────────────
      if (flags.has('waitlist_fill')) {
        await handleWaitlistFill(ctx, fsp, tenant).catch((err) =>
          log.error({ err }, 'Waitlist handler failed'),
        )
      }

      // ── Next lesson sequencing ────────────────────────────────────────────
      if (flags.has('next_lesson')) {
        await handleNextLesson(ctx, fsp, tenant).catch((err) =>
          log.error({ err }, 'Next lesson handler failed'),
        )
      }

      // ── Discovery flights ─────────────────────────────────────────────────
      if (flags.has('discovery_flight')) {
        await handleDiscoveryFlights(ctx, fsp, tenant).catch((err) =>
          log.error({ err }, 'Discovery flight handler failed'),
        )
      }
    } catch (err) {
      log.error({ err }, 'Tenant poll failed')
    } finally {
      // Always reschedule — errors in one cycle don't stop future polls
      const timer = setTimeout(() => this.pollTenant(tenant), POLL_INTERVAL_MS)
      this.timers.push(timer)
    }
  }

  private async loadFlags(tenantId: string): Promise<Set<string>> {
    const rows = await prisma.featureFlag.findMany({
      where: { tenantId, enabled: true },
      select: { flagKey: true },
    })
    return new Set(rows.map((r) => r.flagKey))
  }
}
