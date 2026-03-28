'use client'

import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

interface DiscoveryFormProps {
  operatorId: string
  apiUrl: string
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  requestedDate: string
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

export function DiscoveryForm({ operatorId, apiUrl }: DiscoveryFormProps) {
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    requestedDate: '',
  })
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!operatorId) {
      setErrorMsg('Invalid booking link. Please contact the flight school directly.')
      setStatus('error')
      return
    }
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch(`${apiUrl}/api/v1/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          operatorId,
          requestedDate: form.requestedDate || undefined,
          phone: form.phone || undefined,
        }),
      })
      if (res.ok) {
        setStatus('success')
      } else {
        const data = (await res.json()) as { message?: string }
        setErrorMsg(data.message ?? 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <Card>
        <CardContent sx={{ p: 5, textAlign: 'center' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} mb={1}>
            Request received!
          </Typography>
          <Typography color="text.secondary">
            Thank you, {form.firstName}. We will email you within 24 hours with available discovery
            flight slots.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="First name"
                required
                fullWidth
                value={form.firstName}
                onChange={set('firstName')}
                size="medium"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Last name"
                required
                fullWidth
                value={form.lastName}
                onChange={set('lastName')}
                size="medium"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={form.email}
                onChange={set('email')}
                size="medium"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Phone (optional)"
                type="tel"
                fullWidth
                value={form.phone}
                onChange={set('phone')}
                size="medium"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Preferred date (optional)"
                type="date"
                fullWidth
                value={form.requestedDate}
                onChange={set('requestedDate')}
                inputProps={{ min: new Date().toISOString().substring(0, 10) }}
                InputLabelProps={{ shrink: true }}
                size="medium"
                helperText="All flights are scheduled within FAA civil twilight hours."
              />
            </Grid>
            {status === 'error' && (
              <Grid item xs={12}>
                <Alert severity="error">{errorMsg}</Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={status === 'submitting'}
                startIcon={<FlightTakeoffIcon />}
                sx={{ mt: 0.5 }}
              >
                {status === 'submitting' ? 'Sending…' : 'Request Discovery Flight'}
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Typography
                variant="caption"
                color="text.secondary"
                textAlign="center"
                display="block"
              >
                Payment is collected only after you confirm your slot.
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  )
}
