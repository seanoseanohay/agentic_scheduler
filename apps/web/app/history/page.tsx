/**
 * History Page — shows the operator's approved/rejected/booked suggestion history.
 * Server Component: fetches from API using a signed JWT.
 */

import { createHmac } from 'crypto'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { HistoryClient } from './HistoryClient'
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

type RawSuggestion = Omit<Suggestion, 'reviewedAt' | 'expiresAt' | 'createdAt' | 'updatedAt' | 'candidate'> & {
  reviewedAt?: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  candidate: Omit<Suggestion['candidate'], 'startTime' | 'endTime'> & {
    startTime: string
    endTime: string
  }
}

export default async function HistoryPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const s = session as typeof session & { operatorId?: string }
  const operatorId = s.operatorId ?? 'demo-operator-alpha'
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
  const token = signApiToken(operatorId)
  const headers = { Authorization: `Bearer ${token}` }

  async function fetchByStatus(status: string): Promise<RawSuggestion[]> {
    try {
      const res = await fetch(
        `${apiUrl}/api/v1/suggestions?status=${status}&limit=50`,
        { headers, cache: 'no-store' },
      )
      if (!res.ok) return []
      const data = (await res.json()) as { suggestions: RawSuggestion[] }
      return data.suggestions ?? []
    } catch {
      return []
    }
  }

  const [approved, rejected, booked] = await Promise.all([
    fetchByStatus('approved'),
    fetchByStatus('rejected'),
    fetchByStatus('booked'),
  ])

  const all = [...approved, ...rejected, ...booked].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  return <HistoryClient suggestions={all} />
}
