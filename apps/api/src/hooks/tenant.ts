/**
 * Tenant isolation hook.
 *
 * Extracts operatorId from the verified JWT and attaches it to request context.
 * Every downstream route handler reads from request.tenantContext — never from
 * user-supplied query/body parameters — so a caller cannot impersonate another tenant.
 *
 * This is the enforcement point for constraints.md invariant #7.
 *
 * Routes may opt out of auth by setting { config: { skipAuth: true } } in their
 * route definition (used for the public discovery intake endpoint).
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import type { TenantContext } from '@oneshot/shared-types'
import { getTenantByOperatorId } from '@oneshot/persistence'

declare module 'fastify' {
  interface FastifyRequest {
    tenantContext?: TenantContext
  }
  interface FastifyContextConfig {
    skipAuth?: boolean
  }
}

const PUBLIC_PATHS = new Set(['/health', '/health/ready', '/health/live'])

export async function tenantHook(request: FastifyRequest, reply: FastifyReply) {
  if (PUBLIC_PATHS.has(request.url)) return

  // Route-level opt-out for public endpoints (e.g. discovery prospect intake POST)
  if (request.routeOptions?.config?.skipAuth) return

  try {
    // EventSource (SSE) cannot set Authorization headers — accept ?token= as fallback.
    // The token is verified with the same secret; only the transport differs.
    const queryToken = (request.query as { token?: string }).token
    if (queryToken && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${queryToken}`
    }
    await request.jwtVerify()
  } catch {
    return reply.unauthorized('Invalid or missing authentication token')
  }

  const payload = request.user as { operatorId?: string; sub?: string }
  const operatorId = payload.operatorId

  if (!operatorId) {
    return reply.unauthorized('Token is missing operatorId claim')
  }

  const tenant = await getTenantByOperatorId(operatorId)
  if (!tenant) {
    return reply.forbidden('Operator not registered in OneShot')
  }

  request.tenantContext = { tenantId: tenant.id, operatorId }
}
