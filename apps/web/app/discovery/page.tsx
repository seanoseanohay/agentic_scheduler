/**
 * Operator Discovery Prospects page — authenticated operator view.
 * Shows leads who have submitted discovery flight requests.
 */

import { createHmac } from 'crypto'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { DiscoveryClient } from './DiscoveryClient'

/** Sign a minimal HS256 JWT using Node's built-in crypto (server-side only). */
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

export default async function DiscoveryPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const s = session as typeof session & { operatorId?: string }
  const operatorId = s.operatorId ?? 'demo-operator-alpha'
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

  // Fetch prospects server-side
  const token = signApiToken(operatorId)
  let prospects: DiscoveryProspect[] = []
  try {
    const res = await fetch(`${apiUrl}/api/v1/prospects`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.ok) {
      const data = (await res.json()) as { prospects: DiscoveryProspect[] }
      prospects = data.prospects
    }
  } catch {
    // API unavailable — show empty state
  }

  const bookingLink = `${process.env['NEXTAUTH_URL'] ?? 'http://localhost:3000'}/book?operator=${operatorId}`

  return (
    <DiscoveryClient
      operatorId={operatorId}
      prospects={prospects}
      bookingLink={bookingLink}
      apiUrl={apiUrl}
      token={token}
    />
  )
}

export interface DiscoveryProspect {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  requestedDate?: string | null
  status: string
  paymentStatus: string
  createdAt: string
}
