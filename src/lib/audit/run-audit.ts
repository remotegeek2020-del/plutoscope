import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.types';

import { crawlPage } from './firecrawl';
import { runAuditRules } from './rules';
import { scoreAudit } from './score';

/**
 * Crawl a page (Firecrawl), run the audit rules, score them, and persist an AuditReport. Runs under
 * the user's session, so RLS guarantees the report attaches to a project the caller owns. Server-
 * only; the live crawl requires FIRECRAWL_API_KEY in the deployed environment.
 */
export async function runAudit(projectId: string, pageUrl: string): Promise<void> {
  const page = await crawlPage(pageUrl);
  const findings = runAuditRules(page);
  const score = scoreAudit(findings);

  const supabase = await createClient();
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
