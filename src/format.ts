import type { PageResult, FailingAudit, FieldData, CWVCategory } from './types.js'

const LAB_THRESHOLD = 90

// ────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ────────────────────────────────────────────────────────────────────────────

function labScore(score: number): string {
  const pct = Math.round(score * 100)
  return pct < LAB_THRESHOLD ? `**${pct}** ⚠` : `${pct}`
}

function cwvBadge(category: CWVCategory | undefined): string {
  if (!category) return '—'
  if (category === 'FAST') return 'FAST ✓'
  if (category === 'AVERAGE') return 'AVERAGE ⚠'
  return 'SLOW ✗'
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

// PSI returns CLS as score * 100 (integer)
function formatCLS(raw: number): string {
  return (raw / 100).toFixed(3)
}

function auditTable(audits: FailingAudit[]): string {
  if (audits.length === 0) return '_No failing audits_\n'
  const rows = audits
    .map((a) => {
      const score = a.score !== null ? Math.round(a.score * 100) : 'N/A'
      return `| ${a.title} | ${score} | ${a.displayValue ?? '—'} |`
    })
    .join('\n')
  return `| Audit | Score | Details |\n|-------|-------|---------|  \n${rows}\n`
}

function fieldDataSection(fd: FieldData): string {
  const lines: string[] = []
  const level = fd.isOriginLevel ? ' _(origin-level — URL lacked sufficient traffic)_' : ''
  lines.push(`#### Field Data — Real Users, Mobile P75${level}`)
  lines.push(`| Metric | P75 | Rating |`)
  lines.push(`|--------|-----|--------|`)

  if (fd.lcp) lines.push(`| LCP (Largest Contentful Paint) | ${formatMs(fd.lcp.p75)} | ${cwvBadge(fd.lcp.category)} |`)
  if (fd.cls) lines.push(`| CLS (Cumulative Layout Shift)   | ${formatCLS(fd.cls.p75)} | ${cwvBadge(fd.cls.category)} |`)
  if (fd.inp) lines.push(`| INP (Interaction to Next Paint)  | ${formatMs(fd.inp.p75)} | ${cwvBadge(fd.inp.category)} |`)
  if (fd.fcp) lines.push(`| FCP (First Contentful Paint)    | ${formatMs(fd.fcp.p75)} | ${cwvBadge(fd.fcp.category)} |`)

  lines.push(``)
  return lines.join('\n')
}

function hasFailingLabScores(page: PageResult): boolean {
  return Object.values(page.scores).some((s) => Math.round(s * 100) < LAB_THRESHOLD)
}

function hasFailingFieldData(page: PageResult): boolean {
  if (!page.fieldData) return false
  return page.fieldData.overall === 'SLOW' || page.fieldData.overall === 'AVERAGE'
}

function needsAttention(page: PageResult): boolean {
  if (page.error) return false
  return (
    hasFailingLabScores(page) ||
    Object.values(page.failingAudits).some((a) => a.length > 0) ||
    hasFailingFieldData(page)
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Report
// ────────────────────────────────────────────────────────────────────────────

export function formatReport(pages: PageResult[], site: string, generatedAt: string): string {
  const lines: string[] = []
  const hasAnyFieldData = pages.some((p) => p.fieldData)

  lines.push(`# Lighthouse Audit Report`)
  lines.push(`Generated: ${generatedAt} | Site: ${site} | Pages: ${pages.length}`)
  if (hasAnyFieldData) {
    lines.push(`Lab data: unlighthouse (desktop simulation) | Field data: PageSpeed Insights (real users, mobile)`)
  }
  lines.push(``)

  // ── Summary Table ──────────────────────────────────────────────────────────
  lines.push(`## Summary Table`)
  lines.push(``)

  const fieldHeader = hasAnyFieldData ? ' Field CWV |' : ''
  const fieldDivider = hasAnyFieldData ? ' ---------- |' : ''
  lines.push(`| Page | Performance | Accessibility | Best Practices | SEO |${fieldHeader}`)
  lines.push(`|------|-------------|---------------|----------------|-----|${fieldDivider}`)

  for (const page of pages) {
    if (page.error) {
      const fd = hasAnyFieldData ? ' — |' : ''
      lines.push(`| \`${page.path}\` | ❌ Error | — | — | — |${fd}`)
      continue
    }
    const { performance, accessibility, bestPractices, seo } = page.scores
    const fieldCol = hasAnyFieldData
      ? ` ${page.fieldData ? cwvBadge(page.fieldData.overall) : '—'} |`
      : ''
    lines.push(
      `| \`${page.path}\` | ${labScore(performance)} | ${labScore(accessibility)} | ${labScore(bestPractices)} | ${labScore(seo)} |${fieldCol}`
    )
  }

  lines.push(``)
  lines.push(`> Lab scores below ${LAB_THRESHOLD} flagged with ⚠ | Field CWV: FAST ✓ AVERAGE ⚠ SLOW ✗`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // ── Pages Requiring Attention ──────────────────────────────────────────────
  const attention = pages.filter(needsAttention)

  lines.push(`## Pages Requiring Attention`)
  lines.push(``)

  if (attention.length === 0) {
    lines.push(`_All pages passed lab thresholds${hasAnyFieldData ? ' and field data checks' : ''}._`)
  } else {
    for (const page of attention) {
      lines.push(...pageDetail(page))
    }
  }

  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // ── All Pages ──────────────────────────────────────────────────────────────
  lines.push(`## All Pages (Full Detail)`)
  lines.push(``)

  for (const page of pages) {
    lines.push(...pageDetail(page))
  }

  return lines.join('\n')
}

function pageDetail(page: PageResult): string[] {
  const lines: string[] = []

  lines.push(`### \`${page.path}\``)
  lines.push(`**Route:** \`${page.source.routeFile}\``)

  if (page.error) {
    lines.push(`**Error:** ${page.error}`)
    lines.push(``)
    return lines
  }

  const { performance, accessibility, bestPractices, seo } = page.scores
  lines.push(
    `**Lab Scores:** Performance: ${Math.round(performance * 100)} | Accessibility: ${Math.round(accessibility * 100)} | Best Practices: ${Math.round(bestPractices * 100)} | SEO: ${Math.round(seo * 100)}`
  )

  if (page.fieldData?.overall) {
    lines.push(`**Field CWV:** ${cwvBadge(page.fieldData.overall)}`)
  }

  lines.push(``)

  // Field data table
  if (page.fieldData) {
    lines.push(fieldDataSection(page.fieldData))
  }

  // Failing lab audits
  const categories: Array<[string, FailingAudit[]]> = [
    ['Performance', page.failingAudits.performance],
    ['Accessibility', page.failingAudits.accessibility],
    ['Best Practices', page.failingAudits.bestPractices],
    ['SEO', page.failingAudits.seo],
  ]

  let hasFailingAudits = false
  for (const [label, audits] of categories) {
    if (audits.length > 0) {
      hasFailingAudits = true
      lines.push(`#### ${label} Issues`)
      lines.push(auditTable(audits))
    }
  }

  if (!hasFailingAudits && !page.fieldData) {
    lines.push(`_All audits passing._`)
    lines.push(``)
  }

  return lines
}
