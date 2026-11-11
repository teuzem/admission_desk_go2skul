import crypto from 'node:crypto'
import { config } from '../config.js'

export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

const mfaKey = Buffer.from(config.MFA_ENCRYPTION_KEY, 'hex')

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', mfaKey, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const enc = buf.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', mfaKey, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

export function signStoragePath(bucket: string, filePath: string, expiresSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + expiresSeconds
  const sig = crypto.createHmac('sha256', config.JWT_SECRET).update(`${bucket}:${filePath}:${exp}`).digest('base64url')
  return `${sig}.${exp}`
}

export function verifyStorageSignature(bucket: string, filePath: string, token: string): boolean {
  const [sig, expStr] = token.split('.')
  const exp = Number(expStr)
  if (!sig || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  const expected = crypto.createHmac('sha256', config.JWT_SECRET).update(`${bucket}:${filePath}:${exp}`).digest('base64url')
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}