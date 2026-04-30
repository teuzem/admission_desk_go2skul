/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'admission-desk-auth',
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-application-name': 'admission-desk'
    },
    fetch: (url, options = {}) => {
      // Add timeout to all fetch requests for slow connections
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000)
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId))
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    heartbeatIntervalMs: 15000,
    reconnectAfterMs: (tries: number) => Math.min(1000 * Math.pow(2, tries), 30000),
    timeout: 30000,
  },
  db: {
    schema: 'public',
  },
})

export type SupabaseClient = typeof supabase

// ─── Query Cache Utility ───────────────────────────────────────────
// Simple in-memory + localStorage cache for resilient data loading
const CACHE_PREFIX = 'ad-cache-'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export const queryCache = {
  set<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl }
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
    } catch {
      // localStorage full or unavailable — silent fail
    }
  },

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key)
      if (!raw) return null
      const entry: CacheEntry<T> = JSON.parse(raw)
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(CACHE_PREFIX + key)
        return null
      }
      return entry.data
    } catch {
      return null
    }
  },

  invalidate(key: string): void {
    try { localStorage.removeItem(CACHE_PREFIX + key) } catch { /* noop */ }
  },

  invalidateAll(): void {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
      keys.forEach(k => localStorage.removeItem(k))
    } catch { /* noop */ }
  },
}

// ─── Retry wrapper for Supabase queries on slow connections ────────
export async function withRetry<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<{ data: T | null; error: any }> {
  let lastError: any = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      if (!result.error) return result
      // Don't retry on auth/permission errors (4xx)
      if (result.error.code && !result.error.code.startsWith('5') && result.error.code !== 'PGRST301') {
        return result
      }
      lastError = result.error
    } catch (err: any) {
      lastError = err
      // Only retry on network/timeout errors
      if (err?.name !== 'AbortError' && !err?.message?.includes('fetch')) {
        return { data: null, error: err }
      }
    }
    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500
      await new Promise(r => setTimeout(r, delay))
    }
  }
  return { data: null, error: lastError }
}
