// White-label report HTML (Part VIII §47 Week 17). Pure: builds a self-contained, print-ready
// HTML document (inline CSS) from a project's visibility/audit/competitive summary plus the
// account's branding. Rendered to PDF by reports/pdf.ts. Unit-tested for content + escaping.

export interface ReportData {
  brandName?: string | null;
  logoUrl?: string | null;
  generatedAt: Date;
  project: { domain: string; label?: string | null };
  score: {
    date: string;
    blended: number | null;
    geo: number | null;
    aeo: number | null;
    seo: number | null;
  } | null;
  audit: { pageUrl: string; overall: number | null } | null;
  competitive: { projectCited: number; total: number; gaps: number } | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function metric(label: string, value: number | null): string {
  const display = value === null ? 'n/a' : String(Math.round(value));
  return `<div class="metric"><div class="metric-value">${display}</div><div class="metric-label">${escapeHtml(label)}</div></div>`;
}

export function renderReportHtml(data: ReportData): string {
  const brand = data.brandName?.trim() || 'Plutoscope';
  const projectName = data.project.label?.trim() || data.project.domain;
  const logo = data.logoUrl
    ? `<img src="${escapeHtml(data.logoUrl)}" alt="${escapeHtml(brand)}" class="logo" />`
    : `<div class="brand">${escapeHtml(brand)}</div>`;

  const scoreSection = data.score
    ? `<section>
         <h2>Visibility</h2>
         <div class="metrics">
           ${metric('Blended', data.score.blended)}
           ${metric('GEO', data.score.geo)}
           ${metric('AEO', data.score.aeo)}
           ${metric('SEO', data.score.seo)}
         </div>
         <p class="muted">As of ${escapeHtml(data.score.date)}</p>
       </section>`
    : `<section><h2>Visibility</h2><p class="muted">No tracking data yet.</p></section>`;

  const competitiveSection = data.competitive
    ? `<section>
         <h2>Competitive</h2>
         <p>Cited on <strong>${data.competitive.projectCited}</strong> of
            <strong>${data.competitive.total}</strong> tracked prompts,
            with <strong>${data.competitive.gaps}</strong> competitor gap(s).</p>
       </section>`
    : '';

  const auditSection = data.audit
    ? `<section>
         <h2>Latest Audit</h2>
         <p>${escapeHtml(data.audit.pageUrl)} —
            <strong>${data.audit.overall === null ? 'n/a' : Math.round(data.audit.overall)}</strong> overall</p>
       </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3B2E58; padding-bottom: 16px; }
  .logo { max-height: 48px; }
  .brand { font-size: 20px; font-weight: 700; color: #3B2E58; }
  h1 { font-size: 22px; margin: 24px 0 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin: 28px 0 8px; }
  .muted { color: #94a3b8; font-size: 12px; }
  .metrics { display: flex; gap: 24px; }
  .metric-value { font-size: 32px; font-weight: 700; color: #3B2E58; }
  .metric-label { font-size: 11px; text-transform: uppercase; color: #64748b; }
  footer { margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 12px; color: #94a3b8; font-size: 11px; }
</style>
</head>
<body>
  <header>
    ${logo}
    <div class="muted">Visibility Report</div>
  </header>
  <h1>${escapeHtml(projectName)}</h1>
  <div class="muted">${escapeHtml(data.project.domain)}</div>
  ${scoreSection}
  ${competitiveSection}
  ${auditSection}
  <footer>Generated ${escapeHtml(data.generatedAt.toISOString().slice(0, 10))} by ${escapeHtml(brand)}.</footer>
</body>
</html>`;
}
