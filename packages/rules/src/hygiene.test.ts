/**
 * Hygiene ratchet — encodes current smell counts as budgets.
 *
 * Budgets are monotonic: initialize to current totals, then only lower them.
 * Each category lists file:line hits when the budget is exceeded.
 *
 * Scanned scope: all production .ts / .tsx files under apps/ and packages/,
 * excluding test files, dist/, node_modules/, and Prisma seed/migration files.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, it, expect } from 'vitest'

// ── Budgets ──────────────────────────────────────────────────────────────────
// Set to actual counts as of housekeeping cycle 2026-03-27.
// Only lower these — never raise them.
const MAX_AS_UNKNOWN_AS = 5
const MAX_TS_SUPPRESS = 1 // one ts-suppress directive in apps/web/auth.ts (upstream NextAuth v5 bug)
const MAX_JSON_PARSE = 3 // stream.ts (SSE), booking-consumer.ts (job queue), stream.ts (publish)
const MAX_CONSOLE = 1 // apps/api/src/routes/stream.ts console usage
const MAX_VOID_DISPATCH = 9 // fire-and-forget async calls (setInterval/setTimeout/signal handlers)

// These are zero — keep them there.
const MAX_ANY_TYPE = 0

// ── Source collection ────────────────────────────────────────────────────────

interface SourceLine {
  file: string
  lineNo: number
  text: string
}

function collectSourceFiles(dir: string): SourceLine[] {
  const results: SourceLine[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip noise directories
      if (['node_modules', 'dist', '.next', '.git', 'prisma'].includes(entry.name)) continue
      results.push(...collectSourceFiles(full))
      continue
    }
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue
    // Exclude test files and declaration files
    if (
      entry.name.endsWith('.test.ts') ||
      entry.name.endsWith('.spec.ts') ||
      entry.name.endsWith('.test.tsx') ||
      entry.name.endsWith('.spec.tsx') ||
      entry.name.endsWith('.d.ts')
    )
      continue
    const text = fs.readFileSync(full, 'utf8')
    text.split('\n').forEach((line, i) => {
      results.push({ file: full, lineNo: i + 1, text: line })
    })
  }
  return results
}

// Resolve monorepo root from this file's location (packages/rules/src → ../../..)
const repoRoot = path.resolve(import.meta.dirname ?? __dirname, '..', '..', '..')

const appsLines = collectSourceFiles(path.join(repoRoot, 'apps'))
const packagesLines = collectSourceFiles(path.join(repoRoot, 'packages'))
const allLines = [...appsLines, ...packagesLines]

function hits(lines: SourceLine[], pattern: string): SourceLine[] {
  return lines.filter((l) => l.text.includes(pattern))
}

function hitReport(matches: SourceLine[]): string {
  return matches.map((m) => `  ${m.file}:${m.lineNo}: ${m.text.trim()}`).join('\n')
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('hygiene ratchet', () => {
  it(': any — budget zero', () => {
    // Match `: any` but not `: any[]`, `: any[]`, `anyValue`, etc.
    const matches = allLines.filter((l) => /: any(?!\w|\[)/.test(l.text))
    expect(
      matches.length,
      `": any" budget exceeded (${matches.length}/${MAX_ANY_TYPE}):\n${hitReport(matches)}`,
    ).toBeLessThanOrEqual(MAX_ANY_TYPE)
  })

  it('as unknown as — budget', () => {
    const matches = hits(allLines, 'as unknown as')
    expect(
      matches.length,
      `"as unknown as" budget exceeded (${matches.length}/${MAX_AS_UNKNOWN_AS}):\n${hitReport(matches)}`,
    ).toBeLessThanOrEqual(MAX_AS_UNKNOWN_AS)
  })

  it('@ts- suppression — budget', () => {
    const matches = hits(allLines, '@ts-')
    expect(
      matches.length,
      `"@ts-" budget exceeded (${matches.length}/${MAX_TS_SUPPRESS}):\n${hitReport(matches)}`,
    ).toBeLessThanOrEqual(MAX_TS_SUPPRESS)
  })

  it('JSON.parse — budget', () => {
    const matches = hits(allLines, 'JSON.parse')
    expect(
      matches.length,
      `"JSON.parse" budget exceeded (${matches.length}/${MAX_JSON_PARSE}):\n${hitReport(matches)}`,
    ).toBeLessThanOrEqual(MAX_JSON_PARSE)
  })

  it('console. — budget', () => {
    const matches = hits(allLines, 'console.')
    expect(
      matches.length,
      `"console." budget exceeded (${matches.length}/${MAX_CONSOLE}):\n${hitReport(matches)}`,
    ).toBeLessThanOrEqual(MAX_CONSOLE)
  })

  it('void dispatch — budget (fire-and-forget async)', () => {
    // Match statement-form void calls: lines where `void ` appears but not
    // as a return type annotation (`Promise<void>`, `: void`, `=> void`)
    // and not in pure comment lines (which may use the word "void" descriptively).
    const matches = allLines.filter(
      (l) =>
        l.text.includes('void ') &&
        !/Promise<void>|: void|=> void|return void/.test(l.text) &&
        !/^\s*\/\//.test(l.text),
    )
    expect(
      matches.length,
      `void dispatch budget exceeded (${matches.length}/${MAX_VOID_DISPATCH}):\n${hitReport(matches)}`,
    ).toBeLessThanOrEqual(MAX_VOID_DISPATCH)
  })
})
