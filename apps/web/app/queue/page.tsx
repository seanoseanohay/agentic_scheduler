/**
 * Operator Approval Queue — primary operator workspace.
 * Server Component shell: passes operatorId + apiUrl + signed token to the client queue.
 */

import { createHmac } from 'crypto'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { QueueClient } from './QueueClient'

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

interface PageProps {
  searchParams: Promise<{ workflowType?: string }>
}

export default async function QueuePage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const s = session as typeof session & { operatorId?: string }
  const operatorId = s.operatorId ?? 'demo-operator-alpha'
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
  const { workflowType } = await searchParams

  // Sign a proper HS256 token server-side so the API can verify it
  const token = signApiToken(operatorId)

  return (
    <QueueClient
      operatorId={operatorId}
      apiUrl={apiUrl}
      token={token}
      initialWorkflowType={workflowType ?? ''}
    />
  )
}
