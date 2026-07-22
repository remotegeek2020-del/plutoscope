// Competitive gap analysis (Part VIII §46 Week 13). Compares the project's domain against tracked
// competitor domains across the shared prompt set: for each prompt, how many engines cite each
// domain, and whether it's a "gap" — a prompt where a competitor is cited but the project is not.
// Pure and unit-tested; the screen feeds it the latest citation data.

/** One citation observation: a domain cited for a prompt on a given engine. */
export interface CitationRef {
  promptId: string;
  engine: string;
  domain: string;
}

export interface DomainPresence {
  domain: string;
  /** Number of distinct engines that cite this domain for the prompt (0–3 in MVP). */
  engineCount: number;
}

export interface PromptComparison {
  promptId: string;
  text: string;
  project: DomainPresence;
  competitors: DomainPresence[];
  /** True when at least one competitor is cited for this prompt and the project is not. */
  isGap: boolean;
}

export function analyzeGaps(
  prompts: { id: string; text: string }[],
  projectDomain: string,
  competitorDomains: string[],
  citations: CitationRef[],
): PromptComparison[] {
  // promptId -> domain -> set of engines citing it.
  const byPrompt = new Map<string, Map<string, Set<string>>>();
  for (const citation of citations) {
    let domainMap = byPrompt.get(citation.promptId);
    if (!domainMap) {
      domainMap = new Map();
      byPrompt.set(citation.promptId, domainMap);
    }
    let engines = domainMap.get(citation.domain);
    if (!engines) {
      engines = new Set();
      domainMap.set(citation.domain, engines);
    }
    engines.add(citation.engine);
  }

  const presenceFor = (
    domainMap: Map<string, Set<string>> | undefined,
    domain: string,
  ): DomainPresence => ({ domain, engineCount: domainMap?.get(domain)?.size ?? 0 });

  return prompts.map((prompt) => {
    const domainMap = byPrompt.get(prompt.id);
    const project = presenceFor(domainMap, projectDomain);
    const competitors = competitorDomains.map((domain) => presenceFor(domainMap, domain));
    const isGap = project.engineCount === 0 && competitors.some((c) => c.engineCount > 0);
    return { promptId: prompt.id, text: prompt.text, project, competitors, isGap };
  });
}

/** Summary counts for the header. */
export function summarizeGaps(comparisons: PromptComparison[]) {
  return {
    total: comparisons.length,
    projectCited: comparisons.filter((c) => c.project.engineCount > 0).length,
    gaps: comparisons.filter((c) => c.isGap).length,
  };
}
