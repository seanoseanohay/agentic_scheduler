import { SchedulePoller } from './poller.js'
import { BookingConsumer } from './jobs/booking-consumer.js'
import { ExpiryJob } from './jobs/expiry.js'
import { logger } from '@oneshot/observability'
import { prisma } from '@oneshot/persistence'

async function main() {
  logger.info('OneShot workers starting')

  await prisma.$connect()

  const poller = new SchedulePoller()
  const expiryJob = new ExpiryJob()
  const bookingConsumer = new BookingConsumer(process.env['REDIS_URL'] ?? 'redis://localhost:6379')

  await poller.start()
  expiryJob.start()
  // Booking consumer blocks on Redis BRPOP — runs in background
  bookingConsumer.start().catch((err) => logger.error({ err }, 'Booking consumer crashed'))

  const shutdown = async () => {
    logger.info('Shutting down gracefully')
    poller.stop()
    expiryJob.stop()
    bookingConsumer.stop()
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', () => { void shutdown() })
  process.on('SIGINT', () => { void shutdown() })
}

await main()
