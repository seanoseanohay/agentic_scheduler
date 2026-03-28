/**
 * Flights Page — shows upcoming booked flights for the operator.
 * Server Component: fetches booked suggestions using a signed JWT.
 */

import { createHmac } from 'crypto'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { FlightsClient } from './FlightsClient'
import type { Suggestion } from '@oneshot/shared-types'

function signApiToken(operatorId: string): string {
  const secret = process.env['JWT_SECRET'] ?? 'local-dev-secret'
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  const header = b64url({ alg: 'HS256', typ: 'JWT' })
  const payload = b64url({
    sub: operatorId,
    operatorId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })
  const sig = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${payload}.${sig}`
}

export type RawSuggestion = Omit<
  Suggestion,
  'reviewedAt' | 'expiresAt' | 'createdAt' | 'updatedAt' | 'candidate'
> & {
  reviewedAt?: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  candidate: Omit<Suggestion['candidate'], 'startTime' | 'endTime'> & {
    startTime: string
    endTime: string
  }
}

export default async function FlightsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const s = session as typeof session & { operatorId?: string }
  const operatorId = s.operatorId ?? 'demo-operator-alpha'
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
  const token = signApiToken(operatorId)

  let flights: RawSuggestion[] = []
  try {
    const res = await fetch(`${apiUrl}/api/v1/suggestions?status=booked&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.ok) {
      const data = (await res.json()) as { suggestions: RawSuggestion[] }
      flights = data.suggestions ?? []
    }
  } catch {
    // API unavailable — show empty state
  }

  // Sort ascending by start time for schedule view
  flights.sort(
    (a, b) => new Date(a.candidate.startTime).getTime() - new Date(b.candidate.startTime).getTime(),
  )

  return <FlightsClient flights={flights} apiUrl={apiUrl} token={token} />
}
