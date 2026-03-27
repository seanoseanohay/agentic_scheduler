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
  /** Pre-signed HS256 JWT from the server component — avoids exposing JWT_SECRET client-side. */
  token: string
}

export function QueueClient({ operatorId, apiUrl, token }: QueueClientProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [workflowType, setWorkflowType] = useState<WorkflowType | ''>('')
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [liveIndicator, setLiveIndicator] = useState(false)

  // Build headers — token is a proper HS256 JWT signed server-side with JWT_SECRET
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
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
    void fetchSuggestions()
  }, [fetchSuggestions])

  // SSE live updates — flash indicator and refresh queue on any queue event
  useQueueUpdates(apiUrl, token, () => {
    setLiveIndicator(true)
    setTimeout(() => setLiveIndicator(false), 2000)
    void fetchSuggestions()
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

