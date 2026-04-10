/**
 * useRealtimeRecovery – Global Realtime Connection Recovery Hook
 * 
 * Provides a centralized mechanism to detect and recover from realtime 
 * connection failures in production. Handles:
 * - Tab visibility changes (user leaves and returns)
 * - Network online/offline transitions
 * - Periodic connection health checks
 * - Force refetch signal for all subscribed components
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from './supabase'

/** How often to check channel health (in ms) */
const HEALTH_CHECK_INTERVAL = 60_000 // 1 minute

/** How long after visibility change to force a full reconnect (in ms) */
const VISIBILITY_RECONNECT_DELAY = 500

/** Global refetch listeners – pages register callbacks here */
type RefetchCallback = () => void
const refetchListeners = new Set<RefetchCallback>()

/**
 * Register a refetch callback. Call the returned function to unregister.
 */
export function onGlobalRefetch(cb: RefetchCallback): () => void {
  refetchListeners.add(cb)
  return () => { refetchListeners.delete(cb) }
}

/**
 * Trigger all registered refetch callbacks
 */
function triggerGlobalRefetch() {
  refetchListeners.forEach(cb => {
    try { cb() } catch (e) { console.error('[RealtimeRecovery] Refetch callback error:', e) }
  })
}

/**
 * Reconnect all active Supabase Realtime channels.
 * This forces channels to re-establish their WebSocket subscriptions.
 */
async function reconnectAllChannels() {
  try {
    const channels = supabase.getChannels()
    if (channels.length === 0) return

    // For each channel, unsubscribe and resubscribe to force reconnection
    for (const channel of channels) {
      const state = channel.state
      if (state === 'closed' || state === 'errored') {
        try {
          channel.subscribe()
        } catch (e) {
          console.warn(`[RealtimeRecovery] Failed to resubscribe channel:`, e)
        }
      }
    }
  } catch (e) {
    console.error('[RealtimeRecovery] Error reconnecting channels:', e)
  }
}

/**
 * useRealtimeRecovery – Call this once at the app level (e.g., in AuthProvider)
 * to enable global realtime connection recovery.
 */
export function useRealtimeRecovery() {
  const [connectionHealthy, setConnectionHealthy] = useState(true)
  const lastVisibleRef = useRef(Date.now())
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Handle tab visibility changes
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      const timeSinceHidden = Date.now() - lastVisibleRef.current

      // If tab was hidden for more than 30 seconds, do a full recovery
      if (timeSinceHidden > 30_000) {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = setTimeout(async () => {
          // 1. Refresh the auth token so channels re-auth
          try {
            await supabase.auth.getSession()
          } catch (e) {
            console.warn('[RealtimeRecovery] Token refresh failed:', e)
          }

          // 2. Reconnect any dead channels
          await reconnectAllChannels()

          // 3. Tell all pages to refetch their data
          triggerGlobalRefetch()

          setConnectionHealthy(true)
        }, VISIBILITY_RECONNECT_DELAY)
      } else {
        // Short absence, just trigger refetch
        triggerGlobalRefetch()
      }

      lastVisibleRef.current = Date.now()
    } else {
      lastVisibleRef.current = Date.now()
    }
  }, [])

  // Handle network online/offline
  const handleOnline = useCallback(async () => {
    setConnectionHealthy(true)

    // Refresh auth token
    try {
      await supabase.auth.getSession()
    } catch (e) {
      console.warn('[RealtimeRecovery] Online token refresh failed:', e)
    }

    // Reconnect channels
    await reconnectAllChannels()

    // Refetch all data
    triggerGlobalRefetch()
  }, [])

  const handleOffline = useCallback(() => {
    setConnectionHealthy(false)
  }, [])

  // Periodic health check
  const performHealthCheck = useCallback(() => {
    const channels = supabase.getChannels()
    if (channels.length === 0) {
      setConnectionHealthy(true)
      return
    }

    const hasErroredChannels = channels.some(ch => ch.state === 'errored' || ch.state === 'closed')
    
    if (hasErroredChannels) {
      setConnectionHealthy(false)
      // Attempt recovery
      reconnectAllChannels().then(() => {
        triggerGlobalRefetch()
        setConnectionHealthy(true)
      })
    } else {
      setConnectionHealthy(true)
    }
  }, [])

  useEffect(() => {
    // Register event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Start periodic health check
    healthCheckRef.current = setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (healthCheckRef.current) clearInterval(healthCheckRef.current)
    }
  }, [handleVisibilityChange, handleOnline, handleOffline, performHealthCheck])

  return { connectionHealthy }
}

/**
 * usePageRefetch – Call in each page component to register a refetch callback.
 * The callback will be called whenever the global recovery mechanism detects
 * the need to refetch data (visibility change, network reconnect, etc.)
 */
export function usePageRefetch(refetchFn: RefetchCallback) {
  const refetchRef = useRef(refetchFn)
  refetchRef.current = refetchFn

  useEffect(() => {
    const unregister = onGlobalRefetch(() => refetchRef.current())
    return unregister
  }, [])
}
