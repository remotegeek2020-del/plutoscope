import 'server-only';

import { getServerEnv } from '@/lib/env';

// Content brief draft generator (Part VIII §47 Week 15). Given a topic and its citation-gap
// context, asks an LLM for a review-ready brief (human-in-the-loop by design — a draft, not
// auto-published copy). Server-only. Uses OpenAI when OPENAI_API_KEY is set, otherwise falls back
// to Gemini (GEMINI_API_KEY) so the feature works on either key — engines stay swappable.

const OPENAI_CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const OPENAI_DEFAULT_MODEL = 'gpt-4o';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = [
  'You are an SEO/AEO/GEO content strategist.',
  'Produce a concise CONTENT BRIEF (a plan to review, not finished copy) that would help a page',
  'get cited by AI answer engines (ChatGPT, Perplexity, Gemini) for the given topic.',
  'Output markdown with: a suggested H1, a 1–2 sentence direct answer, 3–5 FAQ questions with',
  'short answers, and a bulleted list of key points and entities to cover. Be specific and factual;',
  'do not invent statistics.',
].join(' ');

export async function generateBriefDraft(topic: string, gapContext: string): Promise<string> {
  const { OPENAI_API_KEY, GEMINI_API_KEY } = getServerEnv();
  const userContent = `Topic: ${topic}\n\nVisibility gap context:\n${gapContext}\n\nWrite the content brief.`;

  if (OPENAI_API_KEY) return generateWithOpenAI(OPENAI_API_KEY, userContent);
  if (GEMINI_API_KEY) return generateWithGemini(GEMINI_API_KEY, userContent);
  throw new Error('No LLM key configured — set OPENAI_API_KEY or GEMINI_API_KEY.');
}

async function generateWithOpenAI(apiKey: string, userContent: string): Promise<string> {
  const response = await fetch(OPENAI_CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? OPENAI_DEFAULT_MODEL,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
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

async function generateWithGemini(apiKey: string, userContent: string): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? GEMINI_DEFAULT_MODEL;
  const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userContent }] }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini error ${response.status}: ${body.slice(0, 500)}`);
  }

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini returned no content');
  return text;
}
