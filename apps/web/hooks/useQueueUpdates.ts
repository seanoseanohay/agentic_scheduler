'use client'

import { useEffect, useCallback } from 'react'

interface QueueEvent {
  type: string
  data: unknown
}

/**
 * useQueueUpdates — subscribes to the SSE stream for realtime queue updates.
 *
 * Calls onUpdate whenever the server pushes a queue event. The caller
 * is responsible for re-fetching or updating state in response.
 *
 * The EventSource reconnects automatically on connection loss (browser behaviour).
 */
export function useQueueUpdates(
  apiUrl: string,
  token: string | null,
  onUpdate: (event: QueueEvent) => void,
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: onUpdate is stabilised once on mount
  const stableOnUpdate = useCallback(onUpdate, [])

  useEffect(() => {
    if (!token) return

    // EventSource doesn't support custom headers — we pass token as query param
    // The API validates it the same way as Authorization header
    const url = `${apiUrl}/api/v1/stream/queue?token=${encodeURIComponent(token)}`
    const es = new EventSource(url, { withCredentials: true })

    const handleMessage = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data as string) as unknown
        stableOnUpdate({ type: e.type, data: parsed })
      } catch {
        // Ignore parse errors
      }
    }

    // Listen for all named event types the server emits
    const events = [
      'suggestion.created',
      'suggestion.approved',
      'suggestion.rejected',
      'suggestion.expired',
      'booking.succeeded',
      'booking.failed',
    ]
    for (const evt of events) {
      es.addEventListener(evt, handleMessage)
    }

    return () => {
      for (const evt of events) {
        es.removeEventListener(evt, handleMessage)
      }
      es.close()
    }
  }, [apiUrl, token, stableOnUpdate])
}
