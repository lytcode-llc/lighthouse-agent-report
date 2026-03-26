import type { PageResult, AuditEntry, AuditElement, FieldData, CWVCategory } from './types.js'

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

function renderElement(el: AuditElement): string {
  let out = `- \`${el.selector}\``
  if (el.snippet) {
    const snip = el.snippet.length > 150 ? el.snippet.slice(0, 150) + '…' : el.snippet
    out += `\n  \`${snip}\``
  }
  if (el.explanation) {
    out += `\n  ${el.explanation}`
  }
  return out
}

function auditScore(a: AuditEntry): string {
  if (a.score === null) return 'N/A'
  const pct = Math.round(a.score * 100)
  if (pct >= 90) return `✓ ${pct}`
  return `⚠ ${pct}`
}

function auditTable(audits: AuditEntry[]): string {
  if (audits.length === 0) return '_No audits_\n'
  const rows = audits
    .map((a) => `| ${a.title} | ${auditScore(a)} | ${a.displayValue || '—'} |`)
    .join('\n')

  let out = `| Audit | Score | Value |\n|-------|-------|-------|  \n${rows}\n`

  // Show element details and descriptions only for failing audits
  for (const audit of audits) {
    if (audit.score === null || audit.score >= 0.9) continue
    const hasElements = audit.elements && audit.elements.length > 0
    const hasDescription = !!audit.description
    if (!hasElements && !hasDescription) continue

    out += '\n'
    if (hasElements) {
      const capped = audit.elements!.slice(0, 5)
      out += capped.map(renderElement).join('\n') + '\n'
      if (audit.elements!.length > 5) {
        out += `_(${audit.elements!.length - 5} more elements not shown)_\n`
      }
    }
    if (hasDescription) {
      out += `> ${audit.description}\n`
    }
  }

  return out
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

function hasFailingAuditEntries(page: PageResult): boolean {
  const all = [
    ...page.audits.performance,
    ...page.audits.accessibility,
    ...page.audits.bestPractices,
    ...page.audits.seo,
    ...page.audits.opportunities,
  ]
  return all.some((a) => a.score !== null && a.score < 0.9)
}

function needsAttention(page: PageResult): boolean {
  if (page.error) return false
  return (
    hasFailingLabScores(page) ||
    hasFailingAuditEntries(page) ||
    hasFailingFieldData(page)
  )
}

function truncateToBytes(str: string, maxBytes: number): string {
  const encoded = new TextEncoder().encode(str)
  if (encoded.length <= maxBytes) return str
  let end = maxBytes
  // Walk back to the start of a multi-byte UTF-8 sequence
  while (end > 0 && (encoded[end] & 0xc0) === 0x80) end--
  return new TextDecoder().decode(encoded.slice(0, end))
}

function pathToFile(path: string): string {
  const stripped = path.replace(/^\//, '').replace(/\/$/, '')
  const name = stripped === '' ? 'index' : stripped
  // Truncate the raw slug before encoding so we never cut mid-percent-sequence.
  // Reserve 3 bytes for the .md extension.
  const truncated = truncateToBytes(name, 252)
  return `pages/${encodeURIComponent(truncated)}.md`
}

function failingScoresSummary(page: PageResult): string {
  const parts: string[] = []
  const { performance, accessibility, bestPractices, seo } = page.scores
  if (Math.round(performance * 100) < LAB_THRESHOLD) parts.push(`Performance: **${Math.round(performance * 100)}** ⚠`)
  if (Math.round(accessibility * 100) < LAB_THRESHOLD) parts.push(`Accessibility: **${Math.round(accessibility * 100)}** ⚠`)
  if (Math.round(bestPractices * 100) < LAB_THRESHOLD) parts.push(`Best Practices: **${Math.round(bestPractices * 100)}** ⚠`)
  if (Math.round(seo * 100) < LAB_THRESHOLD) parts.push(`SEO: **${Math.round(seo * 100)}** ⚠`)
  return parts.join(', ')
}

// ────────────────────────────────────────────────────────────────────────────
// Index
// ────────────────────────────────────────────────────────────────────────────

export function formatIndex(pages: PageResult[], site: string, generatedAt: string): string {
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
      lines.push(`| [\`${page.path}\`](${pathToFile(page.path)}) | ❌ Error | — | — | — |${fd}`)
      continue
    }
    const { performance, accessibility, bestPractices, seo } = page.scores
    const fieldCol = hasAnyFieldData
      ? ` ${page.fieldData ? cwvBadge(page.fieldData.overall) : '—'} |`
      : ''
    lines.push(
      `| [\`${page.path}\`](${pathToFile(page.path)}) | ${labScore(performance)} | ${labScore(accessibility)} | ${labScore(bestPractices)} | ${labScore(seo)} |${fieldCol}`
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
      const file = pathToFile(page.path)
      const scores = failingScoresSummary(page)
      lines.push(`- [\`${page.path}\`](${file})${scores ? ` — ${scores}` : ''}`)
    }
  }

  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // ── Cross-Page Audit Divergence ────────────────────────────────────────────
  const divergenceSection = crossPageDivergenceSection(pages)
  if (divergenceSection) {
    lines.push(divergenceSection)
  }

  return lines.join('\n')
}

function crossPageDivergenceSection(pages: PageResult[]): string {
  const auditScores = new Map<string, Array<{ score: number; title: string; path: string }>>()

  for (const page of pages) {
    if (page.error) continue
    const allAudits = [
      ...page.audits.performance,
      ...page.audits.accessibility,
      ...page.audits.bestPractices,
      ...page.audits.seo,
      ...page.audits.opportunities,
    ]
    for (const audit of allAudits) {
      if (audit.score === null) continue
      if (!auditScores.has(audit.id)) {
        auditScores.set(audit.id, [])
      }
      auditScores.get(audit.id)!.push({ score: audit.score, title: audit.title, path: page.path })
    }
  }

  const divergences: Array<{
    title: string
    lowScore: number
    lowPage: string
    highScore: number
    highPage: string
    spread: number
  }> = []

  for (const [, entries] of auditScores) {
    if (entries.length < 2) continue
    const sorted = [...entries].sort((a, b) => a.score - b.score)
    const low = sorted[0]
    const high = sorted[sorted.length - 1]
    const spread = high.score - low.score
    if (spread >= 0.2) {
      divergences.push({
        title: entries[0].title,
        lowScore: Math.round(low.score * 100),
        lowPage: low.path,
        highScore: Math.round(high.score * 100),
        highPage: high.path,
        spread,
      })
    }
  }

  if (divergences.length === 0) return ''

  divergences.sort((a, b) => b.spread - a.spread)
  const capped = divergences.slice(0, 20)

  const lines: string[] = []
  lines.push(`## Cross-Page Audit Divergence`)
  lines.push(``)
  lines.push(`| Audit | Low Score | Low Page | High Score | High Page |`)
  lines.push(`|-------|-----------|----------|------------|-----------|`)
  for (const d of capped) {
    lines.push(`| ${d.title} | ${d.lowScore} | \`${d.lowPage}\` | ${d.highScore} | \`${d.highPage}\` |`)
  }
  lines.push(``)

  return lines.join('\n')
}

// ────────────────────────────────────────────────────────────────────────────
// Per-page file
// ────────────────────────────────────────────────────────────────────────────

export function formatPage(page: PageResult, site: string, generatedAt: string): string {
  const lines: string[] = []
  lines.push(`# Lighthouse Audit — ${page.path}`)
  lines.push(`Generated: ${generatedAt} | Site: ${site} | URL: ${site}${page.path}`)
  lines.push(``)
  lines.push(...pageDetail(page))
  return lines.join('\n')
}

function pageDetail(page: PageResult): string[] {
  const lines: string[] = []

  lines.push(`### \`${page.path}\``)
  if (page.source.routeFile !== null) {
    lines.push(`**Route:** \`${page.source.routeFile}\``)
  }

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

  // All audits per category
  const categories: Array<[string, AuditEntry[]]> = [
    ['Performance', page.audits.performance],
    ['Accessibility', page.audits.accessibility],
    ['Best Practices', page.audits.bestPractices],
    ['SEO', page.audits.seo],
  ]

  for (const [label, audits] of categories) {
    if (audits.length > 0) {
      lines.push(`#### ${label}`)
      lines.push(auditTable(audits))
    }
  }

  if (page.audits.opportunities.length > 0) {
    lines.push(`#### Opportunities & Diagnostics`)
    lines.push(auditTable(page.audits.opportunities))
  }

  const hasAnyAudits = categories.some(([, a]) => a.length > 0) || page.audits.opportunities.length > 0
  if (!hasAnyAudits && !page.fieldData) {
    lines.push(`_No audit data available._`)
    lines.push(``)
  }

  return lines
}
