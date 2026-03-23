/**
 * Operator Approval Queue — the primary operator workspace.
 *
 * Server Component: fetches pending suggestions from the API and renders
 * the queue. SuggestionCard handles per-item approve/reject actions.
 */

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { SuggestionCard } from '@/components/queue/SuggestionCard'
import type { Suggestion } from '@oneshot/shared-types'

async function fetchSuggestions(operatorId: string): Promise<Suggestion[]> {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

  // TODO (Phase 1): replace with proper service-account JWT or internal token
  const res = await fetch(`${apiUrl}/api/v1/suggestions`, {
    headers: { 'x-operator-id': operatorId },
    cache: 'no-store',
  })

  if (!res.ok) return []
  const data = (await res.json()) as { suggestions: Suggestion[] }
  return data.suggestions
}

export default async function QueuePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const s = session as typeof session & { operatorId?: string }
  const operatorId = s.operatorId ?? 'demo-operator-alpha'

  const suggestions = await fetchSuggestions(operatorId)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Approval Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve scheduling suggestions
          </p>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          {suggestions.length} pending
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">No pending suggestions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      )}
    </div>
  )
}
