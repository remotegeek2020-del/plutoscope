import { describe, expect, it } from 'vitest';

import {
  countOutboundLinks,
  hasFreshnessSignal,
  hasJsonLd,
  hasListMarkup,
  parseHeadings,
  runAuditRules,
  wordCount,
} from './rules';
import type { CrawledPage } from './types';

describe('audit parsing helpers', () => {
  it('parses markdown headings with levels', () => {
    expect(parseHeadings('# Title\n\n## Sub\ntext\n### Deep')).toEqual([
      { level: 1, text: 'Title' },
      { level: 2, text: 'Sub' },
      { level: 3, text: 'Deep' },
    ]);
  });

  it('counts outbound http links, excluding same-domain links', () => {
    expect(countOutboundLinks('[a](https://x.com) [b](/internal) [c](http://y.com)')).toBe(2);
    // links back to the page's own domain are not "external citations"
    expect(countOutboundLinks('[self](https://acme.com/x) [ext](https://y.com)', 'acme.com')).toBe(
      1,
    );
  });

  it('detects list markup and json-ld (from rawHtml, since cleaned html strips scripts)', () => {
    expect(hasListMarkup('- one\n- two')).toBe(true);
    expect(hasListMarkup('just prose')).toBe(false);
    expect(hasJsonLd({ rawHtml: '<script type="application/ld+json">{}</script>' })).toBe(true);
    expect(hasJsonLd({ html: '<p>none</p>' })).toBe(false);
  });

  it('detects freshness from a year or metadata', () => {
    expect(hasFreshnessSignal({ url: '', markdown: 'Updated 2026.', metadata: {} })).toBe(true);
    expect(
      hasFreshnessSignal({ url: '', markdown: 'no date', metadata: { modifiedTime: 'x' } }),
    ).toBe(true);
    expect(hasFreshnessSignal({ url: '', markdown: 'no date here', metadata: {} })).toBe(false);
  });

  it('counts words', () => {
    expect(wordCount('# Heading\n\none two three')).toBe(4);
  });
});

const STRONG_PAGE: CrawledPage = {
  url: 'https://acme.com/guide',
  markdown: [
    '# What is the best CRM software?',
    '',
    'Acme CRM is a top pick for small teams.',
    '',
    '## How do I choose?',
    '',
    '- Ease of use',
    '- Price',
    '',
    'See [G2](https://g2.com) and [Capterra](https://capterra.com). Updated 2026. ' +
      'word '.repeat(320),
  ].join('\n'),
  html: '<script type="application/ld+json">{"@type":"Article"}</script>',
  metadata: { title: 'Best CRM Software (2026)', description: 'A guide to choosing a CRM.' },
};

const WEAK_PAGE: CrawledPage = {
  url: 'https://acme.com/thin',
  markdown: 'Some short prose with no structure and no links.',
  metadata: {},
};

describe('runAuditRules', () => {
  it('passes all checks for a well-optimized page', () => {
    const findings = runAuditRules(STRONG_PAGE);
    const failed = findings.filter((f) => !f.passed);
    expect(failed).toEqual([]);
    expect(findings).toHaveLength(12);
  });

  it('flags the expected failures for a weak page, each with a recommendation', () => {
    const findings = runAuditRules(WEAK_PAGE);
    const failedIds = findings.filter((f) => !f.passed).map((f) => f.id);
    expect(failedIds).toContain('seo-title-present');
    expect(failedIds).toContain('geo-structured-data');
    expect(failedIds).toContain('geo-sufficient-depth');
    expect(failedIds).toContain('aeo-structured-lists');
    // every failed finding must tell the user how to fix it
    for (const finding of findings.filter((f) => !f.passed)) {
      expect(finding.recommendation).toBeTruthy();
    }
  });

  it('covers all three disciplines', () => {
    const disciplines = new Set(runAuditRules(STRONG_PAGE).map((f) => f.discipline));
    expect([...disciplines].sort()).toEqual(['aeo', 'geo', 'seo']);
  });
});
