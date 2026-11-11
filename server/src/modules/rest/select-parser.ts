import { sql, type SQL } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { getTable, type TableInfo } from '../../lib/table-registry.js'
import { getPolicy, type Access } from '../../lib/policies.js'
import type { AuthContext } from '../../plugins/auth.js'

export interface SelectNode {
  kind: 'column' | 'star' | 'embed'
  name: string
  alias?: string
  hint?: string
  children?: SelectNode[]
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of input) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

export function parseSelect(select: string): SelectNode[] {
  return splitTopLevel(select).map((part) => {
    const parenIdx = part.indexOf('(')
    if (parenIdx !== -1 && part.endsWith(')')) {
      const head = part.slice(0, parenIdx)
      const inner = part.slice(parenIdx + 1, -1)
      let alias: string | undefined
      let rest = head
      const colonIdx = head.indexOf(':')
      if (colonIdx !== -1) {
        alias = head.slice(0, colonIdx)
        rest = head.slice(colonIdx + 1)
      }
      const [name, rawHint] = rest.split('!')
      const hint = rawHint === 'inner' || rawHint === 'left' ? undefined : rawHint
      return { kind: 'embed', name, alias, hint, children: parseSelect(inner) }
    }
    const colonIdx = part.indexOf(':')
    if (colonIdx !== -1) {
      return { kind: 'column', name: part.slice(colonIdx + 1), alias: part.slice(0, colonIdx) }
    }
    if (part === '*') return { kind: 'star', name: '*' }
    return { kind: 'column', name: part }
  })
}

export function buildProjection(info: TableInfo, nodes: SelectNode[], access: Access): { projection: SQL; outputNames: string[] } {
  const names: string[] = []
  for (const node of nodes) {
    if (node.kind === 'embed') continue
    if (node.kind === 'star') {
      const allowed = access.columns ? [...info.columnNames].filter((c) => access.columns!.includes(c)) : [...info.columnNames]
      for (const col of allowed) names.push(col)
    } else {
      if (!info.columnNames.has(node.name)) throw new Error(`Unknown column ${node.name} on ${info.name}`)
      if (access.columns && !access.columns.includes(node.name)) throw new Error(`Column ${node.name} is not readable`)
      names.push(node.name)
    }
  }
  const unique = [...new Set(names)]
  for (const node of nodes) {
    if (node.kind !== 'embed') continue
    try {
      const resolved = resolveEmbed(info, node)
      if (
        resolved.direction === 'forward' &&
        info.columnNames.has(resolved.parentColumn) &&
        !unique.includes(resolved.parentColumn) &&
        (!access.columns || access.columns.includes(resolved.parentColumn))
      ) {
        unique.push(resolved.parentColumn)
      }
    } catch {
      // attachEmbeds surfaces resolution errors
    }
  }
  if (unique.length === 0) unique.push('id')
  const outputNames = unique.map((n) => {
    const aliasNode = nodes.find((x) => x.kind === 'column' && x.name === n && x.alias)
    return aliasNode?.alias ?? n
  })
  const projection = sql.raw(unique.map((n, i) => `"${n}" AS "${outputNames[i]}"`).join(', '))
  return { projection, outputNames }
}

interface ResolvedEmbed {
  direction: 'forward' | 'reverse'
  child: TableInfo
  parentColumn: string
  childColumn: string
}

export function resolveEmbed(parent: TableInfo, node: SelectNode): ResolvedEmbed {
  // Case 1: name is an FK column on the parent (alias:fk_column(...))
  const fkByCol = parent.foreignKeys.find((fk) => fk.columns[0] === node.name)
  if (fkByCol && getTable(fkByCol.foreignTable)) {
    return { direction: 'forward', child: getTable(fkByCol.foreignTable)!, parentColumn: fkByCol.columns[0], childColumn: fkByCol.foreignColumns[0] }
  }
  const child = getTable(node.name)
  if (!child) throw new Error(`Unknown embedded resource: ${node.name}`)
  if (node.hint) {
    const fwd = parent.foreignKeys.find((fk) => fk.columns[0] === node.hint && fk.foreignTable === child.name)
    if (fwd) return { direction: 'forward', child, parentColumn: fwd.columns[0], childColumn: fwd.foreignColumns[0] }
    const rev = child.foreignKeys.find((fk) => fk.foreignTable === parent.name && fk.columns[0] === node.hint)
    if (rev) return { direction: 'reverse', child, parentColumn: rev.foreignColumns[0], childColumn: rev.columns[0] }
    throw new Error(`Unknown FK hint ${node.hint} for ${node.name}`)
  }
  const fwd = parent.foreignKeys.find((fk) => fk.foreignTable === child.name)
  const rev = child.foreignKeys.find((fk) => fk.foreignTable === parent.name)
  if (fwd && !rev) return { direction: 'forward', child, parentColumn: fwd.columns[0], childColumn: fwd.foreignColumns[0] }
  if (rev && !fwd) return { direction: 'reverse', child, parentColumn: rev.foreignColumns[0], childColumn: rev.columns[0] }
  if (fwd && rev) throw new Error(`Ambiguous embed ${node.name}; use !fk_column hint`)
  throw new Error(`No relationship between ${parent.name} and ${node.name}`)
}

function combineWhere(conditions: (SQL | undefined | null | boolean)[]): SQL {
  const parts: SQL[] = []
  for (const c of conditions) {
    if (c === true || c === undefined || c === null) continue
    if (c === false) return sql`false`
    parts.push(c)
  }
  if (parts.length === 0) return sql`true`
  return sql.join(parts, sql` AND `)
}

export async function fetchRows(
  info: TableInfo,
  nodes: SelectNode[],
  where: SQL,
  ctx: AuthContext | null,
  opts: { order?: SQL | null; limit?: number; offset?: number } = {},
): Promise<Record<string, unknown>[]> {
  const policy = getPolicy(info.name)
  const access = policy ? policy.select(ctx) : ({ filter: false } as Access)
  if (access.filter === false) return []
  const policyFilter = access.filter === true ? undefined : access.filter
  const finalWhere = combineWhere([where, policyFilter])
  const { projection } = buildProjection(info, nodes, access)
  let query = sql`SELECT ${projection} FROM ${sql.raw(`"${info.name}"`)} WHERE ${finalWhere}`
  if (opts.order) query = sql`${query} ORDER BY ${opts.order}`
  if (opts.limit !== undefined) query = sql`${query} LIMIT ${opts.limit}`
  if (opts.offset !== undefined) query = sql`${query} OFFSET ${opts.offset}`
  const result = await db.execute(query)
  let rows = result.rows as Record<string, unknown>[]
  if (access.mask) rows = rows.map((r) => access.mask!(r, ctx!))
  await attachEmbeds(rows, nodes, info, ctx)
  return rows
}

async function attachEmbeds(rows: Record<string, unknown>[], nodes: SelectNode[], parent: TableInfo, ctx: AuthContext | null): Promise<void> {
  const embeds = nodes.filter((n) => n.kind === 'embed')
  for (const node of embeds) {
    const resolved = resolveEmbed(parent, node)
    const key = node.alias ?? node.name
    const childPolicy = getPolicy(resolved.child.name)
    const childAccess = childPolicy ? childPolicy.select(ctx) : ({ filter: false } as Access)
    if (childAccess.filter === false || rows.length === 0) {
      for (const row of rows) row[key] = resolved.direction === 'reverse' ? [] : null
      continue
    }
    const ids = [...new Set(rows.map((r) => r[resolved.parentColumn]).filter((v) => v !== null && v !== undefined))]
    if (ids.length === 0) {
      for (const row of rows) row[key] = resolved.direction === 'reverse' ? [] : null
      continue
    }
    const inList = sql`${sql.raw(`"${resolved.childColumn}"`)} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`
    const childWhere = combineWhere([inList, childAccess.filter === true ? undefined : childAccess.filter])
    const { projection } = buildProjection(resolved.child, node.children ?? [{ kind: 'star', name: '*' }], childAccess)
    const result = await db.execute(sql`SELECT ${projection} FROM ${sql.raw(`"${resolved.child.name}"`)} WHERE ${childWhere}`)
    let childRows = result.rows as Record<string, unknown>[]
    if (childAccess.mask) childRows = childRows.map((r) => childAccess.mask!(r, ctx!))
    await attachEmbeds(childRows, node.children ?? [], resolved.child, ctx)
    if (resolved.direction === 'forward') {
      const map = new Map(childRows.map((r) => [String(r[resolved.childColumn]), r]))
      for (const row of rows) {
        const v = row[resolved.parentColumn]
        row[key] = v === null || v === undefined ? null : map.get(String(v)) ?? null
      }
    } else {
      const groups = new Map<string, Record<string, unknown>[]>()
      for (const childRow of childRows) {
        const fk = String(childRow[resolved.childColumn])
        if (!groups.has(fk)) groups.set(fk, [])
        groups.get(fk)!.push(childRow)
      }
      for (const row of rows) row[key] = groups.get(String(row[resolved.parentColumn])) ?? []
    }
  }
}

export { combineWhere }