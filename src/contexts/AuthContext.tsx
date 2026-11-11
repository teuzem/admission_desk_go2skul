import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { supabase, queryCache, type User, type Session, type MfaChallenge } from '../lib/supabase'
import type { Database, UserRole, KycStatus } from '../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export type ExtendedProfile = Database['public']['Tables']['profiles']['Row'] & { effective_agency_id?: string }

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: ExtendedProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null; session?: Session | null; mfa?: MfaChallenge | null; profile?: ExtendedProfile | null }>
  completeSignIn: (session: Session) => Promise<ExtendedProfile | null>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<ExtendedProfile | null>
  isAdmin: boolean
  isSuperAdmin: boolean
  isAdmissionManager: boolean
  isSuperAgent: boolean
  isEditor: boolean
  isProgramManager: boolean
  isTechnicalTeam: boolean
  isContractManager: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ── Profile Cache Keys ──
const PROFILE_CACHE_KEY = (id: string) => `profile-${id}`
const PROFILE_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// ── Retry helper for profile fetching on slow connections ──
async function fetchWithRetry<T>(
  fn: () => PromiseLike<{ data: T | null; error: any }>,
  retries = 3,
  baseDelay = 800
): Promise<{ data: T | null; error: any }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn()
      if (!result.error) return result
      // Don't retry on "row not found" (PGRST116) — that's a real result
      if (result.error.code === 'PGRST116') return result
      // Don't retry on permission errors
      if (result.error.code === '42501' || result.error.code === 'PGRST301') return result
      console.warn(`[Auth] Fetch attempt ${attempt + 1} failed:`, result.error.message)
    } catch (err: any) {
      console.warn(`[Auth] Fetch attempt ${attempt + 1} threw:`, err?.message)
      if (attempt === retries) return { data: null, error: err }
    }
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)))
    }
  }
  return { data: null, error: new Error('All retry attempts failed') }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ExtendedProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)
  const profileFetchedForRef = useRef<string | null>(null)

  // ── Core profile fetcher with retry + cache + self-healing ──
  const fetchProfile = useCallback(async (sessionUser: User): Promise<ExtendedProfile | null> => {
    const cacheKey = PROFILE_CACHE_KEY(sessionUser.id)

    try {
      // Step 1: Try fetching from Supabase with retry
      const { data, error } = await fetchWithRetry(() =>
        supabase.from('profiles').select('*').eq('id', sessionUser.id).single()
      )

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned — profile is genuinely missing
          console.warn('[Auth] Profile missing for user, auto-creating:', sessionUser.email)

          // Self-healing: create the profile
          const { data: newData, error: createError } = await fetchWithRetry(() =>
            supabase.from('profiles').insert({
              id: sessionUser.id,
              email: sessionUser.email,
              role: 'agent' as any,
              is_active: true,
              preferred_language: 'English',
            }).select().single()
          )

          if (createError) {
            console.error('[Auth] Failed to auto-create profile:', createError)
            // Last resort: return a synthetic profile from cache or fabricate one
            const cached = queryCache.get<ExtendedProfile>(cacheKey)
            if (cached) {
              console.log('[Auth] Returning cached profile after create failure')
              return cached
            }
            // Fabricate minimal profile so the user isn't locked out
            return {
              id: sessionUser.id,
              email: sessionUser.email || '',
              role: 'agent' as any,
              is_active: true,
              effective_agency_id: sessionUser.id,
            } as ExtendedProfile
          }

          const created: ExtendedProfile = { ...newData, effective_agency_id: newData.id }
          queryCache.set(cacheKey, created, PROFILE_CACHE_TTL)
          return created
        }

        // Network/timeout error — try cache
        console.error('[Auth] Error fetching profile:', error)
        const cached = queryCache.get<ExtendedProfile>(cacheKey)
        if (cached) {
          console.log('[Auth] Returning cached profile after fetch error')
          return cached
        }
        return null
      }

      // Step 2: Build extended profile
      let extendedData: ExtendedProfile = { ...data, effective_agency_id: data.id }

      if (data.role === 'agent' || data.role === 'editor') {
        let parentId = sessionUser.user_metadata?.parent_agency_id

        if (!parentId) {
          const { data: teamData } = await supabase
            .from('team_members')
            .select('agency_id')
            .eq('invited_email', data.email)
            .eq('status', 'active')
            .maybeSingle()

          if (teamData?.agency_id) parentId = teamData.agency_id
        }

        if (parentId) {
          extendedData.effective_agency_id = parentId

          const { data: parentData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', parentId)
            .single()

          if (parentData) {
            extendedData = {
              ...extendedData,
              agency_name: parentData.agency_name,
              trading_name: parentData.trading_name,
              website: parentData.website,
              country: parentData.country,
              city: parentData.city,
              office_address: parentData.office_address,
              office_country: parentData.office_country,
              office_city: parentData.office_city,
              postal_code: parentData.postal_code,
              facebook_url: parentData.facebook_url,
              twitter_url: parentData.twitter_url,
              linkedin_url: parentData.linkedin_url,
              instagram_url: parentData.instagram_url,
              youtube_url: parentData.youtube_url,
              tiktok_url: parentData.tiktok_url,
              founded_year: parentData.founded_year,
              number_of_employees: parentData.number_of_employees,
              languages_spoken: parentData.languages_spoken,
              primary_market: parentData.primary_market
            }
          }
        }
      }

      // Step 3: Cache the result
      queryCache.set(cacheKey, extendedData, PROFILE_CACHE_TTL)
      return extendedData
    } catch (err) {
      console.error('[Auth] Profile fetch failed:', err)
      // Try returning cached profile on any unexpected error
      const cached = queryCache.get<ExtendedProfile>(cacheKey)
      if (cached) {
        console.log('[Auth] Returning cached profile after unexpected error')
        return cached
      }
      return null
    }
  }, [])

  const refreshProfile = useCallback(async (): Promise<ExtendedProfile | null> => {
    if (user) {
      const p = await fetchProfile(user)
      setProfile(p)
      return p
    }
    return null
  }, [user, fetchProfile])

  // ── Initialize auth state ──
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Hard safety timeout — never leave the app stuck on loading
    const safetyTimer = setTimeout(() => {
      setLoading(prev => {
        if (prev) console.warn('[Auth] Safety timeout – forcing loading=false')
        return false
      })
    }, 12000) // Increased to 12s for slow connections

    // Single getSession call on app startup
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        profileFetchedForRef.current = s.user.id
        const p = await fetchProfile(s.user)
        setProfile(p)
      }
      clearTimeout(safetyTimer)
      setLoading(false)
    }).catch((err) => {
      console.error('[Auth] getSession failed:', err)
      clearTimeout(safetyTimer)
      setLoading(false)
    })

    // Auth state change listener — SYNCHRONOUS only, no async Supabase calls
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (!s?.user) {
        setProfile(null)
        profileFetchedForRef.current = null
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimer)
    }
  }, [fetchProfile])

  // ── Fetch profile when user changes (outside onAuthStateChange to avoid lock) ──
  useEffect(() => {
    if (!user) return

    if (profileFetchedForRef.current !== user.id || !profile) {
      profileFetchedForRef.current = user.id
      fetchProfile(user).then(p => {
        if (p) setProfile(p)
      })
    }

    // Subscribe to profile changes for real-time updates
    const profileSubscription = supabase
      .channel(`profile-realtime-${user.id}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        async (payload) => {
          console.log('[Auth] Profile change detected:', payload.eventType)
          const p = await fetchProfile(user)
          if (p) setProfile(p)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profileSubscription)
    }
  }, [user, fetchProfile])

  const completeSignIn = useCallback(async (nextSession: Session): Promise<ExtendedProfile | null> => {
    setSession(nextSession)
    setUser(nextSession.user)
    profileFetchedForRef.current = nextSession.user.id
    const nextProfile = await fetchProfile(nextSession.user)
    setProfile(nextProfile)
    if (nextProfile && (nextProfile.role === 'agent' || nextProfile.role === 'editor')) {
      void (supabase as any).from('agent_global_activities').insert({
        agent_id: nextProfile.id,
        activity_type: 'login',
        description: 'User logged in to the portal'
      }).then()
    }
    return nextProfile
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    const nextProfile = data?.session ? await completeSignIn(data.session) : null
    return { error: error as Error | null, session: data?.session, mfa: data?.mfa, profile: nextProfile }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/email-verified`
      }
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    try {
      // Log logout activity for agents
      if (profile && (profile.role === 'agent' || profile.role === 'editor')) {
        await (supabase as any).from('agent_global_activities').insert({
          agent_id: profile.id,
          activity_type: 'logout',
          description: 'User logged out of the portal'
        })
      }
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[Auth] signOut error:', err)
    }
    setSession(null)
    setUser(null)
    setProfile(null)
    profileFetchedForRef.current = null
    queryCache.invalidateAll()
  }

  const isAdmin = profile?.role === 'admin'
  const isSuperAdmin = profile?.role === 'admin' && (profile?.is_super_admin ?? false)
  const isAdmissionManager = profile?.role === 'admission_manager'
  const isSuperAgent = profile?.role === 'agent' && (profile?.is_super_agent ?? false)
  const isEditor = profile?.role === 'editor'
  const isProgramManager = profile?.role === 'program_manager'
  const isTechnicalTeam = profile?.role === 'admin' || profile?.role === 'technical_team' || (profile as any)?.is_technical_team === true
  const isContractManager = profile?.role === 'contract_manager'

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      completeSignIn,
      signUp,
      signOut,
      refreshProfile,
      isAdmin,
      isSuperAdmin,
      isAdmissionManager,
      isSuperAgent,
      isEditor,
      isProgramManager,
      isTechnicalTeam,
      isContractManager
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
