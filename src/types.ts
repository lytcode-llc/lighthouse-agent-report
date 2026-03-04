export interface AuditConfig {
  output?: string;
  site?: string;
}

export interface PageSource {
  routeFile: string;
}

export interface FailingAudit {
  id: string;
  title: string;
  score: number | null;
  displayValue: string | null;
}

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
  failingAudits: {
    performance: FailingAudit[];
    accessibility: FailingAudit[];
    bestPractices: FailingAudit[];
    seo: FailingAudit[];
  };
  source: PageSource;
  fieldData?: FieldData;
  error?: string;
}
