/**
 * Operator Approval Queue — primary operator workspace.
 * Server Component shell: passes operatorId + apiUrl to the client queue.
 */

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { QueueClient } from './QueueClient'

export default async function QueuePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const s = session as typeof session & { operatorId?: string }
  const operatorId = s.operatorId ?? 'demo-operator-alpha'
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

  return <QueueClient operatorId={operatorId} apiUrl={apiUrl} />
}
