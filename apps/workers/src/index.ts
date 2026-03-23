import { SchedulePoller } from './poller.js'
import { logger } from '@oneshot/observability'
import { prisma } from '@oneshot/persistence'

async function main() {
  logger.info('OneShot workers starting')

  await prisma.$connect()

  const poller = new SchedulePoller()
  await poller.start()

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully')
    poller.stop()
    await prisma.$disconnect()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    poller.stop()
    await prisma.$disconnect()
    process.exit(0)
  })
}

await main()
