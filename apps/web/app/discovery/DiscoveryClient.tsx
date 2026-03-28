'use client'

import { useState } from 'react'
import { AppNav } from '@/components/AppNav'
import type { DiscoveryProspect } from './page'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
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
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EmailIcon from '@mui/icons-material/Email'
import ExploreIcon from '@mui/icons-material/Explore'
import PersonIcon from '@mui/icons-material/Person'

interface DiscoveryClientProps {
  operatorId: string
  prospects: DiscoveryProspect[]
  bookingLink: string
}

function ProspectRow({ prospect }: { prospect: DiscoveryProspect }) {
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
            label={prospect.status}
            color={prospect.status === 'pending' ? 'warning' : 'success'}
            size="small"
            sx={{ fontWeight: 600, textTransform: 'capitalize' }}
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
      </CardContent>
    </Card>
  )
}

export function DiscoveryClient({ prospects, bookingLink }: DiscoveryClientProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(bookingLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNav />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Page header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Discovery Prospects
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Leads who have submitted discovery flight requests
          </Typography>
        </Box>

        {/* Booking link card */}
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
              Public booking link
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Share this link with prospective students so they can submit a discovery flight
              request.
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
