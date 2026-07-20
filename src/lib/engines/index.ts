import { perplexityAdapter } from './perplexity';
import type { EngineAdapter, EngineName } from './types';

// Engine adapter registry. Perplexity is the first adapter (Milestone 1, lowest integration
// effort per Part III §21). OpenAI and Gemini land in Milestone 2 (Week 7).
const REGISTRY: Partial<Record<EngineName, EngineAdapter>> = {
  perplexity: perplexityAdapter,
};

export function getAdapter(engine: EngineName): EngineAdapter | undefined {
  return REGISTRY[engine];
}

export { perplexityAdapter };
