'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import ExploreIcon from '@mui/icons-material/Explore'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import HistoryIcon from '@mui/icons-material/History'
import ListAltIcon from '@mui/icons-material/ListAlt'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsIcon from '@mui/icons-material/Settings'
import { signOutAction } from '@/app/actions'

const NAV_LINKS = [
  { href: '/queue', label: 'Queue', icon: <ListAltIcon fontSize="small" /> },
  { href: '/discovery', label: 'Discovery', icon: <ExploreIcon fontSize="small" /> },
  { href: '/settings', label: 'Settings', icon: <SettingsIcon fontSize="small" /> },
  { href: '/history', label: 'History', icon: <HistoryIcon fontSize="small" /> },
]

interface AppNavProps {
  live?: boolean
}

export function AppNav({ live = false }: AppNavProps) {
  const pathname = usePathname()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar>
        {/* Logo */}
        <Box
          component={Link}
          href="/queue"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            textDecoration: 'none',
            flexShrink: 0,
            mr: 3,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FlightTakeoffIcon sx={{ color: 'white', fontSize: 17 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            OneShot
          </Typography>
        </Box>

        {/* Nav links */}
        <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/queue' && pathname.startsWith(href))
            return (
              <Button
                key={href}
                component={Link}
                href={href}
                size="small"
                sx={{
                  color: active ? 'primary.main' : 'text.secondary',
                  fontWeight: active ? 700 : 500,
                  bgcolor: active ? 'primary.50' : 'transparent',
                  background: active ? 'rgba(30, 64, 175, 0.06)' : undefined,
                  '&:hover': { bgcolor: 'rgba(30, 64, 175, 0.04)' },
                  borderRadius: 2,
                  px: 1.5,
                }}
              >
                {label}
              </Button>
            )
          })}
        </Box>

        {/* Live indicator */}
        {live && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1.5 }}>
            <FiberManualRecordIcon
              sx={{ fontSize: 10, color: 'success.main', animation: 'pulse 1s infinite' }}
            />
            <Typography variant="caption" color="success.main" fontWeight={600}>
              live
            </Typography>
          </Box>
        )}

        {/* Account menu */}
        <Tooltip title="Account">
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ ml: 0.5 }}
          >
            <AccountCircleIcon />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          slotProps={{ paper: { elevation: 2, sx: { minWidth: 160, mt: 0.5 } } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem
            onClick={async () => {
              setAnchorEl(null)
              await signOutAction()
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
