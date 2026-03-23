'use client'

import { useState } from 'react'
import type { Suggestion } from '@oneshot/shared-types'

interface SuggestionCardProps {
  suggestion: Suggestion
  apiUrl?: string
  authHeaders?: Record<string, string>
  onApproved?: () => void
  onRejected?: () => void
}

const WORKFLOW_BADGE: Record<string, { label: string; classes: string }> = {
  waitlist_fill: { label: 'Waitlist Fill', classes: 'bg-purple-100 text-purple-700' },
  cancellation_recovery: { label: 'Cancellation Recovery', classes: 'bg-orange-100 text-orange-700' },
  discovery_flight: { label: 'Discovery Flight', classes: 'bg-sky-100 text-sky-700' },
  next_lesson: { label: 'Next Lesson', classes: 'bg-teal-100 text-teal-700' },
}

export function SuggestionCard({
  suggestion,
  apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001',
  authHeaders = {},
  onApproved,
  onRejected,
}: SuggestionCardProps) {
  const [actionState, setActionState] = useState<'idle' | 'loading' | 'approved' | 'rejected'>('idle')

  async function act(action: 'approve' | 'reject') {
    setActionState('loading')
    const res = await fetch(`${apiUrl}/api/v1/suggestions/${suggestion.id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const next = action === 'approve' ? 'approved' : 'rejected'
      setActionState(next)
      if (action === 'approve') onApproved?.()
      else onRejected?.()
    } else {
      setActionState('idle')
    }
  }

  const { candidate, explanation } = suggestion
  const startStr = new Date(candidate.startTime).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const badge = WORKFLOW_BADGE[suggestion.workflowType] ?? {
    label: suggestion.workflowType,
    classes: 'bg-gray-100 text-gray-700',
  }
  const expiresIn = Math.max(
    0,
    Math.round((new Date(suggestion.expiresAt).getTime() - Date.now()) / 3_600_000),
  )

  if (actionState === 'approved' || actionState === 'rejected') {
    return (
      <div className="rounded-lg border border-gray-100 bg-white p-4 opacity-60">
        <p className="text-sm font-medium text-gray-400">
          {actionState === 'approved' ? '✓ Approved — booking in progress' : '✗ Rejected'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.classes}`}>
            {badge.label}
          </span>
          <p className="text-sm font-semibold text-gray-900">{startStr}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-gray-500">Score: {suggestion.score.toFixed(2)}</p>
          {expiresIn > 0 && (
            <p className={`text-xs ${expiresIn < 2 ? 'text-red-500' : 'text-gray-400'}`}>
              Expires in {expiresIn}h
            </p>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
        <div><span className="font-medium">Student:</span> {candidate.studentId}</div>
        <div><span className="font-medium">Instructor:</span> {candidate.instructorId}</div>
        <div><span className="font-medium">Aircraft:</span> {candidate.aircraftId}</div>
        <div><span className="font-medium">Lesson:</span> {candidate.lessonType}</div>
      </div>

      <div className="mb-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
        <p className="mb-1 font-medium text-gray-700">Why this suggestion?</p>
        <p className="mb-1">{explanation.triggerSummary}</p>
        {explanation.constraintsSatisfied.length > 0 && (
          <p className="mb-1 text-green-700">✓ {explanation.constraintsSatisfied.join(' · ')}</p>
        )}
        {explanation.rankingReasons.length > 0 && (
          <ul className="list-inside list-disc space-y-0.5">
            {explanation.rankingReasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
        {explanation.tradeoffs.length > 0 && (
          <p className="mt-1 text-amber-600">Note: {explanation.tradeoffs.join('; ')}</p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => act('approve')}
          disabled={actionState === 'loading'}
          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {actionState === 'loading' ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={() => act('reject')}
          disabled={actionState === 'loading'}
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
