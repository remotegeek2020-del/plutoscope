import { z } from 'zod';

// A content brief as a structured object, so we can deterministically render three artifacts from
// one LLM call: the human-readable brief (markdown), a paste-ready HTML page, and a valid
// schema.org FAQPage JSON-LD block. Rendering here is pure (no network) and unit-tested — the
// schema is built by us, not trusted from the model, so it's always valid.

export interface BriefStructure {
  h1: string;
  directAnswer: string;
  faqs: { question: string; answer: string }[];
  keyPoints: string[];
}

const briefSchema = z.object({
  h1: z.string().min(1),
  directAnswer: z.string().min(1),
  faqs: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .min(1),
  keyPoints: z.array(z.string().min(1)).default([]),
});

/** Parse an LLM response into a BriefStructure, tolerating code fences / surrounding prose. */
export function parseBrief(raw: string): BriefStructure {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('The model did not return a JSON brief.');
  }
  let json: unknown;
  try {
    json = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new Error('The model returned malformed JSON.');
  }
  const parsed = briefSchema.safeParse(json);
  if (!parsed.success) throw new Error('The model JSON was missing required brief fields.');
  return parsed.data;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Human-readable, editable brief (what the reviewer reads/tweaks). */
export function briefToMarkdown(b: BriefStructure): string {
  const lines = [`# ${b.h1}`, '', `**Direct answer:** ${b.directAnswer}`, '', '## FAQ'];
  for (const f of b.faqs) lines.push(`### ${f.question}`, f.answer, '');
  if (b.keyPoints.length) {
    lines.push('## Key points to cover');
    for (const p of b.keyPoints) lines.push(`- ${p}`);
  }
  return lines.join('\n').trim();
}

/** Paste-ready HTML page — drop into a CMS and publish. */
export function briefToHtml(b: BriefStructure): string {
  const faqs = b.faqs
    .map((f) => `    <h3>${escapeHtml(f.question)}</h3>\n    <p>${escapeHtml(f.answer)}</p>`)
    .join('\n');
  return [
    '<article>',
    `  <h1>${escapeHtml(b.h1)}</h1>`,
    `  <p>${escapeHtml(b.directAnswer)}</p>`,
    '  <section>',
    '    <h2>Frequently asked questions</h2>',
    faqs,
    '  </section>',
    '</article>',
  ].join('\n');
}

/** schema.org FAQPage JSON-LD, wrapped in a <script> tag ready to paste into the page <head>. */
export function briefToFaqSchema(b: BriefStructure): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: b.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}
