import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().default('http://localhost:5173'),
  WEBAUTHN_RP_NAME: z.string().default('Admission Desk'),
  WEBAUTHN_RP_ID: z.string().default(''),
  WEBAUTHN_ORIGIN: z.string().default(''),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  MFA_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  STORAGE_DIR: z.string().default('./storage'),
  MAX_UPLOAD_MB: z.coerce.number().default(25),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('Admission Desk <noreply@admissiondesk.local>'),
  SUPPORT_EMAIL: z.string().default('support@admissiondesk.local'),
  PARTNERS_EMAIL: z.string().default('partners@admissiondesk.local'),
  SEED_ADMIN_EMAIL: z.string().default('admin@admissiondesk.local'),
  SEED_ADMIN_PASSWORD: z.string().default(''),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
export const isProd = config.NODE_ENV === 'production'