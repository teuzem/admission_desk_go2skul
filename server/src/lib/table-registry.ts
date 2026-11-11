import { PgTable, getTableConfig } from 'drizzle-orm/pg-core'
import { is } from 'drizzle-orm'
import * as schema from '../db/schema/index.js'

export interface ForeignKeyInfo {
  columns: string[]
  foreignTable: string
  foreignColumns: string[]
}

export interface TableInfo {
  name: string
  table: PgTable
  columns: Map<string, string> // db column name -> property key
  columnNames: Set<string>
  columnTypes: Map<string, string>
  foreignKeys: ForeignKeyInfo[]
}

const EXCLUDED = new Set(['users', 'refresh_tokens', 'email_tokens', 'auth_challenges', 'mfa_factors', 'files'])

export const tableRegistry = new Map<string, TableInfo>()

for (const value of Object.values(schema)) {
  if (!is(value, PgTable)) continue
  const cfg = getTableConfig(value)
  if (EXCLUDED.has(cfg.name)) continue
  const columns = new Map<string, string>()
  const columnTypes = new Map<string, string>()
  for (const col of cfg.columns) {
    columns.set(col.name, (col as unknown as { key: string }).key ?? col.name)
    columnTypes.set(col.name, col.getSQLType())
  }
  const foreignKeys: ForeignKeyInfo[] = cfg.foreignKeys.map((fk) => {
    const ref = fk.reference()
    return {
      columns: ref.columns.map((c) => c.name),
      foreignTable: getTableConfig(ref.foreignTable).name,
      foreignColumns: ref.foreignColumns.map((c) => c.name),
    }
  })
  tableRegistry.set(cfg.name, {
    name: cfg.name,
    table: value,
    columns,
    columnNames: new Set(columns.keys()),
    columnTypes,
    foreignKeys,
  })
}

export function getTable(name: string): TableInfo | undefined {
  return tableRegistry.get(name)
}