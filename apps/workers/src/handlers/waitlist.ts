/**
 * Waitlist Fill handler — stub for Phase 0.
 *
 * TODO (Phase 3):
 *  - Detect newly opened slots from FSP
 *  - Fetch waitlist students from FSP
 *  - Run constraints + ranking
 *  - Emit suggestions
 */

import type { TenantContext, Tenant } from '@oneshot/shared-types'
import type { IFspClient } from '@oneshot/fsp-adapter'
import { tenantLogger } from '@oneshot/observability'

export async function handleWaitlistFill(
  ctx: TenantContext,
  _fsp: IFspClient,
  _tenant: Tenant,
): Promise<void> {
  const log = tenantLogger(ctx.operatorId, 'waitlist_fill')
  log.info('Waitlist fill handler — Phase 0 stub, not yet implemented')
}
