import { spawn } from 'child_process'
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync, readdirSync } from 'fs'
import { resolve, join, dirname } from 'path'
import * as p from '@clack/prompts'
import { loadConfig } from './config.js'
import { buildRouteMap, resolveSource } from './source-map.js'
import { formatPage, needsAttention, pathToFile, computeDivergences } from './format.js'
import { fetchPSIForPages, isLocalhost } from './psi.js'
import { hasWorkspaceMarkers, promptWorkspace, saveRecentDir } from './workspace.js'
import { hasUnlighthouseConfig, promptScanConfig, writeUnlighthouseConfig } from './config-prompt.js'
import type { PageResult, AuditEntry, AuditElement } from './types.js'

interface RunOptions {
  site?: string
  config?: string
  out?: string
  cwd?: string
  psi?: boolean
  psiKey?: string
  psiConcurrency?: number
}

// ────────────────────────────────────────────────────────────────────────────
// ci-result.json shape (jsonExpanded reporter)
// ────────────────────────────────────────────────────────────────────────────

interface CIResultRoute {
  path: string
  score: number
  categories: {
    performance?: { score: number }
    accessibility?: { score: number }
    'best-practices'?: { score: number }
    seo?: { score: number }
  }
}

interface CIResult {
  routes: CIResultRoute[]
}

// ────────────────────────────────────────────────────────────────────────────
// Per-page lighthouse.json shape
// ────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuditDetails = Record<string, any>

interface LighthouseAudit {
  id: string
  title: string
  description?: string
  score: number | null
  displayValue?: string
  details?: AuditDetails
}

interface LighthouseReport {
  categories: Record<string, {
    score: number
    auditRefs: Array<{ id: string; weight: number }>
  }>
  audits: Record<string, LighthouseAudit>
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function runUnlighthouse(site: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning unlighthouse on ${site}…`)

    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    const proc = spawn(
      npx,
      ['unlighthouse-ci', '--site', site, '--reporter', 'jsonExpanded'],
      { stdio: 'inherit' }
    )

    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`unlighthouse-ci exited with code ${code}`))
    })
  })
}

// Map a URL path to its unlighthouse report directory
// /          → .unlighthouse/reports/
// /contact   → .unlighthouse/reports/contact/
// /blog/slug → .unlighthouse/reports/blog/slug/
function pathToReportDir(urlPath: string, reportsBase: string): string {
  if (urlPath === '/' || urlPath === '') return reportsBase
  const segments = urlPath.replace(/^\//, '').split('/')
  return join(reportsBase, ...segments)
}

// Extract DOM element details from an audit's details.items array.
// Handles two common structures:
//   1. items[].node  — each item has a .node property (e.g., color-contrast, link-name)
//   2. items[] of type "node" — item itself is the node (e.g., lcp-breakdown-insight)
function extractAuditElements(audit: LighthouseAudit): AuditElement[] {
  const items: AuditDetails[] = audit.details?.items
  if (!Array.isArray(items)) return []

  const elements: AuditElement[] = []
  for (const item of items) {
    // Pattern 1: item is a node
    if (item.type === 'node' && typeof item.selector === 'string') {
      elements.push({
        selector: item.selector,
        snippet: item.snippet ?? undefined,
      })
    }
    // Pattern 2: item has a nested .node
    else if (item.node?.type === 'node' && typeof item.node.selector === 'string') {
      elements.push({
        selector: item.node.selector,
        snippet: item.node.snippet ?? undefined,
        explanation: item.node.explanation ?? undefined,
      })
    }
  }
  return elements
}


// Pure data-blob audit IDs that have no useful representation in markdown
const SKIP_AUDIT_IDS = new Set([
  'screenshot-thumbnails',
  'final-screenshot',
  'script-treemap-data',
  'metrics',
  'diagnostics',
  'network-requests',
  'main-thread-tasks',
])

function auditToEntry(audit: LighthouseAudit, allAudits: Record<string, LighthouseAudit>): AuditEntry {
  const entry: AuditEntry = {
    id: audit.id,
    title: audit.title,
    score: audit.score,
    displayValue: audit.displayValue ?? null,
  }

  if (audit.id === 'largest-contentful-paint') {
    // LCP element lives in lcp-breakdown-insight (not the metric audit itself)
    const breakdown = allAudits['lcp-breakdown-insight']
    if (breakdown) entry.elements = extractAuditElements(breakdown)
    // lcp-discovery-insight has more targeted fix guidance than the metric audit itself
    const discovery = allAudits['lcp-discovery-insight']
    if (discovery?.description) entry.description = discovery.description
  } else {
    if (audit.description) entry.description = audit.description
    const elements = extractAuditElements(audit)
    if (elements.length > 0) entry.elements = elements
  }

  return entry
}

function extractCategoryAudits(
  category: { score: number; auditRefs: Array<{ id: string; weight: number }> } | undefined,
  allAudits: Record<string, LighthouseAudit>
): AuditEntry[] {
  if (!category?.auditRefs) return []

  return category.auditRefs
    .filter((ref) => ref.weight > 0)
    .map((ref) => allAudits[ref.id])
    .filter((audit): audit is LighthouseAudit => !!audit)
    .map((audit) => auditToEntry(audit, allAudits))
}

function extractOpportunities(
  categories: LighthouseReport['categories'],
  allAudits: Record<string, LighthouseAudit>
): AuditEntry[] {
  const seen = new Set<string>()
  const results: AuditEntry[] = []

  for (const category of Object.values(categories)) {
    for (const ref of category.auditRefs) {
      if (ref.weight > 0 || seen.has(ref.id) || SKIP_AUDIT_IDS.has(ref.id)) continue
      seen.add(ref.id)
      const audit = allAudits[ref.id]
      if (!audit || audit.score === null) continue
      results.push(auditToEntry(audit, allAudits))
    }
  }

  return results
}

// ────────────────────────────────────────────────────────────────────────────
// Read unlighthouse output
// ────────────────────────────────────────────────────────────────────────────

function readCIResult(unlighthouseDir: string): CIResultRoute[] {
  const ciPath = join(unlighthouseDir, 'ci-result.json')
  if (!existsSync(ciPath)) {
    throw new Error(`Could not find ${ciPath}. Did unlighthouse complete successfully?`)
  }
  const result: CIResult = JSON.parse(readFileSync(ciPath, 'utf8'))
  if (!Array.isArray(result.routes)) {
    throw new Error(`Unexpected ci-result.json format: missing "routes" array.`)
  }
  return result.routes
}

function readLighthouseReport(urlPath: string, reportsBase: string): LighthouseReport | null {
  const dir = pathToReportDir(urlPath, reportsBase)
  const filePath = join(dir, 'lighthouse.json')
  if (!existsSync(filePath)) return null
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function pruneOldRuns(absOutputDir: string): void {
  const RUN_DIR_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/
  const entries = readdirSync(absOutputDir, { withFileTypes: true })
  const runs = entries
    .filter((e) => e.isDirectory() && RUN_DIR_RE.test(e.name))
    .map((e) => e.name)
    .sort()
  for (const name of runs.slice(0, -3)) {
    rmSync(join(absOutputDir, name), { recursive: true })
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────────────────

export async function run(opts: RunOptions): Promise<void> {
  // ── Workspace selection ──────────────────────────────────────────────────
  if (opts.cwd) {
    if (!hasWorkspaceMarkers(opts.cwd)) {
      console.error(
        `\nNo workspace markers found in ${opts.cwd}. Expected one of: package.json, lighthouse-audit.config.js, unlighthouse.config.ts, reports/, .unlighthouse/\n`
      )
      process.exit(1)
    }
    process.chdir(opts.cwd)
  } else if (!hasWorkspaceMarkers(process.cwd())) {
    const chosen = await promptWorkspace()
    if (chosen) process.chdir(chosen)
  }

  // ── Scan config onboarding ───────────────────────────────────────────────
  if (!hasUnlighthouseConfig(process.cwd())) {
    const action = await promptScanConfig()
    if (action.type === 'advanced') {
      writeUnlighthouseConfig(process.cwd(), action)
      console.log('\nunlighthouse.config.ts created — edit it, then re-run lighthouse-agent-report.')
      process.exit(0)
    }
    writeUnlighthouseConfig(process.cwd(), action)
  }

  const config = await loadConfig(opts.config)
  const outputDir = opts.out ?? config.output ?? 'reports/lighthouse'
  const site = opts.site ?? config.site

  if (!site) {
    throw new Error(
      'No site URL provided. Pass --site <url> or set "site" in lighthouse-audit.config.js.'
    )
  }

  const routeMap = buildRouteMap(process.cwd())

  await runUnlighthouse(site)

  const unlighthouseDir = resolve(process.cwd(), '.unlighthouse')
  const reportsBase = join(unlighthouseDir, 'reports')
  const ciRoutes = readCIResult(unlighthouseDir)

  const pages: PageResult[] = ciRoutes.map((route) => {
    const lh = readLighthouseReport(route.path, reportsBase)

    if (!lh) {
      return {
        path: route.path,
        scores: {
          performance: route.categories.performance?.score ?? 0,
          accessibility: route.categories.accessibility?.score ?? 0,
          bestPractices: route.categories['best-practices']?.score ?? 0,
          seo: route.categories.seo?.score ?? 0,
        },
        audits: { performance: [], accessibility: [], bestPractices: [], seo: [], opportunities: [] },
        source: resolveSource(route.path, routeMap),
        error: 'Full Lighthouse report not found',
      }
    }

    const categories = lh.categories
    const lhAudits = lh.audits

    return {
      path: route.path,
      scores: {
        performance: categories.performance?.score ?? 0,
        accessibility: categories.accessibility?.score ?? 0,
        bestPractices: categories['best-practices']?.score ?? 0,
        seo: categories.seo?.score ?? 0,
      },
      audits: {
        performance: extractCategoryAudits(categories.performance, lhAudits),
        accessibility: extractCategoryAudits(categories.accessibility, lhAudits),
        bestPractices: extractCategoryAudits(categories['best-practices'], lhAudits),
        seo: extractCategoryAudits(categories.seo, lhAudits),
        opportunities: extractOpportunities(categories, lhAudits),
      },
      source: resolveSource(route.path, routeMap),
    }
  })

  // PSI field data — opt-in with --psi, --psi-key, or env var + prompt
  const envKey = process.env.PSI_API_KEY
  const hasExplicitKey = !!opts.psiKey
  const hasFlag = !!opts.psi

  if (isLocalhost(site)) {
    // skip — localhost not supported
  } else if (hasExplicitKey || hasFlag) {
    // --psi or --psi-key: force on, no prompt
    const key = opts.psiKey ?? envKey
    if (!key) {
      throw new Error('--psi requires a key. Pass --psi-key or set PSI_API_KEY.')
    }
    const paths = pages.filter((p) => !p.error).map((p) => p.path)
    const fieldDataMap = await fetchPSIForPages(site, paths, key, opts.psiConcurrency)
    for (const page of pages) {
      const fd = fieldDataMap.get(page.path)
      if (fd) page.fieldData = fd
    }
  } else if (envKey && process.stdout.isTTY) {
    // Env key + TTY: prompt
    const confirm = await p.confirm({
      message: 'Fetch real-user field data via PageSpeed Insights?',
    })
    if (!p.isCancel(confirm) && confirm) {
      const paths = pages.filter((p) => !p.error).map((p) => p.path)
      const fieldDataMap = await fetchPSIForPages(site, paths, envKey, opts.psiConcurrency)
      for (const page of pages) {
        const fd = fieldDataMap.get(page.path)
        if (fd) page.fieldData = fd
      }
    }
  } else if (envKey) {
    // Env key + non-TTY: skip silently
  } else {
    // No key: tip
    console.log('\nTip: Set PSI_API_KEY or pass --psi-key to include real-user field data.')
  }

  const generatedAt = new Date().toISOString()

  const absOutputDir = resolve(process.cwd(), outputDir)
  const timestamp = generatedAt.replace(/[:.]/g, '-').slice(0, 19)
  const runDir = join(absOutputDir, timestamp)

  mkdirSync(runDir, { recursive: true })

  const divergences = computeDivergences(pages)
  const pageCount = pages.length

  // Per-page markdown — only for failing or errored pages (links from JSON)
  for (const page of pages) {
    if (!needsAttention(page) && !page.error) continue

    const relFile = pathToFile(page.path)
    const absFile = join(runDir, relFile)
    mkdirSync(dirname(absFile), { recursive: true })
    writeFileSync(absFile, formatPage(page, site, generatedAt), 'utf8')
    page.markdownFile = relFile
  }

  // JSON report — chunk if over 10,000 lines
  const CHUNK_THRESHOLD = 10_000
  // Metadata lines per chunk: {, generatedAt, site, pageCount, divergences, pages, }
  const ENVELOPE_LINES = 7
  const divergencesJson = JSON.stringify(divergences, null, 2)
  const divergencesLineCount = divergencesJson.split('\n').length
  const reportEnvelope = { generatedAt, site, pageCount, divergences, pages }
  const indexJson = JSON.stringify(reportEnvelope, null, 2)
  const lineCount = indexJson.split('\n').length

  let manifestPath: string | undefined

  if (lineCount > CHUNK_THRESHOLD) {
    const avgLinesPerPage = lineCount / pageCount
    const budget = CHUNK_THRESHOLD - ENVELOPE_LINES - divergencesLineCount
    const chunkSize = Math.max(1, Math.floor(budget / avgLinesPerPage))
    const chunks: Array<{ file: string; startPage: number; endPage: number; pageCount: number }> = []

    for (let i = 0; i < pageCount; i += chunkSize) {
      const chunkPages = pages.slice(i, i + chunkSize)
      const chunkFile = `index.json.${chunks.length + 1}`
      writeFileSync(join(runDir, chunkFile), JSON.stringify({
        generatedAt, site, pageCount, divergences, pages: chunkPages,
      }, null, 2), 'utf8')
      chunks.push({
        file: chunkFile,
        startPage: i,
        endPage: Math.min(i + chunkSize - 1, pageCount - 1),
        pageCount: chunkPages.length,
      })
    }

    manifestPath = join(runDir, 'index.json.manifest.json')
    writeFileSync(manifestPath, JSON.stringify({
      version: '1.0',
      generatedAt,
      site,
      pageCount,
      chunked: true,
      chunks,
    }, null, 2), 'utf8')
    console.log(`\nJSON report chunked into ${chunks.length} files (${lineCount} lines > ${CHUNK_THRESHOLD} limit)`)
  } else {
    writeFileSync(join(runDir, 'index.json'), indexJson, 'utf8')
  }

  pruneOldRuns(absOutputDir)

  console.log(`\n── Lighthouse Audit Complete ──`)
  console.log(`Site:   ${site}`)
  console.log(`Pages:  ${pageCount}`)
  console.log(`Report: ${manifestPath ?? join(runDir, 'index.json')}`)

  const failing = pages.filter(
    (p) => !p.error && Object.values(p.scores).some((s) => Math.round(s * 100) < 90)
  )

  if (failing.length > 0) {
    console.log(`\nPages with lab scores < 90:`)
    for (const p of failing) {
      const s = p.scores
      console.log(
        `  ${p.path}  P:${Math.round(s.performance * 100)} A:${Math.round(s.accessibility * 100)} BP:${Math.round(s.bestPractices * 100)} SEO:${Math.round(s.seo * 100)}`
      )
    }
  } else {
    console.log(`\nAll pages scored ≥ 90 (lab). ✓`)
  }

  // ── Persist workspace for future runs ────────────────────────────────────
  saveRecentDir(process.cwd())
}
