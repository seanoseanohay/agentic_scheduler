/**
 * Notification provider abstraction.
 *
 * INotificationProvider decouples delivery logic from the rest of the system.
 * In local dev / Phase 0 the console provider logs to stdout (no real delivery).
 * In Phase 1, AzureCommsProvider sends via Azure Communication Services.
 * Twilio/SendGrid can be added as a second provider if ACS proves insufficient.
 */

export interface NotificationMessage {
  to: string
  channel: 'email' | 'sms'
  subject?: string
  body: string
  /** Tenant brand name for email "From" display */
  brandName: string
}

export interface NotificationResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

export interface INotificationProvider {
  send(message: NotificationMessage): Promise<NotificationResult>
}

/** Console provider — used in local development and tests */
export class ConsoleNotificationProvider implements INotificationProvider {
  async send(message: NotificationMessage): Promise<NotificationResult> {
    const prefix = `[NOTIFICATION][${message.channel.toUpperCase()}]`
    process.stdout.write(
      `${prefix} To: ${message.to} | Subject: ${message.subject ?? '—'}\n${message.body}\n`,
    )
    return { success: true, providerMessageId: `console-${Date.now()}` }
  }
}
