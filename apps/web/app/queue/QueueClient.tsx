'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Suggestion, WorkflowType } from '@oneshot/shared-types'
import { SuggestionCard } from '@/components/queue/SuggestionCard'
import { QueueFilters } from '@/components/queue/QueueFilters'
import { BulkActions } from '@/components/queue/BulkActions'
import { useQueueUpdates } from '@/hooks/useQueueUpdates'

interface QueueClientProps {
  operatorId: string
  apiUrl: string
}

export function QueueClient({ operatorId, apiUrl }: QueueClientProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [workflowType, setWorkflowType] = useState<WorkflowType | ''>('')
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [liveIndicator, setLiveIndicator] = useState(false)

  // Build headers — in Phase 1 we use a dev JWT; Phase 1+ uses real session token
  const headers = {
    'Content-Type': 'application/json',
    // Demo: local-dev JWT signed with 'local-dev-secret', carries operatorId claim
    Authorization: `Bearer ${buildDevToken(operatorId)}`,
  }

  const fetchSuggestions = useCallback(async () => {
    const params = new URLSearchParams({ status: 'pending' })
    if (workflowType) params.set('workflowType', workflowType)

    try {
      const res = await fetch(`${apiUrl}/api/v1/suggestions?${params}`, { headers })
      if (!res.ok) return
      const data = (await res.json()) as { suggestions: Suggestion[] }
      setSuggestions(data.suggestions)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, workflowType, operatorId])

  // Initial fetch + refetch on filter change
  useEffect(() => {
    setLoading(true)
    fetchSuggestions()
  }, [fetchSuggestions])

  // SSE live updates — flash indicator and refresh queue on any queue event
  useQueueUpdates(apiUrl, buildDevToken(operatorId), () => {
    setLiveIndicator(true)
    setTimeout(() => setLiveIndicator(false), 2000)
    fetchSuggestions()
  })

  const handleApprove = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    setSelected((prev) => prev.filter((s) => s !== id))
  }

  const handleReject = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    setSelected((prev) => prev.filter((s) => s !== id))
  }

  const handleBulkApprove = async () => {
    if (selected.length === 0) return
    setBulkLoading(true)
    try {
      await fetch(`${apiUrl}/api/v1/suggestions/bulk-approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: selected }),
      })
      setSuggestions((prev) => prev.filter((s) => !selected.includes(s.id)))
      setSelected([])
    } finally {
      setBulkLoading(false)
    }
  }

  const visibleIds = suggestions.map((s) => s.id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Approval Queue</h1>
          <p className="mt-1 text-sm text-gray-500">Review and approve scheduling suggestions</p>
        </div>
        <div className="flex items-center gap-2">
          {liveIndicator && (
            <span className="animate-pulse rounded-full bg-green-400 px-2 py-0.5 text-xs text-white">
              live
            </span>
          )}
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            {suggestions.length} pending
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <QueueFilters workflowType={workflowType} onWorkflowTypeChange={setWorkflowType} />
      </div>

      {/* Bulk actions */}
      <div className="mb-4">
        <BulkActions
          selected={selected}
          onSelectAll={() => setSelected(visibleIds)}
          onClearSelection={() => setSelected([])}
          onBulkApprove={handleBulkApprove}
          totalVisible={suggestions.length}
          loading={bulkLoading}
        />
      </div>

      {/* Queue */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">No pending suggestions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="flex gap-3">
              <div className="pt-6">
                <input
                  type="checkbox"
                  checked={selected.includes(suggestion.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, suggestion.id]
                        : prev.filter((id) => id !== suggestion.id),
                    )
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
              </div>
              <div className="flex-1">
                <SuggestionCard
                  suggestion={suggestion}
                  apiUrl={apiUrl}
                  authHeaders={headers}
                  onApproved={() => handleApprove(suggestion.id)}
                  onRejected={() => handleReject(suggestion.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Builds a dev JWT for local development.
 * In production, the real session token from NextAuth is used instead.
 * This is a placeholder — Phase 1 wires actual session tokens to API calls.
 */
function buildDevToken(operatorId: string): string {
  // Encode a minimal JWT payload — only valid with local-dev-secret
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({ sub: 'dev-user', operatorId, iat: Math.floor(Date.now() / 1000) }),
  )
  // Signature is not validated in dev — local-dev-secret is used by Fastify
  return `${header}.${payload}.dev-sig`
}
