import type { FieldData, FieldMetric, CWVCategory } from './types.js'

const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
// PSI free tier: ~2 requests/second; 600ms keeps us comfortably under
const RATE_LIMIT_MS = 600

// ────────────────────────────────────────────────────────────────────────────
// PSI response shapes
// ────────────────────────────────────────────────────────────────────────────

interface PSIMetric {
  percentile: number
  category: string
}

interface PSILoadingExperience {
  id?: string
  metrics?: {
    LARGEST_CONTENTFUL_PAINT_MS?: PSIMetric
    CUMULATIVE_LAYOUT_SHIFT_SCORE?: PSIMetric   // p75 is score * 100 (integer)
    INTERACTION_TO_NEXT_PAINT?: PSIMetric
    FIRST_CONTENTFUL_PAINT_MS?: PSIMetric
  }
  overall_category?: string
}

interface PSIResponse {
  id?: string
  loadingExperience?: PSILoadingExperience
  originLoadingExperience?: PSILoadingExperience
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function toCategory(raw: string | undefined): CWVCategory | undefined {
  if (raw === 'FAST' || raw === 'AVERAGE' || raw === 'SLOW') return raw
  return undefined
}

function parseMetric(m: PSIMetric | undefined): FieldMetric | undefined {
  if (!m || m.percentile === undefined) return undefined
  return { p75: m.percentile, category: toCategory(m.category) ?? 'AVERAGE' }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ────────────────────────────────────────────────────────────────────────────
// Single-URL fetch
// ────────────────────────────────────────────────────────────────────────────

async function fetchOnePSI(
  url: string,
  apiKey: string
): Promise<{ fieldData?: FieldData; error?: string }> {
  const params = new URLSearchParams({
    url,
    key: apiKey,
    strategy: 'mobile',
    // Only request the fields we need — faster response
    fields: 'loadingExperience,originLoadingExperience',
  })

  let res: Response
  try {
    res = await fetch(`${PSI_API}?${params}`)
  } catch (err) {
    return { error: `Network error: ${(err as Error).message}` }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    // Surface quota errors clearly
    if (res.status === 429) return { error: 'PSI rate limit exceeded' }
    if (res.status === 400) return { error: `PSI bad request (invalid URL?)` }
    if (res.status === 403) return { error: `PSI API key invalid or quota exhausted` }
    return { error: `PSI API ${res.status}: ${text.slice(0, 100)}` }
  }

  const data: PSIResponse = await res.json()

  // Prefer URL-specific field data; fall back to origin-level
  const urlExp = data.loadingExperience
  const originExp = data.originLoadingExperience
  const hasUrlData = !!urlExp?.metrics
  const experience = hasUrlData ? urlExp : originExp
  const isOriginLevel = !hasUrlData && !!originExp?.metrics

  if (!experience?.metrics) {
    return { error: 'No field data (insufficient traffic for this URL/origin)' }
  }

  const m = experience.metrics
  return {
    fieldData: {
      lcp: parseMetric(m.LARGEST_CONTENTFUL_PAINT_MS),
      cls: parseMetric(m.CUMULATIVE_LAYOUT_SHIFT_SCORE),
      inp: parseMetric(m.INTERACTION_TO_NEXT_PAINT),
      fcp: parseMetric(m.FIRST_CONTENTFUL_PAINT_MS),
      overall: toCategory(experience.overall_category),
      isOriginLevel,
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Batch fetch with rate limiting
// ────────────────────────────────────────────────────────────────────────────

export function isLocalhost(site: string): boolean {
  try {
    const { hostname } = new URL(site)
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.local')
    )
  } catch {
    return false
  }
}

export async function fetchPSIForPages(
  siteUrl: string,
  paths: string[],
  apiKey: string
): Promise<Map<string, FieldData>> {
  const results = new Map<string, FieldData>()
  console.log(`\nFetching PSI field data (mobile) for ${paths.length} pages…`)

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]
    const fullUrl = new URL(path === '/' ? '' : path, siteUrl).href
    process.stdout.write(`  [${i + 1}/${paths.length}] ${path} … `)

    const { fieldData, error } = await fetchOnePSI(fullUrl, apiKey)

    if (error) {
      process.stdout.write(`skipped (${error})\n`)
    } else if (fieldData) {
      const tag = fieldData.isOriginLevel ? `${fieldData.overall} (origin)` : fieldData.overall
      process.stdout.write(`${tag}\n`)
      results.set(path, fieldData)
    }

    if (i < paths.length - 1) {
      await sleep(RATE_LIMIT_MS)
    }
  }

  return results
}
