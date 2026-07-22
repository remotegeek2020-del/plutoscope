import 'server-only';

import { getServerEnv } from '@/lib/env';

// Content brief draft generator (Part VIII §47 Week 15). Given a topic and its citation-gap
// context, asks an LLM for a review-ready brief (human-in-the-loop by design — a draft, not
// auto-published copy). Server-only; the live call runs with OPENAI_API_KEY in the deployed env.

const OPENAI_CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';

const SYSTEM_PROMPT = [
  'You are an SEO/AEO/GEO content strategist.',
  'Produce a concise CONTENT BRIEF (a plan to review, not finished copy) that would help a page',
  'get cited by AI answer engines (ChatGPT, Perplexity, Gemini) for the given topic.',
  'Output markdown with: a suggested H1, a 1–2 sentence direct answer, 3–5 FAQ questions with',
  'short answers, and a bulleted list of key points and entities to cover. Be specific and factual;',
  'do not invent statistics.',
].join(' ');

export async function generateBriefDraft(topic: string, gapContext: string): Promise<string> {
  const { OPENAI_API_KEY } = getServerEnv();
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch(OPENAI_CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Topic: ${topic}\n\nVisibility gap context:\n${gapContext}\n\nWrite the content brief.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${body.slice(0, 500)}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned no content');
  return content;
}
