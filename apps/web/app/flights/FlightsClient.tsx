'use client'

import { AppNav } from '@/components/AppNav'
import type { RawSuggestion } from './page'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive'
import { useEffect, useRef, useState } from 'react'

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

const HOUR_START = 6   // 6 AM
const HOUR_END = 21    // 9 PM (last label; grid ends at 21:00)
const CELL_HEIGHT = 64 // px per hour
const TIME_COL_WIDTH = 56 // px

/** Color map by workflowType → MUI theme color token */
const WORKFLOW_COLORS: Record<string, string> = {
  waitlist_fill: 'secondary.main',
  cancellation_recovery: 'warning.main',
  discovery_flight: 'info.main',
  next_lesson: 'success.main',
}

/** Returns the Monday of the week containing `date` (local time). */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun, 1=Mon…
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Format a week range label like "Apr 7 – Apr 13, 2026". */
function weekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date, year?: boolean) =>
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(year ? { year: 'numeric' } : {}),
    })
  return `${fmt(monday)} – ${fmt(sunday, true)}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface FlightsClientProps {
  flights: RawSuggestion[]
}

export function FlightsClient({ flights }: FlightsClientProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const gridRef = useRef<HTMLDivElement>(null)

  // Update current time every minute for the red indicator
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Monday of the displayed week
  const weekStart = getWeekStart(new Date())
  weekStart.setDate(weekStart.getDate() + weekOffset * 7)

  // Build array of 7 days (Mon–Sun)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  // Filter flights to this week
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const weekFlights = flights.filter((f) => {
    const t = new Date(f.candidate.startTime).getTime()
    return t >= weekStart.getTime() && t < weekEnd.getTime()
  })

  // Hours array for time labels
  const hours = Array.from(
    { length: HOUR_END - HOUR_START },
    (_, i) => HOUR_START + i,
  )

  // Current-time indicator position
  const nowHour = now.getHours() + now.getMinutes() / 60
  const todayInWeek = days.find((d) => isSameDay(d, today))
  const showNowLine =
    todayInWeek !== undefined && nowHour >= HOUR_START && nowHour < HOUR_END
  const nowTop = (nowHour - HOUR_START) * CELL_HEIGHT

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNav />

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Page header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Flights
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Upcoming booked flights — confirmed and scheduled
          </Typography>
        </Box>

        {/* Week navigation bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1.5,
          }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<ChevronLeftIcon />}
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            Prev
          </Button>
          <Typography variant="body1" fontWeight={600} sx={{ minWidth: 200, textAlign: 'center' }}>
            {weekLabel(weekStart)}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            endIcon={<ChevronRightIcon />}
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            Next
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => setWeekOffset(0)}
            sx={{ ml: 1 }}
          >
            Today
          </Button>
        </Box>

        {/* Calendar grid wrapper */}
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {/* Day header row */}
          <Box
            sx={{
              display: 'flex',
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            {/* Corner cell */}
            <Box sx={{ width: TIME_COL_WIDTH, flexShrink: 0 }} />
            {days.map((day, i) => {
              const isToday = isSameDay(day, today)
              return (
                <Box
                  key={i}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    py: 1,
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    bgcolor: isToday ? 'rgba(30,64,175,0.06)' : 'transparent',
                  }}
                >
                  <Typography
                    variant="caption"
                    display="block"
                    color={isToday ? 'primary.main' : 'text.secondary'}
                    fontWeight={isToday ? 700 : 400}
                    sx={{ lineHeight: 1.2, mb: 0.5 }}
                  >
                    {DAY_NAMES[i]}
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: isToday ? 'primary.main' : 'transparent',
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color={isToday ? 'white' : 'text.primary'}
                      sx={{ lineHeight: 1 }}
                    >
                      {day.getDate()}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>

          {/* Scrollable time grid */}
          <Box
            ref={gridRef}
            sx={{
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 220px)',
              position: 'relative',
              bgcolor: 'background.paper',
            }}
          >
            {weekFlights.length === 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1.5,
                  color: 'text.disabled',
                  zIndex: 2,
                  pointerEvents: 'none',
                  minHeight: hours.length * CELL_HEIGHT,
                }}
              >
                <AirplanemodeActiveIcon sx={{ fontSize: 48 }} />
                <Typography variant="body1" fontWeight={600}>
                  No flights this week
                </Typography>
                <Typography variant="body2" textAlign="center">
                  Navigate to another week or wait for bookings to appear.
                </Typography>
              </Box>
            )}

            {/* Hour rows */}
            <Box sx={{ display: 'flex', position: 'relative' }}>
              {/* Time label column */}
              <Box sx={{ width: TIME_COL_WIDTH, flexShrink: 0 }}>
                {hours.map((h) => (
                  <Box
                    key={h}
                    sx={{
                      height: CELL_HEIGHT,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-end',
                      pr: 1,
                      pt: 0.5,
                    }}
                  >
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                      {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Day columns */}
              {days.map((day, dayIdx) => {
                const isToday = isSameDay(day, today)
                const dayFlights = weekFlights.filter((f) =>
                  isSameDay(new Date(f.candidate.startTime), day),
                )

                return (
                  <Box
                    key={dayIdx}
                    sx={{
                      flex: 1,
                      borderLeft: '1px solid',
                      borderColor: 'divider',
                      position: 'relative',
                      bgcolor: isToday ? 'rgba(30,64,175,0.03)' : 'transparent',
                    }}
                  >
                    {/* Hour row dividers */}
                    {hours.map((h, rowIdx) => (
                      <Box
                        key={h}
                        sx={{
                          height: CELL_HEIGHT,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          bgcolor:
                            rowIdx % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent',
                        }}
                      />
                    ))}

                    {/* Flight blocks */}
                    {dayFlights.map((flight) => {
                      const start = new Date(flight.candidate.startTime)
                      const end = new Date(flight.candidate.endTime)
                      const startDecimal = start.getHours() + start.getMinutes() / 60
                      const endDecimal = end.getHours() + end.getMinutes() / 60
                      const durationMinutes = (endDecimal - startDecimal) * 60
                      const top = (startDecimal - HOUR_START) * CELL_HEIGHT
                      const height = Math.max((durationMinutes / 60) * CELL_HEIGHT, 24)

                      const colorToken =
                        WORKFLOW_COLORS[flight.workflowType] ?? 'grey.600'

                      const studentName =
                        STUDENT_NAMES[flight.candidate.studentId] ??
                        (flight.workflowType === 'discovery_flight'
                          ? 'Discovery Prospect'
                          : flight.candidate.studentId)
                      const instructorName =
                        INSTRUCTOR_NAMES[flight.candidate.instructorId] ??
                        flight.candidate.instructorId

                      return (
                        <Box
                          key={flight.id}
                          sx={{
                            position: 'absolute',
                            top,
                            left: 3,
                            right: 3,
                            height,
                            bgcolor: colorToken,
                            borderRadius: 0.75,
                            overflow: 'hidden',
                            px: 0.75,
                            py: 0.5,
                            cursor: 'default',
                            zIndex: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'white',
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {studentName}
                          </Typography>
                          {height >= 36 && (
                            <Typography
                              sx={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.8)',
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {instructorName}
                            </Typography>
                          )}
                        </Box>
                      )
                    })}

                    {/* Current-time red line (only in today's column) */}
                    {isToday && showNowLine && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: nowTop,
                          left: 0,
                          right: 0,
                          height: 2,
                          bgcolor: 'error.main',
                          zIndex: 2,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: -4,
                            top: -4,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: 'error.main',
                          },
                        }}
                      />
                    )}
                  </Box>
                )
              })}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
