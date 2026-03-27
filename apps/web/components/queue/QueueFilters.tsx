'use client'

import type { WorkflowType } from '@oneshot/shared-types'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'

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
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Chip
        label="All"
        onClick={() => onWorkflowTypeChange('')}
        color={workflowType === '' ? 'primary' : 'default'}
        variant={workflowType === '' ? 'filled' : 'outlined'}
      />
      {(Object.entries(WORKFLOW_LABELS) as [WorkflowType, string][]).map(([key, label]) => (
        <Chip
          key={key}
          label={label}
          onClick={() => onWorkflowTypeChange(key)}
          color={workflowType === key ? 'primary' : 'default'}
          variant={workflowType === key ? 'filled' : 'outlined'}
        />
      ))}
    </Stack>
  )
}
