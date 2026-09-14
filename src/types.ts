export interface AuditConfig {
  output?: string;
  site?: string;
}

export interface PageSource {
  routeFile: string | null;
}

export interface AuditElement {
  selector: string;
  snippet?: string;
  explanation?: string;
}

export interface AuditEntry {
  id: string;
  title: string;
  description?: string;         // Lighthouse's own guidance text (may include "Learn more" links)
  score: number | null;
  displayValue: string | null;
  elements?: AuditElement[];    // Affected DOM elements with selectors
}

// Backward-compat alias
export type FailingAudit = AuditEntry;

export type CWVCategory = 'FAST' | 'AVERAGE' | 'SLOW'

export interface FieldMetric {
  p75: number;
  category: CWVCategory;
}

// Real-user field data from PageSpeed Insights (CrUX)
export interface FieldData {
  lcp?: FieldMetric;     // ms — threshold: FAST < 2500, SLOW > 4000
  cls?: FieldMetric;     // raw * 100 — threshold: FAST < 10, SLOW > 25
  inp?: FieldMetric;     // ms — threshold: FAST < 200, SLOW > 500
  fcp?: FieldMetric;     // ms — threshold: FAST < 1800, SLOW > 3000
  overall?: CWVCategory;
  isOriginLevel?: boolean;
}

export interface PageResult {
  path: string;
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number };
  audits: {
    performance: AuditEntry[];      // weight > 0 audits for this category
    accessibility: AuditEntry[];
    bestPractices: AuditEntry[];
    seo: AuditEntry[];
    opportunities: AuditEntry[];    // weight = 0 audits with scores (cross-category)
  };
  source: PageSource;
  fieldData?: FieldData;
  error?: string;
  /**
   * Relative path to a per-page `.md` detail file, e.g. `pages/contact.md`.
   * Set only for pages that need attention (failing scores, failing audits,
   * SLOW/AVERAGE field data) or pages that errored during the audit.
   * Linked from `index.json` so agents can navigate to full markdown details.
   */
  markdownFile?: string;
}

/**
 * Cross-page audit divergence: an audit whose scores vary significantly
 * between pages. Computed by `computeDivergences()` and surfaced in
 * `index.json` to help agents spot site-wide inconsistencies.
 */
export interface Divergence {
  title: string;
  lowScore: number;     // integer 0-100, lowest score seen
  lowPage: string;      // page path with the lowest score
  highScore: number;    // integer 0-100, highest score seen
  highPage: string;     // page path with the highest score
  spread: number;       // integer (highScore - lowScore), included when >= 20
}
