import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database, UserRole, KycStatus } from '../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export type ExtendedProfile = Database['public']['Tables']['profiles']['Row'] & { effective_agency_id?: string }

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: ExtendedProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isAdmin: boolean
  isSuperAdmin: boolean
  isAdmissionManager: boolean
  isSuperAgent: boolean
  isEditor: boolean
  isProgramManager: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ExtendedProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)
  const profileFetchedForRef = useRef<string | null>(null)

  const fetchProfile = useCallback(async (sessionUser: User): Promise<ExtendedProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single()

      if (error) {
        console.error('[Auth] Error fetching profile:', error)
        return null
      }

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

      return extendedData
    } catch (err) {
      console.error('[Auth] Profile fetch failed:', err)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user)
      setProfile(p)
    }
  }, [user, fetchProfile])

  // ── Initialize auth state ──
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Hard safety timeout
    const safetyTimer = setTimeout(() => {
      setLoading(prev => {
        if (prev) console.warn('[Auth] Safety timeout – forcing loading=false')
        return false
      })
    }, 8000)

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

    // ── Auth state change listener ──
    // CRITICAL: Keep this callback SYNCHRONOUS. 
    // Only set React state here — do NOT call any async Supabase methods
    // (getSession, getUser, etc.) because that causes Web Locks deadlocks.
    // Profile fetching is triggered by the `user` state change via a separate useEffect.
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

  // ── Separate effect to fetch profile when user changes ──
  // This runs OUTSIDE the onAuthStateChange callback to avoid lock contention
  useEffect(() => {
    if (!user) return
    // Don't re-fetch if we already have the profile for this user
    if (profileFetchedForRef.current === user.id && profile) return
    
    profileFetchedForRef.current = user.id
    fetchProfile(user).then(p => {
      if (p) setProfile(p)
    })
  }, [user, fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (data?.session) {
      setSession(data.session)
      setUser(data.session.user)
      profileFetchedForRef.current = data.session.user.id
      const p = await fetchProfile(data.session.user)
      setProfile(p)
    }
    return { error: error as Error | null, session: data?.session }
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
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[Auth] signOut error:', err)
    }
    setSession(null)
    setUser(null)
    setProfile(null)
    profileFetchedForRef.current = null
  }

  const isAdmin = profile?.role === 'admin'
  const isSuperAdmin = profile?.role === 'admin' && (profile?.is_super_admin ?? false)
  const isAdmissionManager = profile?.role === 'admission_manager'
  const isSuperAgent = profile?.role === 'agent' && (profile?.is_super_agent ?? false)
  const isEditor = profile?.role === 'editor'
  const isProgramManager = profile?.role === 'program_manager'

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      isAdmin,
      isSuperAdmin,
      isAdmissionManager,
      isSuperAgent,
      isEditor,
      isProgramManager
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
