import { describe, expect, it } from 'vitest';

import { runAuditRules } from './rules';
import { scoreAudit } from './score';
import type { CrawledPage } from './types';

// Week 14 "validate audit scoring by hand": realistic page archetypes with the pass/fail a human
// reviewer would agree with, encoded as assertions. Guards the Week-14 rule fixes (internal-link
// exclusion, JSON-LD via rawHtml, recent-year freshness) against regressions.

const failedIds = (page: CrawledPage) =>
  runAuditRules(page)
    .filter((f) => !f.passed)
    .map((f) => f.id);

describe('audit validation — realistic pages', () => {
  it('a thin marketing landing page is flagged on the weaknesses a human would name', () => {
    const landingPage: CrawledPage = {
      url: 'https://acme.com/',
      markdown: [
        '# Acme — The Best CRM',
        '',
        'Sign up today.',
        '',
        '[Get started](https://acme.com/signup)',
      ].join('\n'),
      metadata: { title: 'Acme — The Best CRM' },
    };
    const failed = failedIds(landingPage);
    expect(failed).toEqual(
      expect.arrayContaining([
        'seo-meta-description',
        'seo-heading-structure',
        'aeo-question-headings',
        'aeo-structured-lists',
        'geo-outbound-citations', // the only link is to its own domain — not an external citation
        'geo-structured-data',
        'geo-freshness',
        'geo-sufficient-depth',
      ]),
    );
    // it does have a title and a single H1 — those should NOT be flagged
    expect(failed).not.toContain('seo-title-present');
    expect(failed).not.toContain('seo-single-h1');
  });

  it('a solid reference article passes SEO/AEO/GEO fundamentals but is flagged for missing schema', () => {
    const body = 'Choosing a CRM depends on team size, budget, and integrations. '.repeat(40);
    const article: CrawledPage = {
      url: 'https://acme.com/guide/best-crm',
      markdown: [
        '# The best CRM software, compared',
        '',
        'The best CRM for most small teams is Acme, thanks to its price and ease of use.',
        '',
        '## Top picks',
        '',
        '- Acme — best overall',
        '- Rival — best for enterprise',
        '',
        `## How we evaluated${'\n\n'}${body}`,
        '',
        'Sources: [G2](https://g2.com/crm) and [Capterra](https://capterra.com/crm). Last updated 2026.',
      ].join('\n'),
      html: '<article>…</article>',
      rawHtml: '<html><body><article>…</article></body></html>', // no JSON-LD
      metadata: { title: 'Best CRM Software (2026)', description: 'How to choose the right CRM.' },
    };

    const failed = failedIds(article);
    // schema is genuinely missing (high severity) and headings aren't question-form
    expect(failed).toContain('geo-structured-data');
    expect(failed).toContain('aeo-question-headings');
    // the fundamentals hold up
    expect(failed).not.toContain('seo-title-present');
    expect(failed).not.toContain('seo-heading-structure');
    expect(failed).not.toContain('geo-outbound-citations');
    expect(failed).not.toContain('geo-sufficient-depth');
    expect(failed).not.toContain('geo-freshness');

    // the top prioritized fix is the high-severity structured-data gap
    const { recommendations, disciplines } = scoreAudit(runAuditRules(article));
    expect(recommendations[0].id).toBe('geo-structured-data');
    expect(recommendations[0].severity).toBe('high');
    expect(disciplines.seo).toBeGreaterThanOrEqual(80);
  });
});
