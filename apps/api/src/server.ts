/**
 * Fastify application factory.
 *
 * Separation from index.ts allows the server to be imported in tests
 * without actually binding to a port.
 */

import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import sensible from '@fastify/sensible'
import { logger } from '@oneshot/observability'

import { registerRedis } from './plugins/redis.js'
import { registerPrisma } from './plugins/prisma.js'
import { tenantHook } from './hooks/tenant.js'
import { healthRoutes } from './routes/health.js'
import { suggestionRoutes } from './routes/suggestions.js'
import { tenantRoutes } from './routes/tenants.js'
import { streamRoutes } from './routes/stream.js'

export async function buildServer() {
  const app = Fastify({
    logger,
    trustProxy: true,
  })

  // ── Core plugins ────────────────────────────────────────────────────────────
  await app.register(sensible)
  await app.register(cors, {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  })
  await app.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? 'local-dev-secret',
  })

  // ── Infrastructure plugins ───────────────────────────────────────────────
  await app.register(registerRedis)
  await app.register(registerPrisma)

  // ── Tenant isolation hook — runs before every authenticated route ─────────
  app.addHook('onRequest', tenantHook)

  // ── Routes ──────────────────────────────────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/health' })
  await app.register(suggestionRoutes, { prefix: '/api/v1/suggestions' })
  await app.register(tenantRoutes, { prefix: '/api/v1/tenants' })
  await app.register(streamRoutes, { prefix: '/api/v1/stream' })

  return app
}
