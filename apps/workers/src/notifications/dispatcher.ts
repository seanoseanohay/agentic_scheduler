/**
 * Notification dispatcher.
 *
 * Selects the appropriate provider (ACS or console), renders the template,
 * sends the notification, and persists a NotificationRecord with delivery outcome.
 *
 * All notification delivery is auditable — every send attempt is recorded
 * regardless of success or failure (requirements.md §24).
 */

import { renderTemplate, createNotificationProvider } from '@oneshot/notifications'
// createNotificationProvider is async — resolves ACS vs console based on env
import type { TemplateKey } from '@oneshot/notifications'
import { writeAuditEvent, prisma } from '@oneshot/persistence'
import type { TenantContext } from '@oneshot/shared-types'
import { tenantLogger } from '@oneshot/observability'

export interface DispatchOptions {
  suggestionId?: string
  channel: 'email' | 'sms'
  recipient: string
  templateKey: TemplateKey
  templateData: Record<string, string>
  brandName: string
}

export async function dispatchNotification(
  ctx: TenantContext,
  opts: DispatchOptions,
): Promise<void> {
  const log = tenantLogger(ctx.operatorId, 'notifications')

  const rendered = renderTemplate(opts.templateKey, opts.templateData, opts.brandName)
  const provider = await createNotificationProvider()

  // Persist record before send — so we have a record even if send throws
  const record = await prisma.notificationRecord.create({
    data: {
      tenantId: ctx.tenantId,
      operatorId: ctx.operatorId,
      suggestionId: opts.suggestionId,
      channel: opts.channel,
      recipient: opts.recipient,
      templateKey: opts.templateKey,
      status: 'pending',
    },
  })

  try {
    const result = await provider.send({
      to: opts.recipient,
      channel: opts.channel,
      subject: rendered.subject,
      body: rendered.body,
      brandName: opts.brandName,
    })

    if (result.success) {
      await prisma.notificationRecord.update({
        where: { id: record.id },
        data: {
          status: 'sent',
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
        },
      })
      await writeAuditEvent(ctx, {
        eventType: 'notification.sent',
        actorType: 'system',
        entityType: 'notification_record',
        entityId: record.id,
        payload: { channel: opts.channel, templateKey: opts.templateKey },
      })
      log.info({ recordId: record.id, channel: opts.channel }, 'Notification sent')
    } else {
      await prisma.notificationRecord.update({
        where: { id: record.id },
        data: { status: 'failed', errorMessage: result.error },
      })
      await writeAuditEvent(ctx, {
        eventType: 'notification.failed',
        actorType: 'system',
        entityType: 'notification_record',
        entityId: record.id,
        payload: { channel: opts.channel, error: result.error },
      })
      log.warn({ recordId: record.id, error: result.error }, 'Notification send failed')
    }
  } catch (err) {
    const error = String(err)
    await prisma.notificationRecord.update({
      where: { id: record.id },
      data: { status: 'failed', errorMessage: error },
    })
    await writeAuditEvent(ctx, {
      eventType: 'notification.failed',
      actorType: 'system',
      entityType: 'notification_record',
      entityId: record.id,
      payload: { channel: opts.channel, error },
    })
    log.error({ err, recordId: record.id }, 'Notification dispatch threw')
  }
}
