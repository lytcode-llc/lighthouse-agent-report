import { describe, it, expect } from 'vitest'
import { formatIndex, formatPage } from './format.js'
import type { PageResult } from './types.js'

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

describe('formatIndex', () => {
  it('includes site and page count in header', () => {
    const md = formatIndex([makePage()], SITE, GENERATED_AT)
    expect(md).toContain(SITE)
    expect(md).toContain('Pages: 1')
  })

  it('includes summary table; omits divergence section for single page', () => {
    const md = formatIndex([makePage()], SITE, GENERATED_AT)
    expect(md).toContain('## Summary Table')
    expect(md).not.toContain('## Cross-Page Audit Divergence')
  })

  it('flags lab scores below 90 with ⚠', () => {
    const page = makePage({ scores: { performance: 0.5, accessibility: 1, bestPractices: 1, seo: 1 } })
    const md = formatIndex([page], SITE, GENERATED_AT)
    expect(md).toContain('**50** ⚠')
  })

  it('does not flag scores at or above 90', () => {
    const page = makePage({ scores: { performance: 0.9, accessibility: 1, bestPractices: 1, seo: 1 } })
    const md = formatIndex([page], SITE, GENERATED_AT)
    expect(md).not.toContain('**90** ⚠')
    expect(md).toContain('90')
  })

  it('shows error pages in summary table', () => {
    const page = makePage({ error: 'Full Lighthouse report not found' })
    const md = formatIndex([page], SITE, GENERATED_AT)
    expect(md).toContain('❌ Error')
  })

  it('puts pages with failing scores in Pages Requiring Attention', () => {
    const failing = makePage({
      path: '/slow',
      scores: { performance: 0.4, accessibility: 1, bestPractices: 1, seo: 1 },
    })
    const passing = makePage({ path: '/fast' })
    const md = formatIndex([failing, passing], SITE, GENERATED_AT)
    const attentionSection = md.split('## Pages Requiring Attention')[1].split('\n---\n')[0]
    expect(attentionSection).toContain('/slow')
    expect(attentionSection).not.toContain('/fast')
  })

  it('shows "All pages passed" when nothing needs attention', () => {
    const md = formatIndex([makePage()], SITE, GENERATED_AT)
    expect(md).toContain('_All pages passed lab thresholds')
  })

  it('links page paths to individual page files in summary table', () => {
    const md = formatIndex([makePage({ path: '/contact' })], SITE, GENERATED_AT)
    expect(md).toContain('[`/contact`](pages/contact.md)')
  })

  it('links root path to pages/index.md', () => {
    const md = formatIndex([makePage({ path: '/' })], SITE, GENERATED_AT)
    expect(md).toContain('pages/index.md')
  })

  it('truncates slugs longer than the filesystem limit before encoding', () => {
    const longSlug = 'a'.repeat(300)
    const md = formatIndex([makePage({ path: `/${longSlug}` })], SITE, GENERATED_AT)
    const match = md.match(/pages\/([^)]+)\.md/)
    expect(match).not.toBeNull()
    // Encoded filename component must fit within 252 bytes (255 - len('.md'))
    expect(new TextEncoder().encode(match![1]).length).toBeLessThanOrEqual(252)
  })

  it('shows compact failing score inline in attention section', () => {
    const page = makePage({
      path: '/slow',
      scores: { performance: 0.42, accessibility: 1, bestPractices: 1, seo: 1 },
    })
    const md = formatIndex([page], SITE, GENERATED_AT)
    const attentionSection = md.split('## Pages Requiring Attention')[1].split('\n---\n')[0]
    expect(attentionSection).toContain('Performance: **42** ⚠')
  })


  it('shows field CWV column in summary when any page has field data', () => {
    const withFd = makePage({ path: '/a', fieldData: { overall: 'FAST' } })
    const withoutFd = makePage({ path: '/b' })
    const md = formatIndex([withFd, withoutFd], SITE, GENERATED_AT)
    expect(md).toContain('Field CWV')
  })

  it('handles multiple pages', () => {
    const pages = [makePage({ path: '/' }), makePage({ path: '/about' }), makePage({ path: '/contact' })]
    const md = formatIndex(pages, SITE, GENERATED_AT)
    expect(md).toContain('Pages: 3')
    expect(md).toContain('`/about`')
    expect(md).toContain('`/contact`')
  })

  it('shows Cross-Page Audit Divergence when spread >= 0.2 across 3 pages', () => {
    const auditId = 'render-blocking-resources'
    const auditTitle = 'Eliminate render-blocking resources'
    const pages = [
      makePage({
        path: '/',
        audits: {
          performance: [{ id: auditId, title: auditTitle, score: 0.9, displayValue: null }],
          accessibility: [], bestPractices: [], seo: [], opportunities: [],
        },
      }),
      makePage({
        path: '/slow',
        audits: {
          performance: [{ id: auditId, title: auditTitle, score: 0.4, displayValue: null }],
          accessibility: [], bestPractices: [], seo: [], opportunities: [],
        },
      }),
      makePage({
        path: '/medium',
        audits: {
          performance: [{ id: auditId, title: auditTitle, score: 0.7, displayValue: null }],
          accessibility: [], bestPractices: [], seo: [], opportunities: [],
        },
      }),
    ]
    const md = formatIndex(pages, SITE, GENERATED_AT)
    expect(md).toContain('## Cross-Page Audit Divergence')
    expect(md).toContain(auditTitle)
  })

  it('omits Cross-Page Audit Divergence when spread is below 0.2', () => {
    const auditId = 'render-blocking-resources'
    const auditTitle = 'Eliminate render-blocking resources'
    const pages = [
      makePage({
        path: '/',
        audits: {
          performance: [{ id: auditId, title: auditTitle, score: 0.9, displayValue: null }],
          accessibility: [], bestPractices: [], seo: [], opportunities: [],
        },
      }),
      makePage({
        path: '/near',
        audits: {
          performance: [{ id: auditId, title: auditTitle, score: 0.85, displayValue: null }],
          accessibility: [], bestPractices: [], seo: [], opportunities: [],
        },
      }),
    ]
    const md = formatIndex(pages, SITE, GENERATED_AT)
    expect(md).not.toContain('## Cross-Page Audit Divergence')
  })
})

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
