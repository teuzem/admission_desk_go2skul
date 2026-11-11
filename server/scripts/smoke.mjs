const BASE = 'http://127.0.0.1:4000'
let pass = 0, fail = 0
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name) }
  else { fail++; console.log('FAIL', name, extra) }
}

const login = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@admissiondesk.local', password: process.env.ADMIN_PW || process.env.SEED_ADMIN_PASSWORD }),
}).then(r => r.json())
const H = { Authorization: `Bearer ${login.access_token}`, apikey: 'local', 'Content-Type': 'application/json' }

// seeded reads
let r = await fetch(`${BASE}/rest/v1/kb_categories?select=id,name,slug&order=display_order.asc`, { headers: H })
let rows = await r.json()
check('kb_categories seeded', r.status === 200 && rows.length === 10, JSON.stringify(rows).slice(0, 120))

r = await fetch(`${BASE}/rest/v1/countries?select=code,name&limit=3`, { headers: H })
rows = await r.json()
check('countries seeded', r.status === 200 && rows.length === 3)

// count + Content-Range
r = await fetch(`${BASE}/rest/v1/regions?select=*`, { headers: { ...H, Prefer: 'count=exact' } })
check('count header', r.headers.get('content-range')?.startsWith('0-5/6'), r.headers.get('content-range'))

// insert announcement
r = await fetch(`${BASE}/rest/v1/announcements`, {
  method: 'POST', headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({ title: 'Smoke test', content: 'hello' }),
})
const created = await r.json()
check('insert announcement', r.status === 201 && created[0]?.id, JSON.stringify(created).slice(0, 200))
const annId = created[0]?.id

// filter eq + single object
r = await fetch(`${BASE}/rest/v1/announcements?id=eq.${annId}&select=title,content`, { headers: { ...H, Accept: 'application/vnd.pgrst.object+json' } })
const single = await r.json()
check('eq filter + single', r.status === 200 && single.title === 'Smoke test', JSON.stringify(single))

// patch
r = await fetch(`${BASE}/rest/v1/announcements?id=eq.${annId}`, {
  method: 'PATCH', headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({ title: 'Smoke updated' }),
})
const patched = await r.json()
check('patch', r.status === 200 && patched[0]?.title === 'Smoke updated')

// embed: announcement author -> profiles (created_by may be null; use universities->campuses instead)
r = await fetch(`${BASE}/rest/v1/universities?select=id,name,campuses:university_campuses(id,country)&limit=1`, { headers: H })
check('embed query runs', r.status === 200, JSON.stringify(await r.json()).slice(0, 150))

// delete
r = await fetch(`${BASE}/rest/v1/announcements?id=eq.${annId}`, { method: 'DELETE', headers: H })
check('delete', r.status === 204 || r.status === 200, String(r.status))

// unauthenticated denial on protected table
r = await fetch(`${BASE}/rest/v1/profiles?select=*`)
const body = await r.json()
check('anon denied profiles', r.status === 401 || (r.status === 200 && Array.isArray(body) && body.length === 0), `${r.status} ${JSON.stringify(body).slice(0, 100)}`)

// refresh token rotation
r = await fetch(`${BASE}/auth/v1/token?grant_type=refresh_token`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: login.refresh_token }),
})
const refreshed = await r.json()
check('refresh rotation', r.status === 200 && refreshed.refresh_token && refreshed.refresh_token !== login.refresh_token)

// reuse of old refresh token must fail (family revoked)
r = await fetch(`${BASE}/auth/v1/token?grant_type=refresh_token`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: login.refresh_token }),
})
check('refresh reuse rejected', r.status >= 400, String(r.status))

// storage signed URL roundtrip on public bucket requires an object; just check list endpoint shape
r = await fetch(`${BASE}/storage/v1/object/list/kb-media`, { method: 'POST', headers: H, body: JSON.stringify({ prefix: '', limit: 10 }) })
check('storage list', r.status === 200, String(r.status))

console.log(`\n${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0