'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

interface BulkActionsProps {
  selected: string[]
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkApprove: () => void
  totalVisible: number
  loading: boolean
}

export function BulkActions({
  selected,
  onSelectAll,
  onClearSelection,
  onBulkApprove,
  totalVisible,
  loading,
}: BulkActionsProps) {
  if (totalVisible === 0) return null

  const allSelected = selected.length === totalVisible && totalVisible > 0

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'primary.light',
        bgcolor: 'primary.50',
        background: 'rgba(30, 64, 175, 0.04)',
      }}
    >
      <Checkbox
        size="small"
        checked={allSelected}
        indeterminate={selected.length > 0 && !allSelected}
        onChange={allSelected ? onClearSelection : onSelectAll}
        sx={{ p: 0.5 }}
      />
      <Typography variant="body2" color="primary.main" fontWeight={500} sx={{ flexGrow: 1 }}>
        {selected.length > 0 ? `${selected.length} selected` : `${totalVisible} suggestions`}
      </Typography>
      {selected.length > 0 && (
        <>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={onBulkApprove}
            disabled={loading}
          >
            {loading ? 'Approving…' : `Approve ${selected.length}`}
          </Button>
          <Button size="small" variant="text" onClick={onClearSelection} sx={{ color: 'text.secondary' }}>
            Clear
          </Button>
        </>
      )}
    </Box>
  )
}
