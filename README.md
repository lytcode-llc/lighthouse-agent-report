# @lytcode/lighthouse-agent-report

Automates website performance testing for SEO and accessibility. Runs Lighthouse across your entire site and generates an agent-readable markdown report your AI coding assistant can use to target and fix performance issues. On production, it also runs PageSpeed Insights to include real-user Core Web Vitals alongside lab scores.

Wraps [unlighthouse](https://unlighthouse.dev/) for URL discovery and execution. Automatically detects your framework and maps discovered URLs to source files — enabling a coding agent to trace every issue back to the exact file responsible.

Works with **Next.js** (App Router and Pages Router), **Astro**, **SvelteKit**, and **Gatsby** out of the box. The Lighthouse audit runs against any HTTP server regardless of framework.

## Install

### As a devDependency (recommended for projects and teams)

```bash
npm install -D @lytcode/lighthouse-agent-report
```

Add scripts to `package.json`:

```json
"scripts": {
  "audit": "lighthouse-agent-report --site http://localhost:3000",
  "audit:prod": "lighthouse-agent-report --site https://example.com"
}
```

Then run:

```bash
npm run audit
npm run audit:prod
```

This is the recommended approach for Next.js projects. The package version is pinned in `package.json`, so all team members and CI run the same version. The audit scripts are discoverable alongside your other project scripts.

### As a global tool

```bash
npm install -g @lytcode/lighthouse-agent-report
```

Then run from your project root (the package reads your `app/` directory and writes output relative to wherever you run it):

```bash
cd my-project
lighthouse-agent-report --site http://localhost:3000
```

Use this if you want a single installation that works across multiple projects without adding it to each one's `package.json`. Note that upgrades affect all projects at once, with no per-project version pinning.

## Framework support

The package automatically detects your framework and scans the appropriate directory:

| Framework | Directory | Dynamic segment syntax |
|-----------|-----------|----------------------|
| Next.js App Router | `app/` or `src/app/` | `[slug]`, `[...slug]`, `(group)` |
| Next.js Pages Router | `pages/` or `src/pages/` | `[slug]`, `[...slug]` |
| Astro | `src/pages/` or `pages/` | `[slug].astro`, `[...slug].astro` |
| SvelteKit | `src/routes/` | `[param]`, `[...rest]`, `(group)`, `[[optional]]` |
| Gatsby | `src/pages/` or `pages/` | n/a (static pages only) |

Detection is automatic — no configuration needed. The audit itself works with any HTTP server; framework detection only affects the **Route:** attribution in the report.

## Usage

```bash
lighthouse-agent-report --site http://localhost:3000
lighthouse-agent-report --site https://example.com
lighthouse-agent-report --site https://example.com --psi-key YOUR_KEY
lighthouse-agent-report --site https://example.com --out ./my-reports
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--site` | URL to audit (required) | — |
| `--psi-key` | PageSpeed Insights API key for real-user field data | `PSI_API_KEY` env var |
| `--out` | Output directory | value from config, or `reports/lighthouse` |
| `--config` | Path to an optional config file | `lighthouse-audit.config.js` |

## Configuration (optional)

No config file is required. If you need to change the output directory, create `lighthouse-audit.config.js` in your project root:

```js
// lighthouse-audit.config.js
export default {
  output: 'reports/lighthouse', // default
}
```

## Real-user field data (PageSpeed Insights)

Pass a [PageSpeed Insights API key](https://developers.google.com/speed/docs/insights/v5/get-started) to include real-user Core Web Vitals (LCP, CLS, INP) alongside lab scores. Field data is sourced from Chrome's user experience dataset and reflects actual visitors — it can differ significantly from simulated lab scores.

```bash
# Via flag
lighthouse-agent-report --site https://example.com --psi-key YOUR_KEY

# Via environment variable (recommended — keep keys out of scripts)
export PSI_API_KEY=YOUR_KEY
lighthouse-agent-report --site https://example.com
```

Field data is automatically skipped for localhost URLs (PSI requires a publicly accessible site). If a URL has insufficient traffic in Chrome's dataset, the package falls back to origin-level data and notes it in the report.

### Field data ratings

Each Core Web Vital is rated against Google's defined thresholds at the 75th percentile of real user sessions:

| Metric | FAST ✓ | AVERAGE ⚠ | SLOW ✗ |
|--------|--------|-----------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5s – 4s | > 4s |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1 – 0.25 | > 0.25 |
| INP (Interaction to Next Paint) | < 200ms | 200ms – 500ms | > 500ms |
| FCP (First Contentful Paint) | < 1.8s | 1.8s – 3s | > 3s |

The overall **Field CWV** rating shown in the summary table reflects whether all Core Web Vitals (LCP, CLS, INP) pass at the 75th percentile — the same threshold Google uses for Search Console and ranking signals. Unlike Lighthouse's 0–100 composite score, there is no single numeric field score; only individual metric values and their pass/fail ratings.

Get a free API key at [console.cloud.google.com](https://console.cloud.google.com) by enabling the **PageSpeed Insights API** — Create a New Project, then click Create credentials > API key.

## Output

See [docs/example-report.md](docs/example-report.md) for a full example of what a generated report looks like.

The tool writes to your output directory:

- `latest.md` — agent-readable markdown with summary table + issue breakdown
- `latest.json` — structured JSON for programmatic use
- `audit-<timestamp>.md` — archived copy of each run

### Report format

```markdown
# Lighthouse Audit Report
Generated: 2026-03-03T14:22:00Z | Site: https://example.com | Pages: 18
Lab data: unlighthouse (desktop simulation) | Field data: PageSpeed Insights (real users, mobile)

## Summary Table

| Page | Performance | Accessibility | Best Practices | SEO | Field CWV |
|------|-------------|---------------|----------------|-----|-----------|
| `/` | 94 | 100 | 96 | 100 | FAST ✓ |
| `/contact` | **78** ⚠ | 95 | **88** ⚠ | 92 | AVERAGE ⚠ |

> Lab scores below 90 flagged with ⚠ | Field CWV: FAST ✓ AVERAGE ⚠ SLOW ✗

---

## Pages Requiring Attention

### `/contact`
**Route:** `app/contact/page.tsx`
**Lab Scores:** Performance: 78 | Accessibility: 95 | Best Practices: 88 | SEO: 92
**Field CWV:** AVERAGE ⚠

#### Field Data — Real Users, Mobile P75
| Metric | P75 | Rating |
|--------|-----|--------|
| LCP    | 3.1s | AVERAGE ⚠ |
| CLS    | 0.04 | FAST ✓ |
| INP    | 180ms | FAST ✓ |

#### Performance
| Audit | Score | Value |
|-------|-------|-------|
| First Contentful Paint | ⚠ 64 | 2.6 s |
| Largest Contentful Paint | ⚠ 42 | 4.8 s |
| Total Blocking Time | ✓ 100 | 0 ms |
...

#### Opportunities & Diagnostics
| Audit | Score | Value |
|-------|-------|-------|
| Improve image delivery | ⚠ 0 | Est savings of 95 KiB |
| Reduce unused JavaScript | ⚠ 0 | Est savings of 118 KiB |
...
```

## Large sites

Unlighthouse discovers a maximum of **200 routes by default**. If your site has more, create an `unlighthouse.config.ts` in your project root to raise or remove the limit:

```ts
// unlighthouse.config.ts
export default {
  scanner: {
    maxRoutes: 500,  // or false for no limit
  },
}
```

This file is picked up automatically by unlighthouse and is separate from `lighthouse-audit.config.js`.

## Development

```bash
npm run build   # compile TypeScript → dist/
npm run dev -- --site http://localhost:3000  # run without build step
```
