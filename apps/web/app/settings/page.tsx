/**
 * Tenant Settings — read-only display of current configuration.
 * Server Component: fetches tenant config from API using a signed JWT.
 */

import { createHmac } from 'crypto'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { SettingsClient } from './SettingsClient'
import type { Tenant } from '@oneshot/shared-types'

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

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const s = session as typeof session & { operatorId?: string }
  const operatorId = s.operatorId ?? 'demo-operator-alpha'
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
  const token = signApiToken(operatorId)

  let tenant: Tenant | null = null
  try {
    const res = await fetch(`${apiUrl}/api/v1/tenants/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.ok) {
      const data = (await res.json()) as { tenant: Tenant }
      tenant = data.tenant
    }
  } catch {
    // Graceful degradation — show UI without config data
  }

  return <SettingsClient tenant={tenant} operatorId={operatorId} />
}
