import { SignJWT, jwtVerify } from 'jose'
import { config } from '../config.js'

const key = new TextEncoder().encode(config.JWT_SECRET)

export interface AccessPayload {
  sub: string
  role: string
  email: string
  mfaVerified?: boolean
  [key: string]: unknown
}

export async function signAccessToken(payload: AccessPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('admission-desk')
    .setAudience('admission-desk-api')
    .setExpirationTime(`${config.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(key)
}

export async function verifyAccessToken(token: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, { issuer: 'admission-desk', audience: 'admission-desk-api' })
    return payload as AccessPayload
  } catch {
    return null
  }
}