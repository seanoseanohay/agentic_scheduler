/**
 * Tenant repository.
 * All queries are scoped to a single operatorId — no cross-tenant reads.
 */

import type { Tenant as PrismaTenant } from '@prisma/client'
import type { Tenant } from '@oneshot/shared-types'
import { prisma } from '../client.js'

export async function getTenantByOperatorId(operatorId: string): Promise<Tenant | null> {
  const row = await prisma.tenant.findUnique({ where: { operatorId } })
  return row ? mapTenant(row) : null
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const row = await prisma.tenant.findUnique({ where: { id } })
  return row ? mapTenant(row) : null
}

export async function listActiveTenants(): Promise<Tenant[]> {
  const rows = await prisma.tenant.findMany({ where: { active: true } })
  return rows.map(mapTenant)
}

function mapTenant(row: PrismaTenant): Tenant {
  return {
    id: row.id,
    operatorId: row.operatorId,
    name: row.name,
    timezone: row.timezone,
    rankingWeights: row.rankingWeights as unknown as Tenant['rankingWeights'],
    searchWindowDays: row.searchWindowDays,
    continuityPreference: row.continuityPreference as Tenant['continuityPreference'],
    notificationPolicy: row.notificationPolicy as unknown as Tenant['notificationPolicy'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
