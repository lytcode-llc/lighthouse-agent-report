import { spawn } from 'child_process'
import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'
import { loadConfig } from './config.js'
import { buildRouteMap, resolveSource } from './source-map.js'
import { formatReport } from './format.js'
import { fetchPSIForPages, isLocalhost } from './psi.js'
import type { PageResult, FailingAudit } from './types.js'

interface RunOptions {
  site: string
  config?: string
  out?: string
  psiKey?: string
}

// ────────────────────────────────────────────────────────────────────────────
// Unlighthouse result shapes (jsonExpanded reporter)
// ────────────────────────────────────────────────────────────────────────────

interface UnlighthouseAudit {
  id: string
  title: string
  score: number | null
  displayValue?: string
}

interface UnlighthouseCategory {
  score: number | null
  auditRefs?: Array<{ id: string; weight: number }>
}

interface UnlighthousePageReport {
  route?: { path: string }
  lighthouse?: {
    categories?: {
      performance?: UnlighthouseCategory
      accessibility?: UnlighthouseCategory
      'best-practices'?: UnlighthouseCategory
      seo?: UnlighthouseCategory
    }
    audits?: Record<string, UnlighthouseAudit>
  }
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

function extractFailingAudits(
  category: UnlighthouseCategory | undefined,
  allAudits: Record<string, UnlighthouseAudit>
): FailingAudit[] {
  if (!category?.auditRefs) return []

  return category.auditRefs
    .filter((ref) => ref.weight > 0)
    .map((ref) => allAudits[ref.id])
    .filter((audit): audit is UnlighthouseAudit => !!audit && audit.score !== null && audit.score < 0.9)
    .map((audit) => ({
      id: audit.id,
      title: audit.title,
      score: audit.score,
      displayValue: audit.displayValue ?? null,
    }))
}

function tryReadUnlighthouseResult(): UnlighthousePageReport[] {
  const primary = resolve(process.cwd(), '.unlighthouse', 'ci-result.json')
  if (existsSync(primary)) {
    return JSON.parse(readFileSync(primary, 'utf8'))
  }

  const reportsDir = resolve(process.cwd(), '.unlighthouse', 'reports')
  if (existsSync(reportsDir)) {
    const files = readdirSync(reportsDir).filter((f) => f.endsWith('.json'))
    return files.map((f) => JSON.parse(readFileSync(join(reportsDir, f), 'utf8')))
  }

  throw new Error(
    'Could not find unlighthouse output.\n' +
    'Expected .unlighthouse/ci-result.json or .unlighthouse/reports/*.json'
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────────────────

export async function run(opts: RunOptions): Promise<void> {
  const config = await loadConfig(opts.config)
  const outputDir = opts.out ?? config.output ?? 'reports/lighthouse'
  const psiKey = opts.psiKey ?? process.env.PSI_API_KEY

  // Build route map by scanning the project's app/ or pages/ directory
  const routeMap = buildRouteMap(process.cwd())

  await runUnlighthouse(opts.site)

  const rawPages = tryReadUnlighthouseResult()

  const pages: PageResult[] = rawPages.map((page) => {
    const path = page.route?.path ?? '/'
    const lh = page.lighthouse

    if (!lh) {
      return {
        path,
        scores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
        failingAudits: { performance: [], accessibility: [], bestPractices: [], seo: [] },
        source: resolveSource(path, routeMap),
        error: 'No Lighthouse data',
      }
    }

    const categories = lh.categories ?? {}
    const audits = lh.audits ?? {}

    return {
      path,
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
      source: resolveSource(path, routeMap),
    }
  })

  // PSI field data — only for non-localhost sites
  if (psiKey && !isLocalhost(opts.site)) {
    const paths = pages.filter((p) => !p.error).map((p) => p.path)
    const fieldDataMap = await fetchPSIForPages(opts.site, paths, psiKey)
    for (const page of pages) {
      const fd = fieldDataMap.get(page.path)
      if (fd) page.fieldData = fd
    }
  } else if (psiKey && isLocalhost(opts.site)) {
    console.log('\nSkipping PSI field data — not available for localhost.')
  } else {
    console.log('\nTip: Pass --psi-key or set PSI_API_KEY to include real-user field data.')
  }

  const generatedAt = new Date().toISOString()
  const markdown = formatReport(pages, opts.site, generatedAt)
  const json = JSON.stringify({ generatedAt, site: opts.site, pages }, null, 2)

  mkdirSync(resolve(process.cwd(), outputDir), { recursive: true })

  const latestMd = resolve(process.cwd(), outputDir, 'latest.md')
  const latestJson = resolve(process.cwd(), outputDir, 'latest.json')
  const timestamp = generatedAt.replace(/[:.]/g, '-').slice(0, 19)
  const archiveMd = resolve(process.cwd(), outputDir, `audit-${timestamp}.md`)

  writeFileSync(latestMd, markdown, 'utf8')
  writeFileSync(latestJson, json, 'utf8')
  writeFileSync(archiveMd, markdown, 'utf8')

  console.log(`\n── Lighthouse Audit Complete ──`)
  console.log(`Site:   ${opts.site}`)
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
