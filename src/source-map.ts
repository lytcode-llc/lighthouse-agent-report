import { readdirSync, existsSync } from 'fs'
import { join, relative } from 'path'
import type { PageSource } from './types.js'

// ────────────────────────────────────────────────────────────────────────────
// Directory scanning
// ────────────────────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'out', '.svelte-kit', '.astro'])

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

function findAstroFiles(dir: string): string[] {
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
      if (entry.name === 'api') continue
      results.push(...findAstroFiles(fullPath))
    } else if (/\.(astro|md|mdx)$/.test(entry.name)) {
      results.push(fullPath)
    }
  }
  return results
}

function findSvelteKitFiles(dir: string): string[] {
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
      results.push(...findSvelteKitFiles(fullPath))
    } else if (entry.name === '+page.svelte') {
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

function astroFileToPattern(filePath: string, pagesDir: string): string {
  // e.g. <pagesDir>/about.astro        → /about
  // e.g. <pagesDir>/blog/[slug].astro  → /blog/[slug]
  // e.g. <pagesDir>/blog/[...slug].astro → /blog/[...slug]
  let route = filePath.slice(pagesDir.length).replace(/\.(astro|md|mdx)$/, '')
  route = route.replace(/\/index$/, '') || '/'
  return route
}

function svelteKitFileToPattern(filePath: string, routesDir: string): string {
  // e.g. <routesDir>/about/+page.svelte          → /about
  // e.g. <routesDir>/blog/[slug]/+page.svelte    → /blog/[slug]
  // e.g. <routesDir>/blog/[...rest]/+page.svelte → /blog/[...rest]
  // e.g. <routesDir>/(group)/about/+page.svelte  → /about
  // e.g. <routesDir>/[[lang]]/about/+page.svelte → /[lang]/about
  let route = filePath.slice(routesDir.length).replace(/\/\+page\.svelte$/, '')
  // Strip route groups: /(group)/ → /
  route = route.replace(/\/\([^)]+\)/g, '')
  // Simplify optional params: [[param]] → [param]
  route = route.replace(/\[\[([^\]]+)\]\]/g, '[$1]')
  return route || '/'
}

// Convert a route pattern to a RegExp.
// Supports Next.js, Astro, and SvelteKit dynamic segment syntax.
// [slug] / [param] → any single segment
// [...slug] / [...rest] → any remaining segments
function patternToRegex(pattern: string): RegExp {
  const regexStr = pattern
    .replace(/\[\.\.\.([^\]]+)\]/g, '(.+)')    // [...slug] / [...rest]
    .replace(/\[([^\]]+)\]/g, '([^/]+)')        // [slug] / [param]
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
  // ── Next.js App Router: app/ or src/app/ ──────────────────────────────────
  for (const candidate of ['app', 'src/app']) {
    const dir = join(cwd, candidate)
    if (existsSync(dir)) {
      const files = findAppRouterFiles(dir)
      if (files.length > 0) {
        return files
          .map((f) => {
            const pattern = appFileToPattern(f, dir)
            return { pattern, routeFile: relative(cwd, f), regex: patternToRegex(pattern) }
          })
          .sort((a, b) => specificity(b.pattern) - specificity(a.pattern))
      }
    }
  }

  // ── SvelteKit: src/routes/ ────────────────────────────────────────────────
  const svelteKitDir = join(cwd, 'src/routes')
  if (existsSync(svelteKitDir)) {
    const files = findSvelteKitFiles(svelteKitDir)
    if (files.length > 0) {
      return files
        .map((f) => {
          const pattern = svelteKitFileToPattern(f, svelteKitDir)
          return { pattern, routeFile: relative(cwd, f), regex: patternToRegex(pattern) }
        })
        .sort((a, b) => specificity(b.pattern) - specificity(a.pattern))
    }
  }

  // ── Astro or Next.js Pages Router: src/pages/ or pages/ ──────────────────
  for (const candidate of ['src/pages', 'pages']) {
    const dir = join(cwd, candidate)
    if (existsSync(dir)) {
      // Detect Astro by presence of .astro files
      const astroFiles = findAstroFiles(dir)
      if (astroFiles.length > 0) {
        return astroFiles
          .map((f) => {
            const pattern = astroFileToPattern(f, dir)
            return { pattern, routeFile: relative(cwd, f), regex: patternToRegex(pattern) }
          })
          .sort((a, b) => specificity(b.pattern) - specificity(a.pattern))
      }
      // Fall back to Next.js Pages Router
      const files = findPagesRouterFiles(dir)
      if (files.length > 0) {
        return files
          .map((f) => {
            const pattern = pagesFileToPattern(f, dir)
            return { pattern, routeFile: relative(cwd, f), regex: patternToRegex(pattern) }
          })
          .sort((a, b) => specificity(b.pattern) - specificity(a.pattern))
      }
    }
  }

  console.warn('Warning: Could not detect a supported router (Next.js, SvelteKit, Astro, Gatsby). Route file attribution will be unavailable.')
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
