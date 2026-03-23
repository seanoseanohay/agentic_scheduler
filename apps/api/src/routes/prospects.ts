/**
 * Discovery prospect intake routes.
 *
 * POST /api/v1/prospects — public endpoint (no auth required); stores the
 * prospect and triggers the discovery flight workflow on the next poll cycle.
 *
 * GET /api/v1/prospects — operator-only, returns pending prospects for the tenant.
 *
 * POST /api/v1/prospects/:id/confirm — called after payment completes to mark
 * prospect as paid and allow final booking.
 *
 * Scope: minimal prospect storage only (scope.md — OneShot is not a CRM).
 */

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@oneshot/persistence'
import { writeAuditEvent } from '@oneshot/persistence'

const intakeBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  requestedDate: z.string().optional(), // ISO date string
  locationId: z.string().optional(),
  operatorId: z.string().min(1), // tenant identifier for public endpoint
})

const confirmBody = z.object({
  paymentIntentId: z.string().min(1),
})

export async function prospectRoutes(app: FastifyInstance) {
  // POST /api/v1/prospects — public intake (no JWT required)
  app.post('/', { config: { skipAuth: true } }, async (request, reply) => {
    const parsed = intakeBody.safeParse(request.body)
    if (!parsed.success) return reply.badRequest('Invalid prospect data')

    const { operatorId, ...data } = parsed.data

    const tenant = await prisma.tenant.findUnique({ where: { operatorId } })
    if (!tenant) return reply.badRequest('Unknown operator')

    // Check discovery_flight feature flag
    const flag = await prisma.featureFlag.findUnique({
      where: { tenantId_flagKey: { tenantId: tenant.id, flagKey: 'discovery_flight' } },
    })
    if (!flag?.enabled) {
      return reply.badRequest('Discovery flight booking is not available for this operator')
    }

    const prospect = await prisma.discoveryProspect.create({
      data: {
        tenantId: tenant.id,
        operatorId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        requestedDate: data.requestedDate ? new Date(data.requestedDate) : undefined,
        locationId: data.locationId,
        status: 'pending',
      },
    })

    await writeAuditEvent(
      { tenantId: tenant.id, operatorId },
      {
        eventType: 'tenant.created', // repurposing as closest available type
        actorType: 'system',
        entityType: 'discovery_prospect',
        entityId: prospect.id,
        payload: { email: data.email, requestedDate: data.requestedDate },
      },
    )

    return reply.code(201).send({
      prospectId: prospect.id,
      message: 'Your request has been received. We will contact you shortly with available slots.',
    })
  })

  // GET /api/v1/prospects — list pending prospects (operator-authenticated)
  app.get('/', async (request, reply) => {
    const ctx = request.tenantContext
    if (!ctx) return reply.unauthorized()

    const prospects = await prisma.discoveryProspect.findMany({
      where: { operatorId: ctx.operatorId, status: { in: ['pending', 'offered'] } },
      orderBy: { createdAt: 'desc' },
    })

    return { prospects }
  })

  // POST /api/v1/prospects/:id/confirm — mark payment confirmed
  app.post<{ Params: { id: string } }>('/:id/confirm', async (request, reply) => {
    const ctx = request.tenantContext
    if (!ctx) return reply.unauthorized()

    const parsed = confirmBody.safeParse(request.body)
    if (!parsed.success) return reply.badRequest('Invalid confirmation data')

    const prospect = await prisma.discoveryProspect.findFirst({
      where: { id: request.params.id, operatorId: ctx.operatorId },
    })
    if (!prospect) return reply.notFound()

    if (prospect.paymentIntentId !== parsed.data.paymentIntentId) {
      return reply.badRequest('Payment intent mismatch')
    }

    await prisma.discoveryProspect.update({
      where: { id: request.params.id },
      data: { paymentStatus: 'paid' },
    })

    await writeAuditEvent(ctx, {
      eventType: 'booking.attempted',
      actorType: 'system',
      entityType: 'discovery_prospect',
      entityId: request.params.id,
      payload: { paymentIntentId: parsed.data.paymentIntentId },
    })

    return { success: true }
  })
}
