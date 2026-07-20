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
