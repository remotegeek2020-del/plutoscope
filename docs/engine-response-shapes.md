# Engine Response Shapes (Normalizer Contract)

> Part VIII §43 Week 2 deliverable. This is the contract the per-engine **normalizers** (built
> from Milestone 1, Week 4) are written against. Every adapter stores the **raw** response in
> `tracking_runs.raw_response` (jsonb) for auditability, then a normalizer reduces it to
> `citations` rows: `{ cited_domain, source_url, position, snippet }`.
>
> **Status: adapters BUILT against these shapes; not yet live-verified.** All three adapters
> (`perplexity.ts` Milestone 1; `openai.ts` + `gemini.ts` Milestone 2 / Week 7) are implemented
> with pure, unit-tested normalizers. The shapes come from the official API docs (2026-07); the
> "one real call per engine, confirm the actual shape" step is deferred until the API keys are in
> a deployed environment (keys kept in Vercel, not CI). When that runs, verify each shape against
> a real response and update `src/lib/engines/types.ts` + the normalizers if anything differs.

TypeScript equivalents of everything below live in
[`src/lib/engines/types.ts`](../src/lib/engines/types.ts).

---

## 1. OpenAI — ChatGPT (Part III §19.1)

- **Call:** Responses API with the `web_search` tool enabled, one call per tracked prompt.
- **Parse:** `url_citation` annotations attached to the assistant message content.
- **Cost:** ~$10 / 1,000 web-search calls + model token cost.

```jsonc
{
  "output": [
    {
      "type": "message",
      "content": [
        {
          "type": "output_text",
          "text": "…answer text…",
          "annotations": [
            {
              "type": "url_citation",
              "url": "https://example.com/page",
              "title": "Example page",
              "start_index": 120,
              "end_index": 180
            }
          ]
        }
      ]
    }
  ]
}
```

**Normalize:** for each `url_citation` → `source_url = url`, `cited_domain = host(url)`,
`snippet = text.slice(start_index, end_index)` (when indices present), `position = order`.

---

## 2. Perplexity — Sonar (Part III §19.2)

- **Call:** Sonar (or Sonar Pro) API, one call per tracked prompt.
- **Parse:** citations arrive as structured metadata — minimal parsing. Support both the legacy
  flat `citations` array and the newer `search_results`.
- **Cost:** ~$1/M in + $1/M out tokens, plus $5–12 / 1,000 requests by search-context size.

```jsonc
{
  "choices": [{ "message": { "content": "…answer text…" } }],
  "citations": ["https://example.com/a", "https://example.org/b"],
  "search_results": [
    { "url": "https://example.com/a", "title": "A", "snippet": "…" },
    { "url": "https://example.org/b", "title": "B", "snippet": "…" }
  ]
}
```

**Normalize:** prefer `search_results` (has title/snippet); fall back to `citations`.
`source_url = url`, `cited_domain = host(url)`, `position = array index + 1`.

---

## 3. Gemini — Google Search grounding (Part III §19.3)

- **Call:** Gemini API with Google Search grounding enabled, one call per tracked prompt.
- **Parse:** `groundingChunks` (the sources) + `groundingSupports` (which answer segments each
  source supports).
- **Cost:** 5,000 grounded prompts/month free (Gemini 3.x, account-wide), then ~$14 / 1,000.

```jsonc
{
  "candidates": [
    {
      "groundingMetadata": {
        "groundingChunks": [{ "web": { "uri": "https://example.com/x", "title": "X" } }],
        "groundingSupports": [
          {
            "segment": { "text": "…supported claim…", "startIndex": 0, "endIndex": 42 },
            "groundingChunkIndices": [0]
          }
        ]
      }
    }
  ]
}
```

**Normalize:** for each `groundingChunks[i].web` → `source_url = uri`, `cited_domain = host(uri)`,
`position = i + 1`; attach `snippet` from the `groundingSupports` segment whose
`groundingChunkIndices` includes `i`.

> Note: Gemini grounding `uri`s are often redirect/proxy URLs (`vertexaisearch.google.com/...`).
> The Week 4+ normalizer must resolve/normalize these to the real destination domain before
> writing `cited_domain`.

---

## Excluded from MVP

**Google AI Overviews** is intentionally out of scope (Part II) — no official API, elevated
legal/ToS risk. Do not add without flagging to the founder. Google **organic** rankings (the
SEO, non-AI signal for `seo_score`) come from a third-party rank-tracking vendor (Part III
§19.4) — vendor decision still pending; not built in Milestone 1–2.
