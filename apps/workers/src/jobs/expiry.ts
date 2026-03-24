/**
 * Expiry job — expires pending suggestions past their expiresAt time.
 *
 * Runs on a configurable interval (default 5 minutes).
 * Writes audit events for all expired suggestions so the audit trail is complete.
 */

import { expireStaleSuggestions, writeAuditEvent, listActiveTenants } from '@oneshot/persistence'
import { logger } from '@oneshot/observability'

const EXPIRY_INTERVAL_MS = Number(process.env['EXPIRY_INTERVAL_SECONDS'] ?? 300) * 1000

export class ExpiryJob {
  private timer: NodeJS.Timeout | null = null

  start() {
    logger.info('Expiry job starting')
    this.timer = setInterval(() => { void this.run() }, EXPIRY_INTERVAL_MS)
    // Also run immediately on startup
    this.run().catch((err) => logger.error({ err }, 'Initial expiry run failed'))
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async run() {
    try {
      const count = await expireStaleSuggestions(new Date())
      if (count > 0) {
        logger.info({ count }, 'Expired stale suggestions')

        // Emit a system audit event per tenant for expired suggestions
        const tenants = await listActiveTenants()
        for (const tenant of tenants) {
          const ctx = { tenantId: tenant.id, operatorId: tenant.operatorId }
          await writeAuditEvent(ctx, {
            eventType: 'suggestion.expired',
            actorType: 'system',
            entityType: 'suggestion_batch',
            entityId: 'expiry_run',
            payload: { expiredCount: count, runAt: new Date().toISOString() },
          }).catch((err) => logger.error({ err, operatorId: tenant.operatorId }, 'Audit write failed'))
        }
      }
    } catch (err) {
      logger.error({ err }, 'Expiry job failed')
    }
  }
}
