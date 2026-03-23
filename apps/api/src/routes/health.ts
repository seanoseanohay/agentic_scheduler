import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async () => ({ status: 'ok', service: 'oneshot-api' }))

  app.get('/ready', async (_req, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`
      await app.redis.ping()
      return reply.send({ status: 'ready' })
    } catch (err) {
      return reply.status(503).send({ status: 'not_ready', error: String(err) })
    }
  })

  app.get('/live', async () => ({ status: 'live' }))
}
