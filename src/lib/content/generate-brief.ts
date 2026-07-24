import 'server-only';

import { getServerEnv } from '@/lib/env';

import { type BriefStructure, parseBrief } from './brief-render';

// Content brief draft generator (Part VIII §47 Week 15). Given a topic and its citation-gap
// context, asks an LLM for a structured brief (human-in-the-loop by design — a plan to review, not
// auto-published copy). Server-only. Uses OpenAI when OPENAI_API_KEY is set, otherwise Gemini
// (GEMINI_API_KEY) — engines stay swappable. Both are asked for JSON so we can render markdown, a
// paste-ready HTML page, and a valid FAQ schema from one call (see brief-render.ts).

const OPENAI_CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const OPENAI_DEFAULT_MODEL = 'gpt-4o';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = [
  'You are an SEO/AEO/GEO content strategist.',
  'Produce a CONTENT BRIEF (a plan to review, not finished copy) for a page that should get cited',
  'by AI answer engines (ChatGPT, Perplexity, Gemini) for the given topic.',
  'Respond with ONLY a JSON object (no markdown, no prose) of this exact shape:',
  '{"h1": string, "directAnswer": string (1-2 sentences), "faqs": [{"question": string,',
  '"answer": string}] (3 to 5 items), "keyPoints": [string] (4 to 7 items)}.',
  'Be specific and factual; do not invent statistics.',
].join(' ');

export async function generateBrief(topic: string, gapContext: string): Promise<BriefStructure> {
  const { OPENAI_API_KEY, GEMINI_API_KEY } = getServerEnv();
  const userContent = `Topic: ${topic}\n\nVisibility gap context:\n${gapContext}\n\nWrite the content brief as JSON.`;

  let raw: string;
  if (OPENAI_API_KEY) raw = await generateWithOpenAI(OPENAI_API_KEY, userContent);
  else if (GEMINI_API_KEY) raw = await generateWithGemini(GEMINI_API_KEY, userContent);
  else throw new Error('No LLM key configured — set OPENAI_API_KEY or GEMINI_API_KEY.');

  return parseBrief(raw);
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
      response_format: { type: 'json_object' },
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
      generationConfig: { responseMimeType: 'application/json' },
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
