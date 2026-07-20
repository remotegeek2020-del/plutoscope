'use client';

import { useState, useTransition } from 'react';

import { expandTopicToPrompts } from '@/lib/tracking/prompt-expansion';

import { createProject } from './actions';

interface Props {
  tier: string;
  maxTopics: number;
  maxPromptsPerTopic: number;
  maxCompetitors: number;
}

export function ProjectSetupForm({ tier, maxTopics, maxPromptsPerTopic, maxCompetitors }: Props) {
  const [domain, setDomain] = useState('');
  const [label, setLabel] = useState('');
  const [topics, setTopics] = useState<string[]>(['']);
  const [competitors, setCompetitors] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateAt = (
    list: string[],
    setList: (v: string[]) => void,
    index: number,
    value: string,
  ) => {
    const next = [...list];
    next[index] = value;
    setList(next);
  };

  const removeAt = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createProject({ domain, label, topics, competitors });
      // A successful action redirects; only a failure returns a result here.
      if (result && !result.ok) setError(result.error);
    });
  };

  const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

  return (
    <form onSubmit={onSubmit} className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Project Setup
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Add a domain to track, the topics you care about (each expands into tracked prompts), and up
        to {maxCompetitors} competitor{maxCompetitors === 1 ? '' : 's'}.{' '}
        <span className="text-slate-400">Plan: {tier}.</span>
      </p>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Domain</span>
          <input
            className={inputClass}
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Label (optional)</span>
          <input
            className={inputClass}
            placeholder="My site"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Topics</h2>
          <span className="text-xs text-slate-400">
            up to {maxTopics}, {maxPromptsPerTopic} prompts each
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-4">
          {topics.map((topic, index) => {
            const preview = expandTopicToPrompts(topic, maxPromptsPerTopic);
            return (
              <div
                key={index}
                className="rounded-md border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="flex gap-2">
                  <input
                    className={`${inputClass} flex-1`}
                    placeholder="e.g. best CRM software"
                    value={topic}
                    onChange={(e) => updateAt(topics, setTopics, index, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeAt(topics, setTopics, index)}
                    className="rounded-md px-2 text-sm text-slate-400 hover:text-red-600"
                    aria-label="Remove topic"
                  >
                    ✕
                  </button>
                </div>
                {preview.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {preview.map((prompt) => (
                      <span
                        key={prompt}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {prompt}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {topics.length < maxTopics ? (
          <button
            type="button"
            onClick={() => setTopics([...topics, ''])}
            className="mt-3 text-sm font-medium text-instrument dark:text-pluto"
          >
            + Add topic
          </button>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Competitors</h2>
        <div className="mt-3 flex flex-col gap-2">
          {competitors.map((competitor, index) => (
            <div key={index} className="flex gap-2">
              <input
                className={`${inputClass} flex-1`}
                placeholder="competitor.com"
                value={competitor}
                onChange={(e) => updateAt(competitors, setCompetitors, index, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeAt(competitors, setCompetitors, index)}
                className="rounded-md px-2 text-sm text-slate-400 hover:text-red-600"
                aria-label="Remove competitor"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {competitors.length < maxCompetitors ? (
          <button
            type="button"
            onClick={() => setCompetitors([...competitors, ''])}
            className="mt-3 text-sm font-medium text-instrument dark:text-pluto"
          >
            + Add competitor
          </button>
        ) : null}
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="mt-8 rounded-md bg-instrument px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? 'Creating…' : 'Create project'}
      </button>
    </form>
  );
}
