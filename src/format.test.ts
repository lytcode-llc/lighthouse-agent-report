import { describe, it, expect } from 'vitest'
import { formatReport } from './format.js'
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

describe('formatReport', () => {
  it('includes site and page count in header', () => {
    const md = formatReport([makePage()], SITE, GENERATED_AT)
    expect(md).toContain(SITE)
    expect(md).toContain('Pages: 1')
  })

  it('includes summary table and all-pages section', () => {
    const md = formatReport([makePage()], SITE, GENERATED_AT)
    expect(md).toContain('## Summary Table')
    expect(md).toContain('## All Pages (Full Detail)')
  })

  it('flags lab scores below 90 with ⚠', () => {
    const page = makePage({ scores: { performance: 0.5, accessibility: 1, bestPractices: 1, seo: 1 } })
    const md = formatReport([page], SITE, GENERATED_AT)
    expect(md).toContain('**50** ⚠')
  })

  it('does not flag scores at or above 90', () => {
    const page = makePage({ scores: { performance: 0.9, accessibility: 1, bestPractices: 1, seo: 1 } })
    const md = formatReport([page], SITE, GENERATED_AT)
    expect(md).not.toContain('**90** ⚠')
    expect(md).toContain('90')
  })

  it('shows error pages in summary table', () => {
    const page = makePage({ error: 'Full Lighthouse report not found' })
    const md = formatReport([page], SITE, GENERATED_AT)
    expect(md).toContain('❌ Error')
  })

  it('puts pages with failing scores in Pages Requiring Attention', () => {
    const failing = makePage({
      path: '/slow',
      scores: { performance: 0.4, accessibility: 1, bestPractices: 1, seo: 1 },
    })
    const passing = makePage({ path: '/fast' })
    const md = formatReport([failing, passing], SITE, GENERATED_AT)
    const attentionSection = md.split('## Pages Requiring Attention')[1].split('## All Pages')[0]
    expect(attentionSection).toContain('/slow')
    expect(attentionSection).not.toContain('/fast')
  })

  it('shows "All pages passed" when nothing needs attention', () => {
    const md = formatReport([makePage()], SITE, GENERATED_AT)
    expect(md).toContain('_All pages passed lab thresholds')
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
    const md = formatReport([page], SITE, GENERATED_AT)
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
    const md = formatReport([page], SITE, GENERATED_AT)
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
    const md = formatReport([page], SITE, GENERATED_AT)
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
    const md = formatReport([page], SITE, GENERATED_AT)
    expect(md).toContain('origin-level')
  })

  it('shows field CWV column in summary when any page has field data', () => {
    const withFd = makePage({ path: '/a', fieldData: { overall: 'FAST' } })
    const withoutFd = makePage({ path: '/b' })
    const md = formatReport([withFd, withoutFd], SITE, GENERATED_AT)
    expect(md).toContain('Field CWV')
  })

  it('handles multiple pages', () => {
    const pages = [makePage({ path: '/' }), makePage({ path: '/about' }), makePage({ path: '/contact' })]
    const md = formatReport(pages, SITE, GENERATED_AT)
    expect(md).toContain('Pages: 3')
    expect(md).toContain('`/about`')
    expect(md).toContain('`/contact`')
  })
})
