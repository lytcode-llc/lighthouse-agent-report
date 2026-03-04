import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildRouteMap, resolveSource } from './source-map.js'

// Creates a temp directory, writes a set of files into it, and returns the root path.
function scaffold(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'lar-test-'))
  for (const file of files) {
    const full = join(root, file)
    mkdirSync(full.replace(/\/[^/]+$/, ''), { recursive: true })
    writeFileSync(full, '')
  }
  return root
}

// ────────────────────────────────────────────────────────────────────────────
// Next.js App Router
// ────────────────────────────────────────────────────────────────────────────

describe('Next.js App Router', () => {
  let root: string
  beforeEach(() => {
    root = scaffold([
      'app/page.tsx',
      'app/contact/page.tsx',
      'app/what-we-do/page.tsx',
      'app/what-we-do/[slug]/page.tsx',
      'app/insights/page.tsx',
      'app/insights/[slug]/page.tsx',
      'app/(marketing)/about/page.tsx',
      'app/blog/[...slug]/page.tsx',
    ])
  })
  afterEach(() => rmSync(root, { recursive: true }))

  it('detects app router and maps static routes', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/', map).routeFile).toBe('app/page.tsx')
    expect(resolveSource('/contact', map).routeFile).toBe('app/contact/page.tsx')
    expect(resolveSource('/what-we-do', map).routeFile).toBe('app/what-we-do/page.tsx')
    expect(resolveSource('/insights', map).routeFile).toBe('app/insights/page.tsx')
  })

  it('maps dynamic routes', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/what-we-do/ai-agents', map).routeFile).toBe('app/what-we-do/[slug]/page.tsx')
    expect(resolveSource('/insights/my-post', map).routeFile).toBe('app/insights/[slug]/page.tsx')
  })

  it('strips route groups from URL patterns', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/about', map).routeFile).toBe('app/(marketing)/about/page.tsx')
  })

  it('maps catch-all routes', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/blog/2024/my-post', map).routeFile).toBe('app/blog/[...slug]/page.tsx')
  })

  it('prefers specific routes over dynamic', () => {
    const map = buildRouteMap(root)
    // /what-we-do should match the static page, not [slug]
    expect(resolveSource('/what-we-do', map).routeFile).toBe('app/what-we-do/page.tsx')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Next.js Pages Router
// ────────────────────────────────────────────────────────────────────────────

describe('Next.js Pages Router', () => {
  let root: string
  beforeEach(() => {
    root = scaffold([
      'pages/index.tsx',
      'pages/contact.tsx',
      'pages/blog/index.tsx',
      'pages/blog/[slug].tsx',
      'pages/docs/[...path].tsx',
    ])
  })
  afterEach(() => rmSync(root, { recursive: true }))

  it('maps index files to root and parent paths', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/', map).routeFile).toBe('pages/index.tsx')
    expect(resolveSource('/blog', map).routeFile).toBe('pages/blog/index.tsx')
  })

  it('maps static and dynamic pages', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/contact', map).routeFile).toBe('pages/contact.tsx')
    expect(resolveSource('/blog/hello-world', map).routeFile).toBe('pages/blog/[slug].tsx')
    expect(resolveSource('/docs/api/reference', map).routeFile).toBe('pages/docs/[...path].tsx')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Astro
// ────────────────────────────────────────────────────────────────────────────

describe('Astro', () => {
  let root: string
  beforeEach(() => {
    root = scaffold([
      'src/pages/index.astro',
      'src/pages/about.astro',
      'src/pages/blog/index.astro',
      'src/pages/blog/[slug].astro',
      'src/pages/docs/[...path].astro',
      'src/pages/guide.md',
    ])
  })
  afterEach(() => rmSync(root, { recursive: true }))

  it('detects Astro by .astro files in src/pages', () => {
    const map = buildRouteMap(root)
    expect(map.length).toBeGreaterThan(0)
    expect(map.some((e) => e.routeFile.endsWith('.astro'))).toBe(true)
  })

  it('maps static Astro pages', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/', map).routeFile).toBe('src/pages/index.astro')
    expect(resolveSource('/about', map).routeFile).toBe('src/pages/about.astro')
    expect(resolveSource('/blog', map).routeFile).toBe('src/pages/blog/index.astro')
  })

  it('maps dynamic Astro routes', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/blog/my-post', map).routeFile).toBe('src/pages/blog/[slug].astro')
    expect(resolveSource('/docs/getting-started/intro', map).routeFile).toBe('src/pages/docs/[...path].astro')
  })

  it('maps markdown pages', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/guide', map).routeFile).toBe('src/pages/guide.md')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// SvelteKit
// ────────────────────────────────────────────────────────────────────────────

describe('SvelteKit', () => {
  let root: string
  beforeEach(() => {
    root = scaffold([
      'src/routes/+page.svelte',
      'src/routes/about/+page.svelte',
      'src/routes/blog/+page.svelte',
      'src/routes/blog/[slug]/+page.svelte',
      'src/routes/docs/[...path]/+page.svelte',
      'src/routes/(marketing)/contact/+page.svelte',
      'src/routes/[[lang]]/faq/+page.svelte',
      // Non-page files that should be ignored
      'src/routes/blog/+layout.svelte',
      'src/routes/blog/+page.ts',
    ])
  })
  afterEach(() => rmSync(root, { recursive: true }))

  it('detects SvelteKit by src/routes directory', () => {
    const map = buildRouteMap(root)
    expect(map.length).toBeGreaterThan(0)
    expect(map.some((e) => e.routeFile.endsWith('+page.svelte'))).toBe(true)
  })

  it('maps static SvelteKit routes', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/', map).routeFile).toBe('src/routes/+page.svelte')
    expect(resolveSource('/about', map).routeFile).toBe('src/routes/about/+page.svelte')
    expect(resolveSource('/blog', map).routeFile).toBe('src/routes/blog/+page.svelte')
  })

  it('maps dynamic SvelteKit routes', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/blog/my-post', map).routeFile).toBe('src/routes/blog/[slug]/+page.svelte')
    expect(resolveSource('/docs/api/endpoints', map).routeFile).toBe('src/routes/docs/[...path]/+page.svelte')
  })

  it('strips route groups', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/contact', map).routeFile).toBe('src/routes/(marketing)/contact/+page.svelte')
  })

  it('handles optional params as dynamic segments', () => {
    const map = buildRouteMap(root)
    expect(resolveSource('/en/faq', map).routeFile).toBe('src/routes/[[lang]]/faq/+page.svelte')
  })

  it('ignores layout and data files', () => {
    const map = buildRouteMap(root)
    expect(map.every((e) => !e.routeFile.includes('+layout'))).toBe(true)
    expect(map.every((e) => !e.routeFile.endsWith('+page.ts'))).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Unknown framework
// ────────────────────────────────────────────────────────────────────────────

describe('Unknown framework', () => {
  let root: string
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'lar-test-')) })
  afterEach(() => rmSync(root, { recursive: true }))

  it('returns empty map and does not throw', () => {
    const map = buildRouteMap(root)
    expect(map).toEqual([])
    expect(resolveSource('/about', map).routeFile).toBe('unknown')
  })
})
