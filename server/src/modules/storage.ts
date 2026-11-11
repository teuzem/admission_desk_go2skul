import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { files } from '../db/schema/index.js'
import { config } from '../config.js'
import { requireAuth, isAdmin, isTechTeam, isContractRole, isAdmissionRole, isAgentSide, type AuthContext } from '../plugins/auth.js'
import { signStoragePath, verifyStorageSignature } from '../lib/crypto.js'

const PUBLIC_BUCKETS = new Set([
  'university-assets', 'program-assets', 'news-assets', 'announcement-assets', 'blog-assets',
  'admin-profiles', 'avatars', 'covers', 'support-attachments', 'kb-media',
])
const PRIVATE_BUCKETS = new Set(['kyc-documents', 'agent-documents', 'student-documents', 'admission-documents', 'message-attachments'])
const ALL_BUCKETS = new Set([...PUBLIC_BUCKETS, ...PRIVATE_BUCKETS])
const IMAGE_BUCKETS = new Set(['university-assets', 'program-assets', 'news-assets', 'announcement-assets', 'blog-assets', 'admin-profiles', 'avatars', 'covers'])
const IMAGE_MAX_BYTES = 5 * 1024 * 1024

function mimeTypeFromPath(objectPath: string): string {
  switch (path.extname(objectPath).toLowerCase()) {
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.png': return 'image/png'
    case '.webp': return 'image/webp'
    case '.gif': return 'image/gif'
    case '.avif': return 'image/avif'
    case '.pdf': return 'application/pdf'
    default: return 'application/octet-stream'
  }
}

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mimeType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mimeType === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
  return false
}

function storageRoot(): string {
  return path.resolve(config.STORAGE_DIR)
}

function safePath(bucket: string, objectPath: string): string | null {
  if (!ALL_BUCKETS.has(bucket)) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(objectPath)
  } catch {
    return null
  }
  if (decoded.includes('..') || decoded.startsWith('/') || decoded.includes('\\') || decoded.length > 500) return null
  const full = path.join(storageRoot(), bucket, decoded)
  if (!full.startsWith(path.join(storageRoot(), bucket) + path.sep)) return null
  return full
}

function canWriteBucket(bucket: string, objectPath: string, ctx: AuthContext): boolean {
  if (isAdmin(ctx)) return true
  switch (bucket) {
    case 'university-assets':
    case 'program-assets':
      return isAdmissionRole(ctx) || ctx.role === 'program_manager'
    case 'news-assets':
    case 'announcement-assets':
    case 'blog-assets':
      return false
    case 'kb-media':
      return isTechTeam(ctx)
    case 'support-attachments':
      return true
    case 'admin-profiles':
    case 'avatars':
    case 'covers':
      return objectPath.startsWith(ctx.id + '/') || objectPath.startsWith(ctx.id)
    case 'kyc-documents':
    case 'agent-documents':
      return isContractRole(ctx) || isAdmissionRole(ctx) || objectPath.startsWith(ctx.effectiveAgencyId + '/')
    case 'message-attachments':
      return objectPath.startsWith(ctx.id + '/')
    case 'student-documents':
    case 'admission-documents':
      return isAgentSide(ctx) || isAdmissionRole(ctx)
    default:
      return false
  }
}

async function canReadPrivate(bucket: string, objectPath: string, ctx: AuthContext): Promise<boolean> {
  if (isAdmin(ctx) || isAdmissionRole(ctx) || isContractRole(ctx) || isTechTeam(ctx)) return true
  switch (bucket) {
    case 'kyc-documents':
    case 'agent-documents':
      return objectPath.startsWith(ctx.effectiveAgencyId + '/')
    case 'message-attachments':
      return objectPath.startsWith(ctx.id + '/') || isAgentSide(ctx)
    case 'student-documents':
    case 'admission-documents': {
      if (!isAgentSide(ctx)) return false
      const studentId = objectPath.split('/')[0].split('_')[0]
      const result = await db.execute(sql`SELECT 1 FROM students WHERE id = ${studentId}::uuid AND agent_id = ${ctx.effectiveAgencyId}::uuid LIMIT 1`)
      return result.rows.length > 0
    }
    default:
      return false
  }
}

function storageError(reply: FastifyReply, status: number, message: string) {
  return reply.code(status).send({ statusCode: String(status), error: message, message })
}

export async function storageRoutes(app: FastifyInstance) {
  await fs.mkdir(storageRoot(), { recursive: true })

  // Public object serving
  app.get('/storage/v1/object/public/:bucket/*', async (req, reply) => {
    const { bucket } = req.params as { bucket: string }
    const objectPath = (req.params as Record<string, string>)['*']
    if (!PUBLIC_BUCKETS.has(bucket)) return storageError(reply, 400, 'Bucket is not public')
    const full = safePath(bucket, objectPath)
    if (!full) return storageError(reply, 400, 'Invalid path')
    try {
      const [meta] = await db.select().from(files).where(sql`${files.bucket} = ${bucket} AND ${files.path} = ${decodeURIComponent(objectPath)}`).limit(1)
      const data = await fs.readFile(full)
      reply.header('Cache-Control', 'public, max-age=3600')
      reply.header('X-Content-Type-Options', 'nosniff')
      reply.type(meta?.mimeType ?? mimeTypeFromPath(objectPath))
      return data
    } catch {
      return storageError(reply, 404, 'Object not found')
    }
  })

  // Create signed URL
  app.post('/storage/v1/object/sign/:bucket/*', { preHandler: requireAuth }, async (req, reply) => {
    const { bucket } = req.params as { bucket: string }
    const objectPath = decodeURIComponent((req.params as Record<string, string>)['*'])
    const body = (req.body ?? {}) as { expiresIn?: number }
    if (!PRIVATE_BUCKETS.has(bucket)) return storageError(reply, 400, 'Bucket does not support signing')
    if (!(await canReadPrivate(bucket, objectPath, req.auth!))) return storageError(reply, 403, 'Access denied')
    const full = safePath(bucket, objectPath)
    if (!full) return storageError(reply, 400, 'Invalid path')
    try {
      await fs.access(full)
    } catch {
      return storageError(reply, 404, 'Object not found')
    }
    const expiresIn = Math.min(Math.max(Number(body.expiresIn) || 3600, 60), 86400)
    const token = signStoragePath(bucket, objectPath, expiresIn)
    return { signedURL: `/object/sign/${bucket}/${encodeURIComponent(objectPath).replace(/%2F/g, '/')}?token=${token}` }
  })

  // Serve signed object
  app.get('/storage/v1/object/sign/:bucket/*', async (req, reply) => {
    const { bucket } = req.params as { bucket: string }
    const objectPath = decodeURIComponent((req.params as Record<string, string>)['*'])
    const token = String((req.query as Record<string, string>).token ?? '')
    if (!verifyStorageSignature(bucket, objectPath, token)) return storageError(reply, 403, 'Invalid or expired signature')
    const full = safePath(bucket, objectPath)
    if (!full) return storageError(reply, 400, 'Invalid path')
    try {
      const [meta] = await db.select().from(files).where(sql`${files.bucket} = ${bucket} AND ${files.path} = ${objectPath}`).limit(1)
      const data = await fs.readFile(full)
      reply.type(meta?.mimeType ?? mimeTypeFromPath(objectPath))
      const download = (req.query as Record<string, string>).download
      if (download !== undefined) {
        reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(download || meta?.originalName || 'file')}"`)
      }
      reply.header('Cache-Control', 'private, max-age=60')
      return data
    } catch {
      return storageError(reply, 404, 'Object not found')
    }
  })

  // Authenticated direct download
  app.get('/storage/v1/object/:bucket/*', { preHandler: requireAuth }, async (req, reply) => {
    const { bucket } = req.params as { bucket: string }
    const objectPath = decodeURIComponent((req.params as Record<string, string>)['*'])
    if (objectPath.startsWith('public/') || objectPath.startsWith('sign/')) return storageError(reply, 400, 'Invalid path')
    if (PRIVATE_BUCKETS.has(bucket) && !(await canReadPrivate(bucket, objectPath, req.auth!))) return storageError(reply, 403, 'Access denied')
    const full = safePath(bucket, objectPath)
    if (!full) return storageError(reply, 400, 'Invalid path')
    try {
      const [meta] = await db.select().from(files).where(sql`${files.bucket} = ${bucket} AND ${files.path} = ${objectPath}`).limit(1)
      const data = await fs.readFile(full)
      reply.type(meta?.mimeType ?? mimeTypeFromPath(objectPath))
      return data
    } catch {
      return storageError(reply, 404, 'Object not found')
    }
  })

  // Upload (raw body or multipart)
  const uploadHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const { bucket } = req.params as { bucket: string }
    const objectPath = decodeURIComponent((req.params as Record<string, string>)['*'])
    if (!ALL_BUCKETS.has(bucket)) return storageError(reply, 400, 'Unknown bucket')
    if (!canWriteBucket(bucket, objectPath, req.auth!)) return storageError(reply, 403, 'Upload not allowed for this bucket/path')
    const full = safePath(bucket, objectPath)
    if (!full) return storageError(reply, 400, 'Invalid path')

    let buffer: Buffer
    let mimeType: string
    let originalName: string
    if ((req.headers['content-type'] ?? '').includes('multipart/form-data')) {
      const file = await (req as unknown as { file: () => Promise<{ toBuffer: () => Promise<Buffer>; mimetype: string; filename: string } | undefined> }).file()
      if (!file) return storageError(reply, 400, 'No file provided')
      buffer = await file.toBuffer()
      mimeType = file.mimetype
      originalName = file.filename
    } else {
      buffer = req.body as Buffer
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) return storageError(reply, 400, 'Empty body')
      mimeType = String(req.headers['content-type'] ?? 'application/octet-stream')
      originalName = path.basename(objectPath)
    }
    mimeType = mimeType.split(';', 1)[0].trim().toLowerCase()
    if (buffer.length === 0) return storageError(reply, 400, 'Empty file')
    if (buffer.length > config.MAX_UPLOAD_MB * 1024 * 1024) return storageError(reply, 413, `File exceeds ${config.MAX_UPLOAD_MB}MB limit`)
    if (IMAGE_BUCKETS.has(bucket)) {
      if (buffer.length > IMAGE_MAX_BYTES) return storageError(reply, 413, 'Image exceeds 5MB limit')
      if (!hasValidImageSignature(buffer, mimeType)) return storageError(reply, 415, 'Only valid JPG, PNG, and WebP images are allowed')
    }

    const upsert = String(req.headers['x-upsert'] ?? '') === 'true'
    try {
      await fs.access(full)
      if (!upsert) return storageError(reply, 409, 'Object already exists (set x-upsert to overwrite)')
    } catch {
      /* does not exist — fine */
    }
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, buffer)
    await db
      .insert(files)
      .values({ bucket, path: objectPath, originalName, mimeType, size: buffer.length, isPublic: PUBLIC_BUCKETS.has(bucket), uploadedBy: req.auth!.id })
      .onConflictDoUpdate({
        target: [files.bucket, files.path],
        set: { originalName, mimeType, size: buffer.length, uploadedBy: req.auth!.id },
      })
    reply.code(200)
    return { Key: `${bucket}/${objectPath}`, Id: `${bucket}/${objectPath}`, path: objectPath }
  }
  app.post('/storage/v1/object/:bucket/*', { preHandler: requireAuth, bodyLimit: config.MAX_UPLOAD_MB * 1024 * 1024 + 1024 }, uploadHandler)
  app.put('/storage/v1/object/:bucket/*', { preHandler: requireAuth, bodyLimit: config.MAX_UPLOAD_MB * 1024 * 1024 + 1024 }, uploadHandler)

  // List objects by prefix
  app.post('/storage/v1/object/list/:bucket', { preHandler: requireAuth }, async (req, reply) => {
    const { bucket } = req.params as { bucket: string }
    const body = (req.body ?? {}) as { prefix?: string; limit?: number; offset?: number; search?: string }
    const prefix = body.prefix ?? ''
    if (PRIVATE_BUCKETS.has(bucket)) {
      const probe = prefix ? prefix + '/probe' : 'probe'
      if (!(await canReadPrivate(bucket, probe, req.auth!))) {
        // allow listing own folder even if probe check fails on empty prefix
        if (!(prefix.startsWith(req.auth!.effectiveAgencyId) || prefix.startsWith(req.auth!.id) || isAdmin(req.auth!))) {
          return storageError(reply, 403, 'Access denied')
        }
      }
    }
    const rows = await db
      .select()
      .from(files)
      .where(sql`${files.bucket} = ${bucket} AND ${files.path} LIKE ${prefix + '%'} ${body.search ? sql`AND ${files.path} ILIKE ${'%' + body.search + '%'}` : sql``}`)
      .limit(Math.min(body.limit ?? 100, 1000))
      .offset(body.offset ?? 0)
    return rows.map((r) => ({
      name: r.path.slice(prefix.length).replace(/^\//, ''),
      id: r.id,
      created_at: r.createdAt.toISOString(),
      updated_at: r.createdAt.toISOString(),
      last_accessed_at: r.createdAt.toISOString(),
      metadata: { size: r.size, mimetype: r.mimeType, eTag: r.id },
    }))
  })

  // Delete objects
  app.delete('/storage/v1/object/:bucket', { preHandler: requireAuth }, async (req, reply) => {
    const { bucket } = req.params as { bucket: string }
    const body = (req.body ?? {}) as { prefixes?: string[] }
    const prefixes = body.prefixes ?? []
    if (!ALL_BUCKETS.has(bucket)) return storageError(reply, 400, 'Unknown bucket')
    const deleted: unknown[] = []
    for (const p of prefixes) {
      if (PRIVATE_BUCKETS.has(bucket) && !(await canReadPrivate(bucket, p, req.auth!)) && !canWriteBucket(bucket, p, req.auth!)) continue
      if (PUBLIC_BUCKETS.has(bucket) && !canWriteBucket(bucket, p, req.auth!)) continue
      const full = safePath(bucket, p)
      if (!full) continue
      await fs.rm(full, { force: true })
      await db.delete(files).where(sql`${files.bucket} = ${bucket} AND ${files.path} = ${p}`)
      deleted.push({ name: p })
    }
    return deleted
  })
}