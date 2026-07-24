// Page-audit types (Part VIII §46 Week 11; Part III §20 Audit Report).

export type AuditDiscipline = 'seo' | 'aeo' | 'geo';
export type AuditSeverity = 'high' | 'medium' | 'low';

/** Normalized page content from the crawl vendor (Firecrawl), the input to the audit rules. */
export interface CrawledPage {
  url: string;
  markdown: string;
  html?: string;
  /** Unmodified HTML (keeps <script> tags) — needed to detect JSON-LD structured data. */
  rawHtml?: string;
  metadata: {
    title?: string;
    description?: string;
    /** Published/modified date if the crawler surfaced one. */
    modifiedTime?: string;
  };
}

/** One rule outcome. Failed findings carry a recommendation; severity drives scoring (Week 12). */
export interface AuditFinding {
  id: string;
  discipline: AuditDiscipline;
  label: string;
  passed: boolean;
  severity: AuditSeverity;
  detail?: string;
  /** Plain-language "why this matters / what's wrong" (shown for failed checks). */
  recommendation?: string;
  /** Plain, concrete steps a non-expert can follow to fix it. */
  howToFix?: string;
}
