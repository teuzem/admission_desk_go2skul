import type { FastifyInstance, FastifyRequest } from 'fastify'
import { sql, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import { getTable, type TableInfo } from '../lib/table-registry.js'
import { getPolicy, type Access } from '../lib/policies.js'
import { requireAuth, type AuthContext } from '../plugins/auth.js'
import { realtimeBus } from '../lib/realtime-bus.js'
import { parseFilters, parseOrder } from './rest/filter-parser.js'
import { parseSelect, fetchRows, combineWhere, buildProjection } from './rest/select-parser.js'

class RestError extends Error {
  constructor(public status: number, message: string, public code = 'PGRST000', public details: string | null = null, public hint: string | null = null) {
    super(message)
  }
}

function pgError(err: unknown): RestError {
  const e = err as { code?: string; message?: string; detail?: string; constraint?: string }
  if (e.code === '23505') return new RestError(409, 'Duplicate key value violates unique constraint', '23505', e.detail ?? null, e.constraint ?? null)
  if (e.code === '23503') return new RestError(409, 'Foreign key violation', '23503', e.detail ?? null, null)
  if (e.code === '23514') return new RestError(400, 'Check constraint violation', '23514', e.detail ?? null, null)
  if (e.code === '22P02') return new RestError(400, 'Invalid input syntax (expected UUID/number)', '22P02', null, null)
  if (e.code === '42703') return new RestError(400, e.message ?? 'Column does not exist', '42703', null, null)
  if (err instanceof RestError) return err
  if (err instanceof Error && /Unknown|Invalid filter|Unsupported|Ambiguous|No relationship/.test(err.message)) {
    return new RestError(400, err.message, 'PGRST100')
  }
  console.error('REST internal error:', err)
  return new RestError(500, 'Internal server error', 'XX000')
}

function pgArrayLiteral(arr: unknown[]): string {
  const elems = arr.map((el) => {
    if (el === null || el === undefined) return 'NULL'
    const s = typeof el === 'object' ? JSON.stringify(el) : String(el)
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  })
  return '{' + elems.join(',') + '}'
}

function serializeValue(value: unknown, type?: string): unknown {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) {
    if (type && type.endsWith('[]')) return pgArrayLiteral(value)
    return JSON.stringify(value)
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

function typedCandidate(row: Record<string, unknown>, info: TableInfo): SQL {
  const cols = Object.keys(row)
  const values = cols.map((c) => {
    const type = info.columnTypes.get(c) ?? 'text'
    const v = serializeValue(row[c], type)
    return sql`${v}::${sql.raw(`"${type.replace(/"/g, '')}"`)}`
  })
  return sql`(VALUES (${sql.join(values, sql`, `)})) AS cand(${sql.raw(cols.map((c) => `"${c}"`).join(', '))})`
}

async function insertAllowed(access: Access, row: Record<string, unknown>, info: TableInfo, ctx: AuthContext): Promise<void> {
  if (access.check) {
    const err = access.check(row, ctx)
    if (err) throw new RestError(403, err, '42501')
  }
  if (access.filter === false) throw new RestError(403, 'Row-level security violation on insert', '42501')
  if (access.filter !== true) {
    const candidate = typedCandidate(row, info)
    const result = await db.execute(sql`SELECT (${access.filter}) AS ok FROM ${candidate}`)
    if (!(result.rows[0] as { ok: boolean }).ok) {
      throw new RestError(403, 'Row-level security violation on insert', '42501')
    }
  }
}

function prepareRow(body: Record<string, unknown>, access: Access, info: TableInfo): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (!info.columnNames.has(key)) throw new RestError(400, `Column ${key} does not exist on ${info.name}`, '42703')
    if (access.columns && !access.columns.includes(key)) throw new RestError(403, `Column ${key} is not writable`, '42501')
    row[key] = value
  }
  if (access.force) Object.assign(row, access.force)
  return row
}

function emitChanges(table: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', newRows: Record<string, unknown>[], oldRows: (Record<string, unknown> | null)[]) {
  const commitTimestamp = new Date().toISOString()
  newRows.forEach((row, i) => {
    realtimeBus.publishChange({
      schema: 'public',
      table,
      eventType,
      new: eventType === 'DELETE' ? null : row,
      old: eventType === 'INSERT' ? null : oldRows[i] ?? (eventType === 'DELETE' ? row : null),
      commitTimestamp,
    })
  })
}

function wantsRepresentation(req: FastifyRequest): boolean {
  const prefer = String(req.headers.prefer ?? '')
  if (prefer.includes('return=minimal')) return false
  return true
}

function wantsSingle(req: FastifyRequest): boolean {
  return String(req.headers.accept ?? '').includes('vnd.pgrst.object')
}

function getLimitOffset(req: FastifyRequest): { limit?: number; offset?: number } {
  const query = req.query as Record<string, string>
  let limit = query.limit !== undefined ? Number(query.limit) : undefined
  let offset = query.offset !== undefined ? Number(query.offset) : undefined
  const range = req.headers.range
  if (typeof range === 'string' && /^\d+-\d*$/.test(range)) {
    const [start, end] = range.split('-').map(Number)
    offset = start
    if (Number.isFinite(end)) limit = end - start + 1
  }
  if (limit !== undefined && (!Number.isFinite(limit) || limit < 0 || limit > 1000)) limit = 1000
  return { limit, offset }
}

export async function restRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req) => {
    // Auth is optional for public reads (kb, technical events, catalog); loadAuth runs globally
  })

  app.get('/rest/v1/rpc/:fn', async (req, reply) => handleRpc(req, reply))
  app.post('/rest/v1/rpc/:fn', async (req, reply) => handleRpc(req, reply))

  app.get('/rest/v1/:table', async (req, reply) => {
    try {
      const { table } = req.params as { table: string }
      const info = getTable(table)
      if (!info) throw new RestError(404, `Table ${table} not found`, 'PGRST205')
      const query = req.query as Record<string, string>
      const nodes = parseSelect(query.select ?? '*')
      const conditions = parseFilters(query, info)
      const where = combineWhere(conditions)
      const order = parseOrder(query.order, info)
      const { limit, offset } = getLimitOffset(req)
      const rows = await fetchRows(info, nodes, where, req.auth, { order, limit, offset })

      const prefer = String(req.headers.prefer ?? '')
      if (prefer.includes('count=exact')) {
        const policy = getPolicy(table)!
        const access = policy.select(req.auth)
        const policyFilter = access.filter === true ? undefined : access.filter === false ? sql`false` : access.filter
        const countWhere = combineWhere([where, policyFilter])
        const countRes = await db.execute(sql`SELECT count(*)::int AS count FROM ${sql.raw(`"${table}"`)} WHERE ${countWhere}`)
        const total = (countRes.rows[0] as { count: number }).count
        const start = offset ?? 0
        reply.header('Content-Range', rows.length ? `${start}-${start + rows.length - 1}/${total}` : `*/${total}`)
      }

      if (wantsSingle(req)) {
        if (rows.length === 0) throw new RestError(406, 'JSON object requested, multiple (or no) rows returned', 'PGRST116', 'The result contains 0 rows')
        return rows[0]
      }
      return rows
    } catch (err) {
      const e = pgError(err)
      reply.code(e.status).send({ message: e.message, code: e.code, details: e.details, hint: e.hint })
    }
  })

  app.post('/rest/v1/:table', { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { table } = req.params as { table: string }
      const info = getTable(table)
      if (!info) throw new RestError(404, `Table ${table} not found`, 'PGRST205')
      const policy = getPolicy(table)
      if (!policy) throw new RestError(403, 'No insert policy', '42501')
      const access = policy.insert(req.auth!)
      if (access.filter === false) throw new RestError(403, 'Row-level security violation: insert denied', '42501')
      const body = req.body
      const bodies: Record<string, unknown>[] = Array.isArray(body) ? body : [body as Record<string, unknown>]
      if (bodies.length === 0) throw new RestError(400, 'Empty insert body', 'PGRST102')
      const rows = bodies.map((b) => prepareRow(b, access, info))
      for (const row of rows) await insertAllowed(access, row, info, req.auth!)

      const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
      // ensure all rows have all columns (null for missing)
      const valuesSql = rows.map((row) => sql`(${sql.join(cols.map((c) => sql`${serializeValue(row[c], info.columnTypes.get(c))}`), sql`, `)})`)
      const prefer = String(req.headers.prefer ?? '')
      const query = req.query as Record<string, string>
      let stmt = sql`INSERT INTO ${sql.raw(`"${table}"`)} (${sql.raw(cols.map((c) => `"${c}"`).join(', '))}) VALUES ${sql.join(valuesSql, sql`, `)}`
      if (prefer.includes('resolution=merge-duplicates') && query.on_conflict) {
        const conflictCols = query.on_conflict.split(',').filter((c) => info.columnNames.has(c))
        const updateCols = cols.filter((c) => !conflictCols.includes(c))
        stmt = sql`${stmt} ON CONFLICT (${sql.raw(conflictCols.map((c) => `"${c}"`).join(', '))}) DO UPDATE SET ${sql.raw(updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', '))}`
      } else if (prefer.includes('resolution=ignore-duplicates') && query.on_conflict) {
        const conflictCols = query.on_conflict.split(',').filter((c) => info.columnNames.has(c))
        stmt = sql`${stmt} ON CONFLICT (${sql.raw(conflictCols.map((c) => `"${c}"`).join(', '))}) DO NOTHING`
      }
      stmt = sql`${stmt} RETURNING *`
      const result = await db.execute(stmt)
      const inserted = result.rows as Record<string, unknown>[]
      emitChanges(table, 'INSERT', inserted, [])
      if (!wantsRepresentation(req)) {
        reply.code(201)
        return null
      }
      reply.code(201)
      return wantsSingle(req) ? inserted[0] ?? null : inserted
    } catch (err) {
      const e = pgError(err)
      reply.code(e.status).send({ message: e.message, code: e.code, details: e.details, hint: e.hint })
    }
  })

  app.patch('/rest/v1/:table', { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { table } = req.params as { table: string }
      const info = getTable(table)
      if (!info) throw new RestError(404, `Table ${table} not found`, 'PGRST205')
      const policy = getPolicy(table)
      if (!policy) throw new RestError(403, 'No update policy', '42501')
      const access = policy.update(req.auth!)
      if (access.filter === false) throw new RestError(403, 'Row-level security violation: update denied', '42501')
      const query = req.query as Record<string, string>
      const conditions = parseFilters(query, info)
      if (conditions.length === 0) throw new RestError(400, 'Update requires at least one filter', 'PGRST100')
      const policyFilter = access.filter === true ? undefined : access.filter
      const where = combineWhere([...conditions, policyFilter])
      const oldRes = await db.execute(sql`SELECT * FROM ${sql.raw(`"${table}"`)} WHERE ${where}`)
      const oldRows = oldRes.rows as Record<string, unknown>[]
      if (oldRows.length === 0) return wantsSingle(req) ? null : []

      const patch = prepareRow(req.body as Record<string, unknown>, access, info)
      if (Object.keys(patch).length === 0) throw new RestError(400, 'Empty update body', 'PGRST102')
      if (access.check) {
        const err = access.check(patch, req.auth!)
        if (err) throw new RestError(403, err, '42501')
      }
      const setCols = Object.keys(patch)
      const setSql = sql.raw(setCols.map((c) => `"${c}"`).join(', '))
      const setValues = sql.join(setCols.map((c) => sql`${serializeValue(patch[c], info.columnTypes.get(c))}`), sql`, `)
      const ids = oldRows.map((r) => r.id)
      const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `)
      // multi-column UPDATE via ROW syntax
      const result = await db.execute(
        sql`UPDATE ${sql.raw(`"${table}"`)} SET (${setSql}) = ROW(${setValues}) WHERE id IN (${idList}) RETURNING *`,
      )
      const updated = result.rows as Record<string, unknown>[]
      emitChanges(table, 'UPDATE', updated, oldRows)
      if (!wantsRepresentation(req)) return null
      return wantsSingle(req) ? updated[0] ?? null : updated
    } catch (err) {
      const e = pgError(err)
      reply.code(e.status).send({ message: e.message, code: e.code, details: e.details, hint: e.hint })
    }
  })

  app.delete('/rest/v1/:table', { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { table } = req.params as { table: string }
      const info = getTable(table)
      if (!info) throw new RestError(404, `Table ${table} not found`, 'PGRST205')
      const policy = getPolicy(table)
      if (!policy) throw new RestError(403, 'No delete policy', '42501')
      const access = policy.delete(req.auth!)
      if (access.filter === false) throw new RestError(403, 'Row-level security violation: delete denied', '42501')
      const query = req.query as Record<string, string>
      const conditions = parseFilters(query, info)
      if (conditions.length === 0) throw new RestError(400, 'Delete requires at least one filter', 'PGRST100')
      const policyFilter = access.filter === true ? undefined : access.filter
      const where = combineWhere([...conditions, policyFilter])
      const result = await db.execute(sql`DELETE FROM ${sql.raw(`"${table}"`)} WHERE ${where} RETURNING *`)
      const deleted = result.rows as Record<string, unknown>[]
      emitChanges(table, 'DELETE', deleted, deleted)
      if (!wantsRepresentation(req)) return null
      return wantsSingle(req) ? deleted[0] ?? null : deleted
    } catch (err) {
      const e = pgError(err)
      reply.code(e.status).send({ message: e.message, code: e.code, details: e.details, hint: e.hint })
    }
  })
}

async function handleRpc(req: FastifyRequest, reply: import('fastify').FastifyReply) {
  try {
    const { fn } = req.params as { fn: string }
    const args = (req.method === 'GET' ? req.query : req.body ?? {}) as Record<string, unknown>
    const ctx = req.auth

    switch (fn) {
      case 'increment_kb_view': {
        const articleId = String(args.article_id ?? '')
        await db.execute(sql`UPDATE kb_articles SET view_count = view_count + 1 WHERE id = ${articleId}::uuid AND (status = 'published' OR ${ctx?.isTechnicalTeam ?? false})`)
        return null
      }
      case 'log_analytics_event': {
        if (!ctx) throw new RestError(401, 'Authentication required', 'PGRST301')
        const result = await db.execute(sql`
          INSERT INTO analytics_events (event_type, event_category, application_id, agent_id, user_id, metadata)
          VALUES (${String(args.p_event_type)}, ${args.p_event_category ? String(args.p_event_category) : null},
                  ${args.p_application_id ? String(args.p_application_id) : null}::uuid,
                  ${args.p_agent_id ? String(args.p_agent_id) : null}::uuid,
                  ${ctx.id}::uuid, ${JSON.stringify(args.p_metadata ?? null)}::jsonb)
          RETURNING id`)
        return (result.rows[0] as { id: string }).id
      }
      case 'get_team_member_permissions': {
        if (!ctx) throw new RestError(401, 'Authentication required', 'PGRST301')
        const userId = String(args.p_user_id ?? ctx.id)
        const result = await db.execute(sql`
          SELECT p.permission_type::text, p.scope::text, NULL::text AS scope_type, NULL::text AS scope_id, NULL::text AS category
          FROM admission_team_permissions p
          JOIN admission_team_members m ON m.id = p.team_member_id
          WHERE m.user_id = ${userId}::uuid AND p.is_granted = true AND (p.expires_at IS NULL OR p.expires_at > now())
          UNION ALL
          SELECT NULL, NULL, g.scope_type, g.scope_id, NULL
          FROM admission_team_geographic_scope g
          JOIN admission_team_members m ON m.id = g.team_member_id
          WHERE m.user_id = ${userId}::uuid
          UNION ALL
          SELECT NULL, NULL, NULL, NULL, c.category::text
          FROM admission_team_category_scope c
          JOIN admission_team_members m ON m.id = c.team_member_id
          WHERE m.user_id = ${userId}::uuid`)
        return result.rows
      }
      case 'get_admissions_by_country':
      case 'get_admissions_by_region':
      case 'get_admissions_by_agent_category': {
        if (!ctx || !(ctx.role === 'admin' || ctx.role === 'admission_manager' || ctx.isSuperAdmin)) {
          throw new RestError(403, 'Analytics access denied', '42501')
        }
        const start = String(args.p_start_date ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
        const end = String(args.p_end_date ?? new Date().toISOString().slice(0, 10))
        if (fn === 'get_admissions_by_country') {
          const result = await db.execute(sql`
            SELECT COALESCE(s.home_country, p.office_country, 'Unknown') AS country,
                   count(*)::int AS total_count,
                   count(*) FILTER (WHERE a.status = 'accepted')::int AS accepted_count,
                   count(*) FILTER (WHERE a.status = 'rejected')::int AS rejected_count,
                   count(*) FILTER (WHERE a.status = 'enrolled')::int AS enrollment_count
            FROM applications a
            LEFT JOIN students s ON s.id = a.student_id
            LEFT JOIN profiles p ON p.id = a.agent_id
            WHERE a.created_at >= ${start}::date AND a.created_at < (${end}::date + 1) AND a.status <> 'draft'
            GROUP BY 1 ORDER BY total_count DESC`)
          return result.rows
        }
        if (fn === 'get_admissions_by_region') {
          const result = await db.execute(sql`
            SELECT COALESCE(r.name, 'Unknown') AS region_name, r.code AS region_code, count(*)::int AS total_count
            FROM applications a
            LEFT JOIN students s ON s.id = a.student_id
            LEFT JOIN countries c ON lower(c.name) = lower(COALESCE(s.home_country, ''))
            LEFT JOIN regions r ON r.id = c.region_id
            WHERE a.created_at >= ${start}::date AND a.created_at < (${end}::date + 1) AND a.status <> 'draft'
            GROUP BY 1, 2 ORDER BY total_count DESC`)
          return result.rows
        }
        const result = await db.execute(sql`
          SELECT COALESCE(ac.category::text, 'pending_classification') AS category,
                 count(*)::int AS total_count,
                 count(*) FILTER (WHERE a.status IN ('accepted', 'enrolled'))::int AS accepted_count,
                 ROUND(100.0 * count(*) FILTER (WHERE a.status IN ('accepted', 'enrolled')) / NULLIF(count(*), 0), 2) AS success_rate
          FROM applications a
          LEFT JOIN agent_categories ac ON ac.agent_id = a.agent_id
          WHERE a.created_at >= ${start}::date AND a.created_at < (${end}::date + 1) AND a.status <> 'draft'
          GROUP BY 1 ORDER BY total_count DESC`)
        return result.rows
      }
      case 'accept_team_invite': {
        if (!ctx) throw new RestError(401, 'Authentication required', 'PGRST301')
        const invitationId = String(args.invitation_id ?? '')
        const result = await db.execute(sql`
          SELECT id, agency_id, invited_email, status FROM team_members WHERE id = ${invitationId}::uuid`)
        const invite = result.rows[0] as { id: string; agency_id: string; invited_email: string; status: string } | undefined
        if (!invite) throw new RestError(404, 'Invitation not found', 'PGRST116')
        if (invite.invited_email.toLowerCase() !== ctx.email.toLowerCase()) {
          throw new RestError(403, 'This invitation belongs to a different email address', '42501')
        }
        if (invite.status === 'active') return { agency_id: invite.agency_id }
        await db.execute(sql`UPDATE profiles SET role = 'editor', parent_agency_id = ${invite.agency_id}::uuid, is_active = true WHERE id = ${ctx.id}::uuid`)
        await db.execute(sql`UPDATE team_members SET status = 'active' WHERE id = ${invitationId}::uuid`)
        return { agency_id: invite.agency_id }
      }
      default:
        throw new RestError(404, `Function ${fn} not found`, 'PGRST202')
    }
  } catch (err) {
    const e = pgError(err)
    reply.code(e.status).send({ message: e.message, code: e.code, details: e.details, hint: e.hint })
  }
}