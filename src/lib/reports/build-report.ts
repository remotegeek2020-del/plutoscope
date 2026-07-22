import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { normalizeDomain } from '@/lib/tracking/url';

import { renderReportHtml, type ReportData } from './report-html';

/**
 * Gather a project's latest visibility score, most-recent audit, and competitive summary (all
 * RLS-scoped to the caller) plus the account's branding, and render the white-label report HTML.
 * Returns null if the project isn't found/owned.
 */
export async function buildReportHtml(projectId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, domain, label, account_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return null;

  const [{ data: account }, { data: score }, { data: audit }, { data: prompts }] =
    await Promise.all([
      supabase
        .from('accounts')
        .select('report_brand_name, report_logo_url')
        .eq('id', project.account_id)
        .maybeSingle(),
      supabase
        .from('visibility_scores')
        .select('date, blended_index, geo_score, aeo_score, seo_score')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('audit_reports')
        .select('page_url, overall_score')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('prompts').select('id').eq('project_id', projectId),
    ]);

  // Competitive summary: how many prompts have the project's domain cited in their latest runs.
  const projectDomain = normalizeDomain(project.domain) ?? project.domain;
  let competitive: ReportData['competitive'] = null;
  const promptCount = prompts?.length ?? 0;
  if (promptCount > 0) {
    const { data: runs } = await supabase
      .from('tracking_runs')
      .select('id, prompt_id, engine, run_at')
      .eq('project_id', projectId)
      .eq('status', 'succeeded')
      .order('run_at', { ascending: false });

    const latestRunByCheck = new Map<string, string>();
    for (const run of runs ?? []) {
      const key = `${run.prompt_id}:${run.engine}`;
      if (!latestRunByCheck.has(key)) latestRunByCheck.set(key, run.id);
    }
    const runIds = [...latestRunByCheck.values()];
    const { data: citations } = runIds.length
      ? await supabase
          .from('citations')
          .select('tracking_run_id')
          .in('tracking_run_id', runIds)
          .eq('cited_domain', projectDomain)
      : { data: [] };
    // count distinct prompts where the project's domain is cited
    const runToPrompt = new Map<string, string>();
    for (const run of runs ?? []) runToPrompt.set(run.id, run.prompt_id);
    const citedPrompts = new Set<string>();
    for (const row of citations ?? []) {
      const promptId = runToPrompt.get(row.tracking_run_id);
      if (promptId) citedPrompts.add(promptId);
    }
    competitive = { projectCited: citedPrompts.size, total: promptCount, gaps: 0 };
  }

  const data: ReportData = {
    brandName: account?.report_brand_name,
    logoUrl: account?.report_logo_url,
    generatedAt: new Date(),
    project: { domain: project.domain, label: project.label },
    score: score
      ? {
          date: score.date,
          blended: score.blended_index,
          geo: score.geo_score,
          aeo: score.aeo_score,
          seo: score.seo_score,
        }
      : null,
    audit: audit ? { pageUrl: audit.page_url, overall: audit.overall_score } : null,
    competitive,
  };

  return renderReportHtml(data);
}
