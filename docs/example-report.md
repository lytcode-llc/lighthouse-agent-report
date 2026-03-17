# Lighthouse Audit Report
Generated: 2026-03-10T14:22:00.000Z | Site: https://example.com | Pages: 4
Lab data: unlighthouse (desktop simulation) | Field data: PageSpeed Insights (real users, mobile)

## Summary Table

| Page | Performance | Accessibility | Best Practices | SEO | Field CWV |
|------|-------------|---------------|----------------|-----|-----------|
| `/` | 94 | 100 | 96 | 100 | FAST ✓ |
| `/about` | 100 | 100 | 100 | 100 | FAST ✓ |
| `/contact` | **78** ⚠ | **82** ⚠ | **88** ⚠ | 92 | AVERAGE ⚠ |
| `/blog/getting-started` | **61** ⚠ | 95 | 96 | 100 | — |

> Lab scores below 90 flagged with ⚠ | Field CWV: FAST ✓ AVERAGE ⚠ SLOW ✗

---

## Pages Requiring Attention

### `/`
**Route:** `app/page.tsx`
**Lab Scores:** Performance: 94 | Accessibility: 100 | Best Practices: 96 | SEO: 100
**Field CWV:** FAST ✓

#### Field Data — Real Users, Mobile P75
| Metric | P75 | Rating |
|--------|-----|--------|
| LCP (Largest Contentful Paint) | 2.1s | FAST ✓ |
| CLS (Cumulative Layout Shift)   | 0.034 | FAST ✓ |
| INP (Interaction to Next Paint)  | 140ms | FAST ✓ |
| FCP (First Contentful Paint)    | 1.3s | FAST ✓ |

#### Performance
| Audit | Score | Value |
|-------|-------|-------|
| First Contentful Paint | ✓ 97 | 0.9 s |
| Largest Contentful Paint | ✓ 91 | 2.1 s |
| Total Blocking Time | ✓ 100 | 0 ms |
| Cumulative Layout Shift | ✓ 100 | 0 |
| Speed Index | ✓ 97 | 0.9 s |

#### Accessibility
| Audit | Score | Value |
|-------|-------|-------|
| `[aria-hidden="true"]` is not present on the document `<body>` | ✓ 100 | — |
| `[aria-hidden="true"]` elements do not contain focusable descendents | ✓ 100 | — |
| Buttons have an accessible name | ✓ 100 | — |
| Background and foreground colors have a sufficient contrast ratio | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| Heading elements appear in a sequentially-descending order | ✓ 100 | — |
| `<html>` element has a `[lang]` attribute | ✓ 100 | — |
| `<html>` element has a valid value for its `[lang]` attribute | ✓ 100 | — |
| Links have a discernible name | ✓ 100 | — |
| `[user-scalable="no"]` is not used in the `<meta name="viewport">` element | ✓ 100 | — |
| Touch targets have sufficient size and spacing. | ✓ 100 | — |
| Page has a main landmark | ✓ 100 | — |

#### Best Practices
| Audit | Score | Value |
|-------|-------|-------|
| Uses HTTPS | ✓ 100 | — |
| Avoids requesting the geolocation permission on page load | ✓ 100 | — |
| Avoids requesting the notification permission on page load | ✓ 100 | — |
| Allows users to paste into input fields | ✓ 100 | — |
| Page has the HTML doctype | ✓ 100 | — |
| Properly defines charset | ✓ 100 | — |
| Avoids deprecated APIs | ✓ 100 | — |
| No browser errors logged to the console | ✓ 100 | — |
| No issues in the `Issues` panel in Chrome Devtools | ✓ 100 | — |
| Avoids third-party cookies | ⚠ 0 | — |

> Third-party cookies may be blocked in future browser versions. [Learn how to use cookie partitioning.](https://developer.chrome.com/docs/privacy-sandbox/third-party-cookie-phaseout)

#### SEO
| Audit | Score | Value |
|-------|-------|-------|
| Page isn't blocked from indexing | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| Document has a meta description | ✓ 100 | — |
| Page has successful HTTP status code | ✓ 100 | — |
| Links have descriptive text | ✓ 100 | — |
| Links are crawlable | ✓ 100 | — |
| Document has a valid `hreflang` | ✓ 100 | — |

#### Opportunities & Diagnostics
| Audit | Score | Value |
|-------|-------|-------|
| Use efficient cache lifetimes | ✓ 100 | — |
| Improve image delivery | ✓ 100 | — |
| Minify JavaScript | ✓ 100 | — |
| Reduce unused JavaScript | ⚠ 0 | Est savings of 42 KiB |
| Reduce unused CSS | ✓ 100 | — |
| Avoids enormous network payloads | ✓ 100 | Total size was 310 KiB |
| Minimizes main-thread work | ✓ 100 | 0.3 s |
| JavaScript execution time | ✓ 100 | 0.1 s |
| Time to Interactive | ✓ 100 | 0.9 s |
| Initial server response time was short | ✓ 100 | Root document took 80 ms |
| Network Round Trip Times | ✓ 100 | 4 ms |
| Page prevented back/forward cache restoration | ⚠ 0 | 1 failure reason |

> Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. [Learn how to reduce unused JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript/).

> Many navigations are performed by going back to a previous page, or forwards again. The back/forward cache (bfcache) can speed up these return navigations. [Learn more about the bfcache](https://developer.chrome.com/docs/lighthouse/performance/bf-cache/)

### `/contact`
**Route:** `app/contact/page.tsx`
**Lab Scores:** Performance: 78 | Accessibility: 82 | Best Practices: 88 | SEO: 92
**Field CWV:** AVERAGE ⚠

#### Field Data — Real Users, Mobile P75
| Metric | P75 | Rating |
|--------|-----|--------|
| LCP (Largest Contentful Paint) | 3.1s | AVERAGE ⚠ |
| CLS (Cumulative Layout Shift)   | 0.041 | FAST ✓ |
| INP (Interaction to Next Paint)  | 180ms | FAST ✓ |
| FCP (First Contentful Paint)    | 1.9s | AVERAGE ⚠ |

#### Performance
| Audit | Score | Value |
|-------|-------|-------|
| First Contentful Paint | ⚠ 64 | 2.6 s |
| Largest Contentful Paint | ⚠ 42 | 4.8 s |
| Total Blocking Time | ⚠ 72 | 190 ms |
| Cumulative Layout Shift | ✓ 100 | 0 |
| Speed Index | ⚠ 70 | 3.8 s |

> First Contentful Paint marks the time at which the first text or image is painted. [Learn more about the First Contentful Paint metric](https://developer.chrome.com/docs/lighthouse/performance/first-contentful-paint/).

- `main > section > img.hero`
  `<img class="hero" src="/hero.jpg" loading="lazy">`
> [Optimize LCP](https://developer.chrome.com/docs/performance/insights/lcp-discovery) by making the LCP image discoverable from the HTML immediately, and avoiding lazy-loading

#### Accessibility
| Audit | Score | Value |
|-------|-------|-------|
| `[aria-hidden="true"]` is not present on the document `<body>` | ✓ 100 | — |
| Buttons have an accessible name | ✓ 100 | — |
| Background and foreground colors have a sufficient contrast ratio | ⚠ 0 | 3 elements |
| Document has a `<title>` element | ✓ 100 | — |
| `<html>` element has a `[lang]` attribute | ✓ 100 | — |
| Links have a discernible name | ✓ 100 | — |
| Form elements have associated labels | ⚠ 0 | 2 elements |
| Page has a main landmark | ✓ 100 | — |

- `form > input.email-field`
  `<input type="email" placeholder="Your email">`
  Fix any of the following:
  Form element does not have an implicit (wrapped) `<label>`
  Form element does not have an explicit `<label>`
  aria-label attribute does not exist or is empty
> Ensures every form element has a label. [Learn more about form element labels](https://dequeuniversity.com/rules/axe/4.11/label).

- `p.subtitle`
  `<p class="subtitle">Send us a message</p>`
  Element has insufficient color contrast of 2.8:1 (foreground color: #999999, background color: #ffffff, required: 4.5:1, font size: 14.0pt)
> Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds. [Learn how to provide sufficient color contrast](https://dequeuniversity.com/rules/axe/4.11/color-contrast).

#### Best Practices
| Audit | Score | Value |
|-------|-------|-------|
| Uses HTTPS | ✓ 100 | — |
| Page has the HTML doctype | ✓ 100 | — |
| Properly defines charset | ✓ 100 | — |
| No browser errors logged to the console | ⚠ 0 | 1 error |
| Avoids third-party cookies | ⚠ 0 | — |
| No issues in the `Issues` panel in Chrome Devtools | ✓ 100 | — |

> Errors logged to the console indicate unresolved problems. They can come from network request failures and other browser concerns. [Learn more about this errors in console diagnostic audit](https://developer.chrome.com/docs/lighthouse/best-practices/errors-in-console).

#### SEO
| Audit | Score | Value |
|-------|-------|-------|
| Page isn't blocked from indexing | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| Document has a meta description | ✓ 100 | — |
| Page has successful HTTP status code | ✓ 100 | — |
| Links do not have descriptive text | ⚠ 0 | 2 links found |
| Links are crawlable | ✓ 100 | — |

> Descriptive link text helps search engines understand your content. [Learn how to make links more accessible](https://developer.chrome.com/docs/lighthouse/seo/link-text/).

#### Opportunities & Diagnostics
| Audit | Score | Value |
|-------|-------|-------|
| Defer offscreen images | ⚠ 0 | Est savings of 180 KiB |
| Improve image delivery | ⚠ 0 | Est savings of 95 KiB |
| Reduce unused JavaScript | ⚠ 0 | Est savings of 118 KiB |
| Minify JavaScript | ✓ 100 | — |
| Reduce unused CSS | ⚠ 0 | Est savings of 28 KiB |
| Avoids enormous network payloads | ⚠ 0 | Total size was 2,840 KiB |
| Minimizes main-thread work | ⚠ 72 | 2.3 s |
| JavaScript execution time | ✓ 100 | 0.4 s |
| Time to Interactive | ⚠ 61 | 5.2 s |
| Initial server response time was short | ✓ 100 | Root document took 120 ms |
| Network Round Trip Times | ✓ 100 | 4 ms |
| Page prevented back/forward cache restoration | ⚠ 0 | 1 failure reason |

> Images that are not visible in the viewport should be deferred. [Learn how to defer offscreen images](https://developer.chrome.com/docs/lighthouse/performance/uses-responsive-images/).

> Serve images in next-gen formats. Image formats like WebP and AVIF often provide better compression than PNG or JPEG. [Learn more about next-gen image formats](https://developer.chrome.com/docs/lighthouse/performance/uses-webp-images/).

> Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. [Learn how to reduce unused JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript/).

### `/blog/getting-started`
**Route:** `app/blog/[slug]/page.tsx`
**Lab Scores:** Performance: 61 | Accessibility: 95 | Best Practices: 96 | SEO: 100

#### Performance
| Audit | Score | Value |
|-------|-------|-------|
| First Contentful Paint | ⚠ 49 | 3.4 s |
| Largest Contentful Paint | ⚠ 31 | 5.9 s |
| Total Blocking Time | ✓ 95 | 40 ms |
| Cumulative Layout Shift | ✓ 100 | 0 |
| Speed Index | ⚠ 48 | 5.2 s |

> First Contentful Paint marks the time at which the first text or image is painted. [Learn more about the First Contentful Paint metric](https://developer.chrome.com/docs/lighthouse/performance/first-contentful-paint/).

- `article > img.cover`
  `<img class="cover" src="/blog/cover.png">`
> [Optimize LCP](https://developer.chrome.com/docs/performance/insights/lcp-discovery) by making the LCP image discoverable from the HTML immediately, and avoiding lazy-loading

#### Accessibility
| Audit | Score | Value |
|-------|-------|-------|
| `[aria-hidden="true"]` is not present on the document `<body>` | ✓ 100 | — |
| Buttons have an accessible name | ✓ 100 | — |
| Background and foreground colors have a sufficient contrast ratio | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| `<html>` element has a `[lang]` attribute | ✓ 100 | — |
| Links have a discernible name | ✓ 100 | — |
| Page has a main landmark | ✓ 100 | — |
| Heading elements appear in a sequentially-descending order | ⚠ 0 | 1 element |

- `article > h4.callout-title`
  `<h4 class="callout-title">Note</h4>`
  Fix any of the following:
  Heading order invalid (h2 → h4, skipped h3)
> Ensure that headings appear in a sequentially-descending order. [Learn more about heading order](https://dequeuniversity.com/rules/axe/4.11/heading-order).

#### Best Practices
| Audit | Score | Value |
|-------|-------|-------|
| Uses HTTPS | ✓ 100 | — |
| Page has the HTML doctype | ✓ 100 | — |
| Avoids deprecated APIs | ✓ 100 | — |
| No browser errors logged to the console | ✓ 100 | — |
| Avoids third-party cookies | ⚠ 0 | — |

#### SEO
| Audit | Score | Value |
|-------|-------|-------|
| Page isn't blocked from indexing | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| Document has a meta description | ✓ 100 | — |
| Page has successful HTTP status code | ✓ 100 | — |
| Links have descriptive text | ✓ 100 | — |
| Links are crawlable | ✓ 100 | — |
| Document has a valid `hreflang` | ✓ 100 | — |

#### Opportunities & Diagnostics
| Audit | Score | Value |
|-------|-------|-------|
| Improve image delivery | ⚠ 0 | Est savings of 620 KiB |
| Reduce unused JavaScript | ⚠ 0 | Est savings of 89 KiB |
| Reduce unused CSS | ✓ 100 | — |
| Avoids enormous network payloads | ⚠ 0 | Total size was 3,100 KiB |
| Minimizes main-thread work | ✓ 91 | 1.1 s |
| Time to Interactive | ⚠ 61 | 5.1 s |
| Initial server response time was short | ✓ 100 | Root document took 95 ms |

> Serve images in next-gen formats. Image formats like WebP and AVIF often provide better compression than PNG or JPEG. [Learn more about next-gen image formats](https://developer.chrome.com/docs/lighthouse/performance/uses-webp-images/).

> Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. [Learn how to reduce unused JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript/).

---

## All Pages (Full Detail)

### `/`
**Route:** `app/page.tsx`
**Lab Scores:** Performance: 94 | Accessibility: 100 | Best Practices: 96 | SEO: 100
**Field CWV:** FAST ✓

#### Field Data — Real Users, Mobile P75
| Metric | P75 | Rating |
|--------|-----|--------|
| LCP (Largest Contentful Paint) | 2.1s | FAST ✓ |
| CLS (Cumulative Layout Shift)   | 0.034 | FAST ✓ |
| INP (Interaction to Next Paint)  | 140ms | FAST ✓ |
| FCP (First Contentful Paint)    | 1.3s | FAST ✓ |

#### Performance
| Audit | Score | Value |
|-------|-------|-------|
| First Contentful Paint | ✓ 97 | 0.9 s |
| Largest Contentful Paint | ✓ 91 | 2.1 s |
| Total Blocking Time | ✓ 100 | 0 ms |
| Cumulative Layout Shift | ✓ 100 | 0 |
| Speed Index | ✓ 97 | 0.9 s |

#### Accessibility
| Audit | Score | Value |
|-------|-------|-------|
| `[aria-hidden="true"]` is not present on the document `<body>` | ✓ 100 | — |
| `[aria-hidden="true"]` elements do not contain focusable descendents | ✓ 100 | — |
| Buttons have an accessible name | ✓ 100 | — |
| Background and foreground colors have a sufficient contrast ratio | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| Heading elements appear in a sequentially-descending order | ✓ 100 | — |
| `<html>` element has a `[lang]` attribute | ✓ 100 | — |
| `<html>` element has a valid value for its `[lang]` attribute | ✓ 100 | — |
| Links have a discernible name | ✓ 100 | — |
| `[user-scalable="no"]` is not used in the `<meta name="viewport">` element | ✓ 100 | — |
| Touch targets have sufficient size and spacing. | ✓ 100 | — |
| Page has a main landmark | ✓ 100 | — |

#### Best Practices
| Audit | Score | Value |
|-------|-------|-------|
| Uses HTTPS | ✓ 100 | — |
| Avoids requesting the geolocation permission on page load | ✓ 100 | — |
| Avoids requesting the notification permission on page load | ✓ 100 | — |
| Allows users to paste into input fields | ✓ 100 | — |
| Page has the HTML doctype | ✓ 100 | — |
| Properly defines charset | ✓ 100 | — |
| Avoids deprecated APIs | ✓ 100 | — |
| No browser errors logged to the console | ✓ 100 | — |
| No issues in the `Issues` panel in Chrome Devtools | ✓ 100 | — |
| Avoids third-party cookies | ⚠ 0 | — |

> Third-party cookies may be blocked in future browser versions. [Learn how to use cookie partitioning.](https://developer.chrome.com/docs/privacy-sandbox/third-party-cookie-phaseout)

#### SEO
| Audit | Score | Value |
|-------|-------|-------|
| Page isn't blocked from indexing | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| Document has a meta description | ✓ 100 | — |
| Page has successful HTTP status code | ✓ 100 | — |
| Links have descriptive text | ✓ 100 | — |
| Links are crawlable | ✓ 100 | — |
| Document has a valid `hreflang` | ✓ 100 | — |

#### Opportunities & Diagnostics
| Audit | Score | Value |
|-------|-------|-------|
| Use efficient cache lifetimes | ✓ 100 | — |
| Improve image delivery | ✓ 100 | — |
| Minify JavaScript | ✓ 100 | — |
| Reduce unused JavaScript | ⚠ 0 | Est savings of 42 KiB |
| Reduce unused CSS | ✓ 100 | — |
| Avoids enormous network payloads | ✓ 100 | Total size was 310 KiB |
| Minimizes main-thread work | ✓ 100 | 0.3 s |
| JavaScript execution time | ✓ 100 | 0.1 s |
| Time to Interactive | ✓ 100 | 0.9 s |
| Initial server response time was short | ✓ 100 | Root document took 80 ms |
| Network Round Trip Times | ✓ 100 | 4 ms |
| Page prevented back/forward cache restoration | ⚠ 0 | 1 failure reason |

> Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. [Learn how to reduce unused JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript/).

> Many navigations are performed by going back to a previous page, or forwards again. The back/forward cache (bfcache) can speed up these return navigations. [Learn more about the bfcache](https://developer.chrome.com/docs/lighthouse/performance/bf-cache/)

### `/about`
**Route:** `app/about/page.tsx`
**Lab Scores:** Performance: 100 | Accessibility: 100 | Best Practices: 100 | SEO: 100
**Field CWV:** FAST ✓

#### Field Data — Real Users, Mobile P75
| Metric | P75 | Rating |
|--------|-----|--------|
| LCP (Largest Contentful Paint) | 1.8s | FAST ✓ |
| CLS (Cumulative Layout Shift)   | 0.012 | FAST ✓ |
| INP (Interaction to Next Paint)  | 110ms | FAST ✓ |
| FCP (First Contentful Paint)    | 1.1s | FAST ✓ |

#### Performance
| Audit | Score | Value |
|-------|-------|-------|
| First Contentful Paint | ✓ 100 | 0.6 s |
| Largest Contentful Paint | ✓ 100 | 1.1 s |
| Total Blocking Time | ✓ 100 | 0 ms |
| Cumulative Layout Shift | ✓ 100 | 0 |
| Speed Index | ✓ 100 | 0.6 s |

#### Accessibility
| Audit | Score | Value |
|-------|-------|-------|
| `[aria-hidden="true"]` is not present on the document `<body>` | ✓ 100 | — |
| Buttons have an accessible name | ✓ 100 | — |
| Background and foreground colors have a sufficient contrast ratio | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| Heading elements appear in a sequentially-descending order | ✓ 100 | — |
| `<html>` element has a `[lang]` attribute | ✓ 100 | — |
| Links have a discernible name | ✓ 100 | — |
| Page has a main landmark | ✓ 100 | — |
| Touch targets have sufficient size and spacing. | ✓ 100 | — |

#### Best Practices
| Audit | Score | Value |
|-------|-------|-------|
| Uses HTTPS | ✓ 100 | — |
| Avoids requesting the geolocation permission on page load | ✓ 100 | — |
| Avoids requesting the notification permission on page load | ✓ 100 | — |
| Page has the HTML doctype | ✓ 100 | — |
| Properly defines charset | ✓ 100 | — |
| Avoids deprecated APIs | ✓ 100 | — |
| No browser errors logged to the console | ✓ 100 | — |
| Avoids third-party cookies | ✓ 100 | — |
| No issues in the `Issues` panel in Chrome Devtools | ✓ 100 | — |

#### SEO
| Audit | Score | Value |
|-------|-------|-------|
| Page isn't blocked from indexing | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| Document has a meta description | ✓ 100 | — |
| Page has successful HTTP status code | ✓ 100 | — |
| Links have descriptive text | ✓ 100 | — |
| Links are crawlable | ✓ 100 | — |
| Document has a valid `hreflang` | ✓ 100 | — |

#### Opportunities & Diagnostics
| Audit | Score | Value |
|-------|-------|-------|
| Use efficient cache lifetimes | ✓ 100 | — |
| Improve image delivery | ✓ 100 | — |
| Minify JavaScript | ✓ 100 | — |
| Reduce unused JavaScript | ✓ 100 | — |
| Reduce unused CSS | ✓ 100 | — |
| Avoids enormous network payloads | ✓ 100 | Total size was 180 KiB |
| Minimizes main-thread work | ✓ 100 | 0.2 s |
| Time to Interactive | ✓ 100 | 0.6 s |
| Initial server response time was short | ✓ 100 | Root document took 65 ms |
| Network Round Trip Times | ✓ 100 | 4 ms |
| Page prevented back/forward cache restoration | ✓ 100 | — |

### `/contact`
**Route:** `app/contact/page.tsx`
**Lab Scores:** Performance: 78 | Accessibility: 82 | Best Practices: 88 | SEO: 92
**Field CWV:** AVERAGE ⚠

#### Field Data — Real Users, Mobile P75
| Metric | P75 | Rating |
|--------|-----|--------|
| LCP (Largest Contentful Paint) | 3.1s | AVERAGE ⚠ |
| CLS (Cumulative Layout Shift)   | 0.041 | FAST ✓ |
| INP (Interaction to Next Paint)  | 180ms | FAST ✓ |
| FCP (First Contentful Paint)    | 1.9s | AVERAGE ⚠ |

#### Performance
| Audit | Score | Value |
|-------|-------|-------|
| First Contentful Paint | ⚠ 64 | 2.6 s |
| Largest Contentful Paint | ⚠ 42 | 4.8 s |
| Total Blocking Time | ⚠ 72 | 190 ms |
| Cumulative Layout Shift | ✓ 100 | 0 |
| Speed Index | ⚠ 70 | 3.8 s |

> First Contentful Paint marks the time at which the first text or image is painted. [Learn more about the First Contentful Paint metric](https://developer.chrome.com/docs/lighthouse/performance/first-contentful-paint/).

- `main > section > img.hero`
  `<img class="hero" src="/hero.jpg" loading="lazy">`
> [Optimize LCP](https://developer.chrome.com/docs/performance/insights/lcp-discovery) by making the LCP image discoverable from the HTML immediately, and avoiding lazy-loading

#### Accessibility
| Audit | Score | Value |
|-------|-------|-------|
| `[aria-hidden="true"]` is not present on the document `<body>` | ✓ 100 | — |
| Buttons have an accessible name | ✓ 100 | — |
| Background and foreground colors have a sufficient contrast ratio | ⚠ 0 | 3 elements |
| Document has a `<title>` element | ✓ 100 | — |
| `<html>` element has a `[lang]` attribute | ✓ 100 | — |
| Links have a discernible name | ✓ 100 | — |
| Form elements have associated labels | ⚠ 0 | 2 elements |
| Page has a main landmark | ✓ 100 | — |

- `form > input.email-field`
  `<input type="email" placeholder="Your email">`
  Fix any of the following:
  Form element does not have an implicit (wrapped) `<label>`
  Form element does not have an explicit `<label>`
  aria-label attribute does not exist or is empty
> Ensures every form element has a label. [Learn more about form element labels](https://dequeuniversity.com/rules/axe/4.11/label).

- `p.subtitle`
  `<p class="subtitle">Send us a message</p>`
  Element has insufficient color contrast of 2.8:1 (foreground color: #999999, background color: #ffffff, required: 4.5:1, font size: 14.0pt)
> Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds. [Learn how to provide sufficient color contrast](https://dequeuniversity.com/rules/axe/4.11/color-contrast).

#### Best Practices
| Audit | Score | Value |
|-------|-------|-------|
| Uses HTTPS | ✓ 100 | — |
| Page has the HTML doctype | ✓ 100 | — |
| Properly defines charset | ✓ 100 | — |
| No browser errors logged to the console | ⚠ 0 | 1 error |
| Avoids third-party cookies | ⚠ 0 | — |
| No issues in the `Issues` panel in Chrome Devtools | ✓ 100 | — |

> Errors logged to the console indicate unresolved problems. They can come from network request failures and other browser concerns. [Learn more about this errors in console diagnostic audit](https://developer.chrome.com/docs/lighthouse/best-practices/errors-in-console).

#### SEO
| Audit | Score | Value |
|-------|-------|-------|
| Page isn't blocked from indexing | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| Document has a meta description | ✓ 100 | — |
| Page has successful HTTP status code | ✓ 100 | — |
| Links do not have descriptive text | ⚠ 0 | 2 links found |
| Links are crawlable | ✓ 100 | — |

> Descriptive link text helps search engines understand your content. [Learn how to make links more accessible](https://developer.chrome.com/docs/lighthouse/seo/link-text/).

#### Opportunities & Diagnostics
| Audit | Score | Value |
|-------|-------|-------|
| Defer offscreen images | ⚠ 0 | Est savings of 180 KiB |
| Improve image delivery | ⚠ 0 | Est savings of 95 KiB |
| Reduce unused JavaScript | ⚠ 0 | Est savings of 118 KiB |
| Minify JavaScript | ✓ 100 | — |
| Reduce unused CSS | ⚠ 0 | Est savings of 28 KiB |
| Avoids enormous network payloads | ⚠ 0 | Total size was 2,840 KiB |
| Minimizes main-thread work | ⚠ 72 | 2.3 s |
| JavaScript execution time | ✓ 100 | 0.4 s |
| Time to Interactive | ⚠ 61 | 5.2 s |
| Initial server response time was short | ✓ 100 | Root document took 120 ms |
| Network Round Trip Times | ✓ 100 | 4 ms |
| Page prevented back/forward cache restoration | ⚠ 0 | 1 failure reason |

> Images that are not visible in the viewport should be deferred. [Learn how to defer offscreen images](https://developer.chrome.com/docs/lighthouse/performance/uses-responsive-images/).

> Serve images in next-gen formats. Image formats like WebP and AVIF often provide better compression than PNG or JPEG. [Learn more about next-gen image formats](https://developer.chrome.com/docs/lighthouse/performance/uses-webp-images/).

> Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. [Learn how to reduce unused JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript/).

### `/blog/getting-started`
**Route:** `app/blog/[slug]/page.tsx`
**Lab Scores:** Performance: 61 | Accessibility: 95 | Best Practices: 96 | SEO: 100

#### Performance
| Audit | Score | Value |
|-------|-------|-------|
| First Contentful Paint | ⚠ 49 | 3.4 s |
| Largest Contentful Paint | ⚠ 31 | 5.9 s |
| Total Blocking Time | ✓ 95 | 40 ms |
| Cumulative Layout Shift | ✓ 100 | 0 |
| Speed Index | ⚠ 48 | 5.2 s |

> First Contentful Paint marks the time at which the first text or image is painted. [Learn more about the First Contentful Paint metric](https://developer.chrome.com/docs/lighthouse/performance/first-contentful-paint/).

- `article > img.cover`
  `<img class="cover" src="/blog/cover.png">`
> [Optimize LCP](https://developer.chrome.com/docs/performance/insights/lcp-discovery) by making the LCP image discoverable from the HTML immediately, and avoiding lazy-loading

#### Accessibility
| Audit | Score | Value |
|-------|-------|-------|
| `[aria-hidden="true"]` is not present on the document `<body>` | ✓ 100 | — |
| Buttons have an accessible name | ✓ 100 | — |
| Background and foreground colors have a sufficient contrast ratio | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| `<html>` element has a `[lang]` attribute | ✓ 100 | — |
| Links have a discernible name | ✓ 100 | — |
| Page has a main landmark | ✓ 100 | — |
| Heading elements appear in a sequentially-descending order | ⚠ 0 | 1 element |

- `article > h4.callout-title`
  `<h4 class="callout-title">Note</h4>`
  Fix any of the following:
  Heading order invalid (h2 → h4, skipped h3)
> Ensure that headings appear in a sequentially-descending order. [Learn more about heading order](https://dequeuniversity.com/rules/axe/4.11/heading-order).

#### Best Practices
| Audit | Score | Value |
|-------|-------|-------|
| Uses HTTPS | ✓ 100 | — |
| Page has the HTML doctype | ✓ 100 | — |
| Avoids deprecated APIs | ✓ 100 | — |
| No browser errors logged to the console | ✓ 100 | — |
| Avoids third-party cookies | ⚠ 0 | — |

#### SEO
| Audit | Score | Value |
|-------|-------|-------|
| Page isn't blocked from indexing | ✓ 100 | — |
| Document has a `<title>` element | ✓ 100 | — |
| Document has a meta description | ✓ 100 | — |
| Page has successful HTTP status code | ✓ 100 | — |
| Links have descriptive text | ✓ 100 | — |
| Links are crawlable | ✓ 100 | — |
| Document has a valid `hreflang` | ✓ 100 | — |

#### Opportunities & Diagnostics
| Audit | Score | Value |
|-------|-------|-------|
| Improve image delivery | ⚠ 0 | Est savings of 620 KiB |
| Reduce unused JavaScript | ⚠ 0 | Est savings of 89 KiB |
| Reduce unused CSS | ✓ 100 | — |
| Avoids enormous network payloads | ⚠ 0 | Total size was 3,100 KiB |
| Minimizes main-thread work | ✓ 91 | 1.1 s |
| Time to Interactive | ⚠ 61 | 5.1 s |
| Initial server response time was short | ✓ 100 | Root document took 95 ms |

> Serve images in next-gen formats. Image formats like WebP and AVIF often provide better compression than PNG or JPEG. [Learn more about next-gen image formats](https://developer.chrome.com/docs/lighthouse/performance/uses-webp-images/).

> Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. [Learn how to reduce unused JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript/).
