/**
 * Structured logger built on pino.
 *
 * In production (NODE_ENV=production), emits JSON to stdout for Azure Monitor ingestion.
 * In development, uses pino-pretty for human-readable output.
 *
 * All log calls should include tenantId/operatorId where available so logs
 * are filterable per tenant without cross-tenant data leakage.
 */

import pino, { type DestinationStream } from 'pino'

const isDev = process.env['NODE_ENV'] !== 'production'

export const logger = pino(
  {
    level: process.env['LOG_LEVEL'] ?? 'info',
    base: {
      service: process.env['SERVICE_NAME'] ?? 'oneshot',
      env: process.env['NODE_ENV'] ?? 'development',
    },
    // Redact secrets and PII fields from all log output
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        'body.apiKey',
        'body.phone',
        '*.phone',
        '*.email',
      ],
      remove: true,
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  },
  (isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      })
    : undefined) as DestinationStream | undefined,
)

/** Creates a child logger pre-bound with tenant context */
export function tenantLogger(operatorId: string, workflowType?: string) {
  return logger.child({ operatorId, workflowType })
}
