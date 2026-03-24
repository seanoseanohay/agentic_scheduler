/**
 * SSE (Server-Sent Events) stream endpoint for realtime queue updates.
 *
 * Operators subscribe to /api/v1/stream/queue and receive push events when
 * suggestions are created, approved, rejected, booked, or expired for
 * their tenant. This avoids polling from the operator console.
 *
 * Architecture decision: SSE over WebSocket for MVP because:
 *  - SSE is unidirectional (server→client) which matches the use case
 *  - No library dependency — plain HTTP streaming
 *  - Azure Container Apps supports streaming responses natively
 *
 * EventSource cannot set custom headers, so the JWT is accepted as ?token=
 * query param. The tenantHook handles this transparently.
 *
 * Each event is a JSON payload: { type, data }
 * The Redis pub/sub channel is 'oneshot:queue:{operatorId}'
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { Redis } from 'ioredis'

export async function streamRoutes(app: FastifyInstance) {
  app.get('/queue', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = request.tenantContext
    if (!ctx) return reply.unauthorized()

    // SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering
    reply.raw.flushHeaders()

    // Subscribe to this tenant's channel on a dedicated Redis subscriber connection
    const channel = `oneshot:queue:${ctx.operatorId}`
    const subscriber = (app.redis).duplicate()
    await subscriber.subscribe(channel)

    const send = (type: string, data: unknown) => {
      reply.raw.write(`event: ${type}\n`)
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // Heartbeat every 30s to keep the connection alive through proxies
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n')
    }, 30_000)

    send('connected', { operatorId: ctx.operatorId, channel })

    subscriber.on('message', (_ch: string, message: string) => {
      try {
        const parsed = JSON.parse(message) as { type: string; data: unknown }
        send(parsed.type, parsed.data)
      } catch {
        // Ignore malformed messages
      }
    })

    request.raw.on('close', () => {
      clearInterval(heartbeat)
      void subscriber.unsubscribe(channel).finally(() => subscriber.disconnect())
    })

    // Keep the handler alive — SSE responses never resolve normally
    await new Promise<void>((resolve) => {
      request.raw.on('close', resolve)
    })
  })
}

/**
 * Publish a queue event to a tenant's SSE channel.
 * Called by the booking orchestrator and workflow handlers after state changes.
 */
export async function publishQueueEvent(
  redisClient: Redis,
  operatorId: string,
  type: string,
  data: unknown,
): Promise<void> {
  const channel = `oneshot:queue:${operatorId}`
  await redisClient.publish(channel, JSON.stringify({ type, data }))
}
