/**
 * Database seed — creates two demo tenants for local development.
 * Run: pnpm db:seed
 */

import { PrismaClient } from '@prisma/client'
import type { RankingWeights, NotificationPolicy } from '@oneshot/shared-types'

const prisma = new PrismaClient()

const defaultWeights: RankingWeights = {
  timeSinceLastFlight: 0.35,
  timeUntilNextFlight: 0.25,
  totalHours: 0.15,
  instructorContinuity: 0.15,
  aircraftContinuity: 0.1,
}

const defaultNotificationPolicy: NotificationPolicy = {
  emailEnabled: true,
  smsEnabled: false,
  offerExpiryHours: 24,
  brandName: 'Demo Flight School',
}

async function main() {
  console.log('Seeding database...')

  const alpha = await prisma.tenant.upsert({
    where: { operatorId: 'demo-operator-alpha' },
    update: {},
    create: {
      operatorId: 'demo-operator-alpha',
      name: 'Alpha Flight Academy',
      timezone: 'America/Chicago',
      rankingWeights: defaultWeights,
      searchWindowDays: 14,
      continuityPreference: 'preferred',
      notificationPolicy: { ...defaultNotificationPolicy, brandName: 'Alpha Flight Academy' },
      users: {
        create: [
          {
            email: 'scheduler@alpha.local',
            name: 'Alpha Scheduler',
            role: 'scheduler',
          },
          {
            email: 'admin@alpha.local',
            name: 'Alpha Admin',
            role: 'admin',
          },
        ],
      },
      featureFlags: {
        create: [
          { flagKey: 'waitlist_fill', enabled: true },
          { flagKey: 'cancellation_recovery', enabled: true },
          { flagKey: 'discovery_flight', enabled: true },
          { flagKey: 'next_lesson', enabled: false },
        ],
      },
    },
  })

  const bravo = await prisma.tenant.upsert({
    where: { operatorId: 'demo-operator-bravo' },
    update: {},
    create: {
      operatorId: 'demo-operator-bravo',
      name: 'Bravo Aero Club',
      timezone: 'America/New_York',
      rankingWeights: defaultWeights,
      searchWindowDays: 7,
      continuityPreference: 'strict',
      notificationPolicy: {
        ...defaultNotificationPolicy,
        smsEnabled: true,
        brandName: 'Bravo Aero Club',
      },
      users: {
        create: [
          {
            email: 'scheduler@bravo.local',
            name: 'Bravo Scheduler',
            role: 'scheduler',
          },
        ],
      },
      featureFlags: {
        create: [
          { flagKey: 'waitlist_fill', enabled: true },
          { flagKey: 'cancellation_recovery', enabled: true },
          { flagKey: 'discovery_flight', enabled: true },
          { flagKey: 'next_lesson', enabled: false },
        ],
      },
    },
  })

  console.log(
    `Seeded tenants: ${alpha.name} (${alpha.operatorId}), ${bravo.name} (${bravo.operatorId})`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
