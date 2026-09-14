import { describe, it, expect } from 'vitest'
import { formatPage, needsAttention, pathToFile, computeDivergences } from './format.js'
import type { PageResult, FieldData, Divergence } from './types.js'

const GENERATED_AT = '2026-01-01T00:00:00.000Z'
const SITE = 'https://example.com'

function makePage(overrides: Partial<PageResult> = {}): PageResult {
  return {
    path: '/',
    scores: { performance: 1, accessibility: 1, bestPractices: 1, seo: 1 },
    audits: { performance: [], accessibility: [], bestPractices: [], seo: [], opportunities: [] },
    source: { routeFile: 'app/page.tsx' },
    ...overrides,
  }
}

describe('formatPage', () => {
  it('generates page file with path in header', () => {
    const page = makePage({ path: '/about' })
    const md = formatPage(page, SITE, GENERATED_AT)
    expect(md).toContain('# Lighthouse Audit — /about')
    expect(md).toContain(GENERATED_AT)
  })

  it('includes full URL in header', () => {
    const page = makePage({ path: '/about' })
    const md = formatPage(page, SITE, GENERATED_AT)
    expect(md).toContain(`URL: ${SITE}/about`)
  })

  it('includes audit table content', () => {
    const page = makePage({
      path: '/about',
      audits: {
        performance: [{ id: 'render-blocking-resources', title: 'Eliminate render-blocking resources', score: 0.5, displayValue: '0.5 s' }],
        accessibility: [],
        bestPractices: [],
        seo: [],
        opportunities: [],
      },
    })
    const md = formatPage(page, SITE, GENERATED_AT)
    expect(md).toContain('Eliminate render-blocking resources')
    expect(md).toContain('0.5 s')
  })

  it('omits Route line when routeFile is null', () => {
    const page = makePage({ source: { routeFile: null } })
    const md = formatPage(page, SITE, GENERATED_AT)
    expect(md).not.toContain('**Route:**')
  })

  it('renders Route line when routeFile is set', () => {
    const page = makePage({ source: { routeFile: 'app/page.tsx' } })
    const md = formatPage(page, SITE, GENERATED_AT)
    expect(md).toContain('**Route:** `app/page.tsx`')
  })

  it('renders failing audits table', () => {
    const page = makePage({
      audits: {
        performance: [{ id: 'render-blocking-resources', title: 'Eliminate render-blocking resources', score: 0.5, displayValue: '0.5 s' }],
        accessibility: [],
        bestPractices: [],
        seo: [],
        opportunities: [],
      },
    })
    const md = formatPage(page, SITE, GENERATED_AT)
    expect(md).toContain('Eliminate render-blocking resources')
    expect(md).toContain('0.5 s')
  })

  it('renders audit elements with selectors', () => {
    const page = makePage({
      audits: {
        performance: [],
        accessibility: [
          {
            id: 'color-contrast',
            title: 'Background and foreground colors do not have a sufficient contrast ratio.',
            score: 0,
            displayValue: '2 elements',
            elements: [{ selector: 'p.muted', snippet: '<p class="muted">Hello</p>' }],
          },
        ],
        bestPractices: [],
        seo: [],
        opportunities: [],
      },
    })
    const md = formatPage(page, SITE, GENERATED_AT)
    expect(md).toContain('`p.muted`')
    expect(md).toContain('<p class="muted">Hello</p>')
  })

  it('includes field data section when present', () => {
    const page = makePage({
      fieldData: {
        lcp: { p75: 2800, category: 'AVERAGE' },
        cls: { p75: 5, category: 'FAST' },
        inp: { p75: 150, category: 'FAST' },
        fcp: { p75: 1600, category: 'FAST' },
        overall: 'AVERAGE',
      },
    })
    const md = formatPage(page, SITE, GENERATED_AT)
    expect(md).toContain('Field Data — Real Users')
    expect(md).toContain('2.8s')
    expect(md).toContain('AVERAGE ⚠')
    expect(md).toContain('FAST ✓')
  })

  it('shows origin-level note when isOriginLevel is true', () => {
    const page = makePage({
      fieldData: {
        lcp: { p75: 2000, category: 'FAST' },
        overall: 'FAST',
        isOriginLevel: true,
      },
    })
    const md = formatPage(page, SITE, GENERATED_AT)
    expect(md).toContain('origin-level')
  })
})

describe('needsAttention', () => {
  it('returns true when any lab score is below 90', () => {
    const page = makePage({ scores: { performance: 0.89, accessibility: 1, bestPractices: 1, seo: 1 } })
    expect(needsAttention(page)).toBe(true)
  })

  it('returns true when any audit score is below 0.9', () => {
    const page = makePage({
      audits: {
        performance: [{ id: 'render-blocking-resources', title: 'Eliminate render-blocking resources', score: 0.5, displayValue: '0.5 s' }],
        accessibility: [],
        bestPractices: [],
        seo: [],
        opportunities: [],
      },
    })
    expect(needsAttention(page)).toBe(true)
  })

  it('returns true when fieldData.overall is SLOW', () => {
    const page = makePage({ fieldData: { overall: 'SLOW' } as FieldData })
    expect(needsAttention(page)).toBe(true)
  })

  it('returns true when fieldData.overall is AVERAGE', () => {
    const page = makePage({ fieldData: { overall: 'AVERAGE' } as FieldData })
    expect(needsAttention(page)).toBe(true)
  })

  it('returns false when all lab scores are >= 90, all audits are >= 0.9, and there is no field data', () => {
    const page = makePage()
    expect(needsAttention(page)).toBe(false)
  })

  it('returns false when page.error is set', () => {
    const page = makePage({ error: 'Full Lighthouse report not found' })
    expect(needsAttention(page)).toBe(false)
  })

  it('returns true for AVERAGE field data even with perfect lab scores', () => {
    const page = makePage({
      fieldData: {
        lcp: { p75: 2800, category: 'AVERAGE' },
        cls: { p75: 5, category: 'FAST' },
        inp: { p75: 150, category: 'FAST' },
        fcp: { p75: 1600, category: 'FAST' },
        overall: 'AVERAGE',
      },
    })
    expect(needsAttention(page)).toBe(true)
  })
})

describe('pathToFile', () => {
  it('maps root path to pages/index.md', () => {
    expect(pathToFile('/')).toBe('pages/index.md')
  })

  it('maps a single-segment path to pages/<segment>.md', () => {
    expect(pathToFile('/contact')).toBe('pages/contact.md')
  })

  it('encodes nested path separators', () => {
    expect(pathToFile('/blog/slug')).toBe('pages/blog%2Fslug.md')
  })

  it('truncates a long slug to fit 252 bytes before encoding', () => {
    const longSlug = 'a'.repeat(300)
    const result = pathToFile(`/${longSlug}`)
    const encodedName = result.replace(/^pages\//, '').replace(/\.md$/, '')
    const decoded = decodeURIComponent(encodedName)
    expect(new TextEncoder().encode(decoded).length).toBeLessThanOrEqual(252)
  })

  it('encodes multi-byte UTF-8 paths without mid-character truncation', () => {
    expect(pathToFile('/café')).toBe('pages/caf%C3%A9.md')
    expect(pathToFile('/日本語')).toBe('pages/%E6%97%A5%E6%9C%AC%E8%AA%9E.md')
  })

  it('does not split a multi-byte character when truncation is required', () => {
    // Each Japanese character is 3 bytes; create a path longer than 252 bytes.
    const longUnicode = '日'.repeat(100)
    const result = pathToFile(`/${longUnicode}`)
    const encodedName = result.replace(/^pages\//, '').replace(/\.md$/, '')
    const decoded = decodeURIComponent(encodedName)
    const bytes = new TextEncoder().encode(decoded)
    expect(bytes.length).toBeLessThanOrEqual(252)
    // Should be a whole number of characters (multiple of 3 bytes).
    expect(bytes.length % 3).toBe(0)
  })
})

describe('computeDivergences', () => {
  function makeAudits(score: number) {
    return {
      performance: [{ id: 'render-blocking-resources', title: 'Eliminate render-blocking resources', score, displayValue: '' }],
      accessibility: [],
      bestPractices: [],
      seo: [],
      opportunities: [],
    }
  }

  it('returns an empty array for a single page', () => {
    const pages = [makePage({ audits: makeAudits(0.5) })]
    expect(computeDivergences(pages)).toEqual([])
  })

  it('returns an empty array when two pages share the same audit score', () => {
    const pages = [
      makePage({ path: '/a', audits: makeAudits(0.8) }),
      makePage({ path: '/b', audits: makeAudits(0.8) }),
    ]
    expect(computeDivergences(pages)).toEqual([])
  })

  it('excludes audits whose spread is below 0.2', () => {
    const pages = [
      makePage({ path: '/a', audits: makeAudits(0.8) }),
      makePage({ path: '/b', audits: makeAudits(0.95) }),
    ]
    expect(computeDivergences(pages)).toEqual([])
  })

  it('includes audits whose spread is exactly 0.2', () => {
    const pages = [
      makePage({ path: '/a', audits: makeAudits(0.6) }),
      makePage({ path: '/b', audits: makeAudits(0.8) }),
    ]
    const result = computeDivergences(pages)
    expect(result).toHaveLength(1)
    expect(result[0].spread).toBe(20)
    expect(result[0].lowScore).toBe(60)
    expect(result[0].highScore).toBe(80)
  })

  it('excludes audits whose spread is 0.19', () => {
    const pages = [
      makePage({ path: '/a', audits: makeAudits(0.8) }),
      makePage({ path: '/b', audits: makeAudits(0.99) }),
    ]
    expect(computeDivergences(pages)).toEqual([])
  })

  it('returns a divergence with integer lowScore, highScore, and spread', () => {
    const pages = [
      makePage({ path: '/a', audits: makeAudits(0.5) }),
      makePage({ path: '/b', audits: makeAudits(1.0) }),
    ]
    const result = computeDivergences(pages)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: 'Eliminate render-blocking resources',
      lowScore: 50,
      lowPage: '/a',
      highScore: 100,
      highPage: '/b',
      spread: 50,
    })
  })

  it('rounds spread to the nearest integer', () => {
    const pages = [
      makePage({ path: '/a', audits: makeAudits(0.33) }),
      makePage({ path: '/b', audits: makeAudits(0.67) }),
    ]
    const result = computeDivergences(pages)
    expect(result[0].spread).toBe(34)
  })

  it('excludes errored pages from computation', () => {
    const pages = [
      makePage({ path: '/a', audits: makeAudits(0.5) }),
      makePage({ path: '/b', error: 'Failed' }),
      makePage({ path: '/c', audits: makeAudits(1.0) }),
    ]
    const result = computeDivergences(pages)
    expect(result).toHaveLength(1)
    expect(result[0].lowPage).toBe('/a')
    expect(result[0].highPage).toBe('/c')
  })

  it('sorts results by spread descending', () => {
    function makePageWithAudit(path: string, id: string, score: number): PageResult {
      return makePage({
        path,
        audits: {
          performance: [{ id, title: `Audit ${id}`, score, displayValue: '' }],
          accessibility: [],
          bestPractices: [],
          seo: [],
          opportunities: [],
        },
      })
    }

    const pages = [
      makePageWithAudit('/a', 'audit-a', 0.5),
      makePageWithAudit('/b', 'audit-a', 1.0),
      makePageWithAudit('/c', 'audit-b', 0.6),
      makePageWithAudit('/d', 'audit-b', 0.8),
    ]
    const result = computeDivergences(pages)
    expect(result.map((d: Divergence) => d.spread)).toEqual([50, 20])
  })
})
