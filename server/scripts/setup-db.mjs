// One-time local database bootstrap.
// Usage: PG_ADMIN_PASSWORD='<postgres superuser password>' node scripts/setup-db.mjs
import pg from 'pg'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const adminPassword = process.env.PG_ADMIN_PASSWORD
const port = Number(process.env.PG_PORT || 5432)
if (!adminPassword) {
  console.error('Set PG_ADMIN_PASSWORD to the local postgres superuser password.')
  process.exit(1)
}

const appPassword = crypto.randomBytes(24).toString('base64url')
const client = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password: adminPassword, database: 'postgres' })
await client.connect()

const roleExists = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = 'admission_app'`)
if (roleExists.rowCount === 0) {
  await client.query(`CREATE ROLE admission_app LOGIN PASSWORD '${appPassword}'`)
  console.log('Created role admission_app')
} else {
  await client.query(`ALTER ROLE admission_app WITH LOGIN PASSWORD '${appPassword}'`)
  console.log('Role admission_app exists — password rotated')
}

const dbExists = await client.query(`SELECT 1 FROM pg_database WHERE datname = 'admission_desk'`)
if (dbExists.rowCount === 0) {
  await client.query(`CREATE DATABASE admission_desk OWNER admission_app`)
  console.log('Created database admission_desk')
} else {
  console.log('Database admission_desk already exists')
}
await client.end()

const envPath = path.join(root, '.env')
if (fs.existsSync(envPath)) {
  console.log('.env already exists — leaving it untouched. Update DATABASE_URL manually if needed.')
} else {
  const template = fs.readFileSync(path.join(root, '.env.example'), 'utf8')
  const env = template
    .replace('DATABASE_URL=postgresql://admission_app:CHANGE_ME@127.0.0.1:5432/admission_desk', `DATABASE_URL=postgresql://admission_app:${appPassword}@127.0.0.1:${port}/admission_desk`)
    .replace('JWT_SECRET=CHANGE_ME', `JWT_SECRET=${crypto.randomBytes(48).toString('base64url')}`)
    .replace('COOKIE_SECRET=CHANGE_ME', `COOKIE_SECRET=${crypto.randomBytes(48).toString('base64url')}`)
    .replace('MFA_ENCRYPTION_KEY=CHANGE_ME_64_HEX_CHARS', `MFA_ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`)
    .replace('SEED_ADMIN_PASSWORD=CHANGE_ME', `SEED_ADMIN_PASSWORD=${crypto.randomBytes(12).toString('base64url')}`)
  fs.writeFileSync(envPath, env)
  console.log('Wrote server/.env with generated secrets.')
  const seedPw = env.match(/SEED_ADMIN_PASSWORD=(.+)/)?.[1]
  console.log(`\nBootstrap admin credentials (change after first login):\n  email: admin@admissiondesk.local\n  password: ${seedPw}\n`)
}
console.log('Done. Next: npm run db:migrate && npm run db:seed')