import { describe, it, expect } from 'vitest'
import { renderTemplate } from './templates.js'

describe('renderTemplate', () => {
  it('renders waitlist.offer with required fields', () => {
    const result = renderTemplate(
      'waitlist.offer',
      { firstName: 'Alice', date: '2026-06-20', time: '10:00 AM' },
      'Blue Sky Flight School',
    )
    expect(result.subject).toContain('Blue Sky Flight School')
    expect(result.subject).toContain('2026-06-20')
    expect(result.body).toContain('Alice')
  })

  it('renders booking.confirmed correctly', () => {
    const result = renderTemplate(
      'booking.confirmed',
      { firstName: 'Bob', date: '2026-06-20', time: '14:00' },
      'Apex Aviation',
    )
    expect(result.subject).toContain('confirmed')
    expect(result.body).toContain('Bob')
    expect(result.body).toContain('Apex Aviation')
  })

  it('renders discovery.offer with booking URL', () => {
    const result = renderTemplate(
      'discovery.offer',
      { firstName: 'Carol', date: '2026-06-21', time: '09:00 AM', bookingUrl: 'https://example.com/book' },
      'Horizon Air',
    )
    expect(result.body).toContain('https://example.com/book')
  })

  it('throws for unknown template key', () => {
    expect(() =>
      renderTemplate('unknown.template' as never, {}, 'Brand'),
    ).toThrow('Unknown notification template')
  })

  it('handles missing optional data fields gracefully', () => {
    const result = renderTemplate('next_lesson.offer', {}, 'My School')
    expect(result.subject).toBeTruthy()
    expect(result.body).toBeTruthy()
  })
})
