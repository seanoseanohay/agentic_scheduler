import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@oneshot/persistence'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma
  }
}

async function prismaPlugin(app: FastifyInstance) {
  await prisma.$connect()
  app.decorate('prisma', prisma)
  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

export const registerPrisma = fp(prismaPlugin, { name: 'prisma' })
