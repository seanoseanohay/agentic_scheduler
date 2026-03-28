'use client'

import { AppNav } from '@/components/AppNav'
import type { RawSuggestion } from './page'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonIcon from '@mui/icons-material/Person'
import SchoolIcon from '@mui/icons-material/School'

/** Display-name lookups for mock FSP entities. */
const STUDENT_NAMES: Record<string, string> = {
  'stu-001': 'Alice Nguyen',
  'stu-002': 'Bob Kowalski',
  'stu-003': 'Carol Park',
}
const INSTRUCTOR_NAMES: Record<string, string> = {
  'ins-001': 'Dave Martinez',
  'ins-002': 'Eve Thompson',
}

const WORKFLOW_CONFIG: Record<
  string,
  { label: string; color: 'secondary' | 'warning' | 'info' | 'success' | 'default' }
> = {
  waitlist_fill: { label: 'Waitlist Fill', color: 'secondary' },
  cancellation_recovery: { label: 'Cancellation Recovery', color: 'warning' },
  discovery_flight: { label: 'Discovery Flight', color: 'info' },
  next_lesson: { label: 'Next Lesson', color: 'success' },
}

interface FlightsClientProps {
  flights: RawSuggestion[]
}

function FlightRow({ flight }: { flight: RawSuggestion }) {
  const wf = WORKFLOW_CONFIG[flight.workflowType] ?? {
    label: flight.workflowType,
    color: 'default' as const,
  }

  const startDate = new Date(flight.candidate.startTime)
  const endDate = new Date(flight.candidate.endTime)

  const timeStr = `${startDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })} – ${endDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          {/* Workflow chip */}
          <Chip label={wf.label} color={wf.color} size="small" variant="outlined" />

          {/* Time */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {timeStr}
            </Typography>
          </Box>

          {/* Student */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {STUDENT_NAMES[flight.candidate.studentId] ?? flight.candidate.studentId}
            </Typography>
          </Box>

          {/* Instructor */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SchoolIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {INSTRUCTOR_NAMES[flight.candidate.instructorId] ?? flight.candidate.instructorId}
            </Typography>
          </Box>

          {/* Aircraft */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AirplanemodeActiveIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {flight.candidate.aircraftId}
            </Typography>
          </Box>

          {flight.candidate.lessonType && (
            <Typography variant="caption" color="text.disabled">
              {flight.candidate.lessonType}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

/** Group flights by date label (e.g. "Mon, Mar 27, 2026") */
function groupByDate(flights: RawSuggestion[]): { dateLabel: string; flights: RawSuggestion[] }[] {
  const map = new Map<string, RawSuggestion[]>()
  for (const flight of flights) {
    const label = new Date(flight.candidate.startTime).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const group = map.get(label) ?? []
    group.push(flight)
    map.set(label, group)
  }
  return Array.from(map.entries()).map(([dateLabel, flights]) => ({ dateLabel, flights }))
}

export function FlightsClient({ flights }: FlightsClientProps) {
  const groups = groupByDate(flights)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNav />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Page header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Flights
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Upcoming booked flights — confirmed and scheduled
          </Typography>
        </Box>

        {flights.length === 0 ? (
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
            <AirplanemodeActiveIcon sx={{ fontSize: 56 }} />
            <Typography variant="body1" fontWeight={600}>
              No flights booked yet
            </Typography>
            <Typography variant="body2" color="text.disabled" textAlign="center">
              Booked flights will appear here once suggestions are approved and confirmed.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={4}>
            {groups.map(({ dateLabel, flights: dayFlights }) => (
              <Box key={dateLabel}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ display: 'block', mb: 1.5, letterSpacing: 1 }}
                >
                  {dateLabel}
                </Typography>
                <Stack spacing={1.5}>
                  {dayFlights.map((f) => (
                    <FlightRow key={f.id} flight={f} />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  )
}
