import { signIn } from '@/auth'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'

export default function LoginPage() {
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

          {/* Credentials form */}
          <form
            action={async (formData: FormData) => {
              'use server'
              await signIn('credentials', {
                username: formData.get('username'),
                password: formData.get('password'),
                redirectTo: '/queue',
              })
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
              />
              <TextField
                name="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                fullWidth
                size="medium"
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
