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
      label: 'Page title',
      passed: title.length > 0,
      severity: 'high',
      detail: title ? `Title: "${title}"` : 'No <title> found.',
      recommendation: title
        ? undefined
        : 'This page has no title — the clickable blue headline people see in Google.',
      howToFix: title
        ? undefined
        : 'In your website editor, find the “Page title” or “SEO title” box and write what the page is about, e.g. “Merchant Services for Small Business”.',
    };
  },
  (page) => {
    const len = page.metadata.title?.trim().length ?? 0;
    const passed = len >= 10 && len <= 60;
    return {
      id: 'seo-title-length',
      discipline: 'seo',
      label: 'Title length',
      passed,
      severity: 'low',
      detail: `Title length: ${len}.`,
      recommendation: passed
        ? undefined
        : 'The title is too short or too long. Very long titles get cut off in Google.',
      howToFix: passed
        ? undefined
        : 'Edit the page title so it is about 10–60 letters — one short, clear sentence.',
    };
  },
  (page) => {
    const has = Boolean(page.metadata.description?.trim());
    return {
      id: 'seo-meta-description',
      discipline: 'seo',
      label: 'Search result summary',
      passed: has,
      severity: 'medium',
      recommendation: has
        ? undefined
        : 'This page has no summary line — the little grey text that shows under the blue link in Google.',
      howToFix: has
        ? undefined
        : 'In your website editor, look for a box called “meta description”, “search description”, or “SEO description”, and write one clear sentence about the page (about 150 letters).',
    };
  },
  (page) => {
    const h1s = parseHeadings(page.markdown).filter((h) => h.level === 1);
    const passed = h1s.length === 1;
    return {
      id: 'seo-single-h1',
      discipline: 'seo',
      label: 'Main headline (H1)',
      passed,
      severity: 'high',
      detail: `Found ${h1s.length} H1 heading(s).`,
      recommendation: passed
        ? undefined
        : `A page should have exactly one big main headline at the top (called an H1). This page has ${h1s.length}.`,
      howToFix: passed
        ? undefined
        : 'Give the page one clear main headline that says what it is about, and make the other headings smaller (sub-headings).',
    };
  },
  (page) => {
    const passed = parseHeadings(page.markdown).length >= 2;
    return {
      id: 'seo-heading-structure',
      discipline: 'seo',
      label: 'Subheadings',
      passed,
      severity: 'medium',
      recommendation: passed
        ? undefined
        : 'The page is one big block of text with no sub-headings. Headings help people and AI scan it.',
      howToFix: passed
        ? undefined
        : 'Break the page into sections with sub-headings, like “Pricing”, “How it works”, “FAQ”.',
    };
  },
];

const AEO_RULES: Rule[] = [
  (page) => {
    const passed = parseHeadings(page.markdown).some((h) => h.text.trim().endsWith('?'));
    return {
      id: 'aeo-question-headings',
      discipline: 'aeo',
      label: 'Question headings',
      passed,
      severity: 'medium',
      recommendation: passed
        ? undefined
        : 'None of your headings are written as questions. People ask AI questions, so pages with matching questions get picked.',
      howToFix: passed
        ? undefined
        : 'Add headings written as real questions, e.g. “What is a merchant account?” or “How much does it cost?”.',
    };
  },
  (page) => {
    const passed = hasListMarkup(page.markdown);
    return {
      id: 'aeo-structured-lists',
      discipline: 'aeo',
      label: 'Bullet / numbered lists',
      passed,
      severity: 'medium',
      recommendation: passed
        ? undefined
        : 'This page has no bullet points or numbered lists. AI loves lists because it can lift out the steps.',
      howToFix: passed
        ? undefined
        : 'Turn some text into a bullet list or numbered steps, e.g. “3 steps to get started: 1… 2… 3…”.',
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
      label: 'Quick answer up top',
      passed,
      severity: 'low',
      detail: `Opening paragraph: ${words} words.`,
      recommendation: passed
        ? undefined
        : 'The page doesn’t start with a short, direct answer. AI grabs the first clear answer it sees.',
      howToFix: passed
        ? undefined
        : 'At the very top, add one or two short sentences that directly answer the page’s main question, before the longer details.',
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
      label: 'Links to trusted sources',
      passed,
      severity: 'medium',
      detail: `${count} outbound link(s).`,
      recommendation: passed
        ? undefined
        : 'This page doesn’t link to any trusted outside sources. Linking to good sources makes your page look more trustworthy to AI.',
      howToFix: passed
        ? undefined
        : 'Add a link or two to a respected source (an industry site, or an official/government page) where it fits naturally.',
    };
  },
  (page) => {
    const passed = hasJsonLd(page);
    return {
      id: 'geo-structured-data',
      discipline: 'geo',
      label: 'An “about this page” code snippet for AI',
      passed,
      severity: 'high',
      recommendation: passed
        ? undefined
        : 'This page is missing a small piece of code that quietly tells Google and AI what the page is about (its main questions and answers). Pages that have it get picked more often.',
      howToFix: passed
        ? undefined
        : 'Good news — you don’t write any code yourself. Plutoscope makes it for you: open Content Briefs, click Generate, and copy the “page code” block. Then paste it into this page on your website. New to pasting code? See “How do I add this code to my website?” at the top of this screen.',
    };
  },
  (page) => {
    const passed = hasFreshnessSignal(page);
    return {
      id: 'geo-freshness',
      discipline: 'geo',
      label: 'Recent date',
      passed,
      severity: 'low',
      recommendation: passed
        ? undefined
        : 'This page shows no recent date, so AI can’t tell if it’s up to date — and AI prefers fresh pages.',
      howToFix: passed
        ? undefined
        : 'Show a “Last updated” date on the page, and refresh the content every few months.',
    };
  },
  (page) => {
    const words = wordCount(page.markdown);
    const passed = words >= 300;
    return {
      id: 'geo-sufficient-depth',
      discipline: 'geo',
      label: 'Enough detail',
      passed,
      severity: 'medium',
      detail: `${words} words.`,
      recommendation: passed
        ? undefined
        : `This page is thin (about ${words} words). Short pages rarely get picked by AI.`,
      howToFix: passed
        ? undefined
        : 'Add more helpful detail — aim for at least 300 words that genuinely answer the questions people ask.',
    };
  },
];

export const AUDIT_RULES: Rule[] = [...SEO_RULES, ...AEO_RULES, ...GEO_RULES];

/** Run every audit rule against a crawled page. */
export function runAuditRules(page: CrawledPage): AuditFinding[] {
  return AUDIT_RULES.map((rule) => rule(page));
}
