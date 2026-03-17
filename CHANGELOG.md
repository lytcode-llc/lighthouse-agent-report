# Changelog

All notable changes to `@lytcode/lighthouse-agent-report` are documented here.

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
