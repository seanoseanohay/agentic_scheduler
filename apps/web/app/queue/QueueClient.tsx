'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Suggestion, WorkflowType } from '@oneshot/shared-types'
import { SuggestionCard } from '@/components/queue/SuggestionCard'
import { QueueFilters } from '@/components/queue/QueueFilters'
import { BulkActions } from '@/components/queue/BulkActions'
import { AppNav } from '@/components/AppNav'
import { useQueueUpdates } from '@/hooks/useQueueUpdates'

import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import InboxIcon from '@mui/icons-material/Inbox'

interface QueueClientProps {
  operatorId: string
  apiUrl: string
  token: string
  initialWorkflowType?: string
}

export function QueueClient({ operatorId, apiUrl, token, initialWorkflowType = '' }: QueueClientProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [workflowType, setWorkflowType] = useState<WorkflowType | ''>(initialWorkflowType as WorkflowType | '')
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [live, setLive] = useState(false)

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

  useEffect(() => {
    setLoading(true)
    void fetchSuggestions()
  }, [fetchSuggestions])

  useQueueUpdates(apiUrl, token, () => {
    setLive(true)
    setTimeout(() => setLive(false), 2500)
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNav live={live} />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Page header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Approval Queue
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.25}>
              Review and approve scheduling suggestions
            </Typography>
          </Box>
          <Chip
            label={loading ? '…' : `${suggestions.length} pending`}
            color="primary"
            variant="filled"
            size="medium"
            sx={{ fontWeight: 700, fontSize: '0.875rem', px: 0.5 }}
          />
        </Box>

        {/* Filters */}
        <Box sx={{ mb: 2 }}>
          <QueueFilters workflowType={workflowType} onWorkflowTypeChange={setWorkflowType} />
        </Box>

        {/* Bulk actions */}
        <Box sx={{ mb: 2 }}>
          <BulkActions
            selected={selected}
            onSelectAll={() => setSelected(visibleIds)}
            onClearSelection={() => setSelected([])}
            onBulkApprove={handleBulkApprove}
            totalVisible={suggestions.length}
            loading={bulkLoading}
          />
        </Box>

        {/* Queue list */}
        {loading ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={220} />
            ))}
          </Stack>
        ) : suggestions.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 10,
              borderRadius: 3,
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <InboxIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body1" color="text.secondary" fontWeight={500}>
              No pending suggestions
            </Typography>
            <Typography variant="body2" color="text.disabled" mt={0.5}>
              Workers will generate new suggestions automatically
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {suggestions.map((suggestion) => (
              <Box key={suggestion.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Checkbox
                  size="small"
                  checked={selected.includes(suggestion.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, suggestion.id]
                        : prev.filter((id) => id !== suggestion.id),
                    )
                  }
                  sx={{ mt: 1.5, p: 0.5 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <SuggestionCard
                    suggestion={suggestion}
                    apiUrl={apiUrl}
                    authHeaders={headers}
                    onApproved={() => handleApprove(suggestion.id)}
                    onRejected={() => handleReject(suggestion.id)}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  )
}
