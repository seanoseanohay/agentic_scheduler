import { buildServer } from './server.js'
import { logger } from '@oneshot/observability'

const PORT = Number(process.env['API_PORT'] ?? 3001)
const HOST = process.env['API_HOST'] ?? '0.0.0.0'

async function start() {
  const app = await buildServer()
  try {
    await app.listen({ port: PORT, host: HOST })
    logger.info({ port: PORT }, 'OneShot API listening')
  } catch (err) {
    logger.error(err, 'Failed to start API server')
    process.exit(1)
  }
}

await start()
