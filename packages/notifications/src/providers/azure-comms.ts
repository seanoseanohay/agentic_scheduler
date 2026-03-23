/**
 * Azure Communication Services notification provider.
 *
 * Used in production when ACS_CONNECTION_STRING is set.
 * Sends email via ACS Email and SMS via ACS SMS.
 *
 * Decisions.md §9: ACS is the preferred provider; Twilio/SendGrid are permitted
 * as fallback if deliverability or tenant needs require it.
 *
 * The ACS SDK (@azure/communication-email, @azure/communication-sms) is
 * invoked via dynamic require so it is only loaded when this provider is active,
 * keeping the console/test path dependency-free.
 */

import type { INotificationProvider, NotificationMessage, NotificationResult } from '../provider.js'

export class AzureCommsProvider implements INotificationProvider {
  constructor(private readonly connectionString: string) {}

  async send(message: NotificationMessage): Promise<NotificationResult> {
    if (message.channel === 'email') {
      return this.sendEmail(message)
    }
    return this.sendSms(message)
  }

  private async sendEmail(message: NotificationMessage): Promise<NotificationResult> {
    try {
      // Dynamic import — @azure/communication-email is only needed in production
      const { EmailClient } = await import('@azure/communication-email')
      const client = new EmailClient(this.connectionString)

      const poller = await client.beginSend({
        senderAddress: `DoNotReply@${this.senderDomain()}`,
        content: {
          subject: message.subject ?? message.brandName,
          plainText: message.body,
        },
        recipients: {
          to: [{ address: message.to, displayName: message.to }],
        },
      })

      const result = await poller.pollUntilDone()
      return {
        success: result.status === 'Succeeded',
        providerMessageId: result.id,
        error: result.status !== 'Succeeded' ? `ACS email status: ${result.status}` : undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }

  private async sendSms(message: NotificationMessage): Promise<NotificationResult> {
    try {
      const { SmsClient } = await import('@azure/communication-sms')
      const client = new SmsClient(this.connectionString)

      const from = process.env['ACS_SMS_FROM'] ?? ''
      const results = await client.send({ from, to: [message.to], message: message.body })
      const r = results[0]

      return {
        success: r?.successful ?? false,
        providerMessageId: r?.messageId,
        error: r?.errorMessage ?? undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }

  private senderDomain(): string {
    // ACS verified domain, set via ACS_SENDER_DOMAIN env var
    return process.env['ACS_SENDER_DOMAIN'] ?? 'azurecomm.net'
  }
}
