/**
 * Discovery Flight Intake Form — public-facing page.
 * No authentication required.
 */

import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { DiscoveryForm } from './DiscoveryForm'

interface PageProps {
  searchParams: Promise<{ operator?: string }>
}

export default async function DiscoveryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const operatorId = params.operator ?? ''
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #EFF6FF 0%, #F8FAFC 60%)',
      }}
    >
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Box sx={{ mb: 5, textAlign: 'center' }}>
          <Typography variant="h3" fontWeight={800} color="text.primary" mb={1.5}>
            Book a Discovery Flight
          </Typography>
          <Typography variant="body1" color="text.secondary" maxWidth={400} mx="auto">
            Experience the freedom of flight. Fill out the form and we'll send you available slots
            that meet FAA daylight requirements.
          </Typography>
        </Box>
        <DiscoveryForm operatorId={operatorId} apiUrl={apiUrl} />
      </Container>
    </Box>
  )
}
