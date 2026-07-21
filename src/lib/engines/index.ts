import { geminiAdapter } from './gemini';
import { openaiAdapter } from './openai';
import { perplexityAdapter } from './perplexity';
import type { EngineAdapter, EngineName } from './types';

// Engine adapter registry. All three MVP engines are wired (Milestone 1: Perplexity;
// Milestone 2 / Week 7: OpenAI + Gemini). Adding an engine = a new adapter + registry entry;
// the scheduler and normalizer contract are untouched.
const REGISTRY: Partial<Record<EngineName, EngineAdapter>> = {
  perplexity: perplexityAdapter,
  openai: openaiAdapter,
  gemini: geminiAdapter,
};

export function getAdapter(engine: EngineName): EngineAdapter | undefined {
  return REGISTRY[engine];
}

export { perplexityAdapter, openaiAdapter, geminiAdapter };
