import { describe, expect, it } from 'vitest';

import { dedupeUrls } from './url-dedupe';

describe('dedupeUrls', () => {
  it('collapses trailing slash, www, fragments and tracking params to one page', () => {
    const out = dedupeUrls([
      'https://example.com/pricing',
      'https://example.com/pricing/', // trailing slash
      'https://www.example.com/pricing', // www
      'https://example.com/pricing#top', // fragment
      'https://example.com/pricing?utm_source=x', // tracking param
    ]);
    expect(out).toEqual(['https://example.com/pricing']);
  });

  it('keeps genuinely different pages and meaningful query params', () => {
    const out = dedupeUrls([
      'https://example.com/',
      'https://example.com/about',
      'https://example.com/product?id=1',
      'https://example.com/product?id=2',
    ]);
    expect(out).toHaveLength(4);
  });

  it('drops non-page assets and invalid urls', () => {
    const out = dedupeUrls([
      'https://example.com/page',
      'https://example.com/brochure.pdf',
      'https://example.com/logo.png',
      'https://example.com/styles.css',
      'not a url',
      'ftp://example.com/file',
    ]);
    expect(out).toEqual(['https://example.com/page']);
  });
});
