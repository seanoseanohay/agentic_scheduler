/**
 * Database seed — creates two demo tenants and sample suggestions for local development.
 * Run: pnpm db:seed
 */

import { PrismaClient } from '@prisma/client'
import type { RankingWeights, NotificationPolicy, SuggestionExplanation } from '@oneshot/shared-types'

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

/** Returns a Date offset from now by the given hours. */
function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000)
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

  // ── Demo suggestions for the approval queue ─────────────────────────────────
  // Only seed if there are no existing pending suggestions to avoid duplicates.
  const existingCount = await prisma.suggestion.count({
    where: { operatorId: alpha.operatorId, status: 'pending' },
  })

  if (existingCount === 0) {
    // Shared workflow run for demo suggestions
    const demoRun = await prisma.workflowRun.create({
      data: {
        tenantId: alpha.id,
        operatorId: alpha.operatorId,
        workflowType: 'cancellation_recovery',
        status: 'completed',
        triggerKey: 'seed-demo-run',
        triggerPayload: { source: 'seed' },
        suggestionsCreated: 4,
        completedAt: new Date(),
      },
    })

    const demoSuggestions: Array<{
      workflowType: string
      studentId: string
      instructorId: string
      aircraftId: string
      locationId: string
      startTime: Date
      endTime: Date
      lessonType: string
      score: number
      explanation: SuggestionExplanation
    }> = [
      {
        workflowType: 'cancellation_recovery',
        studentId: 'stu-002',
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
        locationId: 'loc-001',
        startTime: hoursFromNow(26),
        endTime: hoursFromNow(28),
        lessonType: 'dual',
        score: 0.87,
        explanation: {
          triggerSummary:
            'Bob Kowalski was removed from the 10:00 AM slot after a last-minute cancellation. This slot has been open for 2 hours.',
          constraintsSatisfied: [
            'Within civil twilight',
            'Instructor rated for C172',
            'Aircraft available',
          ],
          rankingReasons: [
            '14 days since last flight — highest urgency in queue',
            'Dave Martinez instructed Bob on last 3 lessons (continuity)',
            'N12345 is same aircraft as previous 4 lessons',
          ],
          tradeoffs: [],
        },
      },
      {
        workflowType: 'waitlist_fill',
        studentId: 'stu-001',
        instructorId: 'ins-002',
        aircraftId: 'ac-001',
        locationId: 'loc-001',
        startTime: hoursFromNow(50),
        endTime: hoursFromNow(52),
        lessonType: 'dual',
        score: 0.72,
        explanation: {
          triggerSummary:
            'Open slot detected on Thursday morning. Alice Nguyen is first on waitlist and has been waiting 7 days.',
          constraintsSatisfied: [
            'Within civil twilight',
            'Student eligible for next lesson stage',
          ],
          rankingReasons: [
            '7 days since last flight',
            'No upcoming flights scheduled in next 14 days',
          ],
          tradeoffs: ['Different instructor than usual (Eve Thompson vs Dave Martinez)'],
        },
      },
      {
        workflowType: 'discovery_flight',
        studentId: 'prospect-jane-smith',
        instructorId: 'ins-001',
        aircraftId: 'ac-001',
        locationId: 'loc-001',
        startTime: hoursFromNow(72),
        endTime: hoursFromNow(73),
        lessonType: 'discovery',
        score: 0.91,
        explanation: {
          triggerSummary:
            'Jane Smith submitted a discovery flight request for Saturday. Dave Martinez is available and N12345 is open.',
          constraintsSatisfied: [
            'Weekend slot preferred by prospect',
            'Instructor available',
            'Aircraft available',
          ],
          rankingReasons: ['Prospect requested date matches exactly', 'High engagement score'],
          tradeoffs: [],
        },
      },
      {
        workflowType: 'cancellation_recovery',
        studentId: 'stu-003',
        instructorId: 'ins-001',
        aircraftId: 'ac-002',
        locationId: 'loc-001',
        startTime: hoursFromNow(6),
        endTime: hoursFromNow(8),
        lessonType: 'dual',
        score: 0.58,
        explanation: {
          triggerSummary:
            'Emergency opening this afternoon. Carol Park has availability and is close to her solo milestone.',
          constraintsSatisfied: ['Within civil twilight', 'Aircraft available'],
          rankingReasons: [
            'Carol is 3 hours from solo requirement',
            'Only 3 days since last flight — moderate urgency',
          ],
          tradeoffs: [
            'PA28 instead of usual C172 (different aircraft type)',
            'Short notice — 6 hours lead time',
          ],
        },
      },
    ]

    for (const s of demoSuggestions) {
      await prisma.suggestion.create({
        data: {
          tenantId: alpha.id,
          operatorId: alpha.operatorId,
          workflowRunId: demoRun.id,
          workflowType: s.workflowType,
          status: 'pending',
          studentId: s.studentId,
          instructorId: s.instructorId,
          aircraftId: s.aircraftId,
          locationId: s.locationId,
          startTime: s.startTime,
          endTime: s.endTime,
          lessonType: s.lessonType,
          score: s.score,
          explanation: s.explanation,
          expiresAt: hoursFromNow(24),
        },
      })
    }

    console.log(`Seeded ${demoSuggestions.length} demo suggestions for ${alpha.name}`)
  } else {
    console.log(`Skipped suggestion seed — ${existingCount} pending suggestions already exist`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
