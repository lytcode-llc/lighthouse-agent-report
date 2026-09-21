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

Then run from your project root:

```bash
cd my-project
lighthouse-agent-report --site http://localhost:3000
```

When run globally without `--cwd`, the tool detects whether your current directory contains project files (`package.json`, `lighthouse-audit.config.js`, etc.). If not, an interactive prompt lets you choose a recent workspace, create a new project, or use the current directory. Pass `--cwd <dir>` to bypass workspace detection entirely.

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
| `--cwd` | Working directory (skips workspace detection) | auto-detect |
| `--psi` | Force PageSpeed Insights fetch with env var key | off |
| `--psi-key` | PageSpeed Insights API key for real-user field data | `PSI_API_KEY` env var |
| `--psi-concurrency` | Concurrent PSI requests, 1–16 (free tier safe: sliding window at 2 req/sec) | `3` |
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

PSI is **off by default** — the tool no longer auto-runs PSI from the `PSI_API_KEY` env var alone. You must explicitly opt in:

```bash
# Explicit key (no prompt)
lighthouse-agent-report --site https://example.com --psi-key YOUR_KEY

# Force with env var key (no prompt)
export PSI_API_KEY=YOUR_KEY
lighthouse-agent-report --site https://example.com --psi

# Env var + interactive prompt
export PSI_API_KEY=YOUR_KEY
lighthouse-agent-report --site https://example.com
# → "Fetch real-user field data via PageSpeed Insights? (Y/n)"
```

In CI or non-interactive contexts, use `--psi` to skip the prompt. Without `--psi` or `--psi-key`, PSI is silently skipped.

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

The tool writes to your output directory with a timestamped run folder:

```
reports/lighthouse/
└── 2026-03-03T14-22-00/
    ├── index.json              # Primary report (agent-readable)
    ├── index.json.manifest.json # Present only when chunked (see Large sites)
    ├── pages/
    │   ├── contact.md          # Per-page detail (only for failing/errored pages)
    │   └── blog%2Fgetting-started.md
    └── ...
```

### JSON report (`index.json`)

The JSON report is the primary output. It contains everything an agent needs to identify and fix issues:

```json
{
  "generatedAt": "2026-03-03T14:22:00.000Z",
  "site": "https://example.com",
  "pageCount": 4,
  "divergences": [
    {
      "title": "First Contentful Paint",
      "lowScore": 49,
      "lowPage": "/blog/getting-started",
      "highScore": 100,
      "highPage": "/about",
      "spread": 51
    }
  ],
  "pages": [
    {
      "path": "/contact",
      "source": { "routeFile": "app/contact/page.tsx" },
      "scores": { "performance": 0.78, "accessibility": 0.82, "bestPractices": 0.88, "seo": 0.92 },
      "audits": {
        "performance": [{ "id": "first-contentful-paint", "title": "First Contentful Paint", "score": 0.64, "displayValue": "2.6 s" }],
        "accessibility": [{ "id": "label", "title": "Form elements have associated labels", "score": 0, "displayValue": "2 elements", "elements": [{ "selector": "input.email-field" }] }],
        "bestPractices": [],
        "seo": [],
        "opportunities": [{ "id": "unused-javascript", "title": "Reduce unused JavaScript", "score": 0, "displayValue": "Est savings of 118 KiB" }]
      },
      "markdownFile": "pages/contact.md"
    }
  ]
}
```

Key fields:
- **`divergences`** — Audits that vary significantly across pages (spread ≥ 20). Helps agents find site-wide inconsistencies.
- **`scores`** — Raw Lighthouse scores (0–1). Multiply by 100 for display.
- **`audits`** — All audited items, grouped by category. Each audit has `id`, `title`, `score`, `displayValue`, and optional `elements` (affected DOM nodes).
- **`markdownFile`** — Present only on pages with failing scores or errors. Points to a `.md` file with full audit details and human-readable explanations.
- **`source.routeFile`** — The framework source file responsible for this page (e.g., `app/contact/page.tsx`).
- **`fieldData`** — Real-user Core Web Vitals from PageSpeed Insights (only when `--psi-key` is provided).

### Chunking

For large sites, `index.json` is automatically split when it exceeds **10,000 lines**. Each chunk contains a subset of pages plus the full metadata envelope. A manifest file is written alongside:

```json
{
  "version": "1.0",
  "generatedAt": "...",
  "site": "...",
  "pageCount": 200,
  "chunked": true,
  "chunks": [
    { "file": "index.json.1", "startPage": 0, "endPage": 59, "pageCount": 60 },
    { "file": "index.json.2", "startPage": 60, "endPage": 119, "pageCount": 60 }
  ]
}
```

### Per-page markdown

Individual `.md` files are written **only for pages that need attention** (failing scores, audits with score < 0.9, SLOW/AVERAGE field data, or Lighthouse errors). Passing pages have no `.md` file — their JSON data is sufficient.

See [docs/example-report.md](docs/example-report.md) for a complete per-page markdown example.

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
