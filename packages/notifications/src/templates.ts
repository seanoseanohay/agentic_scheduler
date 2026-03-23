/**
 * Notification template registry.
 *
 * Templates are keyed by templateKey. All templates receive a typed data object
 * and return subject + body strings. Tenant brandName is injected at call time.
 *
 * Phase 1: move templates to database-backed tenant configuration.
 */

export type TemplateKey =
  | 'waitlist.offer'
  | 'cancellation.reschedule_offer'
  | 'discovery.offer'
  | 'next_lesson.offer'
  | 'booking.confirmed'
  | 'booking.failed'

export interface RenderedTemplate {
  subject: string
  body: string
}

export function renderTemplate(
  templateKey: TemplateKey,
  data: Record<string, string>,
  brandName: string,
): RenderedTemplate {
  const template = TEMPLATES[templateKey]
  if (!template) {
    throw new Error(`Unknown notification template: ${templateKey}`)
  }
  return template(data, brandName)
}

type TemplateRenderer = (data: Record<string, string>, brandName: string) => RenderedTemplate

const TEMPLATES: Record<TemplateKey, TemplateRenderer> = {
  'waitlist.offer': (d, brand) => ({
    subject: `${brand}: Flight slot available — ${d['date'] ?? ''}`,
    body: `Hi ${d['firstName'] ?? 'there'},\n\nA flight slot has opened up on ${d['date'] ?? ''} at ${d['time'] ?? ''}. Please reply to confirm your interest.\n\n${brand}`,
  }),
  'cancellation.reschedule_offer': (d, brand) => ({
    subject: `${brand}: Reschedule offer for your cancelled flight`,
    body: `Hi ${d['firstName'] ?? 'there'},\n\nWe have an alternative slot available: ${d['date'] ?? ''} at ${d['time'] ?? ''} with ${d['instructorName'] ?? 'your instructor'}.\n\n${brand}`,
  }),
  'discovery.offer': (d, brand) => ({
    subject: `${brand}: Your discovery flight is ready to book`,
    body: `Hi ${d['firstName'] ?? 'there'},\n\nWe have a discovery flight available on ${d['date'] ?? ''} at ${d['time'] ?? ''}. Complete your booking at: ${d['bookingUrl'] ?? ''}\n\n${brand}`,
  }),
  'next_lesson.offer': (d, brand) => ({
    subject: `${brand}: Time to schedule your next lesson`,
    body: `Hi ${d['firstName'] ?? 'there'},\n\nBased on your progress, we suggest scheduling: ${d['lessonType'] ?? 'your next lesson'} on ${d['date'] ?? ''} at ${d['time'] ?? ''}.\n\n${brand}`,
  }),
  'booking.confirmed': (d, brand) => ({
    subject: `${brand}: Flight confirmed — ${d['date'] ?? ''}`,
    body: `Hi ${d['firstName'] ?? 'there'},\n\nYour flight is confirmed for ${d['date'] ?? ''} at ${d['time'] ?? ''}. See you then!\n\n${brand}`,
  }),
  'booking.failed': (d, brand) => ({
    subject: `${brand}: Booking issue — action needed`,
    body: `Hi ${d['firstName'] ?? 'there'},\n\nWe were unable to complete your booking for ${d['date'] ?? ''}. Please contact us for assistance.\n\n${brand}`,
  }),
}
