import fp from 'fastify-plugin'
import { Redis } from 'ioredis'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
}

// Singleton Redis client accessible outside Fastify context (e.g. job publisher)
export const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

async function redisPlugin(app: FastifyInstance) {
  await redis.connect().catch(() => {
    // Already connected if singleton was used first — ignore ECONNRESET on re-connect
  })

  app.decorate('redis', redis)

  app.addHook('onClose', async () => {
    await redis.quit()
  })
}

export const registerRedis = fp(redisPlugin, { name: 'redis' })
