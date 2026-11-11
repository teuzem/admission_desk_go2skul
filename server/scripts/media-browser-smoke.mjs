import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright'
import pg from 'pg'
import argon2 from 'argon2'

const origin = 'http://localhost:5173'
const api = 'http://127.0.0.1:4000'
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname), 'Only run against a local test database')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const id = randomUUID()
const email = `media-${id}@example.com`
const password = 'Media-Browser-2026!-Strong'
const universityIds = new Set()
const programIds = new Set()
let passed = 0
let token
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' })
page.setDefaultTimeout(20000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('response', async response => {
  const table = new URL(response.url()).pathname
  if (response.request().method() !== 'POST' || !response.ok()) return
  if (table !== '/rest/v1/universities' && table !== '/rest/v1/programs') return
  const rows = await response.json()
  for (const row of Array.isArray(rows) ? rows : [rows]) {
    if (row.id) (table.endsWith('/universities') ? universityIds : programIds).add(row.id)
  }
})
function check(name, value) { assert(value, name); console.log(`PASS ${name}`); passed++ }
async function next(times) {
  for (let i = 0; i < times; i++) await page.getByRole('button', { name: /^Next:/ }).click()
}
async function image(name, color) {
  const data = await page.evaluate(color => {
    const canvas = document.createElement('canvas')
    canvas.width = 32; canvas.height = 32
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = color; ctx.fillRect(0, 0, 32, 32)
    return canvas.toDataURL('image/png').split(',')[1]
  }, color)
  return { name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') }
}
async function submit(name) {
  await page.getByRole('button', { name, exact: true }).click()
  await page.waitForURL('**/admin')
}
async function readable(url, bytes, name) {
  assert(url, `${name} URL missing`)
  const response = await fetch(url)
  check(`${name}: public fetch has correct MIME`, response.status === 200 && response.headers.get('content-type').startsWith('image/png'))
  check(`${name}: uploaded bytes preserved`, Buffer.from(await response.arrayBuffer()).equals(bytes))
}
try {
  await pool.query('INSERT INTO users (id, email, password_hash, email_verified_at) VALUES ($1, $2, $3, now())', [id, email, await argon2.hash(password, { type: argon2.argon2id })])
  await pool.query("INSERT INTO profiles (id, email, first_name, role, kyc_status) VALUES ($1, $2, 'Media Smoke', 'admin', 'approved')", [id, email])
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
  await page.goto(origin + '/admin/login')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/admin')
  token = await page.evaluate(() => JSON.parse(localStorage.getItem('admission-desk-auth')).access_token)
  const red = await image('misleading-extension.jpeg', '#de3344')
  const blue = await image('replacement.png', '#245cdd')

  const name = `Media Smoke University ${id}`
  await page.goto(origin + '/admin/universities/new')
  await page.getByPlaceholder('e.g., University of Toronto').fill(name)
  await page.locator('select').nth(0).selectOption('Canada')
  await next(2)
  await page.locator('input[type="file"]').nth(0).setInputFiles({ name: 'invalid.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await page.getByText('Choose a JPG, PNG, or WebP image', { exact: true }).waitFor()
  check('University form rejects unsupported images visibly', await page.getByRole('img', { name: 'Logo', exact: true }).count() === 0)
  await page.locator('input[type="file"]').nth(0).setInputFiles(red)
  await page.locator('input[type="file"]').nth(1).setInputFiles(red)
  await submit('Create University')
  const { rows: [uni] } = await pool.query('SELECT id, logo_url, image_url FROM universities WHERE name = $1', [name])
  assert(uni)
  universityIds.add(uni.id)
  check('University creation persists both media URLs', uni.logo_url.includes('.png?') && uni.image_url.includes('.png?'))
  await readable(uni.logo_url, red.buffer, 'University logo')
  await readable(uni.image_url, red.buffer, 'University campus')
  await page.goto(`${origin}/admin/universities/edit/${uni.id}`)
  await next(2)
  check('University saved logo renders in browser', await page.getByRole('img', { name: 'Logo', exact: true }).evaluate(img => img.complete && img.naturalWidth === 32))
  await page.locator('input[type="file"]').nth(0).setInputFiles(blue)
  await page.locator('input[type="file"]').nth(1).setInputFiles(blue)
  await submit('Save Changes')
  const { rows: [updatedUni] } = await pool.query('SELECT logo_url, image_url FROM universities WHERE id = $1', [uni.id])
  check('University replacement invalidates cached URL', updatedUni.logo_url !== uni.logo_url)
  await readable(updatedUni.logo_url, blue.buffer, 'Replaced logo')
  await readable(updatedUni.image_url, blue.buffer, 'Replaced campus')

  await page.goto(origin + '/admin/programs/new')
  await page.locator('select').nth(0).selectOption(uni.id)
  await next(1)
  const programName = `Media Smoke Program ${id}`
  await page.getByPlaceholder('e.g., Bachelor of Computer Science').fill(programName)
  await page.locator('select').nth(0).selectOption({ index: 1 })
  await next(3)
  await page.locator('input[type="file"]').setInputFiles(red)
  await submit('Create Program')
  const { rows: [program] } = await pool.query('SELECT id, img_url FROM programs WHERE name = $1', [programName])
  assert(program)
  programIds.add(program.id)
  await readable(program.img_url, red.buffer, 'Program cover')
  await page.goto(`${origin}/admin/programs/edit/${program.id}`)
  await next(4)
  await page.locator('input[type="file"]').setInputFiles(blue)
  await submit('Save Changes')
  const { rows: [updatedProgram] } = await pool.query('SELECT img_url FROM programs WHERE id = $1', [program.id])
  check('Program replacement invalidates cached URL', updatedProgram.img_url !== program.img_url)
  await readable(updatedProgram.img_url, blue.buffer, 'Replaced program cover')

  await page.goto(`${origin}/admin/universities/edit/${uni.id}`)
  await next(2)
  await page.locator('input[type="file"]').nth(0).setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not a PNG image') })
  const rejected = page.waitForResponse(r => new URL(r.url()).pathname.startsWith('/storage/v1/object/university-assets/') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
  check('Server rejects disguised image payload', (await rejected).status() === 415)
  await page.getByText(/Only valid JPG, PNG, and WebP images are allowed/).waitFor()
  check('Failed upload remains on edit form with visible error', page.url().includes(`/edit/${uni.id}`))
  const { rows: [unchanged] } = await pool.query('SELECT logo_url FROM universities WHERE id = $1', [uni.id])
  check('Failed replacement preserves previous URL', unchanged.logo_url === updatedUni.logo_url)
  await readable(unchanged.logo_url, blue.buffer, 'Logo after rejected replacement')

  const privatePath = `${id}/private smoke.png`
  const upload = await fetch(`${api}/storage/v1/object/agent-documents/${encodeURIComponent(privatePath).replaceAll('%2F', '/')}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' }, body: red.buffer })
  check('Private document upload', upload.status === 200)
  const signed = await fetch(`${api}/storage/v1/object/sign/agent-documents/${encodeURIComponent(privatePath).replaceAll('%2F', '/')}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 }) })
  const { signedURL } = await signed.json()
  check('Private document signing', signed.status === 200 && Boolean(signedURL))
  await readable(`${api}/storage/v1${signedURL}`, red.buffer, 'Signed document')
  const denied = await fetch(`${api}/storage/v1/object/public/agent-documents/${privatePath}`)
  check('Private document cannot be read publicly', denied.status === 400)
  check('No uncaught browser exceptions', errors.length === 0)
  console.log(`Browser media: ${passed} passed`)
} catch (error) {
  console.error(error.message)
  console.error('At route', new URL(page.url()).pathname)
  if (errors.length) console.error(errors)
  await page.screenshot({ path: 'scripts/media-failure-smoke.png', fullPage: true })
  process.exitCode = 1
} finally {
  await browser.close()
  if (token) {
    const objects = await pool.query('SELECT bucket, path FROM files WHERE uploaded_by = $1', [id])
    for (const object of objects.rows) {
      const r = await fetch(`${api}/storage/v1/object/${object.bucket}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [object.path] }) })
      assert(r.ok(), 'Test media cleanup failed')
    }
  }
  for (const programId of programIds) await pool.query('DELETE FROM programs WHERE id = $1', [programId])
  for (const universityId of universityIds) await pool.query('DELETE FROM universities WHERE id = $1', [universityId])
  await pool.query('DELETE FROM users WHERE id = $1', [id])
  await pool.end()
}
