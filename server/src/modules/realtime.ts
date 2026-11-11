import type { FastifyInstance } from 'fastify'
import type { WebSocket } from 'ws'
import { verifyAccessToken } from '../lib/tokens.js'
import { realtimeBus, type ChangeEvent } from '../lib/realtime-bus.js'
import { getPolicy } from '../lib/policies.js'
import type { AuthContext } from '../plugins/auth.js'
import { db } from '../db/index.js'
import { profiles, teamMembers } from '../db/schema/index.js'
import { eq, sql } from 'drizzle-orm'

interface Subscription {
  channel: string
  changes: { event: string; table: string; filter?: string }[]
}

interface ClientState {
  socket: WebSocket
  ctx: AuthContext | null
  subscriptions: Map<string, Subscription>
  presence: Map<string, { key: string; payload: unknown }>
  alive: boolean
}

const clients = new Set<ClientState>()
const presenceState = new Map<string, Map<string, unknown>>()

function matchesFilter(filter: string | undefined, row: Record<string, unknown> | null): boolean {
  if (!filter || !row) return true
  const match = filter.match(/^([\w]+)=(eq|neq|in)\.(.+)$/)
  if (!match) return true
  const [, column, op, rawValue] = match
  const actual = String(row[column] ?? '')
  if (op === 'eq') return actual === rawValue
  if (op === 'neq') return actual !== rawValue
  if (op === 'in') return rawValue.replace(/^\(|\)$/g, '').split(',').includes(actual)
  return true
}

function send(state: ClientState, message: unknown) {
  if (state.socket.readyState === 1) state.socket.send(JSON.stringify(message))
}

function broadcastToChannel(channel: string, message: unknown, exclude?: ClientState) {
  for (const client of clients) {
    if (client === exclude) continue
    if (client.subscriptions.has(channel)) send(client, message)
  }
}

export async function realtimeRoutes(app: FastifyInstance) {
  app.get('/realtime/v1/websocket', { websocket: true }, (socket, req) => {
    const state: ClientState = { socket, ctx: null, subscriptions: new Map(), presence: new Map(), alive: true }
    clients.add(state)

    const url = new URL(req.url, 'http://localhost')
    const token = url.searchParams.get('token') ?? url.searchParams.get('apikey') ?? ''

    const init = async () => {
      if (token && token !== 'anon') {
        const payload = await verifyAccessToken(token)
        if (payload?.sub) {
          const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
          if (profile?.isActive && (!profile.isTwoFactorEnabled || payload.mfaVerified === true)) {
            let effectiveAgencyId = profile.id
            if (profile.role === 'editor') {
              if (profile.parentAgencyId) effectiveAgencyId = profile.parentAgencyId
              else {
                const [membership] = await db.select().from(teamMembers)
                  .where(sql`lower(${teamMembers.invitedEmail}) = lower(${profile.email}) AND ${teamMembers.status} = 'active'`).limit(1)
                if (membership) effectiveAgencyId = membership.agencyId
              }
            }
            state.ctx = {
              id: profile.id,
              email: profile.email,
              role: profile.role,
              isSuperAdmin: profile.isSuperAdmin,
              isTechnicalTeam: profile.role === 'technical_team' || profile.isTechnicalTeam || profile.role === 'admin',
              mfaVerified: payload.mfaVerified === true,
              effectiveAgencyId,
              profile,
            }
          }
        }
      }
      send(state, { type: 'connected', authenticated: !!state.ctx })
    }
    init().catch(() => send(state, { type: 'connected', authenticated: false }))

    socket.on('message', (raw) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(String(raw))
      } catch {
        return
      }
      const channel = String(msg.channel ?? '')
      switch (msg.type) {
        case 'join': {
          const changes = Array.isArray(msg.postgres_changes) ? (msg.postgres_changes as Subscription['changes']) : []
          const allowed = changes.filter((c) => {
            const policy = getPolicy(c.table)
            if (!policy) return false
            return policy.select(state.ctx).filter !== false
          })
          state.subscriptions.set(channel, { channel, changes: allowed })
          send(state, { type: 'joined', channel, subscribed_tables: allowed.map((c) => c.table) })
          const existing = presenceState.get(channel)
          if (existing) send(state, { type: 'presence_state', channel, state: Object.fromEntries(existing) })
          break
        }
        case 'leave': {
          cleanupPresence(state, channel)
          state.subscriptions.delete(channel)
          send(state, { type: 'left', channel })
          break
        }
        case 'broadcast': {
          if (!state.subscriptions.has(channel)) return
          broadcastToChannel(channel, { type: 'broadcast', channel, event: msg.event, payload: msg.payload }, state)
          break
        }
        case 'track': {
          if (!state.subscriptions.has(channel)) return
          const key = String(msg.key ?? state.ctx?.id ?? crypto.randomUUID())
          state.presence.set(channel, { key, payload: msg.payload })
          if (!presenceState.has(channel)) presenceState.set(channel, new Map())
          presenceState.get(channel)!.set(key, msg.payload)
          broadcastToChannel(channel, { type: 'presence', channel, event: 'join', key, payload: msg.payload })
          break
        }
        case 'untrack': {
          cleanupPresence(state, channel)
          break
        }
        case 'heartbeat':
          state.alive = true
          send(state, { type: 'heartbeat_ack' })
          break
      }
    })

    socket.on('close', () => {
      for (const channel of state.presence.keys()) cleanupPresence(state, channel)
      clients.delete(state)
    })
    socket.on('pong', () => { state.alive = true })
  })

  realtimeBus.on('change', (event: ChangeEvent) => {
    for (const client of clients) {
      for (const sub of client.subscriptions.values()) {
        const matching = sub.changes.some(
          (c) => c.table === event.table && (c.event === '*' || c.event === event.eventType) && matchesFilter(c.filter, event.new ?? event.old),
        )
        if (matching) {
          send(client, {
            type: 'postgres_changes',
            channel: sub.channel,
            payload: {
              data: {
                schema: event.schema,
                table: event.table,
                commit_timestamp: event.commitTimestamp,
                eventType: event.eventType,
                new: event.new,
                old: event.old,
                errors: null,
              },
            },
          })
        }
      }
    }
  })

  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (!client.alive) {
        client.socket.terminate()
        clients.delete(client)
        continue
      }
      client.alive = false
      client.socket.ping()
    }
  }, 30000)

  app.addHook('onClose', async () => {
    clearInterval(heartbeat)
    for (const client of clients) client.socket.close()
  })
}

function cleanupPresence(state: ClientState, channel: string) {
  const entry = state.presence.get(channel)
  if (!entry) return
  state.presence.delete(channel)
  const channelPresence = presenceState.get(channel)
  channelPresence?.delete(entry.key)
  if (channelPresence?.size === 0) presenceState.delete(channel)
  broadcastToChannel(channel, { type: 'presence', channel, event: 'leave', key: entry.key })
}