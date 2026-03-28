'use client'

import { AppNav } from '@/components/AppNav'
import type { RawSuggestion } from './page'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive'
import { useCallback, useEffect, useRef, useState } from 'react'

const STUDENT_NAMES: Record<string, string> = {
  'stu-001': 'Alice Nguyen',
  'stu-002': 'Bob Kowalski',
  'stu-003': 'Carol Park',
}
const INSTRUCTOR_NAMES: Record<string, string> = {
  'ins-001': 'Dave Martinez',
  'ins-002': 'Eve Thompson',
}

const HOUR_START = 6
const HOUR_END = 21
const CELL_HEIGHT = 64 // px per hour
const TIME_COL_WIDTH = 52

const WORKFLOW_COLORS: Record<string, string> = {
  waitlist_fill: '#7C3AED',
  cancellation_recovery: '#D97706',
  discovery_flight: '#2563EB',
  next_lesson: '#059669',
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function weekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date, yr?: boolean) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(yr ? { year: 'numeric' } : {}) })
  return `${fmt(monday)} – ${fmt(sunday, true)}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Assign column indices to overlapping blocks so they render side-by-side. */
function layoutBlocks(flights: RawSuggestion[]): { flight: RawSuggestion; col: number; totalCols: number }[] {
  const sorted = [...flights].sort(
    (a, b) => new Date(a.candidate.startTime).getTime() - new Date(b.candidate.startTime).getTime(),
  )

  const result: { flight: RawSuggestion; col: number; totalCols: number }[] = []
  // groups: each group is a set of overlapping events
  const groups: { flight: RawSuggestion; col: number; endTime: number }[][] = []

  for (const flight of sorted) {
    const start = new Date(flight.candidate.startTime).getTime()
    const end = new Date(flight.candidate.endTime).getTime()

    // Find an existing group that overlaps with this flight
    let placed = false
    for (const group of groups) {
      // Check if this flight overlaps with any event in the group
      const overlaps = group.some((e) => {
        const eStart = new Date(e.flight.candidate.startTime).getTime()
        const eEnd = new Date(e.flight.candidate.endTime).getTime()
        return start < eEnd && end > eStart
      })
      if (overlaps) {
        // Assign the next available column within this group
        const usedCols = new Set(group.map((e) => e.col))
        let col = 0
        while (usedCols.has(col)) col++
        group.push({ flight, col, endTime: end })
        placed = true
        break
      }
    }
    if (!placed) {
      groups.push([{ flight, col: 0, endTime: end }])
    }
  }

  // Compute totalCols for each group and build result
  for (const group of groups) {
    const totalCols = Math.max(...group.map((e) => e.col)) + 1
    for (const entry of group) {
      result.push({ flight: entry.flight, col: entry.col, totalCols })
    }
  }
  return result
}

interface FlightsClientProps {
  flights: RawSuggestion[]
  apiUrl: string
  token: string
}

export function FlightsClient({ flights: initial, apiUrl, token }: FlightsClientProps) {
  const [flights, setFlights] = useState<RawSuggestion[]>(initial)
  const [weekOffset, setWeekOffset] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const gridRef = useRef<HTMLDivElement>(null)

  // Poll for new booked flights every 30s so calendar updates after approvals
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/suggestions?status=booked&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = (await res.json()) as { suggestions: RawSuggestion[] }
      const sorted = (data.suggestions ?? []).sort(
        (a, b) => new Date(a.candidate.startTime).getTime() - new Date(b.candidate.startTime).getTime(),
      )
      setFlights(sorted)
    } catch {
      // keep last-known data on network error
    }
  }, [apiUrl, token])

  useEffect(() => {
    const flightPoll = setInterval(() => { void poll() }, 30_000)
    const clockTick = setInterval(() => setNow(new Date()), 60_000)
    return () => { clearInterval(flightPoll); clearInterval(clockTick) }
  }, [poll])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekStart = getWeekStart(new Date())
  weekStart.setDate(weekStart.getDate() + weekOffset * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const weekFlights = flights.filter((f) => {
    const t = new Date(f.candidate.startTime).getTime()
    return t >= weekStart.getTime() && t < weekEnd.getTime()
  })

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  const nowHour = now.getHours() + now.getMinutes() / 60
  const showNowLine = days.some((d) => isSameDay(d, today)) && nowHour >= HOUR_START && nowHour < HOUR_END
  const nowTop = (nowHour - HOUR_START) * CELL_HEIGHT

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNav />

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>Flights</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Confirmed bookings — updates automatically when suggestions are approved
          </Typography>
        </Box>

        {/* Week nav */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Button size="small" variant="outlined" startIcon={<ChevronLeftIcon />} onClick={() => setWeekOffset((o) => o - 1)}>
            Prev
          </Button>
          <Typography variant="body1" fontWeight={600} sx={{ minWidth: 210, textAlign: 'center' }}>
            {weekLabel(weekStart)}
          </Typography>
          <Button size="small" variant="outlined" endIcon={<ChevronRightIcon />} onClick={() => setWeekOffset((o) => o + 1)}>
            Next
          </Button>
          <Button size="small" variant="text" onClick={() => setWeekOffset(0)} sx={{ ml: 1 }}>
            Today
          </Button>
        </Box>

        {/* Calendar */}
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: 'background.paper' }}>

          {/* Day header row */}
          <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
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
                  <Typography variant="caption" display="block" color={isToday ? 'primary.main' : 'text.secondary'} fontWeight={isToday ? 700 : 400} sx={{ lineHeight: 1.2, mb: 0.5 }}>
                    {DAY_NAMES[i]}
                  </Typography>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', bgcolor: isToday ? 'primary.main' : 'transparent' }}>
                    <Typography variant="body2" fontWeight={700} color={isToday ? 'white' : 'text.primary'} sx={{ lineHeight: 1 }}>
                      {day.getDate()}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>

          {/* Scrollable grid */}
          <Box ref={gridRef} sx={{ overflowY: 'auto', maxHeight: 'calc(100vh - 230px)', position: 'relative' }}>
            {weekFlights.length === 0 && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, color: 'text.disabled', zIndex: 2, pointerEvents: 'none', minHeight: hours.length * CELL_HEIGHT }}>
                <AirplanemodeActiveIcon sx={{ fontSize: 48 }} />
                <Typography variant="body1" fontWeight={600}>No flights this week</Typography>
                <Typography variant="body2" textAlign="center">Approve suggestions in the Queue to schedule flights.</Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', position: 'relative' }}>
              {/* Time labels */}
              <Box sx={{ width: TIME_COL_WIDTH, flexShrink: 0 }}>
                {hours.map((h) => (
                  <Box key={h} sx={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 1, pt: 0.5 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                      {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Day columns */}
              {days.map((day, dayIdx) => {
                const isToday = isSameDay(day, today)
                const dayFlights = weekFlights.filter((f) => isSameDay(new Date(f.candidate.startTime), day))
                const laid = layoutBlocks(dayFlights)

                return (
                  <Box
                    key={dayIdx}
                    sx={{ flex: 1, borderLeft: '1px solid', borderColor: 'divider', position: 'relative', bgcolor: isToday ? 'rgba(30,64,175,0.03)' : 'transparent' }}
                  >
                    {/* Hour grid lines */}
                    {hours.map((h, rowIdx) => (
                      <Box key={h} sx={{ height: CELL_HEIGHT, borderBottom: '1px solid', borderColor: 'divider', bgcolor: rowIdx % 2 === 1 ? 'rgba(0,0,0,0.012)' : 'transparent' }} />
                    ))}

                    {/* Flight blocks — side-by-side when overlapping */}
                    {laid.map(({ flight, col, totalCols }) => {
                      const start = new Date(flight.candidate.startTime)
                      const end = new Date(flight.candidate.endTime)
                      const startH = start.getHours() + start.getMinutes() / 60
                      const endH = end.getHours() + end.getMinutes() / 60
                      const top = (startH - HOUR_START) * CELL_HEIGHT
                      const height = Math.max((endH - startH) * CELL_HEIGHT, 24)
                      const color = WORKFLOW_COLORS[flight.workflowType] ?? '#6B7280'

                      // Side-by-side: divide column width evenly, leave 3px gap on each side
                      const gutter = 3
                      const colW = `calc((100% - ${gutter * 2}px) / ${totalCols})`
                      const leftOffset = `calc(${gutter}px + (100% - ${gutter * 2}px) / ${totalCols} * ${col})`

                      const studentName =
                        STUDENT_NAMES[flight.candidate.studentId] ??
                        (flight.workflowType === 'discovery_flight' ? 'Discovery Prospect' : flight.candidate.studentId)
                      const instructorName =
                        INSTRUCTOR_NAMES[flight.candidate.instructorId] ?? flight.candidate.instructorId

                      const timeLabel = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

                      return (
                        <Tooltip
                          key={flight.id}
                          title={`${studentName} · ${instructorName} · ${timeLabel}`}
                          placement="top"
                          arrow
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              top,
                              left: leftOffset,
                              width: colW,
                              height,
                              bgcolor: color,
                              borderRadius: 0.75,
                              overflow: 'hidden',
                              px: 0.75,
                              py: 0.4,
                              cursor: 'default',
                              zIndex: 1,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              '&:hover': { filter: 'brightness(1.1)', zIndex: 3 },
                              transition: 'filter 0.1s',
                            }}
                          >
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'white', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {studentName}
                            </Typography>
                            {height >= 36 && (
                              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.82)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {instructorName}
                              </Typography>
                            )}
                            {height >= 52 && (
                              <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', lineHeight: 1.3 }}>
                                {timeLabel}
                              </Typography>
                            )}
                          </Box>
                        </Tooltip>
                      )
                    })}

                    {/* Current-time red line */}
                    {isToday && showNowLine && (
                      <Box sx={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, bgcolor: 'error.main', zIndex: 2, pointerEvents: 'none', '&::before': { content: '""', position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' } }} />
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
