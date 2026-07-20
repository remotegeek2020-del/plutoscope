import { createClient } from '@/lib/supabase/server';

// Minimal internal inspector for TrackingRun + Citation rows (Part VIII §43 Week 4). Uses the
// signed-in user's session, so RLS scopes it to their own projects. The full staff admin console
// (cross-account, impersonation) is Milestone 5.
export const dynamic = 'force-dynamic';

type RunRow = {
  id: string;
  engine: string;
  status: string;
  run_at: string | null;
  created_at: string;
  citations: { cited_domain: string; position: number | null; source_url: string | null }[];
};

export default async function TrackingRunsPage() {
  const supabase = await createClient();
  const { data: runs } = await supabase
    .from('tracking_runs')
    .select('id, engine, status, run_at, created_at, citations(cited_domain, position, source_url)')
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<RunRow[]>();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Tracking Runs <span className="text-sm font-normal text-slate-400">(internal)</span>
      </h1>

      {!runs || runs.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No tracking runs yet. The hourly scheduler enqueues runs for your project&apos;s prompts;
          the processor fills in citations once the Perplexity key is configured in the deployed
          environment.
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left dark:border-slate-800">
              <th className="py-2 pr-4 font-medium">Engine</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Run at</th>
              <th className="py-2 pr-4 font-medium">Citations</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-2 pr-4">{run.engine}</td>
                <td className="py-2 pr-4">{run.status}</td>
                <td className="py-2 pr-4 text-slate-500">
                  {run.run_at ? new Date(run.run_at).toLocaleString() : '—'}
                </td>
                <td className="py-2 pr-4 text-slate-500">
                  {run.citations.length > 0
                    ? run.citations
                        .map((c) => c.cited_domain)
                        .slice(0, 5)
                        .join(', ')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
