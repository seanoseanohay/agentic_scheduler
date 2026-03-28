'use client'

import { AppNav } from '@/components/AppNav'
import type { Tenant, RankingWeights } from '@oneshot/shared-types'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EmailIcon from '@mui/icons-material/Email'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SmsIcon from '@mui/icons-material/Sms'
import TuneIcon from '@mui/icons-material/Tune'

const WEIGHT_LABELS: Record<keyof RankingWeights, string> = {
  timeSinceLastFlight: 'Time since last flight',
  timeUntilNextFlight: 'Time until next flight',
  totalHours: 'Total logged hours',
  instructorContinuity: 'Instructor continuity',
  aircraftContinuity: 'Aircraft continuity',
}

interface SettingsClientProps {
  tenant: Tenant | null
  operatorId: string
}

export function SettingsClient({ tenant, operatorId }: SettingsClientProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNav />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Page header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Tenant configuration for {operatorId}
          </Typography>
        </Box>

        {!tenant ? (
          <Alert severity="warning">
            Could not load tenant configuration. The API may be starting up — refresh in a moment.
          </Alert>
        ) : (
          <Stack spacing={3}>
            {/* Tenant Info */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2} color="text.primary">
                  Operator
                </Typography>
                <Grid container spacing={2}>
                  {[
                    ['Name', tenant.name],
                    ['Operator ID', tenant.operatorId],
                    ['Timezone', tenant.timezone],
                    ['Search window', `${tenant.searchWindowDays} days`],
                    [
                      'Continuity preference',
                      tenant.continuityPreference.charAt(0).toUpperCase() +
                        tenant.continuityPreference.slice(1),
                    ],
                  ].map(([label, value]) => (
                    <Grid item xs={12} sm={6} key={label}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {value}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Ranking Weights */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                  <TuneIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Ranking Weights
                  </Typography>
                </Box>
                <Stack spacing={2}>
                  {(Object.entries(tenant.rankingWeights) as [keyof RankingWeights, number][]).map(
                    ([key, value]) => (
                      <Box key={key}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.5,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {WEIGHT_LABELS[key]}
                          </Typography>
                          <Typography variant="caption" fontWeight={700} color="text.primary">
                            {Math.round(value * 100)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={value * 100}
                          color="primary"
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'grey.100',
                            '& .MuiLinearProgress-bar': { borderRadius: 3 },
                          }}
                        />
                      </Box>
                    ),
                  )}
                </Stack>
                <Typography variant="caption" color="text.disabled" mt={1.5} display="block">
                  Weights determine how suggestions are ranked in the approval queue. Contact support
                  to adjust.
                </Typography>
              </CardContent>
            </Card>

            {/* Notification Policy */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                  <NotificationsIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Notifications
                  </Typography>
                </Box>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      Email notifications
                    </Typography>
                    <Chip
                      label={tenant.notificationPolicy.emailEnabled ? 'Enabled' : 'Disabled'}
                      color={tenant.notificationPolicy.emailEnabled ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <SmsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      SMS notifications
                    </Typography>
                    <Chip
                      label={tenant.notificationPolicy.smsEnabled ? 'Enabled' : 'Disabled'}
                      color={tenant.notificationPolicy.smsEnabled ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AccessTimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      Offer expiry
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {tenant.notificationPolicy.offerExpiryHours}h
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      Brand name
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {tenant.notificationPolicy.brandName}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}
      </Container>
    </Box>
  )
}
