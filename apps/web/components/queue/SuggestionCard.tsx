'use client'

import { useState } from 'react'
import type { Suggestion } from '@oneshot/shared-types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

interface SuggestionCardProps {
  suggestion: Suggestion
  apiUrl?: string
  authHeaders?: Record<string, string>
  onApproved?: () => void
  onRejected?: () => void
}

const WORKFLOW_CONFIG: Record<string, { label: string; color: 'secondary' | 'warning' | 'info' | 'success' }> = {
  waitlist_fill:        { label: 'Waitlist Fill',         color: 'secondary' },
  cancellation_recovery:{ label: 'Cancellation Recovery', color: 'warning'   },
  discovery_flight:     { label: 'Discovery Flight',      color: 'info'      },
  next_lesson:          { label: 'Next Lesson',           color: 'success'   },
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
      setActionState(action === 'approve' ? 'approved' : 'rejected')
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
  const wf = WORKFLOW_CONFIG[suggestion.workflowType] ?? { label: suggestion.workflowType, color: 'default' as const }
  const expiresIn = Math.max(
    0,
    Math.round((new Date(suggestion.expiresAt).getTime() - Date.now()) / 3_600_000),
  )
  const scorePercent = Math.round(suggestion.score * 100)
  const urgent = expiresIn > 0 && expiresIn < 2

  if (actionState === 'approved') {
    return (
      <Card sx={{ opacity: 0.55 }}>
        <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="success" fontSize="small" />
          <Typography variant="body2" color="success.main" fontWeight={600}>
            Approved — booking in progress
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (actionState === 'rejected') {
    return (
      <Card sx={{ opacity: 0.45 }}>
        <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DoNotDisturbIcon color="error" fontSize="small" />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Rejected
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {actionState === 'loading' && <LinearProgress />}
      <CardContent sx={{ p: 3 }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, gap: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Chip label={wf.label} color={wf.color} size="small" />
            <Typography variant="subtitle2" color="text.primary">
              {startStr}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
              <LinearProgress
                variant="determinate"
                value={scorePercent}
                sx={{ width: 60, height: 6, bgcolor: 'grey.100' }}
                color={scorePercent >= 70 ? 'success' : scorePercent >= 40 ? 'warning' : 'error'}
              />
              <Typography variant="caption" fontWeight={700}>
                {scorePercent}%
              </Typography>
            </Box>
            {expiresIn > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', mt: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 12, color: urgent ? 'error.main' : 'text.disabled' }} />
                <Typography
                  variant="caption"
                  color={urgent ? 'error.main' : 'text.disabled'}
                  fontWeight={urgent ? 700 : 400}
                >
                  {expiresIn}h left
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Details grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 16px',
            mb: 2,
          }}
        >
          {[
            ['Student',    candidate.studentId],
            ['Instructor', candidate.instructorId],
            ['Aircraft',   candidate.aircraftId],
            ['Lesson',     candidate.lessonType],
          ].map(([label, value]) => (
            <Typography key={label} variant="body2" color="text.secondary">
              <Box component="span" fontWeight={600} color="text.primary">{label}:</Box>{' '}
              {value}
            </Typography>
          ))}
        </Box>

        {/* Explanation */}
        <Box
          sx={{
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 1.5,
            mb: 2.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
            <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
              Why this suggestion?
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={0.5}>
            {explanation.triggerSummary}
          </Typography>
          {explanation.constraintsSatisfied.length > 0 && (
            <Typography variant="body2" color="success.dark" fontWeight={500} mb={0.5}>
              ✓ {explanation.constraintsSatisfied.join(' · ')}
            </Typography>
          )}
          {explanation.rankingReasons.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {explanation.rankingReasons.map((r, i) => (
                <Typography key={i} component="li" variant="body2" color="text.secondary">
                  {r}
                </Typography>
              ))}
            </Box>
          )}
          {explanation.tradeoffs.length > 0 && (
            <Typography variant="body2" color="warning.dark" mt={0.5}>
              ⚠ {explanation.tradeoffs.join('; ')}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            color="success"
            fullWidth
            startIcon={<CheckCircleIcon />}
            onClick={() => act('approve')}
            disabled={actionState === 'loading'}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            fullWidth
            startIcon={<DoNotDisturbIcon />}
            onClick={() => act('reject')}
            disabled={actionState === 'loading'}
            sx={{ borderColor: 'divider', color: 'text.secondary' }}
          >
            Reject
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}
