/**
 * useRealtimeRecovery – Global Realtime Connection Recovery Hook
 * 
 * Handles:
 * - Reconnecting dead realtime channels on slow/dropped connections
 * - Triggering data refetches on visibility change / network reconnect
 * - Periodic health checks with progressive backoff
 * - Online/offline status tracking for the entire app
 * 
 * IMPORTANT: Does NOT call supabase.auth.getSession() to avoid Web Locks deadlock.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from './supabase'

/** How often to check channel health (in ms) */
const HEALTH_CHECK_INTERVAL = 30_000

/** Minimum time tab must be hidden before full reconnect (20s — lowered for slow networks) */
const MIN_HIDDEN_FOR_RECONNECT = 20_000

/** Debounce time to avoid rapid-fire refetches */
const REFETCH_DEBOUNCE = 2000

/** Global refetch listeners – pages register callbacks here */
type RefetchCallback = () => void
const refetchListeners = new Set<RefetchCallback>()

/** Track last refetch to debounce */
let lastRefetchTime = 0

/**
 * Register a refetch callback. Returns an unregister function.
 */
export function onGlobalRefetch(cb: RefetchCallback): () => void {
  refetchListeners.add(cb)
  return () => { refetchListeners.delete(cb) }
}

/**
 * Trigger all registered refetch callbacks (debounced)
 */
function triggerGlobalRefetch() {
  const now = Date.now()
  if (now - lastRefetchTime < REFETCH_DEBOUNCE) {
    return // Too soon since last refetch
  }
  lastRefetchTime = now
  console.log(`[RealtimeRecovery] Triggering global refetch for ${refetchListeners.size} listeners`)
  refetchListeners.forEach(cb => {
    try { cb() } catch (e) { console.error('[RealtimeRecovery] Refetch callback error:', e) }
  })
}

/**
 * Reconnect any dead Supabase Realtime channels.
 */
function reconnectDeadChannels() {
  try {
    const channels = supabase.getChannels()
    if (channels.length === 0) return

    let reconnected = 0
    for (const channel of channels) {
      if (channel.state === 'closed' || channel.state === 'errored') {
        try {
          channel.subscribe((status) => {
            if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
              console.warn(`[RealtimeRecovery] Channel resubscribe failed: ${status}`)
            }
          })
          reconnected++
        } catch (e) {
          console.warn(`[RealtimeRecovery] Failed to resubscribe channel:`, e)
        }
      }
    }
    if (reconnected > 0) {
      console.log(`[RealtimeRecovery] Reconnected ${reconnected} dead channel(s)`)
    }
  } catch (e) {
    console.error('[RealtimeRecovery] Error reconnecting channels:', e)
  }
}

/**
 * useRealtimeRecovery – Call this once at the app level (e.g., in App or AuthProvider).
 * Returns connection health status for optional UI indicators.
 */
export function useRealtimeRecovery() {
  const [connectionHealthy, setConnectionHealthy] = useState(navigator.onLine !== false)
  const lastVisibleRef = useRef(Date.now())
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const consecutiveFailsRef = useRef(0)

  // Handle tab visibility changes — NO auth calls, just channel+data recovery
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      const timeSinceHidden = Date.now() - lastVisibleRef.current

      if (timeSinceHidden > MIN_HIDDEN_FOR_RECONNECT) {
        console.log('[RealtimeRecovery] Tab returned after', Math.round(timeSinceHidden / 1000), 's — full reconnect')
        reconnectDeadChannels()
        // Slight delay before refetching to let channels reconnect
        setTimeout(triggerGlobalRefetch, 500)
        setConnectionHealthy(true)
      } else {
        // Short absence — just refetch data
        triggerGlobalRefetch()
      }

      lastVisibleRef.current = Date.now()
    } else {
      lastVisibleRef.current = Date.now()
    }
  }, [])

  // Handle network online — NO auth calls
  const handleOnline = useCallback(() => {
    console.log('[RealtimeRecovery] Network came online')
    setConnectionHealthy(true)
    consecutiveFailsRef.current = 0
    reconnectDeadChannels()
    // Delay refetch slightly to let connection stabilize
    setTimeout(triggerGlobalRefetch, 1000)
  }, [])

  const handleOffline = useCallback(() => {
    console.log('[RealtimeRecovery] Network went offline')
    setConnectionHealthy(false)
  }, [])

  // Periodic health check with progressive backoff on failures
  const performHealthCheck = useCallback(() => {
    if (document.visibilityState !== 'visible') return

    const channels = supabase.getChannels()
    if (channels.length === 0) return

    const deadChannels = channels.filter(ch => ch.state === 'errored' || ch.state === 'closed')

    if (deadChannels.length > 0) {
      consecutiveFailsRef.current++
      console.log(`[RealtimeRecovery] Health check: ${deadChannels.length} dead channel(s), consecutive fails: ${consecutiveFailsRef.current}`)
      setConnectionHealthy(false)
      reconnectDeadChannels()

      // Only trigger refetch if we haven't been failing too much (prevents spam)
      if (consecutiveFailsRef.current <= 5) {
        triggerGlobalRefetch()
      }
    } else {
      if (!connectionHealthy || consecutiveFailsRef.current > 0) {
        console.log('[RealtimeRecovery] Health check: all channels healthy')
        setConnectionHealthy(true)
      }
      consecutiveFailsRef.current = 0
    }
  }, [connectionHealthy])

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    healthCheckRef.current = setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (healthCheckRef.current) clearInterval(healthCheckRef.current)
    }
  }, [handleVisibilityChange, handleOnline, handleOffline, performHealthCheck])

  return { connectionHealthy }
}

/**
 * usePageRefetch – pages register a callback to be called on global recovery events.
 * The callback is automatically updated if the function reference changes.
 */
export function usePageRefetch(refetchFn: RefetchCallback) {
  const refetchRef = useRef(refetchFn)
  refetchRef.current = refetchFn

  useEffect(() => {
    const unregister = onGlobalRefetch(() => refetchRef.current())
    return unregister
  }, [])
}
