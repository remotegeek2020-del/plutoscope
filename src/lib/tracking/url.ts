/**
 * Extract a normalized registrable-ish domain from a URL: lowercase host with a leading `www.`
 * stripped. Returns null for anything that doesn't parse as an absolute URL. Used by the engine
 * normalizers to fill `citations.cited_domain`.
 */
export function extractDomain(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

/**
 * Normalize user-entered domain input (a full URL or a bare `example.com`) to a bare domain.
 * Returns null if it can't be parsed. Used for Project/Competitor domain fields.
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return extractDomain(trimmed) ?? extractDomain(`https://${trimmed}`);
}
