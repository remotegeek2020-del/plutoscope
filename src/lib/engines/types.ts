import type { Enums, Json } from '@/types/database.types';

/**
 * Engine adapter contract (Part III §16, §19).
 *
 * The system architecture isolates each engine behind an adapter so engines can be added,
 * removed, or swapped without touching the normalizer, scoring, or app layers. An adapter has
 * two responsibilities, kept separate on purpose:
 *   1. `run`       — call the engine's API for one prompt and return the RAW response verbatim
 *                    (stored in TrackingRun.raw_response for auditability).
 *   2. `normalize` — turn that raw response into NormalizedCitation rows.
 *
 * The concrete adapters are built starting Milestone 1 (Perplexity first, Week 4), then OpenAI
 * and Gemini in Milestone 2 (Week 7). This file is the contract they implement; the documented
 * per-engine response shapes live in `docs/engine-response-shapes.md`.
 */

export type EngineName = Enums<'tracking_engine'>; // 'openai' | 'perplexity' | 'gemini'

/** Input the scheduler hands an adapter for a single (project, prompt) tracking job. */
export interface EngineRunInput {
  projectId: string;
  promptId: string;
  promptText: string;
}

/** Normalized citation — the common schema every engine's raw response is reduced to. */
export interface NormalizedCitation {
  citedDomain: string;
  sourceUrl?: string;
  /** 1-based rank/order within the engine's answer, when the engine exposes ordering. */
  position?: number;
  snippet?: string;
}

export interface EngineAdapter {
  readonly engine: EngineName;
  /** Call the engine API for one prompt; return the raw response for TrackingRun.raw_response. */
  run(input: EngineRunInput): Promise<Json>;
  /** Reduce a raw response into normalized Citation rows. Pure — no I/O. */
  normalize(raw: Json): NormalizedCitation[];
}

/*
 * ---------------------------------------------------------------------------------------------
 * Documented raw-response shapes (the normalizer contract).
 *
 * These reflect the OFFICIAL API docs as of 2026-07 and are the target the normalizers are
 * built against. They are intentionally partial (only the fields we parse) and are marked
 * TO-BE-VERIFIED against a real response during the Week 2 prototype step, which is deferred
 * until the API keys are provisioned in a deployed environment. See docs/engine-response-shapes.md.
 * ---------------------------------------------------------------------------------------------
 */

/** OpenAI Responses API + `web_search` tool → `url_citation` annotations (Part III §19.1). */
export interface OpenAIWebSearchResponseShape {
  output: Array<{
    type: string;
    content?: Array<{
      type: string;
      text?: string;
      annotations?: Array<{
        type: 'url_citation';
        url: string;
        title?: string;
        start_index?: number;
        end_index?: number;
      }>;
    }>;
  }>;
}

/** Perplexity Sonar API → citations as structured response metadata (Part III §19.2). */
export interface PerplexitySonarResponseShape {
  /** Legacy flat list of source URLs. */
  citations?: string[];
  /** Newer structured search results. */
  search_results?: Array<{
    url: string;
    title?: string;
    snippet?: string;
  }>;
  choices?: Array<{ message?: { content?: string } }>;
}

/** Gemini API + Google Search grounding → groundingMetadata (Part III §19.3). */
export interface GeminiGroundingResponseShape {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri: string; title?: string };
      }>;
      groundingSupports?: Array<{
        segment?: { text?: string; startIndex?: number; endIndex?: number };
        groundingChunkIndices?: number[];
      }>;
    };
  }>;
}
