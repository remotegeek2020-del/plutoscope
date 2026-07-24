import Link from 'next/link';

import { HelpNote } from '@/app/(app)/_components/help-note';
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
      .select('id, topic_id, gap_summary, draft_content, page_html, faq_schema, status, created_at')
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

      <HelpNote title="What is a content brief and how does it fix my problem?">
        <p>
          A <strong>content brief is a blueprint for one web page</strong> — a plan you (or a
          writer) use to build a page on your own site. Plutoscope doesn&apos;t publish anything; it
          tells you <em>exactly what page to create</em> so the AI starts recommending you.
        </p>
        <p className="font-medium">How to use it, step by step:</p>
        <ol className="ml-4 list-decimal space-y-1">
          <li>
            Pick a topic below and click <strong>Generate brief</strong>. Plutoscope reads your gap
            data (which questions competitors win and you don&apos;t) and drafts a plan.
          </li>
          <li>
            The brief gives you a suggested <strong>headline</strong>, a <strong>direct answer</strong>{' '}
            to put at the top, <strong>FAQ questions</strong>, and <strong>key points to cover</strong>.
          </li>
          <li>
            <strong>Edit</strong> it if you like, then mark it <strong>Approved</strong> (your note
            that you&apos;re acting on it).
          </li>
          <li>
            Hand the brief to whoever runs your website. They <strong>write and publish</strong> that
            page on your domain, following the plan.
          </li>
          <li>
            Weeks later, <strong>re-run tracking</strong>. As the AIs pick up your new page, that
            gap&apos;s &ldquo;—&rdquo; turns into a citation and your score climbs.
          </li>
        </ol>
        <p>
          <strong>Why it works:</strong> AI answer engines cite pages that clearly and credibly
          answer the exact question. The brief is engineered to produce exactly that kind of page —
          which is what moves you from invisible to cited.
        </p>
      </HelpNote>

      <HelpNote title="Why not just a magic script that does it all automatically?">
        <p>
          It&apos;s a fair thing to want — but a snippet that auto-injects content wouldn&apos;t
          actually work, and we won&apos;t pretend otherwise. Here&apos;s the honest reasoning:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>AI engines cite real, server-rendered content on your domain.</strong> Text
            injected by a client-side script often isn&apos;t seen or trusted by crawlers the same
            way — &ldquo;content that only exists in JavaScript&rdquo; is a known blind spot, so a
            magic script would add words no AI ever reads.
          </li>
          <li>
            <strong>Auto-publishing unreviewed AI text is risky.</strong> A single wrong fact would
            go live on your site under your name. Citations are earned by being credible — one bad
            claim undoes it.
          </li>
          <li>
            <strong>The citation comes from you genuinely having the best answer.</strong> There is
            no snippet that fakes that. Real page, real answer, on your domain — that&apos;s the
            whole game.
          </li>
        </ul>
        <p>
          So instead of fake magic, we do the real easy mode:{' '}
          <strong>we generate the finished page HTML and its structured-data script for you</strong>{' '}
          (on each brief below). You paste two blocks into your site and publish — minutes of work,
          and it actually earns citations.
        </p>
      </HelpNote>

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
        <h2 className="text-sm font-semibold">Step 1 — Generate a brief from a topic</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Click &ldquo;Generate brief&rdquo; next to a topic to draft a page plan for the questions
          you&apos;re losing on.
        </p>
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
        <h2 className="text-sm font-semibold">Step 2 — Your page blueprints</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Each brief is a plan for one page to build on your site. Edit it, approve it, then have
          that page written and published — that&apos;s what earns the citation.
        </p>
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
