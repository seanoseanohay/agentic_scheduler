/**
 * WorkflowRun repository.
 *
 * WorkflowRuns are the deduplication and audit boundary for every trigger.
 * The (tenantId, triggerKey) unique index is the idempotency enforcement point.
 */

import type { WorkflowRun } from '@oneshot/shared-types'
import type { TenantContext } from '@oneshot/shared-types'
import { prisma } from '../client.js'

export async function createWorkflowRun(
  ctx: TenantContext,
  data: {
    workflowType: WorkflowRun['workflowType']
    triggerKey: string
    triggerPayload: unknown
  },
): Promise<{ run: WorkflowRun; isNew: boolean }> {
  // findOrCreate pattern — returns existing if triggerKey already processed
  const existing = await prisma.workflowRun.findUnique({
    where: { tenantId_triggerKey: { tenantId: ctx.tenantId, triggerKey: data.triggerKey } },
  })
  if (existing) {
    return { run: mapRun(existing, ctx), isNew: false }
  }

  const row = await prisma.workflowRun.create({
    data: {
      tenantId: ctx.tenantId,
      operatorId: ctx.operatorId,
      workflowType: data.workflowType,
      status: 'running',
      triggerKey: data.triggerKey,
      triggerPayload: data.triggerPayload as never,
    },
  })
  return { run: mapRun(row, ctx), isNew: true }
}

export async function completeWorkflowRun(
  runId: string,
  suggestionsCreated: number,
): Promise<void> {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: 'completed', suggestionsCreated, completedAt: new Date() },
  })
}

export async function failWorkflowRun(runId: string, errorMessage: string): Promise<void> {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: 'failed', errorMessage, completedAt: new Date() },
  })
}

export async function skipWorkflowRun(runId: string): Promise<void> {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: 'skipped', completedAt: new Date() },
  })
}

function mapRun(row: Awaited<ReturnType<typeof prisma.workflowRun.findUniqueOrThrow>>, ctx: TenantContext): WorkflowRun {
  return {
    id: row.id,
    tenantContext: ctx,
    workflowType: row.workflowType as WorkflowRun['workflowType'],
    status: row.status as WorkflowRun['status'],
    triggerKey: row.triggerKey,
    triggerPayload: row.triggerPayload,
    suggestionsCreated: row.suggestionsCreated,
    errorMessage: row.errorMessage ?? undefined,
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? undefined,
  }
}
