import { readdirSync, existsSync } from 'fs'
import { join, relative } from 'path'
import type { PageSource } from './types.js'

// ────────────────────────────────────────────────────────────────────────────
// Directory scanning
// ────────────────────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'out'])

function findAppRouterFiles(dir: string): string[] {
  const results: string[] = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findAppRouterFiles(fullPath))
    } else if (/^page\.(tsx?|jsx?)$/.test(entry.name)) {
      results.push(fullPath)
    }
  }
  return results
}

function findPagesRouterFiles(dir: string): string[] {
  const results: string[] = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    // Skip Next.js internals (_app, _document, _error) and API routes
    if (entry.name.startsWith('_') || entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'api') continue
      results.push(...findPagesRouterFiles(fullPath))
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      results.push(fullPath)
    }
  }
  return results
}

// ────────────────────────────────────────────────────────────────────────────
// Path → URL pattern conversion
// ────────────────────────────────────────────────────────────────────────────

function appFileToPattern(filePath: string, appDir: string): string {
  // e.g. <appDir>/what-we-do/[slug]/page.tsx → /what-we-do/[slug]
  let route = filePath.slice(appDir.length).replace(/\/page\.(tsx?|jsx?)$/, '')
  // Strip route groups: /(group)/ → /
  route = route.replace(/\/\([^)]+\)/g, '')
  return route || '/'
}

function pagesFileToPattern(filePath: string, pagesDir: string): string {
  // e.g. <pagesDir>/contact.tsx → /contact
  let route = filePath.slice(pagesDir.length).replace(/\.(tsx?|jsx?)$/, '')
  // index files map to parent path
  route = route.replace(/\/index$/, '') || '/'
  return route
}

// Convert a Next.js route pattern to a RegExp
// [slug] → any single segment, [...slug] → any remaining segments
function patternToRegex(pattern: string): RegExp {
  const regexStr = pattern
    .replace(/\[\.\.\.([^\]]+)\]/g, '(.+)')    // [...slug]
    .replace(/\[([^\]]+)\]/g, '([^/]+)')        // [slug]
    .replace(/\//g, '\\/')
  return new RegExp(`^${regexStr}$`)
}

// Static routes take priority over dynamic, dynamic over catch-all
function specificity(pattern: string): number {
  if (pattern.includes('[...')) return 0
  if (pattern.includes('[')) return 1
  return 2
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

interface RouteEntry {
  pattern: string
  routeFile: string
  regex: RegExp
}

export function buildRouteMap(cwd: string): RouteEntry[] {
  // App Router: try app/ then src/app/
  for (const candidate of ['app', 'src/app']) {
    const dir = join(cwd, candidate)
    if (existsSync(dir)) {
      const files = findAppRouterFiles(dir)
      return files
        .map((f) => {
          const pattern = appFileToPattern(f, dir)
          return { pattern, routeFile: relative(cwd, f), regex: patternToRegex(pattern) }
        })
        .sort((a, b) => specificity(b.pattern) - specificity(a.pattern))
    }
  }

  // Pages Router: try pages/ then src/pages/
  for (const candidate of ['pages', 'src/pages']) {
    const dir = join(cwd, candidate)
    if (existsSync(dir)) {
      const files = findPagesRouterFiles(dir)
      return files
        .map((f) => {
          const pattern = pagesFileToPattern(f, dir)
          return { pattern, routeFile: relative(cwd, f), regex: patternToRegex(pattern) }
        })
        .sort((a, b) => specificity(b.pattern) - specificity(a.pattern))
    }
  }

  console.warn('Warning: Could not find app/ or pages/ directory. Route file attribution will be unavailable.')
  return []
}

export function resolveSource(urlPath: string, routeMap: RouteEntry[]): PageSource {
  for (const entry of routeMap) {
    if (entry.regex.test(urlPath)) {
      return { routeFile: entry.routeFile }
    }
  }
  return { routeFile: 'unknown' }
}
