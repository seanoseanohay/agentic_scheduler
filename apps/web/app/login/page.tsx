import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import { signIn } from '@/auth'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams
  const hasError = !!params.error
  const azureClientId = process.env['AZURE_AD_CLIENT_ID'] ?? ''
  const showAzure = azureClientId && azureClientId !== 'placeholder'

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlightTakeoffIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              OneShot
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Agentic scheduler for Flight Schedule Pro
          </Typography>

          {hasError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Invalid username or password. Please try again.
            </Alert>
          )}

          {/* Credentials form */}
          <form
            action={async (formData: FormData) => {
              'use server'
              try {
                await signIn('credentials', {
                  username: formData.get('username'),
                  password: formData.get('password'),
                  redirectTo: '/queue',
                })
              } catch (error) {
                if (error instanceof AuthError) {
                  redirect('/login?error=1')
                }
                throw error
              }
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                name="username"
                label="Username"
                type="text"
                autoComplete="username"
                required
                fullWidth
                size="medium"
                error={hasError}
              />
              <TextField
                name="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                fullWidth
                size="medium"
                error={hasError}
              />
              <Button type="submit" variant="contained" size="large" fullWidth sx={{ mt: 0.5 }}>
                Sign in
              </Button>
            </Box>
          </form>

          {showAzure && (
            <>
              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  or
                </Typography>
              </Divider>
              <form
                action={async () => {
                  'use server'
                  await signIn('microsoft-entra-id', { redirectTo: '/queue' })
                }}
              >
                <Button type="submit" variant="outlined" fullWidth>
                  Sign in with Microsoft
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
