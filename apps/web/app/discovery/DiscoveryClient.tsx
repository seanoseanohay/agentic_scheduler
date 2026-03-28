'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppNav } from '@/components/AppNav'
import type { DiscoveryProspect } from './page'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EmailIcon from '@mui/icons-material/Email'
import ExploreIcon from '@mui/icons-material/Explore'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PersonIcon from '@mui/icons-material/Person'

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    color: 'warning' | 'info' | 'success' | 'error' | 'default'
    hint: string
  }
> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    hint: 'AI is finding a slot — will appear in your Queue within 30 seconds.',
  },
  offered: {
    label: 'Offered',
    color: 'info',
    hint: 'A slot was found. Go to the Queue → Discovery Flight filter to approve or reject.',
  },
  booked: { label: 'Booked', color: 'success', hint: 'Flight confirmed and scheduled.' },
  cancelled: { label: 'Cancelled', color: 'error', hint: 'Prospect cancelled.' },
}

interface DiscoveryClientProps {
  operatorId: string
  prospects: DiscoveryProspect[]
  bookingLink: string
  apiUrl: string
  token: string
}

function ProspectRow({ prospect }: { prospect: DiscoveryProspect }) {
  const cfg = STATUS_CONFIG[prospect.status] ?? {
    label: prospect.status,
    color: 'default' as const,
    hint: '',
  }

  const createdAt = new Date(prospect.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const requestedDate = prospect.requestedDate
    ? new Date(prospect.requestedDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          {/* Status chip */}
          <Chip
            label={cfg.label}
            color={cfg.color}
            size="small"
            sx={{ fontWeight: 600 }}
          />

          {/* Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" fontWeight={600}>
              {prospect.firstName} {prospect.lastName}
            </Typography>
          </Box>

          {/* Email */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {prospect.email}
            </Typography>
          </Box>

          {/* Requested date */}
          {requestedDate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Requested {requestedDate}
              </Typography>
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Submitted date */}
          <Typography variant="caption" color="text.disabled">
            Submitted {createdAt}
          </Typography>
        </Box>

        {/* Status hint + action */}
        {cfg.hint && (
          <Box
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {prospect.status === 'pending' && (
              <HourglassEmptyIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
              {cfg.hint}
            </Typography>
            {prospect.status === 'offered' && (
              <Button
                component={Link}
                href="/queue?workflowType=discovery_flight"
                size="small"
                variant="outlined"
                endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ flexShrink: 0, fontSize: '0.75rem' }}
              >
                Review in Queue
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export function DiscoveryClient({ prospects: initial, bookingLink, apiUrl, token }: DiscoveryClientProps) {
  const [prospects, setProspects] = useState<DiscoveryProspect[]>(initial)
  const [copied, setCopied] = useState(false)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/prospects`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = (await res.json()) as { prospects: DiscoveryProspect[] }
        setProspects(data.prospects)
      }
    } catch {
      // silently ignore — keep showing last known data
    }
  }, [apiUrl, token])

  // Poll every 10 seconds so pending → offered transitions appear without navigation
  useEffect(() => {
    const id = setInterval(() => { void poll() }, 10_000)
    return () => clearInterval(id)
  }, [poll])

  function handleCopy() {
    void navigator.clipboard.writeText(bookingLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const pendingCount = prospects.filter((p) => p.status === 'pending').length
  const offeredCount = prospects.filter((p) => p.status === 'offered').length

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNav />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Page header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Discovery Prospects
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Leads who have submitted discovery flight requests
          </Typography>
        </Box>

        {/* Action alert — shown when there are offered prospects waiting for review */}
        {offeredCount > 0 && (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Button
                component={Link}
                href="/queue?workflowType=discovery_flight"
                size="small"
                color="inherit"
                endIcon={<ArrowForwardIcon />}
              >
                Go to Queue
              </Button>
            }
          >
            {offeredCount} prospect{offeredCount > 1 ? 's have' : ' has'} a slot offer waiting for
            your approval in the Queue.
          </Alert>
        )}

        {pendingCount > 0 && offeredCount === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }} icon={<HourglassEmptyIcon />}>
            {pendingCount} prospect{pendingCount > 1 ? 's are' : ' is'} waiting for the AI to find
            a compliant slot. This happens automatically every 30 seconds.
          </Alert>
        )}

        {/* Booking link card */}
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
              Public booking link
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Share this with prospective students. When they submit, they appear below and the AI
              automatically finds them a daylight-compliant slot.
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={bookingLink}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
                      <IconButton size="small" onClick={handleCopy} edge="end">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            {copied && (
              <Alert severity="success" sx={{ mt: 1.5 }} icon={false}>
                Link copied to clipboard
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Prospects list */}
        {prospects.length === 0 ? (
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
            <ExploreIcon sx={{ fontSize: 56 }} />
            <Typography variant="body1" fontWeight={600}>
              No prospects yet
            </Typography>
            <Typography variant="body2" color="text.disabled" textAlign="center">
              Share the booking link above to get started. Prospect submissions will appear here.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {prospects.map((p) => (
              <ProspectRow key={p.id} prospect={p} />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  )
}
