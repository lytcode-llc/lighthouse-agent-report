# Changelog

All notable changes to `@lytcode/lighthouse-agent-report` are documented here.

## [2.0.0] — 2026-08-28

### Added

- Concurrent PageSpeed Insights fetches: worker pool + sliding-window rate limiter (`new RateLimiter(2, 1000)` enforces 2 req/sec)
- `--psi-concurrency` CLI flag (1–16, default 3) — free-tier safe by default, paid users can raise it
- `divergences` array in `index.json` envelope — audits with ≥ 20-point spread across pages, sorted descending. Top cross-page inconsistencies available without scanning every page
- `markdownFile` field on `PageResult` — relative path to per-page detail `.md` for pages that need attention
- `pageCount` field in `index.json` envelope — quick total without iterating the `pages` array
- `index.json.manifest.json` — chunk metadata for large sites, lists each chunk with `file`, `startPage`, `endPage`, `pageCount`
- Exported `needsAttention()`, `pathToFile()`, `computeDivergences()` from `format.js` for reuse in tests and downstream tools

### Changed

- **BREAKING**: `index.md` removed — `index.json` is now the single source of truth for agents
- **BREAKING**: `formatIndex()` removed; use `computeDivergences()` + `formatPage()` directly
- Per-page `.md` files now only written for failing/errored pages (`needsAttention(page) || page.error`), not for every page
- Per-page `.md` files written to `pages/<route>.md` inside the timestamped run directory (no longer in a separate `pages/` subdirectory)
- JSON report envelope: `{ generatedAt, site, pageCount, divergences, pages }`
- Divergence `spread` field is now an integer (`Math.round(rawSpread * 100)`, e.g. 35 = 35% spread) instead of a fractional value

### Performance

- PSI fetches are ~3× faster with `--psi-concurrency 8` against large sites while staying rate-limit-safe on free tier
- `index.json` automatically chunks at the 10,000-line agent-parse ceiling; each chunk stays under 9,990 lines (chunk size accounts for envelope lines and divergence array length)

---

## [1.0.0] — 2026-03-17

### Added

- Full audit output in generated reports: all weighted audits per category (Performance, Accessibility, Best Practices, SEO) now shown with ✓/⚠ status, not just failing ones
- New "Opportunities & Diagnostics" section per page surfaces weight=0 audits with scores (e.g. unused JS savings, bfcache failures, TTI), excluding pure data blobs
- `docs/example-report.md` — full example of a generated report for reference

### Fixed

- Route attribution for trailing-slash URLs (e.g. Gatsby's `/about/`) now resolves correctly

### Changed

- `FailingAudit` type renamed to `AuditEntry`; `FailingAudit` kept as a backward-compat alias
- `failingAudits` field on `PageResult` renamed to `audits`; includes all category audits plus an `opportunities` array
- Report section headers changed from `#### Performance Issues` → `#### Performance` etc.
- Audit table column renamed from `Details` to `Value`

### Notes

- Element details and descriptions in the report are still shown only for failing audits (score < 0.9) to keep signal-to-noise ratio high

---

## [0.3.0] — 2026-03-12

### Added

- Tests for `format.ts` (report generation) and `config.ts` (config loading)
- Gatsby static-page support via Pages Router detection (`src/pages/`)
- Gatsby listed in framework detection warning message

### Fixed

- DEP0190 deprecation warning: removed `shell: true` from `unlighthouse-ci` spawn call

### Notes

- Dynamic Gatsby pages created via `gatsby-node.js` are not attributed to source files. Only pages in `src/pages/` are resolved.

---

## [0.2.0] — 2025-03-01

### Added

- Route file attribution for Astro (`src/pages/**/*.astro|md|mdx`) and SvelteKit (`src/routes/**/+page.svelte`)
- Support for route groups, catch-all segments, and optional params across all frameworks
- Test suite for `source-map.ts` (38 cases covering Next.js App Router, Pages Router, Astro, SvelteKit, and unknown)

### Changed

- Package scope renamed to `@lytcode/lighthouse-agent-report`
- `bin` path corrected (removed leading `./` that caused npm install issues)

---

## [0.1.0] — 2025-02-01

### Added

- Initial release
- Runs `unlighthouse-ci` across a site and generates `reports/lighthouse/latest.md` + `latest.json`
- Summary table with lab scores (Performance, Accessibility, Best Practices, SEO)
- Per-page failing audit details with titles, scores, display values, and DOM element selectors
- PageSpeed Insights (PSI) field data integration — real-user CWV metrics (LCP, CLS, INP, FCP) at P75
- Automatic origin-level fallback when URL lacks sufficient CrUX traffic
- Route file attribution for Next.js App Router and Pages Router
- Optional config file: `lighthouse-audit.config.mjs`
- `--site`, `--config`, `--out`, `--psi-key` CLI flags
- Archived reports saved as `audit-<timestamp>.md` alongside `latest.md`
