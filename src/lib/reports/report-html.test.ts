import { describe, expect, it } from 'vitest';

import { renderReportHtml, type ReportData } from './report-html';

const base: ReportData = {
  brandName: 'Acme Agency',
  logoUrl: null,
  generatedAt: new Date('2026-07-21T00:00:00Z'),
  project: { domain: 'client.com', label: 'Client Co' },
  score: { date: '2026-07-21', blended: 48.05, geo: 54.36, aeo: 33.33, seo: null },
  audit: { pageUrl: 'https://client.com/page', overall: 82 },
  competitive: { projectCited: 3, total: 10, gaps: 2 },
};

describe('renderReportHtml', () => {
  it('includes branding, project, rounded scores, and sections', () => {
    const html = renderReportHtml(base);
    expect(html).toContain('Acme Agency');
    expect(html).toContain('Client Co');
    expect(html).toContain('client.com');
    expect(html).toContain('>48<'); // blended rounded
    expect(html).toContain('n/a'); // SEO null
    expect(html).toContain('3</strong> of');
    expect(html).toContain('client.com/page');
  });

  it('falls back to Plutoscope branding and handles missing data', () => {
    const html = renderReportHtml({
      ...base,
      brandName: null,
      score: null,
      audit: null,
      competitive: null,
    });
    expect(html).toContain('Plutoscope');
    expect(html).toContain('No tracking data yet.');
  });

  it('escapes HTML in user-controlled fields', () => {
    const html = renderReportHtml({
      ...base,
      project: { domain: 'client.com', label: '<script>alert(1)</script>' },
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
