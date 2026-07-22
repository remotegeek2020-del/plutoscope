import { extractDomain } from '@/lib/tracking/url';

import type { AuditFinding, CrawledPage } from './types';

// SEO/AEO/GEO audit rule set (Part VIII §46 Week 11). Each rule is a pure function of the crawled
// page → an AuditFinding. Deterministic and unit-tested; the scoring engine (Week 12) aggregates
// these findings (weighted by severity) into a per-discipline score + prioritized fix list.

// ---- parsing helpers ------------------------------------------------------------------------

export interface Heading {
  level: number;
  text: string;
}

export function parseHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const regex = /^(#{1,6})\s+(.+?)\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    headings.push({ level: match[1].length, text: match[2].trim() });
  }
  return headings;
}

/** Count links to external domains (excludes links back to the page's own domain). */
export function countOutboundLinks(markdown: string, ownDomain?: string | null): number {
  let count = 0;
  for (const match of markdown.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) {
    const host = extractDomain(match[1]);
    if (!host) continue;
    if (ownDomain && host === ownDomain) continue;
    count += 1;
  }
  return count;
}

export function wordCount(markdown: string): number {
  const text = markdown.replace(/[#>*_`\-]/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function hasListMarkup(markdown: string): boolean {
  return /^[ \t]*([-*+]|\d+\.)\s+\S/m.test(markdown);
}

/** Detect JSON-LD structured data. Checks rawHtml first (cleaned html strips <script> tags). */
export function hasJsonLd(page: Pick<CrawledPage, 'html' | 'rawHtml'>): boolean {
  const source = `${page.rawHtml ?? ''}\n${page.html ?? ''}`;
  return /<script[^>]+type=["']application\/ld\+json["']/i.test(source);
}

export function hasFreshnessSignal(page: CrawledPage): boolean {
  if (page.metadata.modifiedTime) return true;
  // Only a recent year counts as freshness (an old "founded 2015" mention shouldn't).
  return /\b202[4-9]\b/.test(page.markdown);
}

// ---- rules -----------------------------------------------------------------------------------

type Rule = (page: CrawledPage) => AuditFinding;

const SEO_RULES: Rule[] = [
  (page) => {
    const title = page.metadata.title?.trim() ?? '';
    return {
      id: 'seo-title-present',
      discipline: 'seo',
      label: 'Page has a title',
      passed: title.length > 0,
      severity: 'high',
      detail: title ? `Title: "${title}"` : 'No <title> found.',
      recommendation: title ? undefined : 'Add a descriptive <title> tag.',
    };
  },
  (page) => {
    const len = page.metadata.title?.trim().length ?? 0;
    const passed = len >= 10 && len <= 60;
    return {
      id: 'seo-title-length',
      discipline: 'seo',
      label: 'Title length is 10–60 characters',
      passed,
      severity: 'low',
      detail: `Title length: ${len}.`,
      recommendation: passed ? undefined : 'Keep the title between 10 and 60 characters.',
    };
  },
  (page) => {
    const has = Boolean(page.metadata.description?.trim());
    return {
      id: 'seo-meta-description',
      discipline: 'seo',
      label: 'Page has a meta description',
      passed: has,
      severity: 'medium',
      recommendation: has ? undefined : 'Add a concise meta description (~150 chars).',
    };
  },
  (page) => {
    const h1s = parseHeadings(page.markdown).filter((h) => h.level === 1);
    const passed = h1s.length === 1;
    return {
      id: 'seo-single-h1',
      discipline: 'seo',
      label: 'Exactly one H1 heading',
      passed,
      severity: 'high',
      detail: `Found ${h1s.length} H1 heading(s).`,
      recommendation: passed ? undefined : 'Use exactly one H1 that states the page topic.',
    };
  },
  (page) => {
    const passed = parseHeadings(page.markdown).length >= 2;
    return {
      id: 'seo-heading-structure',
      discipline: 'seo',
      label: 'Uses subheadings for structure',
      passed,
      severity: 'medium',
      recommendation: passed ? undefined : 'Break content up with H2/H3 subheadings.',
    };
  },
];

const AEO_RULES: Rule[] = [
  (page) => {
    const passed = parseHeadings(page.markdown).some((h) => h.text.trim().endsWith('?'));
    return {
      id: 'aeo-question-headings',
      discipline: 'aeo',
      label: 'Has question-style headings',
      passed,
      severity: 'medium',
      recommendation: passed
        ? undefined
        : 'Add question-form headings (e.g. "What is …?") to match answer queries.',
    };
  },
  (page) => {
    const passed = hasListMarkup(page.markdown);
    return {
      id: 'aeo-structured-lists',
      discipline: 'aeo',
      label: 'Contains extractable lists',
      passed,
      severity: 'medium',
      recommendation: passed
        ? undefined
        : 'Use bulleted/numbered lists so answer engines can extract steps or points.',
    };
  },
  (page) => {
    const firstPara = page.markdown
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .find((b) => b.length > 0 && !b.startsWith('#'));
    const words = firstPara ? firstPara.split(/\s+/).length : 0;
    const passed = words > 0 && words <= 60;
    return {
      id: 'aeo-concise-answer',
      discipline: 'aeo',
      label: 'Leads with a concise answer',
      passed,
      severity: 'low',
      detail: `Opening paragraph: ${words} words.`,
      recommendation: passed
        ? undefined
        : 'Open with a direct, concise answer (≤ ~60 words) before elaborating.',
    };
  },
];

const GEO_RULES: Rule[] = [
  (page) => {
    const count = countOutboundLinks(page.markdown, extractDomain(page.url));
    const passed = count >= 2;
    return {
      id: 'geo-outbound-citations',
      discipline: 'geo',
      label: 'Cites external sources',
      passed,
      severity: 'medium',
      detail: `${count} outbound link(s).`,
      recommendation: passed ? undefined : 'Cite authoritative external sources to build trust.',
    };
  },
  (page) => {
    const passed = hasJsonLd(page);
    return {
      id: 'geo-structured-data',
      discipline: 'geo',
      label: 'Has schema.org structured data',
      passed,
      severity: 'high',
      recommendation: passed
        ? undefined
        : 'Add JSON-LD structured data (Article/FAQ/Product) to clarify entities for AI engines.',
    };
  },
  (page) => {
    const passed = hasFreshnessSignal(page);
    return {
      id: 'geo-freshness',
      discipline: 'geo',
      label: 'Shows a freshness signal',
      passed,
      severity: 'low',
      recommendation: passed
        ? undefined
        : 'Surface a published/updated date; AI engines favor current content.',
    };
  },
  (page) => {
    const words = wordCount(page.markdown);
    const passed = words >= 300;
    return {
      id: 'geo-sufficient-depth',
      discipline: 'geo',
      label: 'Has sufficient depth',
      passed,
      severity: 'medium',
      detail: `${words} words.`,
      recommendation: passed ? undefined : 'Thin pages are rarely cited — expand to 300+ words.',
    };
  },
];

export const AUDIT_RULES: Rule[] = [...SEO_RULES, ...AEO_RULES, ...GEO_RULES];

/** Run every audit rule against a crawled page. */
export function runAuditRules(page: CrawledPage): AuditFinding[] {
  return AUDIT_RULES.map((rule) => rule(page));
}
