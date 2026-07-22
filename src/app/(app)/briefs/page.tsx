import Link from 'next/link';

import { getActiveProjectId, resolveActiveProject } from '@/lib/active-project';
import { createClient } from '@/lib/supabase/server';

import { BriefEditor, GenerateBriefButton } from './brief-controls';

export const dynamic = 'force-dynamic';

export default async function ContentBriefPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const supabase = await createClient();
  const { project: projectParam } = await searchParams;

  const { data: projects } = await supabase
    .from('projects')
    .select('id, domain, label')
    .order('created_at', { ascending: false });

  if (!projects || projects.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
          Content Briefs
        </h1>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Create a project and add topics first — briefs are generated from your tracked topics.
        </p>
      </div>
    );
  }

  const active =
    resolveActiveProject(projects, await getActiveProjectId(), projectParam) ?? projects[0];

  const [{ data: topics }, { data: briefs }] = await Promise.all([
    supabase.from('topics').select('id, text').eq('project_id', active.id),
    supabase
      .from('content_briefs')
      .select('id, topic_id, gap_summary, draft_content, status, created_at')
      .eq('project_id', active.id)
      .order('created_at', { ascending: false }),
  ]);

  const topicText = new Map((topics ?? []).map((t) => [t.id, t.text]));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Content Briefs
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Turn a citation gap into an AI-drafted brief. Drafts are yours to edit and approve —
        human-in-the-loop, never auto-published.
      </p>

      {projects.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/briefs?project=${p.id}`}
              className={`rounded-md px-3 py-1 text-sm ${
                p.id === active.id
                  ? 'bg-instrument text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {p.label || p.domain}
            </Link>
          ))}
        </div>
      ) : null}

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Topics</h2>
        {(topics ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No topics yet — add some in Project Setup.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {(topics ?? []).map((topic) => (
              <li
                key={topic.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
              >
                <span>{topic.text}</span>
                <GenerateBriefButton projectId={active.id} topicId={topic.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Briefs</h2>
        {(briefs ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No briefs yet. Generate one from a topic above.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {(briefs ?? []).map((brief) => (
              <div
                key={brief.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {brief.topic_id ? (topicText.get(brief.topic_id) ?? 'Topic') : 'Topic'}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      brief.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {brief.status}
                  </span>
                </div>
                {brief.gap_summary ? (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {brief.gap_summary}
                  </p>
                ) : null}
                <BriefEditor brief={brief} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
