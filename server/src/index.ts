import { buildApp } from './app.js'
import { config } from './config.js'
import { pool } from './db/index.js'

async function main() {
  const app = await buildApp()
  try {
    await app.listen({ port: config.PORT, host: config.HOST })
    app.log.info(`Admission Desk API listening on http://${config.HOST}:${config.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }

  const shutdown = async () => {
    app.log.info('Shutting down…')
    await app.close()
    await pool.end()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main()