import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.types';

import { crawlPage, mapSite } from './firecrawl';
import { runAuditRules } from './rules';
import { scoreAudit } from './score';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Crawl one page, run the rules, score, and persist an AuditReport. */
async function auditPageToReport(
  supabase: Supabase,
  projectId: string,
  pageUrl: string,
): Promise<void> {
  const page = await crawlPage(pageUrl);
  const findings = runAuditRules(page);
  const score = scoreAudit(findings);

  const { error } = await supabase.from('audit_reports').insert({
    project_id: projectId,
    page_url: pageUrl,
    overall_score: score.overall,
    seo_findings: findings.filter((f) => f.discipline === 'seo') as unknown as Json,
    aeo_findings: findings.filter((f) => f.discipline === 'aeo') as unknown as Json,
    geo_findings: findings.filter((f) => f.discipline === 'geo') as unknown as Json,
    recommendations: score.recommendations as unknown as Json,
  });
  if (error) throw new Error(error.message);
}

/**
 * Crawl a single page (Firecrawl), run the audit rules, score them, and persist an AuditReport.
 * Runs under the user's session, so RLS guarantees the report attaches to a project the caller
 * owns. Server-only; the live crawl requires FIRECRAWL_API_KEY in the deployed environment.
 */
export async function runAudit(projectId: string, pageUrl: string): Promise<void> {
  const supabase = await createClient();
  await auditPageToReport(supabase, projectId, pageUrl);
}

export interface SiteAuditSummary {
  audited: number;
  failed: number;
  discovered: number;
}

/**
 * Whole-site audit: map the project's domain, then audit up to `limit` pages and store a report for
 * each. Pages are crawled in small concurrent batches to stay within serverless time limits without
 * hammering the crawl vendor's rate limit. Per-page failures are counted, not fatal.
 */
export async function runSiteAudit(
  projectId: string,
  domain: string,
  limit: number,
): Promise<SiteAuditSummary> {
  const supabase = await createClient();

  const allUrls = await mapSite(domain);
  const urls = allUrls.slice(0, Math.max(1, limit));

  let audited = 0;
  let failed = 0;
  const BATCH = 3;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((url) => auditPageToReport(supabase, projectId, url)),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') audited += 1;
      else failed += 1;
    }
  }

  return { audited, failed, discovered: allUrls.length };
}
