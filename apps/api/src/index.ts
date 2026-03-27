import { buildServer } from './server.js'
import { logger } from '@oneshot/observability'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env['API_PORT'] ?? 3001)
const HOST = process.env['API_HOST'] ?? '0.0.0.0'

// In the Docker image the monorepo root is /app; dist is at apps/api/dist/index.js
// dirname gives apps/api/dist, then ../../.. walks up to /app
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

async function runMigrations() {
  if (process.env['RUN_MIGRATIONS'] !== 'true') return
  try {
    logger.info('Running DB migrations...')
    execSync(
      'node_modules/.bin/prisma migrate deploy --schema packages/persistence/prisma/schema.prisma',
      {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env: { ...process.env },
      },
    )
    logger.info('DB migrations complete')
  } catch (err) {
    logger.error(err, 'DB migration failed — aborting startup')
    process.exit(1)
  }
}

async function start() {
  await runMigrations()
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
