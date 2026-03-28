'use client'

import { useState } from 'react'
import { AppNav } from '@/components/AppNav'
import type { Suggestion, SuggestionStatus } from '@oneshot/shared-types'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import HistoryIcon from '@mui/icons-material/History'
import PersonIcon from '@mui/icons-material/Person'
import SchoolIcon from '@mui/icons-material/School'

// The API returns dates as ISO strings, so we use this shape for props
type RawSuggestion = Omit<Suggestion, 'reviewedAt' | 'expiresAt' | 'createdAt' | 'updatedAt' | 'candidate'> & {
  reviewedAt?: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  candidate: Omit<Suggestion['candidate'], 'startTime' | 'endTime'> & {
    startTime: string
    endTime: string
  }
}

type FilterTab = 'all' | 'approved' | 'rejected' | 'booked'

interface HistoryClientProps {
  suggestions: RawSuggestion[]
}

const WORKFLOW_CONFIG: Record<
  string,
  { label: string; color: 'secondary' | 'warning' | 'info' | 'success' | 'default' }
> = {
  waitlist_fill: { label: 'Waitlist Fill', color: 'secondary' },
  cancellation_recovery: { label: 'Cancellation Recovery', color: 'warning' },
  discovery_flight: { label: 'Discovery Flight', color: 'info' },
  next_lesson: { label: 'Next Lesson', color: 'success' },
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function StatusChip({ status }: { status: SuggestionStatus }) {
  if (status === 'approved') {
    return (
      <Chip
        icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
        label="Approved"
        color="success"
        size="small"
        sx={{ fontWeight: 600 }}
      />
    )
  }
  if (status === 'booked') {
    return (
      <Chip
        icon={<EventAvailableIcon sx={{ fontSize: '14px !important' }} />}
        label="Booked"
        color="success"
        size="small"
        variant="outlined"
        sx={{ fontWeight: 600 }}
      />
    )
  }
  return (
    <Chip
      icon={<DoNotDisturbIcon sx={{ fontSize: '14px !important' }} />}
      label="Rejected"
      color="error"
      size="small"
      sx={{ fontWeight: 600 }}
    />
  )
}

function HistoryRow({ suggestion }: { suggestion: RawSuggestion }) {
  const wf = WORKFLOW_CONFIG[suggestion.workflowType] ?? {
    label: suggestion.workflowType,
    color: 'default' as const,
  }
  const startStr = new Date(suggestion.candidate.startTime).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const reviewedAgo = suggestion.reviewedAt
    ? relativeTime(suggestion.reviewedAt)
    : relativeTime(suggestion.updatedAt)

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {/* Status */}
          <StatusChip status={suggestion.status} />

          {/* Workflow */}
          <Chip label={wf.label} color={wf.color} size="small" variant="outlined" />

          {/* Student */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {suggestion.candidate.studentId}
            </Typography>
          </Box>

          {/* Instructor */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SchoolIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {suggestion.candidate.instructorId}
            </Typography>
          </Box>

          {/* Slot time */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {startStr}
            </Typography>
          </Box>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Reviewer + time */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
            {suggestion.reviewedBy && (
              <Typography variant="caption" color="text.disabled">
                by{' '}
                <Box component="span" fontWeight={600} color="text.secondary">
                  {suggestion.reviewedBy}
                </Box>
              </Typography>
            )}
            <Typography variant="caption" color="text.disabled">
              {reviewedAgo}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export function HistoryClient({ suggestions }: HistoryClientProps) {
  const [filter, setFilter] = useState<FilterTab>('all')

  const counts: Record<FilterTab, number> = {
    all: suggestions.length,
    approved: suggestions.filter((s) => s.status === 'approved').length,
    rejected: suggestions.filter((s) => s.status === 'rejected').length,
    booked: suggestions.filter((s) => s.status === 'booked').length,
  }

  const filtered =
    filter === 'all' ? suggestions : suggestions.filter((s) => s.status === filter)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNav />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Page header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            History
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Reviewed suggestions — approved, rejected, and booked
          </Typography>
        </Box>

        {/* Filter tabs */}
        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_e, val: FilterTab | null) => {
              if (val !== null) setFilter(val)
            }}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'booked', label: 'Booked' },
              ] as { value: FilterTab; label: string }[]
            ).map(({ value, label }) => (
              <ToggleButton
                key={value}
                value={value}
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: '20px !important',
                  border: '1px solid',
                  borderColor: 'divider',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                <Badge
                  badgeContent={counts[value]}
                  color="default"
                  sx={{
                    '& .MuiBadge-badge': {
                      right: -10,
                      top: -4,
                      fontSize: '0.65rem',
                      minWidth: 16,
                      height: 16,
                      bgcolor: filter === value ? 'rgba(255,255,255,0.25)' : 'grey.200',
                      color: filter === value ? 'white' : 'text.secondary',
                    },
                  }}
                >
                  {label}
                </Badge>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Content */}
        {filtered.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 10,
              gap: 2,
              color: 'text.disabled',
            }}
          >
            <HistoryIcon sx={{ fontSize: 56 }} />
            <Typography variant="body1" fontWeight={600}>
              No history yet
            </Typography>
            <Typography variant="body2" color="text.disabled" textAlign="center">
              Reviewed suggestions will appear here once operators approve or reject items from the
              queue.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {filtered.map((s) => (
              <HistoryRow key={s.id} suggestion={s} />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  )
}
