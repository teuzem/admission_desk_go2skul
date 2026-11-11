/// <reference types="vite/client" />
// ─────────────────────────────────────────────────────────────────────────────
// Admission Desk API client — Supabase-compatible surface backed by the local
// Fastify + PostgreSQL backend (see /server). Exposes the same query-builder,
// auth, storage, realtime and functions APIs the UI was built against.
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = ((import.meta.env.VITE_API_URL as string) || 'http://localhost:4000').replace(/\/$/, '')
const AUTH_STORAGE_KEY = 'admission-desk-auth'

// ─── Shared types (Supabase-shaped) ──────────────────────────────────────────

export interface User {
  id: string
  aud: string
  role: string
  email?: string
  email_confirmed_at?: string | null
  phone?: string
  confirmed_at?: string | null
  last_sign_in_at?: string | null
  app_metadata: Record<string, any>
  user_metadata: Record<string, any>
  identities: any[]
  created_at: string
  updated_at?: string
  is_anonymous?: boolean
}

export interface Session {
  access_token: string
  token_type: string
  expires_in: number
  expires_at?: number
  refresh_token: string
  mfa_verified?: boolean
  user: User
}

export interface MfaChallenge {
  mfa_required: true
  mfa_ticket: string
  mfa_factor_id: string | null
  mfa_expires_at: number
  mfa_methods: {
    totp: { id: string; friendly_name: string }[]
    passkey: boolean
    recovery: boolean
  }
}

interface ApiError {
  message: string
  code?: string
  status?: number
  details?: string | null
  hint?: string | null
}

interface Result<T> {
  data: T | null
  error: ApiError | null
  count?: number | null
  status?: number
  statusText?: string
}

function apiError(message: string, code?: string, status?: number): ApiError {
  return { message, code, status }
}

async function parseBody(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return text }
}

function errorFrom(res: Response, body: any): ApiError {
  return {
    message: body?.message || body?.msg || body?.error_description || body?.error || res.statusText || 'Request failed',
    code: body?.code || String(res.status),
    status: res.status,
    details: body?.details ?? null,
    hint: body?.hint ?? null,
  }
}

async function apiFetch(path: string, init: RequestInit = {}, withAuth = true): Promise<Response> {
  const headers = new Headers(init.headers)
  if (withAuth && currentSession?.access_token) {
    headers.set('Authorization', `Bearer ${currentSession.access_token}`)
  }
  headers.set('apikey', 'local-anon')
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000)
  try {
    return await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─── Auth state ──────────────────────────────────────────────────────────────

type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY'
type AuthListener = (event: AuthEvent, session: Session | null) => void

let currentSession: Session | null = null
let pendingMfaChallenge: MfaChallenge | null = null
let emailVerificationError: ApiError | null = null
const authListeners = new Set<AuthListener>()
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let refreshPromise: Promise<Session | null> | null = null

function persistSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch { /* storage unavailable */ }
}

function emitAuth(event: AuthEvent, session: Session | null) {
  authListeners.forEach((cb) => {
    try { cb(event, session) } catch (err) { console.error('[auth] listener error', err) }
  })
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  if (!currentSession?.expires_at) return
  const delay = Math.max(currentSession.expires_at * 1000 - Date.now() - 60000, 1000)
  refreshTimer = setTimeout(() => { refreshSession().catch(() => {}) }, delay)
}

function setSession(session: Session | null, event: AuthEvent) {
  const prevUserId = currentSession?.user?.id
  if (session) pendingMfaChallenge = null
  currentSession = session
  persistSession(session)
  scheduleRefresh()
  if (session) emitAuth(event, session)
  else emitAuth('SIGNED_OUT', null)
  if (prevUserId !== session?.user?.id) realtimeManager.onAuthChange()
}

async function refreshSession(): Promise<Session | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const token = currentSession?.refresh_token
    if (!token) return null
    try {
      const res = await apiFetch('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: token }),
      }, false)
      const body = await parseBody(res)
      if (!res.ok || !body?.access_token) {
        setSession(null, 'SIGNED_OUT')
        return null
      }
      const session = body as Session
      setSession(session, 'TOKEN_REFRESHED')
      return session
    } catch {
      return currentSession
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

async function authRequest(path: string, body?: unknown, method = 'POST'): Promise<{ body: any; error: ApiError | null }> {
  try {
    const res = await apiFetch(path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const parsed = await parseBody(res)
    if (!res.ok) return { body: null, error: errorFrom(res, parsed) }
    return { body: parsed, error: null }
  } catch (err: any) {
    return { body: null, error: apiError(err?.message || 'Network request failed', 'NETWORK') }
  }
}

// Restore persisted session + handle email confirmation / recovery links
const authReady: Promise<void> = (async () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (raw) currentSession = JSON.parse(raw) as Session
  } catch { currentSession = null }

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const type = params.get('type')
    if (tokenHash && (type === 'signup' || type === 'recovery' || type === 'email' || type === 'invite')) {
      const { body, error } = await authRequest('/auth/v1/verify', { token_hash: tokenHash, type: type === 'email' ? 'signup' : type })
      emailVerificationError = error
      if (error) setSession(null, 'SIGNED_OUT')
      if (!error && body?.access_token) {
        setSession(body as Session, type === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN')
      } else if (!error && body?.mfa_required) {
        pendingMfaChallenge = body as MfaChallenge
        setSession(null, 'SIGNED_OUT')
      }
      params.delete('token_hash')
      params.delete('type')
      const clean = window.location.pathname + (params.toString() ? `?${params}` : '') + window.location.hash
      window.history.replaceState({}, '', clean)
    }
  }
  scheduleRefresh()
})()

// Cross-tab session sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== AUTH_STORAGE_KEY) return
    try {
      const next = e.newValue ? (JSON.parse(e.newValue) as Session) : null
      if (next?.access_token !== currentSession?.access_token) {
        currentSession = next
        scheduleRefresh()
        emitAuth(next ? 'SIGNED_IN' : 'SIGNED_OUT', next)
        realtimeManager.onAuthChange()
      }
    } catch { /* ignore */ }
  })
}

const auth = {
  async getSession(): Promise<{ data: { session: Session | null }; error: ApiError | null }> {
    await authReady
    if (currentSession?.expires_at && currentSession.expires_at * 1000 < Date.now() + 30000) {
      await refreshSession()
    }
    return { data: { session: currentSession }, error: null }
  },

  async getPendingMfaChallenge(): Promise<{ data: MfaChallenge | null; error: ApiError | null }> {
    await authReady
    if (pendingMfaChallenge && pendingMfaChallenge.mfa_expires_at <= Math.floor(Date.now() / 1000)) {
      pendingMfaChallenge = null
    }
    return { data: pendingMfaChallenge, error: emailVerificationError }
  },

  clearPendingMfaChallenge() {
    pendingMfaChallenge = null
  },

  async getUser(): Promise<{ data: { user: User | null }; error: ApiError | null }> {
    await authReady
    if (!currentSession) return { data: { user: null }, error: null }
    if (currentSession.expires_at && currentSession.expires_at * 1000 < Date.now()) await refreshSession()
    if (!currentSession) return { data: { user: null }, error: null }
    const { body, error } = await authRequest('/auth/v1/user', undefined, 'GET')
    if (error) return { data: { user: null }, error }
    return { data: { user: body as User }, error: null }
  },

  async signInWithPassword(credentials: { email: string; password: string }) {
    await authReady
    pendingMfaChallenge = null
    const { body, error } = await authRequest('/auth/v1/token?grant_type=password', credentials)
    if (error) return { data: { user: null, session: null, mfa: null }, error }
    if (body?.mfa_required) {
      setSession(null, 'SIGNED_OUT')
      return { data: { user: null, session: null, mfa: body as MfaChallenge }, error: null }
    }
    const session = body as Session
    setSession(session, 'SIGNED_IN')
    return { data: { user: session.user, session, mfa: null }, error: null }
  },

  async signUp(params: { email: string; password: string; options?: { data?: Record<string, any>; emailRedirectTo?: string } }) {
    const { body, error } = await authRequest('/auth/v1/signup', {
      email: params.email,
      password: params.password,
      data: params.options?.data,
      options: { emailRedirectTo: params.options?.emailRedirectTo },
    })
    if (error) return { data: { user: null, session: null }, error }
    if (body?.session?.access_token) setSession(body.session as Session, 'SIGNED_IN')
    return { data: { user: body?.user ?? null, session: body?.session ?? null }, error: null }
  },

  async signOut(): Promise<{ error: ApiError | null }> {
    pendingMfaChallenge = null
    emailVerificationError = null
    if (currentSession) {
      await authRequest('/auth/v1/logout', { refresh_token: currentSession.refresh_token }).catch(() => {})
    }
    setSession(null, 'SIGNED_OUT')
    return { error: null }
  },

  async updateUser(attrs: { password?: string; current_password?: string; email?: string; data?: Record<string, any> }) {
    await authReady
    if (!currentSession) return { data: { user: null }, error: apiError('Auth session missing', 'session_missing') }
    const { body, error } = await authRequest('/auth/v1/user', attrs, 'PUT')
    if (error) return { data: { user: null }, error }
    if (attrs.password) {
      if (!body?.session?.access_token) return { data: { user: null }, error: apiError('Unable to renew the authenticated session', 'session_missing') }
      setSession(body.session as Session, 'USER_UPDATED')
    } else {
      emitAuth('USER_UPDATED', currentSession)
    }
    return { data: { user: body as User }, error: null }
  },

  async resetPasswordForEmail(email: string, _options?: { redirectTo?: string }) {
    const { error } = await authRequest('/auth/v1/recover', { email })
    return { data: {}, error }
  },

  async resend(params: { type: string; email: string }) {
    const { error } = await authRequest('/auth/v1/resend', { type: params.type, email: params.email })
    return { data: {}, error }
  },

  async verifyOtp(params: { token_hash: string; type: string }) {
    const { body, error } = await authRequest('/auth/v1/verify', params)
    if (error) return { data: { user: null, session: null, mfa: null }, error }
    if (body?.mfa_required) {
      pendingMfaChallenge = body as MfaChallenge
      setSession(null, 'SIGNED_OUT')
      return { data: { user: null, session: null, mfa: pendingMfaChallenge }, error: null }
    }
    const session = body as Session
    setSession(session, params.type === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN')
    return { data: { user: session.user, session, mfa: null }, error: null }
  },

  onAuthStateChange(callback: AuthListener) {
    authListeners.add(callback)
    authReady.then(() => {
      setTimeout(() => callback('INITIAL_SESSION', currentSession), 0)
    })
    return { data: { subscription: { unsubscribe: () => { authListeners.delete(callback) } } } }
  },

  async refreshSession(params?: { refresh_token?: string }) {
    if (params?.refresh_token && currentSession) currentSession.refresh_token = params.refresh_token
    const session = await refreshSession()
    return { data: { session, user: session?.user ?? null }, error: session ? null : apiError('Refresh failed', 'refresh_failed') }
  },

  async setSession(params: { access_token: string; refresh_token: string }) {
    try {
      const res = await apiFetch('/auth/v1/user', {
        method: 'GET',
        headers: { Authorization: `Bearer ${params.access_token}` },
      }, false)
      const body = await parseBody(res)
      if (!res.ok) return { data: { user: null, session: null }, error: errorFrom(res, body) }
      const session: Session = {
        access_token: params.access_token,
        refresh_token: params.refresh_token,
        token_type: 'bearer',
        expires_in: 900,
        expires_at: Math.floor(Date.now() / 1000) + 900,
        user: body as User,
      }
      setSession(session, 'SIGNED_IN')
      return { data: { user: session.user, session }, error: null }
    } catch (err: any) {
      return { data: { user: null, session: null }, error: apiError(err?.message || 'Network request failed', 'NETWORK') }
    }
  },

  /** Server-side staff invite acceptance (replaces client-side role elevation). */
  async acceptAdminInvite() {
    const { body, error } = await authRequest('/auth/v1/accept-invite', {})
    if (error) return { data: null, error }
    if (body?.session?.access_token) setSession(body.session as Session, 'USER_UPDATED')
    return { data: body, error: null }
  },

  mfa: {
    async listFactors() {
      const { body, error } = await authRequest('/auth/v1/factors', undefined, 'GET')
      if (error) return { data: null, error }
      return { data: { all: body?.factors ?? [], totp: (body?.factors ?? []).filter((factor: any) => factor.status === 'verified') }, error: null }
    },
    async enroll(params: { factorType: string; friendlyName?: string; issuer?: string }) {
      const { body, error } = await authRequest('/auth/v1/factors', {
        factor_type: params.factorType,
        friendly_name: params.friendlyName,
      })
      return { data: body, error }
    },
    async challenge(params: { factorId: string }) {
      const { body, error } = await authRequest(`/auth/v1/factors/${params.factorId}/challenge`, {})
      return { data: body, error }
    },
    async verify(params: { factorId: string; challengeId: string; code: string }) {
      const { body, error } = await authRequest(`/auth/v1/factors/${params.factorId}/verify`, { code: params.code })
      if (!error && body?.access_token) setSession(body as Session, 'USER_UPDATED')
      return { data: body, error }
    },
    async unenroll(params: { factorId: string }) {
      const { body, error } = await authRequest(`/auth/v1/factors/${params.factorId}`, undefined, 'DELETE')
      return { data: body, error }
    },
    async challengeAndVerify(params: { factorId: string; code: string }) {
      const challenge = await auth.mfa.challenge({ factorId: params.factorId })
      if (challenge.error) return { data: null, error: challenge.error }
      return auth.mfa.verify({ factorId: params.factorId, challengeId: challenge.data.id, code: params.code })
    },
    async verifyLogin(params: { ticket: string; code: string; factorId?: string; method: 'totp' | 'recovery' }) {
      const { body, error } = await authRequest('/auth/v1/mfa/verify', {
        mfa_ticket: params.ticket,
        code: params.code,
        factor_id: params.factorId,
        method: params.method,
      })
      if (!error && body?.access_token) setSession(body as Session, 'SIGNED_IN')
      return { data: body, error }
    },
    async getRecoveryCodes() {
      const { body, error } = await authRequest('/auth/v1/mfa/recovery-codes', undefined, 'GET')
      return { data: body, error }
    },
    async generateRecoveryCodes() {
      const { body, error } = await authRequest('/auth/v1/mfa/recovery-codes', {})
      return { data: body, error }
    },
    async getAuthenticatorAssuranceLevel() {
      if (!currentSession) return { data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] }, error: null }
      const factors = await auth.mfa.listFactors()
      const hasFactors = (factors.data?.totp.length ?? 0) > 0
      return {
        data: {
          currentLevel: currentSession.mfa_verified ? 'aal2' : 'aal1',
          nextLevel: hasFactors ? 'aal2' : 'aal1',
          currentAuthenticationMethods: currentSession.mfa_verified ? ['totp', 'passkey', 'recovery'] : ['password'],
        },
        error: factors.error,
      }
    },
  },

  passkeys: {
    async list() {
      const { body, error } = await authRequest('/auth/v1/passkeys', undefined, 'GET')
      return { data: body ?? [], error }
    },
    async registerOptions() {
      const { body, error } = await authRequest('/auth/v1/passkeys/register/options', {})
      return { data: body, error }
    },
    async verifyRegistration(params: { ticket: string; response: unknown; name: string }) {
      const { body, error } = await authRequest('/auth/v1/passkeys/register/verify', {
        challenge_ticket: params.ticket,
        response: params.response,
        key_name: params.name,
      })
      if (!error && body?.session?.access_token) setSession(body.session as Session, 'USER_UPDATED')
      return { data: body, error }
    },
    async remove(id: string) {
      const { body, error } = await authRequest(`/auth/v1/passkeys/${id}`, undefined, 'DELETE')
      return { data: body, error }
    },
    async authenticateOptions(ticket?: string) {
      const { body, error } = await authRequest('/auth/v1/passkeys/authenticate/options', { mfa_ticket: ticket })
      return { data: body, error }
    },
    async verifyAuthentication(params: { ticket: string; response: unknown }) {
      const { body, error } = await authRequest('/auth/v1/passkeys/authenticate/verify', {
        challenge_ticket: params.ticket,
        response: params.response,
      })
      if (!error && body?.access_token) setSession(body as Session, 'SIGNED_IN')
      return { data: body, error }
    },
  },
}

// ─── Realtime (WebSocket) ────────────────────────────────────────────────────

type PresenceState = Record<string, any[]>
interface ChangeBinding { type: 'postgres_changes'; event: string; table: string; filter?: string; cb: (payload: any) => void }
interface BroadcastBinding { type: 'broadcast'; event: string; cb: (payload: any) => void }
interface PresenceBinding { type: 'presence'; event: 'sync' | 'join' | 'leave'; cb: (payload: any) => void }
type Binding = ChangeBinding | BroadcastBinding | PresenceBinding

function localFilterMatches(filter: string | undefined, row: Record<string, any> | null | undefined): boolean {
  if (!filter || !row) return true
  const m = filter.match(/^(\w+)=(eq|neq|in)\.(.+)$/)
  if (!m) return true
  const [, col, op, raw] = m
  const actual = String(row[col] ?? '')
  if (op === 'eq') return actual === raw
  if (op === 'neq') return actual !== raw
  if (op === 'in') return raw.replace(/^\(|\)$/g, '').split(',').includes(actual)
  return true
}

class WireChannel {
  joined = false
  presence: PresenceState = {}
  instances = new Set<RealtimeChannel>()
  constructor(public name: string) {}

  subscribedInstances(): RealtimeChannel[] {
    return [...this.instances].filter((c) => c.subscribed)
  }

  mergedChanges() {
    const seen = new Set<string>()
    const out: { event: string; table: string; filter?: string }[] = []
    for (const inst of this.subscribedInstances()) {
      for (const b of inst.bindings) {
        if (b.type !== 'postgres_changes') continue
        const key = `${b.event}|${b.table}|${b.filter ?? ''}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ event: b.event, table: b.table, ...(b.filter ? { filter: b.filter } : {}) })
      }
    }
    return out
  }
}

class RealtimeManager {
  private ws: WebSocket | null = null
  private wires = new Map<string, WireChannel>()
  private reconnectDelay = 1000
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private closedByUser = false
  private wsUserId: string | null | undefined = undefined

  getWire(name: string): WireChannel {
    let wire = this.wires.get(name)
    if (!wire) {
      wire = new WireChannel(name)
      this.wires.set(name, wire)
    }
    return wire
  }

  dropWire(name: string) {
    this.wires.delete(name)
    this.rawSend({ type: 'leave', channel: name })
  }

  onAuthChange() {
    const userId = currentSession?.user?.id ?? null
    if (this.ws && this.wsUserId !== userId) {
      this.wsUserId = userId
      this.ws.close()
    }
  }

  connect() {
    if (typeof WebSocket === 'undefined') return
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return
    this.closedByUser = false
    this.wsUserId = currentSession?.user?.id ?? null
    const wsUrl = `${API_URL.replace(/^http/, 'ws')}/realtime/v1/websocket?token=${encodeURIComponent(currentSession?.access_token ?? 'anon')}&vsn=1.0.0`
    const ws = new WebSocket(wsUrl)
    this.ws = ws

    ws.onopen = () => {
      this.reconnectDelay = 1000
      for (const wire of this.wires.values()) {
        if (wire.subscribedInstances().length > 0) this.sendJoin(wire)
      }
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = setInterval(() => this.rawSend({ type: 'heartbeat' }), 25000)
    }

    ws.onmessage = (ev) => {
      let msg: any
      try { msg = JSON.parse(String(ev.data)) } catch { return }
      const wire = this.wires.get(msg.channel)
      switch (msg.type) {
        case 'joined': {
          if (!wire) return
          wire.joined = true
          for (const inst of wire.subscribedInstances()) {
            inst.state = 'joined'
            inst.subscribeCb?.('SUBSCRIBED')
            if (inst.trackedPayload !== null) {
              this.rawSend({ type: 'track', channel: wire.name, payload: inst.trackedPayload })
            }
          }
          break
        }
        case 'postgres_changes': {
          if (!wire) return
          const data = msg.payload?.data
          if (!data) return
          for (const inst of wire.subscribedInstances()) {
            for (const b of inst.bindings) {
              if (b.type !== 'postgres_changes') continue
              if (b.table !== data.table) continue
              if (b.event !== '*' && b.event !== data.eventType) continue
              if (!localFilterMatches(b.filter, data.new ?? data.old)) continue
              try { b.cb(data) } catch (err) { console.error('[realtime] callback error', err) }
            }
          }
          break
        }
        case 'broadcast': {
          if (!wire) return
          for (const inst of wire.subscribedInstances()) {
            for (const b of inst.bindings) {
              if (b.type === 'broadcast' && b.event === msg.event) {
                try { b.cb({ type: 'broadcast', event: msg.event, payload: msg.payload }) } catch (err) { console.error('[realtime] callback error', err) }
              }
            }
          }
          break
        }
        case 'presence_state': {
          if (!wire) return
          wire.presence = {}
          for (const [key, payload] of Object.entries(msg.state ?? {})) wire.presence[key] = [payload]
          this.firePresence(wire, 'sync')
          break
        }
        case 'presence': {
          if (!wire) return
          if (msg.event === 'join') {
            wire.presence[msg.key] = [msg.payload]
            this.firePresence(wire, 'sync')
            this.firePresence(wire, 'join', { key: msg.key, newPresences: [msg.payload] })
          } else if (msg.event === 'leave') {
            const left = wire.presence[msg.key] ?? []
            delete wire.presence[msg.key]
            this.firePresence(wire, 'sync')
            this.firePresence(wire, 'leave', { key: msg.key, leftPresences: left })
          }
          break
        }
      }
    }

    ws.onclose = () => {
      if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null }
      for (const wire of this.wires.values()) {
        wire.joined = false
        for (const inst of wire.instances) if (inst.subscribed) inst.state = 'joining'
      }
      if (this.ws === ws) this.ws = null
      if (!this.closedByUser && this.wires.size > 0) {
        setTimeout(() => this.connect(), this.reconnectDelay)
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      }
    }
    ws.onerror = () => { /* onclose handles reconnect */ }
  }

  private firePresence(wire: WireChannel, event: 'sync' | 'join' | 'leave', payload?: any) {
    for (const inst of wire.subscribedInstances()) {
      for (const b of inst.bindings) {
        if (b.type === 'presence' && b.event === event) {
          try { b.cb(payload ?? {}) } catch (err) { console.error('[realtime] presence callback error', err) }
        }
      }
    }
  }

  private rawSend(msg: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  sendJoin(wire: WireChannel) {
    this.connect()
    this.rawSend({ type: 'join', channel: wire.name, postgres_changes: wire.mergedChanges() })
  }

  send(msg: unknown): 'ok' | 'error' {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.rawSend(msg)
      return 'ok'
    }
    this.connect()
    return 'error'
  }

  close() {
    this.closedByUser = true
    this.ws?.close()
  }
}

const realtimeManager = new RealtimeManager()
const allChannels = new Set<RealtimeChannel>()

export class RealtimeChannel {
  state: 'closed' | 'joining' | 'joined' | 'errored' = 'closed'
  bindings: Binding[] = []
  subscribed = false
  subscribeCb: ((status: string, err?: Error) => void) | null = null
  trackedPayload: any = null
  private wire: WireChannel

  constructor(public topic: string) {
    this.wire = realtimeManager.getWire(topic)
    this.wire.instances.add(this)
    allChannels.add(this)
  }

  on(type: 'postgres_changes', filter: { event: string; schema?: string; table: string; filter?: string }, cb: (payload: any) => void): this
  on(type: 'broadcast', filter: { event: string }, cb: (payload: any) => void): this
  on(type: 'presence', filter: { event: 'sync' | 'join' | 'leave' }, cb: (payload: any) => void): this
  on(type: string, filter: any, cb: (payload: any) => void): this {
    if (type === 'postgres_changes') {
      this.bindings.push({ type, event: filter.event ?? '*', table: filter.table, filter: filter.filter, cb })
    } else if (type === 'broadcast') {
      this.bindings.push({ type, event: filter.event, cb })
    } else if (type === 'presence') {
      this.bindings.push({ type, event: filter.event ?? 'sync', cb })
    }
    return this
  }

  subscribe(cb?: (status: string, err?: Error) => void): this {
    this.subscribed = true
    this.subscribeCb = cb ?? null
    this.state = 'joining'
    if (this.wire.joined) {
      this.state = 'joined'
      setTimeout(() => cb?.('SUBSCRIBED'), 0)
      // A new instance on an already-joined wire must re-join to register its own bindings
      realtimeManager.sendJoin(this.wire)
    } else {
      realtimeManager.sendJoin(this.wire)
    }
    return this
  }

  async unsubscribe(): Promise<'ok' | 'error' | 'timed out'> {
    this.subscribed = false
    this.state = 'closed'
    this.wire.instances.delete(this)
    allChannels.delete(this)
    if (this.wire.instances.size === 0) realtimeManager.dropWire(this.wire.name)
    return 'ok'
  }

  presenceState(): PresenceState {
    return this.wire.presence
  }

  async track(payload: Record<string, any>): Promise<'ok' | 'error' | 'timed out'> {
    this.trackedPayload = payload
    return realtimeManager.send({ type: 'track', channel: this.topic, payload })
  }

  async untrack(): Promise<'ok' | 'error' | 'timed out'> {
    this.trackedPayload = null
    return realtimeManager.send({ type: 'untrack', channel: this.topic })
  }

  async send(msg: { type: 'broadcast'; event: string; payload: any }): Promise<'ok' | 'error' | 'timed out'> {
    return realtimeManager.send({ type: 'broadcast', channel: this.topic, event: msg.event, payload: msg.payload })
  }
}

// ─── REST query builder ──────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

function encodeFilterValue(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return value.map(String).join(',')
  return String(value)
}

class QueryBuilder<T = any> implements PromiseLike<Result<T>> {
  private method: HttpMethod = 'GET'
  private body: unknown = undefined
  private selectStr: string | null = null
  private returning = false
  private filters: [string, string][] = []
  private orderParts: string[] = []
  private limitN: number | null = null
  private offsetN: number | null = null
  private rangeHeader: string | null = null
  private singleMode: 'single' | 'maybe' | null = null
  private countMode: 'exact' | 'planned' | 'estimated' | null = null
  private headMode = false
  private prefer: string[] = []
  private onConflict: string | null = null

  constructor(private table: string) {}

  select(columns = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    if (this.method === 'GET') {
      this.selectStr = columns
    } else {
      this.selectStr = columns
      this.returning = true
    }
    if (options?.count) this.countMode = options.count
    if (options?.head) this.headMode = true
    return this
  }

  insert(values: Record<string, any> | Record<string, any>[], _options?: { count?: 'exact' }): this {
    this.method = 'POST'
    this.body = values
    return this
  }

  upsert(values: Record<string, any> | Record<string, any>[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.method = 'POST'
    this.body = values
    this.prefer.push(options?.ignoreDuplicates ? 'resolution=ignore-duplicates' : 'resolution=merge-duplicates')
    if (options?.onConflict) this.onConflict = options.onConflict
    return this
  }

  update(values: Record<string, any>): this {
    this.method = 'PATCH'
    this.body = values
    return this
  }

  delete(): this {
    this.method = 'DELETE'
    return this
  }

  eq(column: string, value: unknown): this { this.filters.push([column, `eq.${encodeFilterValue(value)}`]); return this }
  neq(column: string, value: unknown): this { this.filters.push([column, `neq.${encodeFilterValue(value)}`]); return this }
  gt(column: string, value: unknown): this { this.filters.push([column, `gt.${encodeFilterValue(value)}`]); return this }
  gte(column: string, value: unknown): this { this.filters.push([column, `gte.${encodeFilterValue(value)}`]); return this }
  lt(column: string, value: unknown): this { this.filters.push([column, `lt.${encodeFilterValue(value)}`]); return this }
  lte(column: string, value: unknown): this { this.filters.push([column, `lte.${encodeFilterValue(value)}`]); return this }
  like(column: string, value: string): this { this.filters.push([column, `like.${value}`]); return this }
  ilike(column: string, value: string): this { this.filters.push([column, `ilike.${value}`]); return this }
  is(column: string, value: null | boolean): this { this.filters.push([column, `is.${value === null ? 'null' : String(value)}`]); return this }
  in(column: string, values: unknown[]): this {
    const list = values.map((v) => {
      const s = String(v)
      return /[,()."]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s
    }).join(',')
    this.filters.push([column, `in.(${list})`])
    return this
  }
  contains(column: string, value: unknown): this {
    const encoded = Array.isArray(value) ? `{${value.map(String).join(',')}}` : JSON.stringify(value)
    this.filters.push([column, `cs.${encoded}`])
    return this
  }
  containedBy(column: string, value: unknown): this {
    const encoded = Array.isArray(value) ? `{${value.map(String).join(',')}}` : JSON.stringify(value)
    this.filters.push([column, `cd.${encoded}`])
    return this
  }
  overlaps(column: string, value: unknown[]): this { this.filters.push([column, `ov.{${value.map(String).join(',')}}`]); return this }
  or(expr: string): this { this.filters.push(['or', `(${expr})`]); return this }
  and(expr: string): this { this.filters.push(['and', `(${expr})`]); return this }
  not(column: string, op: string, value: unknown): this { this.filters.push([column, `not.${op}.${encodeFilterValue(value)}`]); return this }
  filter(column: string, op: string, value: unknown): this { this.filters.push([column, `${op}.${encodeFilterValue(value)}`]); return this }
  match(obj: Record<string, unknown>): this {
    for (const [k, v] of Object.entries(obj)) this.eq(k, v)
    return this
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }): this {
    const prefix = options?.foreignTable ? `${options.foreignTable}.` : ''
    let part = `${prefix}${column}.${options?.ascending === false ? 'desc' : 'asc'}`
    if (options?.nullsFirst === true) part += '.nullsfirst'
    else if (options?.nullsFirst === false) part += '.nullslast'
    this.orderParts.push(part)
    return this
  }

  limit(n: number): this { this.limitN = n; return this }
  range(from: number, to: number): this { this.rangeHeader = `${from}-${to}`; return this }
  single(): this { this.singleMode = 'single'; return this }
  maybeSingle(): this { this.singleMode = 'maybe'; return this }

  then<R1 = Result<T>, R2 = never>(
    onfulfilled?: ((value: Result<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private async execute(): Promise<Result<T>> {
    await authReady
    if (currentSession?.expires_at && currentSession.expires_at * 1000 < Date.now() + 5000) {
      await refreshSession()
    }

    const params = new URLSearchParams()
    if (this.method === 'GET') {
      params.set('select', this.selectStr ?? '*')
    } else if (this.returning) {
      params.set('select', this.selectStr ?? '*')
    }
    for (const [k, v] of this.filters) params.append(k, v)
    if (this.orderParts.length) params.set('order', this.orderParts.join(','))
    if (this.onConflict) params.set('on_conflict', this.onConflict)
    if (this.headMode) params.set('limit', '0')
    else if (this.limitN !== null) params.set('limit', String(this.limitN))
    if (this.offsetN !== null) params.set('offset', String(this.offsetN))

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const prefer = [...this.prefer]
    if (this.method !== 'GET') prefer.push(this.returning ? 'return=representation' : 'return=minimal')
    if (this.countMode) prefer.push(`count=${this.countMode}`)
    if (prefer.length) headers['Prefer'] = prefer.join(',')
    if (this.singleMode) headers['Accept'] = 'application/vnd.pgrst.object+json'
    if (this.rangeHeader) headers['Range'] = this.rangeHeader

    const query = params.toString()
    const url = `/rest/v1/${encodeURIComponent(this.table)}${query ? `?${query}` : ''}`

    let res: Response
    try {
      res = await apiFetch(url, {
        method: this.method,
        headers,
        body: this.body !== undefined ? JSON.stringify(this.body) : undefined,
      })
    } catch (err: any) {
      return { data: null, error: apiError(err?.message || 'Network request failed', 'NETWORK'), status: 0, statusText: 'Network Error' }
    }

    const body = await parseBody(res)
    if (!res.ok) {
      const error = errorFrom(res, body)
      if (this.singleMode === 'maybe' && error.code === 'PGRST116') {
        return { data: null, error: null, count: null, status: res.status, statusText: res.statusText }
      }
      return { data: null, error, status: res.status, statusText: res.statusText }
    }

    let count: number | null = null
    const contentRange = res.headers.get('content-range')
    if (contentRange && contentRange.includes('/')) {
      const total = contentRange.split('/')[1]
      count = total === '*' ? null : Number(total)
    }

    let data: any = this.headMode ? null : body
    if (this.method !== 'GET' && !this.returning) data = null
    return { data: data as T, error: null, count, status: res.status, statusText: res.statusText }
  }
}

// ─── Storage ─────────────────────────────────────────────────────────────────

function encodeObjectPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function storageFrom(bucket: string) {
  return {
    async upload(path: string, file: File | Blob | ArrayBuffer, options?: { upsert?: boolean; contentType?: string; cacheControl?: string }) {
      await authReady
      const contentType = options?.contentType || (file instanceof Blob ? file.type : '') || 'application/octet-stream'
      try {
        const res = await apiFetch(`/storage/v1/object/${bucket}/${encodeObjectPath(path)}`, {
          method: 'POST',
          headers: {
            'Content-Type': contentType,
            'x-upsert': String(options?.upsert ?? false),
            'cache-control': options?.cacheControl ?? 'max-age=3600',
          },
          body: file as BodyInit,
        })
        const body = await parseBody(res)
        if (!res.ok) return { data: null, error: errorFrom(res, body) }
        return { data: { path: body?.path ?? path, id: body?.Id, fullPath: body?.Key }, error: null }
      } catch (err: any) {
        return { data: null, error: apiError(err?.message || 'Upload failed', 'NETWORK') }
      }
    },

    async update(path: string, file: File | Blob | ArrayBuffer, options?: { upsert?: boolean; contentType?: string }) {
      return this.upload(path, file, { ...options, upsert: true })
    },

    getPublicUrl(path: string) {
      return { data: { publicUrl: `${API_URL}/storage/v1/object/public/${bucket}/${encodeObjectPath(path)}` } }
    },

    async createSignedUrl(path: string, expiresIn: number, options?: { download?: string | boolean }) {
      await authReady
      const { body, error } = await authRequest(`/storage/v1/object/sign/${bucket}/${encodeObjectPath(path)}`, { expiresIn })
      if (error) return { data: null, error }
      let url = `${API_URL}/storage/v1${body.signedURL}`
      if (options?.download !== undefined && options.download !== false) {
        const name = typeof options.download === 'string' ? options.download : ''
        url += `&download=${encodeURIComponent(name)}`
      }
      return { data: { signedUrl: url, signedURL: url, path }, error: null }
    },

    async createSignedUrls(paths: string[], expiresIn: number) {
      const results = await Promise.all(paths.map(async (p) => {
        const { data, error } = await this.createSignedUrl(p, expiresIn)
        return { path: p, signedUrl: data?.signedUrl ?? null, error }
      }))
      return { data: results, error: null }
    },

    async list(prefix = '', options?: { limit?: number; offset?: number; search?: string; sortBy?: { column: string; order: string } }) {
      await authReady
      const { body, error } = await authRequest(`/storage/v1/object/list/${bucket}`, {
        prefix,
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
        search: options?.search ?? '',
      })
      return { data: body, error }
    },

    async remove(paths: string[]) {
      await authReady
      const { body, error } = await authRequest(`/storage/v1/object/${bucket}`, { prefixes: paths }, 'DELETE')
      return { data: body, error }
    },

    async download(path: string) {
      await authReady
      try {
        const res = await apiFetch(`/storage/v1/object/${bucket}/${encodeObjectPath(path)}`)
        if (!res.ok) return { data: null, error: errorFrom(res, await parseBody(res)) }
        return { data: await res.blob(), error: null }
      } catch (err: any) {
        return { data: null, error: apiError(err?.message || 'Download failed', 'NETWORK') }
      }
    },
  }
}

// ─── RPC & edge functions ────────────────────────────────────────────────────

async function rpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<Result<T>> {
  await authReady
  try {
    const res = await apiFetch(`/rest/v1/rpc/${encodeURIComponent(fn)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    const body = await parseBody(res)
    if (!res.ok) return { data: null, error: errorFrom(res, body), status: res.status, statusText: res.statusText }
    return { data: body as T, error: null, status: res.status, statusText: res.statusText }
  } catch (err: any) {
    return { data: null, error: apiError(err?.message || 'RPC failed', 'NETWORK') }
  }
}

const functions = {
  async invoke<T = any>(name: string, options?: { body?: unknown; headers?: Record<string, string> }): Promise<Result<T>> {
    await authReady
    try {
      const res = await apiFetch(`/functions/v1/${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      })
      const body = await parseBody(res)
      if (!res.ok) return { data: null, error: errorFrom(res, body) }
      return { data: body as T, error: null }
    } catch (err: any) {
      return { data: null, error: apiError(err?.message || 'Function invocation failed', 'NETWORK') }
    }
  },
}

// ─── Client ──────────────────────────────────────────────────────────────────

export const supabase = {
  from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table)
  },
  rpc,
  functions,
  auth,
  storage: { from: storageFrom },
  channel(name: string, _opts?: { config?: Record<string, any> }): RealtimeChannel {
    return new RealtimeChannel(name)
  },
  removeChannel(channel: RealtimeChannel): Promise<'ok' | 'error' | 'timed out'> {
    return channel.unsubscribe()
  },
  removeAllChannels(): Promise<Array<'ok' | 'error' | 'timed out'>> {
    return Promise.all([...allChannels].map((c) => c.unsubscribe()))
  },
  getChannels(): RealtimeChannel[] {
    return [...allChannels]
  },
}

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

// ─── Retry wrapper for queries on slow connections ────────
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
      if (result.error.code && !result.error.code.startsWith('5') && result.error.code !== 'PGRST301') {
        return result
      }
      lastError = result.error
    } catch (err: any) {
      lastError = err
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