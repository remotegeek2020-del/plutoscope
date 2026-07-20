import { getTierLimits, type AccountTier } from '@/lib/tiers';

/**
 * Topic → prompt expansion (Part VIII §43 Week 2; Part III §22 open question).
 *
 * One user-entered topic expands into N tracked prompts, each of which becomes a TrackingRun
 * per engine per schedule tick. Because every prompt multiplies AI-API cost, the number of
 * prompts is HARD-CAPPED per tier (see `TIER_LIMITS`). This first-pass expander is deterministic
 * and template-based (no LLM call, so it adds zero API cost and is trivially testable). A future
 * iteration may swap in LLM-generated prompt sets — the cap and the function contract stay the
 * same, so callers and the scheduler don't change.
 */

// Ordered from most to least important, so a low cap keeps the highest-signal prompts.
const PROMPT_TEMPLATES: ReadonlyArray<(topic: string) => string> = [
  (t) => t,
  (t) => `What is the best ${t}?`,
  (t) => `Which ${t} is best?`,
  (t) => `Top ${t} recommendations`,
  (t) => `Best ${t} options compared`,
  (t) => `How do I choose ${t}?`,
  (t) => `Who offers the best ${t}?`,
  (t) => `${t} reviews`,
];

/** Trim, collapse internal whitespace, and strip trailing sentence punctuation. */
export function normalizeTopic(topicRaw: string): string {
  return topicRaw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?.!]+$/g, '')
    .trim();
}

/**
 * Expand a topic into up to `maxPrompts` unique prompts. Returns `[]` for an empty/blank topic.
 * `maxPrompts` is clamped to at least 1; there is no need to exceed the template count.
 */
export function expandTopicToPrompts(topicRaw: string, maxPrompts: number): string[] {
  const topic = normalizeTopic(topicRaw);
  if (!topic) return [];

  const cap = Math.max(1, Math.floor(maxPrompts));
  const seen = new Set<string>();
  const prompts: string[] = [];

  for (const template of PROMPT_TEMPLATES) {
    if (prompts.length >= cap) break;
    const prompt = template(topic).trim();
    const key = prompt.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      prompts.push(prompt);
    }
  }

  return prompts;
}

/** Convenience: expand using the caller's tier cap. */
export function expandTopicForTier(topicRaw: string, tier: AccountTier): string[] {
  return expandTopicToPrompts(topicRaw, getTierLimits(tier).maxPromptsPerTopic);
}
