import { sql, type SQL } from 'drizzle-orm'
import type { TableInfo } from '../../lib/table-registry.js'

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])

const OPERATORS: Record<string, string> = {
  eq: '=',
  neq: '<>',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  ilike: 'ILIKE',
  cs: '@>',
  cd: '<@',
  ov: '&&',
}

function splitTopLevel(input: string, sep = ','): string[] {
  const parts: string[] = []
  let depth = 0
  let inQuotes = false
  let current = ''
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '"') inQuotes = !inQuotes
    if (!inQuotes) {
      if (ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === sep && depth === 0) {
        parts.push(current)
        current = ''
        continue
      }
    }
    current += ch
  }
  if (current) parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  return value
}

function castValue(column: string, value: string, info: TableInfo): SQL {
  return sql`${unquote(value)}`
}

function parseCondition(expr: string, info: TableInfo): SQL {
  // forms: col.op.value | col.not.op.value | col.is.null | col.in.(a,b)
  const firstDot = expr.indexOf('.')
  if (firstDot === -1) throw new Error(`Invalid filter expression: ${expr}`)
  const column = expr.slice(0, firstDot)
  if (!info.columnNames.has(column)) throw new Error(`Unknown filter column: ${column}`)
  let rest = expr.slice(firstDot + 1)
  let negated = false
  if (rest.startsWith('not.')) {
    negated = true
    rest = rest.slice(4)
  }
  const secondDot = rest.indexOf('.')
  const op = secondDot === -1 ? rest : rest.slice(0, secondDot)
  const rawValue = secondDot === -1 ? '' : rest.slice(secondDot + 1)
  const colSql = sql.raw(`"${column}"`)

  let cond: SQL
  if (op === 'is') {
    const v = rawValue.toLowerCase()
    if (v === 'null') cond = sql`${colSql} IS NULL`
    else if (v === 'true') cond = sql`${colSql} IS TRUE`
    else if (v === 'false') cond = sql`${colSql} IS FALSE`
    else if (v === 'unknown') cond = sql`${colSql} IS NULL`
    else throw new Error(`Unsupported IS value: ${rawValue}`)
  } else if (op === 'in') {
    const inner = rawValue.replace(/^\(/, '').replace(/\)$/, '')
    const values = splitTopLevel(inner).map((v) => unquote(v))
    if (values.length === 0) cond = sql`false`
    else cond = sql`${colSql} IN (${sql.join(values.map((v) => sql`${v}`), sql`, `)})`
  } else if (OPERATORS[op]) {
    let value = unquote(rawValue)
    if (op === 'like' || op === 'ilike') value = value.replace(/\*/g, '%')
    if (op === 'cs' || op === 'cd' || op === 'ov') {
      // array or jsonb literal
      cond = sql`${colSql} ${sql.raw(OPERATORS[op])} ${value}::jsonb`
      // arrays use text[] cast; try to detect
      if (value.startsWith('{') && !value.startsWith('{\"')) {
        cond = sql`${colSql} ${sql.raw(OPERATORS[op])} ${value}::text[]`
      }
    } else {
      cond = sql`${colSql} ${sql.raw(OPERATORS[op])} ${value}`
    }
  } else {
    throw new Error(`Unsupported operator: ${op}`)
  }
  return negated ? sql`NOT (${cond})` : cond
}

function parseLogic(value: string, joiner: 'AND' | 'OR', info: TableInfo): SQL {
  const inner = value.replace(/^\(/, '').replace(/\)$/, '')
  const parts = splitTopLevel(inner)
  const conditions = parts.map((part) => {
    if (part.startsWith('or=')) return parseLogic(part.slice(3), 'OR', info)
    if (part.startsWith('and=')) return parseLogic(part.slice(4), 'AND', info)
    if (part.startsWith('not.or=')) return sql`NOT (${parseLogic(part.slice(7), 'OR', info)})`
    if (part.startsWith('not.and=')) return sql`NOT (${parseLogic(part.slice(8), 'AND', info)})`
    return parseCondition(part, info)
  })
  if (conditions.length === 0) return sql`true`
  return sql.join(conditions, sql.raw(` ${joiner} `))
}

export function parseFilters(query: Record<string, unknown>, info: TableInfo): SQL[] {
  const conditions: SQL[] = []
  for (const [key, raw] of Object.entries(query)) {
    if (RESERVED.has(key) || raw === undefined) continue
    const value = String(raw)
    if (key === 'or') conditions.push(parseLogic(value, 'OR', info))
    else if (key === 'and') conditions.push(parseLogic(value, 'AND', info))
    else if (key === 'not.or') conditions.push(sql`NOT (${parseLogic(value, 'OR', info)})`)
    else if (key === 'not.and') conditions.push(sql`NOT (${parseLogic(value, 'AND', info)})`)
    else conditions.push(parseCondition(`${key}.${value}`, info))
  }
  return conditions
}

export function parseOrder(orderParam: string | undefined, info: TableInfo): SQL | null {
  if (!orderParam) return null
  const parts = splitTopLevel(orderParam).map((part) => {
    const [column, direction = 'asc', ...nulls] = part.split('.')
    if (!info.columnNames.has(column)) throw new Error(`Unknown order column: ${column}`)
    const dir = direction.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
    const nullsOpt = nulls[0] === 'nullslast' ? ' NULLS LAST' : nulls[0] === 'nullsfirst' ? ' NULLS FIRST' : ''
    return sql.raw(`"${column}" ${dir}${nullsOpt}`)
  })
  return sql.join(parts, sql`, `)
}