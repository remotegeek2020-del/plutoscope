// De-duplicates the URL list returned by the site map before auditing. A crawl vendor commonly
// returns the same page under several forms (trailing slash, www/non-www, #fragment, ?utm= tracking
// params) plus non-page assets (.pdf, .jpg, …). Auditing those is redundant and wastes crawl
// credits, so we collapse them to one URL per real page. Pure and unit-tested.

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_|ref$|igshid$)/i;
const ASSET_EXT = /\.(pdf|jpe?g|png|gif|svg|webp|ico|css|js|mjs|json|xml|txt|zip|mp4|webm|woff2?)$/i;

/** A normalized key that treats trivially-different URLs as the same page. */
function canonicalKey(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;

  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const path = u.pathname.replace(/\/+$/, '') || '/';
  if (ASSET_EXT.test(path)) return null; // skip non-page assets entirely

  const params = [...u.searchParams.entries()].filter(([k]) => !TRACKING_PARAM.test(k));
  params.sort(([a], [b]) => a.localeCompare(b));
  const qs = params.map(([k, v]) => `${k}=${v}`).join('&');

  return `${host}${path}${qs ? `?${qs}` : ''}`;
}

/** Return one representative URL per real page, preserving first-seen order. */
export function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const key = canonicalKey(url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}
