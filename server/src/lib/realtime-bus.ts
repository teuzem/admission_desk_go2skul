import { EventEmitter } from 'node:events'

export interface ChangeEvent {
  schema: 'public'
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
  commitTimestamp: string
}

class RealtimeBus extends EventEmitter {
  publishChange(event: ChangeEvent) {
    this.emit('change', event)
  }
  publishBroadcast(channel: string, event: string, payload: unknown) {
    this.emit('broadcast', { channel, event, payload })
  }
  publishPresence(channel: string, key: string, state: 'join' | 'leave', meta?: unknown) {
    this.emit('presence', { channel, key, state, meta })
  }
}

export const realtimeBus = new RealtimeBus()
realtimeBus.setMaxListeners(500)