/**
 * Tenant configuration routes.
 * Only admin-role users may update tenant config.
 */

import type { FastifyInstance } from 'fastify'
import { getTenantById } from '@oneshot/persistence'

export async function tenantRoutes(app: FastifyInstance) {
  // GET /api/v1/tenants/me — returns the calling tenant's config
  app.get('/me', async (request, reply) => {
    const ctx = request.tenantContext
    if (!ctx) return reply.unauthorized()

    const tenant = await getTenantById(ctx.tenantId)
    if (!tenant) return reply.notFound()
    return { tenant }
  })
}
