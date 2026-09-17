import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'

const written = vi.hoisted(() => new Map<string, string>())
const routesState = vi.hoisted(() => ({ routes: [] as any[] }))
const fsState = vi.hoisted(() => ({ includeLighthouse: false }))

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    on(event: string, cb: (code: number) => void) {
      if (event === 'close') {
        process.nextTick(() => cb(0))
      }
    },
  })),
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    writeFileSync: vi.fn((path, data, _options?) => {
      written.set(path as string, data as string)
    }),
    readFileSync: vi.fn((path, options?) => {
      const p = path as string
      if (p.endsWith('ci-result.json')) {
        return JSON.stringify({ routes: routesState.routes })
      }
      if (fsState.includeLighthouse && p.endsWith('lighthouse.json')) {
        return JSON.stringify({
          categories: {
            performance: { score: 1, auditRefs: [] },
            accessibility: { score: 1, auditRefs: [] },
            'best-practices': { score: 1, auditRefs: [] },
            seo: { score: 1, auditRefs: [] },
          },
          audits: {},
        })
      }
      return actual.readFileSync(path, options)
    }),
    existsSync: vi.fn((path) => {
      const p = path as string
      return p.endsWith('ci-result.json') || (fsState.includeLighthouse && p.endsWith('lighthouse.json'))
    }),
    readdirSync: vi.fn(() => []),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
  }
})

vi.mock('./config.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
}))

vi.mock('./source-map.js', () => ({
  buildRouteMap: vi.fn().mockReturnValue([]),
  resolveSource: vi.fn().mockReturnValue({ routeFile: null }),
}))

vi.mock('./format.js', () => ({
  formatPage: vi.fn().mockReturnValue('# page'),
  needsAttention: vi.fn().mockReturnValue(true),
  pathToFile: vi.fn().mockImplementation((p: string) => `pages${p === '/' ? '/index' : p}.md`),
  computeDivergences: vi.fn().mockReturnValue([]),
}))

vi.mock('./psi.js', () => ({
  fetchPSIForPages: vi.fn().mockResolvedValue(new Map()),
  isLocalhost: vi.fn().mockReturnValue(false),
}))

vi.mock('./workspace.js', () => ({
  hasWorkspaceMarkers: vi.fn().mockReturnValue(true),
  promptWorkspace: vi.fn(),
  saveRecentDir: vi.fn(),
}))

vi.mock('./config-prompt.js', () => ({
  hasUnlighthouseConfig: vi.fn().mockReturnValue(true),
  promptScanConfig: vi.fn(),
  writeUnlighthouseConfig: vi.fn(),
}))

vi.mock('@clack/prompts', () => ({
  confirm: vi.fn().mockResolvedValue(true),
  isCancel: vi.fn().mockReturnValue(false),
}))

function makeRoutes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    path: `/page-${i}`,
    score: 1,
    categories: {
      performance: { score: 1 },
      accessibility: { score: 1 },
      'best-practices': { score: 1 },
      seo: { score: 1 },
    },
  }))
}

describe('run JSON chunking', () => {
  let originalCwd: string
  let tmpDir: string

  beforeEach(async () => {
    originalCwd = process.cwd()
    const fs = await import('fs')
    tmpDir = fs.mkdtempSync(join(tmpdir(), 'lar-run-test-'))
    process.chdir(tmpDir)
    written.clear()
    routesState.routes = []
  })

  afterEach(() => {
    process.chdir(originalCwd)
    fsState.includeLighthouse = false
    vi.clearAllMocks()
  })

  it('writes a single index.json when the report is under 10,000 lines', async () => {
    routesState.routes = makeRoutes(5)

    const { run } = await import('./run.js')
    await run({ site: 'https://example.com' })

    const indexJsonKey = [...written.keys()].find((k) => /[/\\]index\.json$/.test(k))
    expect(indexJsonKey).toBeDefined()

    const manifestKey = [...written.keys()].find((k) =>
      k.endsWith('index.json.manifest.json')
    )
    expect(manifestKey).toBeUndefined()
  })

  it('chunks the report and writes a manifest when over 10,000 lines', async () => {
    routesState.routes = makeRoutes(2000)

    const { run } = await import('./run.js')
    await run({ site: 'https://example.com' })

    const manifestKey = [...written.keys()].find((k) =>
      k.endsWith('index.json.manifest.json')
    )
    expect(manifestKey).toBeDefined()

    const manifest = JSON.parse(written.get(manifestKey!)!)
    expect(manifest.version).toBe('1.0')
    expect(manifest.site).toBe('https://example.com')
    expect(manifest.chunked).toBe(true)
    expect(manifest.pageCount).toBe(2000)
    expect(manifest.generatedAt).toBeDefined()

    const totalChunkPages = manifest.chunks.reduce(
      (sum: number, chunk: { pageCount: number }) => sum + chunk.pageCount,
      0
    )
    expect(totalChunkPages).toBe(2000)

    let expectedStart = 0
    for (const chunk of manifest.chunks) {
      expect(chunk.startPage).toBe(expectedStart)
      expect(chunk.endPage).toBe(chunk.startPage + chunk.pageCount - 1)
      expectedStart = chunk.endPage + 1

      const chunkKey = [...written.keys()].find((k) => k.endsWith(chunk.file))
      expect(chunkKey).toBeDefined()

      const chunkJson = written.get(chunkKey!)!
      const chunkData = JSON.parse(chunkJson)
      expect(chunkData.site).toBe('https://example.com')
      expect(chunkData.pages.length).toBe(chunk.pageCount)
      expect(chunkJson.split('\n').length).toBeLessThanOrEqual(10_000)
    }

    const indexJsonKey = [...written.keys()].find((k) => /[/\\]index\.json$/.test(k))
    expect(indexJsonKey).toBeUndefined()
  })

  it('forwards psiConcurrency to fetchPSIForPages', async () => {
    routesState.routes = makeRoutes(2)

    const { fetchPSIForPages } = await import('./psi.js')
    const { run } = await import('./run.js')

    await run({
      site: 'https://example.com',
      psiKey: 'PSI_KEY',
      psiConcurrency: 7,
    })

    expect(fetchPSIForPages).toHaveBeenCalledWith(
      'https://example.com',
      expect.any(Array),
      'PSI_KEY',
      7
    )
  })

  it('chunks the report when divergences push the line count over 10,000 and keeps each chunk <= 10,000 lines', async () => {
    routesState.routes = makeRoutes(500)

    const { computeDivergences } = await import('./format.js')
    const largeDivergences = Array.from({ length: 500 }, (_, i) => ({
      title: `Divergent audit ${i}`,
      lowScore: 50,
      lowPage: `/page-${i}`,
      highScore: 100,
      highPage: `/page-${i + 1}`,
      spread: 50,
    }))
    vi.mocked(computeDivergences).mockReturnValue(largeDivergences)

    const { run } = await import('./run.js')
    await run({ site: 'https://example.com' })

    const manifestKey = [...written.keys()].find((k) =>
      k.endsWith('index.json.manifest.json')
    )
    expect(manifestKey).toBeDefined()

    const manifest = JSON.parse(written.get(manifestKey!)!)
    expect(manifest.chunked).toBe(true)

    for (const chunk of manifest.chunks) {
      const chunkKey = [...written.keys()].find((k) => k.endsWith(chunk.file))
      expect(chunkKey).toBeDefined()
      const chunkJson = written.get(chunkKey!)!
      expect(chunkJson.split('\n').length).toBeLessThanOrEqual(10_000)
    }
  })

  it('sets markdownFile on a failing page in the written index.json', async () => {
    routesState.routes = makeRoutes(1)

    const { run } = await import('./run.js')
    await run({ site: 'https://example.com' })

    const indexJsonKey = [...written.keys()].find((k) => /[/\\]index\.json$/.test(k))
    expect(indexJsonKey).toBeDefined()

    const data = JSON.parse(written.get(indexJsonKey!)!)
    expect(data.pages).toHaveLength(1)
    expect(data.pages[0].markdownFile).toBe('pages/page-0.md')
  })

  it('writes no markdownFile and empty divergences when all pages pass', async () => {
    routesState.routes = makeRoutes(3)
    fsState.includeLighthouse = true

    const { needsAttention, computeDivergences } = await import('./format.js')
    vi.mocked(needsAttention).mockReturnValue(false)
    vi.mocked(computeDivergences).mockReturnValue([])

    const { run } = await import('./run.js')
    await run({ site: 'https://example.com' })

    const indexJsonKey = [...written.keys()].find((k) => /[/\\]index\.json$/.test(k))
    expect(indexJsonKey).toBeDefined()

    const data = JSON.parse(written.get(indexJsonKey!)!)
    expect(data.divergences).toEqual([])
    expect(data.pageCount).toBe(3)
    for (const page of data.pages) {
      expect(page.markdownFile).toBeUndefined()
    }
  })
})
