'use client'

import type { WorkflowType } from '@oneshot/shared-types'

interface QueueFiltersProps {
  workflowType: WorkflowType | ''
  onWorkflowTypeChange: (v: WorkflowType | '') => void
}

const WORKFLOW_LABELS: Record<WorkflowType, string> = {
  waitlist_fill: 'Waitlist Fill',
  cancellation_recovery: 'Cancellation Recovery',
  discovery_flight: 'Discovery Flight',
  next_lesson: 'Next Lesson',
}

export function QueueFilters({ workflowType, onWorkflowTypeChange }: QueueFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onWorkflowTypeChange('')}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          workflowType === ''
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All
      </button>
      {(Object.entries(WORKFLOW_LABELS) as [WorkflowType, string][]).map(([key, label]) => (
        <button
          key={key}
          onClick={() => onWorkflowTypeChange(key)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            workflowType === key
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
