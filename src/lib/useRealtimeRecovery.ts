/**
 * useRealtimeRecovery – Global Realtime Connection Recovery Hook
 * 
 * IMPORTANT: This hook does NOT call supabase.auth.getSession() to avoid
 * the Web Locks API deadlock. Auth is managed solely by AuthContext.
 * This hook only handles:
 * - Reconnecting dead realtime channels
 * - Triggering data refetches on visibility change / network reconnect
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from './supabase'

/** How often to check channel health (in ms) */
const HEALTH_CHECK_INTERVAL = 45_000

/** Minimum time tab must be hidden before full reconnect (30s) */
const MIN_HIDDEN_FOR_RECONNECT = 30_000

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

    for (const channel of channels) {
      if (channel.state === 'closed' || channel.state === 'errored') {
        console.log(`[RealtimeRecovery] Resubscribing dead channel (state: ${channel.state})`)
        try {
          channel.subscribe((status) => {
            if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
              console.warn(`[RealtimeRecovery] Channel resubscribe failed: ${status}`)
            }
          })
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
 */
export function useRealtimeRecovery() {
  const [connectionHealthy, setConnectionHealthy] = useState(true)
  const lastVisibleRef = useRef(Date.now())
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Handle tab visibility changes — NO auth calls, just channel+data recovery
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      const timeSinceHidden = Date.now() - lastVisibleRef.current

      if (timeSinceHidden > MIN_HIDDEN_FOR_RECONNECT) {
        console.log('[RealtimeRecovery] Tab returned after', Math.round(timeSinceHidden / 1000), 's')
        // Reconnect dead channels and refetch data
        reconnectDeadChannels()
        triggerGlobalRefetch()
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
    reconnectDeadChannels()
    triggerGlobalRefetch()
  }, [])

  const handleOffline = useCallback(() => {
    console.log('[RealtimeRecovery] Network went offline')
    setConnectionHealthy(false)
  }, [])

  // Periodic health check — only reconnect dead channels, no auth calls
  const performHealthCheck = useCallback(() => {
    if (document.visibilityState !== 'visible') return
    
    const channels = supabase.getChannels()
    if (channels.length === 0) return

    const hasDeadChannels = channels.some(ch => ch.state === 'errored' || ch.state === 'closed')
    
    if (hasDeadChannels) {
      console.log('[RealtimeRecovery] Health check found dead channels')
      setConnectionHealthy(false)
      reconnectDeadChannels()
      triggerGlobalRefetch()
      setConnectionHealthy(true)
    }
  }, [])

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
 */
export function usePageRefetch(refetchFn: RefetchCallback) {
  const refetchRef = useRef(refetchFn)
  refetchRef.current = refetchFn

  useEffect(() => {
    const unregister = onGlobalRefetch(() => refetchRef.current())
    return unregister
  }, [])
}
