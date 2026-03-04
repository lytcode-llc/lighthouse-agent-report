import { spawn } from 'child_process'
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { loadConfig } from './config.js'
import { buildRouteMap, resolveSource } from './source-map.js'
import { formatReport } from './format.js'
import { fetchPSIForPages, isLocalhost } from './psi.js'
import type { PageResult, FailingAudit, AuditElement } from './types.js'

interface RunOptions {
  site?: string
  config?: string
  out?: string
  psiKey?: string
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

    const proc = spawn(
      'npx',
      ['unlighthouse-ci', '--site', site, '--reporter', 'jsonExpanded'],
      { stdio: 'inherit', shell: true }
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


function extractFailingAudits(
  category: { score: number; auditRefs: Array<{ id: string; weight: number }> } | undefined,
  allAudits: Record<string, LighthouseAudit>
): FailingAudit[] {
  if (!category?.auditRefs) return []

  return category.auditRefs
    .filter((ref) => ref.weight > 0)
    .map((ref) => allAudits[ref.id])
    .filter((audit): audit is LighthouseAudit => !!audit && audit.score !== null && audit.score < 0.9)
    .map((audit) => {
      const result: FailingAudit = {
        id: audit.id,
        title: audit.title,
        score: audit.score,
        displayValue: audit.displayValue ?? null,
      }

      if (audit.id === 'largest-contentful-paint') {
        // LCP element lives in lcp-breakdown-insight (not the metric audit itself)
        const breakdown = allAudits['lcp-breakdown-insight']
        if (breakdown) result.elements = extractAuditElements(breakdown)
        // lcp-discovery-insight has more targeted fix guidance than the metric audit itself
        const discovery = allAudits['lcp-discovery-insight']
        if (discovery?.description) result.description = discovery.description
      } else {
        if (audit.description) result.description = audit.description
        const elements = extractAuditElements(audit)
        if (elements.length > 0) result.elements = elements
      }

      return result
    })
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

// ────────────────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────────────────

export async function run(opts: RunOptions): Promise<void> {
  const config = await loadConfig(opts.config)
  const outputDir = opts.out ?? config.output ?? 'reports/lighthouse'
  const psiKey = opts.psiKey ?? process.env.PSI_API_KEY
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
        failingAudits: { performance: [], accessibility: [], bestPractices: [], seo: [] },
        source: resolveSource(route.path, routeMap),
        error: 'Full Lighthouse report not found',
      }
    }

    const categories = lh.categories
    const audits = lh.audits

    return {
      path: route.path,
      scores: {
        performance: categories.performance?.score ?? 0,
        accessibility: categories.accessibility?.score ?? 0,
        bestPractices: categories['best-practices']?.score ?? 0,
        seo: categories.seo?.score ?? 0,
      },
      failingAudits: {
        performance: extractFailingAudits(categories.performance, audits),
        accessibility: extractFailingAudits(categories.accessibility, audits),
        bestPractices: extractFailingAudits(categories['best-practices'], audits),
        seo: extractFailingAudits(categories.seo, audits),
      },
      source: resolveSource(route.path, routeMap),
    }
  })

  // PSI field data — only for non-localhost sites
  if (psiKey && !isLocalhost(site)) {
    const paths = pages.filter((p) => !p.error).map((p) => p.path)
    const fieldDataMap = await fetchPSIForPages(site, paths, psiKey)
    for (const page of pages) {
      const fd = fieldDataMap.get(page.path)
      if (fd) page.fieldData = fd
    }
  } else if (psiKey && isLocalhost(site)) {
    console.log('\nSkipping PSI field data — not available for localhost.')
  } else {
    console.log('\nTip: Pass --psi-key or set PSI_API_KEY to include real-user field data.')
  }

  const generatedAt = new Date().toISOString()
  const markdown = formatReport(pages, site, generatedAt)
  const json = JSON.stringify({ generatedAt, site, pages }, null, 2)

  mkdirSync(resolve(process.cwd(), outputDir), { recursive: true })

  const latestMd = resolve(process.cwd(), outputDir, 'latest.md')
  const latestJson = resolve(process.cwd(), outputDir, 'latest.json')
  const timestamp = generatedAt.replace(/[:.]/g, '-').slice(0, 19)
  const archiveMd = resolve(process.cwd(), outputDir, `audit-${timestamp}.md`)

  writeFileSync(latestMd, markdown, 'utf8')
  writeFileSync(latestJson, json, 'utf8')
  writeFileSync(archiveMd, markdown, 'utf8')

  console.log(`\n── Lighthouse Audit Complete ──`)
  console.log(`Site:   ${site}`)
  console.log(`Pages:  ${pages.length}`)
  console.log(`Report: ${latestMd}`)

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
}
