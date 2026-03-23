'use client'

import { useState } from 'react'
import type { Suggestion } from '@oneshot/shared-types'

interface SuggestionCardProps {
  suggestion: Suggestion
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null)

  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

  async function act(action: 'approve' | 'reject') {
    setStatus('loading')
    const res = await fetch(`${apiUrl}/api/v1/suggestions/${suggestion.id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      setResult(action === 'approve' ? 'approved' : 'rejected')
      setStatus('done')
    } else {
      setStatus('idle')
    }
  }

  const { candidate, explanation } = suggestion
  const startStr = new Date(candidate.startTime).toLocaleString()

  if (status === 'done') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-500">
          Suggestion {result === 'approved' ? '✓ Approved' : '✗ Rejected'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            {suggestion.workflowType.replace('_', ' ')}
          </span>
          <p className="mt-1 text-sm font-medium text-gray-900">{startStr}</p>
        </div>
        <p className="text-xs text-gray-400">Score: {suggestion.score.toFixed(2)}</p>
      </div>

      {/* Candidate details */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <span className="font-medium">Student:</span> {candidate.studentId}
        </div>
        <div>
          <span className="font-medium">Instructor:</span> {candidate.instructorId}
        </div>
        <div>
          <span className="font-medium">Aircraft:</span> {candidate.aircraftId}
        </div>
        <div>
          <span className="font-medium">Lesson:</span> {candidate.lessonType}
        </div>
      </div>

      {/* Explanation */}
      <div className="mb-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
        <p className="mb-1 font-medium text-gray-700">Why this suggestion?</p>
        <p className="mb-1">{explanation.triggerSummary}</p>
        {explanation.rankingReasons.length > 0 && (
          <ul className="list-inside list-disc space-y-0.5">
            {explanation.rankingReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
        {explanation.tradeoffs.length > 0 && (
          <p className="mt-1 text-amber-600">Note: {explanation.tradeoffs.join('; ')}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => act('approve')}
          disabled={status === 'loading'}
          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {status === 'loading' ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={() => act('reject')}
          disabled={status === 'loading'}
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
