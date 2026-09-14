import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchPSIForPages } from './psi.js'

function psiResponse(metrics: object) {
  return new Response(
    JSON.stringify({
      loadingExperience: { metrics },
    }),
    { status: 200 }
  )
}

describe('fetchPSIForPages', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fetches field data for every path and returns a map', async () => {
    // Move the sliding window forward on every acquire so the rate limiter never blocks.
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => {
      now += 1000
      return now
    })

    fetchMock.mockImplementation(() =>
      psiResponse({
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2000, category: 'FAST' },
        CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5, category: 'FAST' },
        INTERACTION_TO_NEXT_PAINT: { percentile: 150, category: 'FAST' },
        FIRST_CONTENTFUL_PAINT_MS: { percentile: 1600, category: 'FAST' },
      })
    )

    const results = await fetchPSIForPages(
      'https://example.com',
      ['/', '/about', '/contact'],
      'API_KEY',
      3
    )

    expect(results.size).toBe(3)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const about = results.get('/about')
    expect(about).toBeDefined()
    expect(about!.lcp).toEqual({ p75: 2000, category: 'FAST' })
    expect(about!.cls).toEqual({ p75: 5, category: 'FAST' })
    expect(about!.inp).toEqual({ p75: 150, category: 'FAST' })
    expect(about!.fcp).toEqual({ p75: 1600, category: 'FAST' })
  })

  it('builds full URLs relative to the site and passes the API key', async () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => {
      now += 1000
      return now
    })

    fetchMock.mockImplementation(() =>
      psiResponse({
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 1000, category: 'FAST' },
      })
    )

    await fetchPSIForPages('https://example.com', ['/about', '/blog/post'], 'API_KEY')

    const urls = fetchMock.mock.calls.map((call) => new URL(call[0] as string))
    expect(urls.map((u) => u.searchParams.get('url'))).toEqual([
      'https://example.com/about',
      'https://example.com/blog/post',
    ])
    expect(urls.every((u) => u.searchParams.get('key') === 'API_KEY')).toBe(true)
    expect(urls.every((u) => u.searchParams.get('strategy') === 'mobile')).toBe(true)
  })

  it('uses the root site URL for the / path', async () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => {
      now += 1000
      return now
    })

    fetchMock.mockResolvedValue(
      psiResponse({
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 1000, category: 'FAST' },
      })
    )

    await fetchPSIForPages('https://example.com', ['/'], 'API_KEY')

    const url = new URL(fetchMock.mock.calls[0][0] as string)
    expect(url.searchParams.get('url')).toBe('https://example.com/')
  })

  it('falls back to origin-level field data when URL-level data is missing', async () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => {
      now += 1000
      return now
    })

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          originLoadingExperience: {
            metrics: {
              LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3000, category: 'AVERAGE' },
            },
            overall_category: 'AVERAGE',
          },
        }),
        { status: 200 }
      )
    )

    const results = await fetchPSIForPages('https://example.com', ['/low-traffic'], 'API_KEY')

    expect(results.size).toBe(1)
    expect(results.get('/low-traffic')).toMatchObject({
      lcp: { p75: 3000, category: 'AVERAGE' },
      overall: 'AVERAGE',
      isOriginLevel: true,
    })
  })

  it('skips pages that return a PSI error', async () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => {
      now += 1000
      return now
    })

    fetchMock
      .mockResolvedValueOnce(
        psiResponse({
          LARGEST_CONTENTFUL_PAINT_MS: { percentile: 1000, category: 'FAST' },
        })
      )
      .mockResolvedValueOnce(new Response('Rate limit exceeded', { status: 429 }))

    const results = await fetchPSIForPages(
      'https://example.com',
      ['/good', '/bad'],
      'API_KEY'
    )

    expect(results.size).toBe(1)
    expect(results.has('/good')).toBe(true)
    expect(results.has('/bad')).toBe(false)
  })

  describe('rate limiting', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('allows at most 2 requests per second', async () => {
      type Deferred = { resolve: () => void; promise: Promise<void> }
      const deferreds: Deferred[] = []

      fetchMock.mockImplementation(() => {
        let resolve = () => {}
        const promise = new Promise<void>((r) => {
          resolve = r
        })
        deferreds.push({ resolve, promise })
        return promise.then(() =>
          psiResponse({
            LARGEST_CONTENTFUL_PAINT_MS: { percentile: 1000, category: 'FAST' },
          })
        )
      })

      vi.setSystemTime(0)
      const runPromise = fetchPSIForPages(
        'https://example.com',
        ['/1', '/2', '/3', '/4'],
        'API_KEY',
        10
      )

      // Flush microtasks so the first two workers acquire the limiter and call fetch.
      await Promise.resolve()
      expect(deferreds.length).toBe(2)

      // Advance past the 1-second window so the next batch can start.
      await vi.advanceTimersByTimeAsync(1010)
      expect(deferreds.length).toBe(4)

      deferreds.forEach((d) => d.resolve())
      await runPromise

      expect(fetchMock).toHaveBeenCalledTimes(4)
    })
  })
})
