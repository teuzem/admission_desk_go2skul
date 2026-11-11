import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'
import { config, isProd } from './config.js'
import { loadAuth } from './plugins/auth.js'
import { authRoutes } from './modules/auth.js'
import { mfaRoutes } from './modules/mfa.js'
import { restRoutes } from './modules/rest.js'
import { storageRoutes } from './modules/storage.js'
import { realtimeRoutes } from './modules/realtime.js'
import { functionsRoutes } from './modules/functions.js'

export async function buildApp() {
  const app = Fastify({
    logger: isProd
      ? { level: 'info' }
      : { level: 'info', transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } },
    bodyLimit: 10 * 1024 * 1024,
    trustProxy: true,
  })

  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } })
  await app.register(cors, {
    origin: config.APP_URL.split(',').map((s) => s.trim()),
    credentials: true,
    exposedHeaders: ['Content-Range'],
  })
  await app.register(cookie, { secret: config.COOKIE_SECRET })
  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })
  await app.register(multipart, { limits: { fileSize: config.MAX_UPLOAD_MB * 1024 * 1024 } })
  await app.register(websocket, { options: { maxPayload: 1024 * 1024 } })

  // Parse any non-JSON, non-multipart body as a raw buffer (storage uploads)
  app.addContentTypeParser('*', { parseAs: 'buffer', bodyLimit: config.MAX_UPLOAD_MB * 1024 * 1024 + 1024 }, (_req, body, done) => {
    done(null, body)
  })
  app.addContentTypeParser('text/plain', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body)
  })

  // Tolerate empty JSON bodies (DELETE/PATCH with no payload), like PostgREST
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const text = body as string
    if (!text || text.trim() === '') return done(null, {})
    try {
      done(null, JSON.parse(text))
    } catch (err) {
      ;(err as Error & { statusCode?: number }).statusCode = 400
      done(err as Error, undefined)
    }
  })

  app.addHook('preHandler', loadAuth)

  app.get('/health', async () => ({ status: 'ok', service: 'admission-desk-api', timestamp: new Date().toISOString() }))

  await app.register(authRoutes)
  await app.register(mfaRoutes)
  await app.register(restRoutes)
  await app.register(storageRoutes)
  await app.register(realtimeRoutes)
  await app.register(functionsRoutes)

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ message: `Route ${req.method} ${req.url} not found`, code: 'PGRST201' })
  })

  app.setErrorHandler((err, req, reply) => {
    const e = err as Error & { statusCode?: number; code?: string }
    req.log.error(e)
    const status = e.statusCode ?? 500
    reply.code(status).send({
      message: status === 500 && isProd ? 'Internal server error' : e.message,
      code: e.code ?? 'INTERNAL',
    })
  })

  return app
}