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
  },
  global: {
    headers: {
      'x-application-name': 'admission-desk'
    }
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
