/**
 * Retry utility with exponential backoff.
 *
 * Handles transient FSP errors (429, 5xx) according to reliability patterns
 * described in fsp-adapter/client.ts and architecture.md.
 *
 * - Respects Retry-After headers on 429 responses
 * - Exponential backoff with jitter on 5xx
 * - Non-retriable errors (4xx except 429) throw immediately
 */

export class FspHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    message: string,
  ) {
    super(message)
    this.name = 'FspHttpError'
  }
}

export interface RetryOptions {
  maxRetries: number
  baseDelayMs: number
}

const DEFAULT_RETRY: RetryOptions = { maxRetries: 3, baseDelayMs: 500 }

function isRetriable(status: number): boolean {
  return status === 429 || status >= 500
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetches a URL with retry logic. Throws FspHttpError on non-retriable failures.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: RetryOptions = DEFAULT_RETRY,
): Promise<Response> {
  let attempt = 0
  while (true) {
    const res = await fetch(url, init)

    if (res.ok) return res

    if (!isRetriable(res.status)) {
      const body = await res.text()
      throw new FspHttpError(res.status, body, `FSP request failed: ${res.status} ${url}`)
    }

    if (attempt >= opts.maxRetries) {
      const body = await res.text()
      throw new FspHttpError(
        res.status,
        body,
        `FSP request failed after ${opts.maxRetries} retries: ${res.status} ${url}`,
      )
    }

    // Respect Retry-After header (in seconds) if present
    const retryAfter = res.headers.get('Retry-After')
    const delayMs = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 200

    await sleep(delayMs)
    attempt++
  }
}
