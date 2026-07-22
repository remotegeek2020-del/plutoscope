import 'server-only';

import { getServerEnv } from '@/lib/env';

import type { CrawledPage } from './types';

// Firecrawl page-crawl client (Part VIII §46 Week 11; founder-approved vendor). Fetches a single
// page as LLM-ready markdown + html + metadata — the input to the audit rules. We do NOT build a
// crawler in-house (Part III §19.4 / §46). Runs the live call once FIRECRAWL_API_KEY is set in the
// deployed environment.

const FIRECRAWL_SCRAPE_ENDPOINT = 'https://api.firecrawl.dev/v1/scrape';

interface FirecrawlScrapeResponse {
  success?: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    metadata?: {
      title?: string;
      description?: string;
      modifiedTime?: string;
      'article:modified_time'?: string;
    };
  };
}

export async function crawlPage(url: string): Promise<CrawledPage> {
  const { FIRECRAWL_API_KEY } = getServerEnv();
  if (!FIRECRAWL_API_KEY) {
    throw new Error('FIRECRAWL_API_KEY is not configured');
  }

  const response = await fetch(FIRECRAWL_SCRAPE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown', 'html', 'rawHtml'] }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firecrawl error ${response.status}: ${body.slice(0, 500)}`);
  }

  const json = (await response.json()) as FirecrawlScrapeResponse;
  const data = json.data ?? {};
  const metadata = data.metadata ?? {};

  return {
    url,
    markdown: data.markdown ?? '',
    html: data.html,
    rawHtml: data.rawHtml,
    metadata: {
      title: metadata.title,
      description: metadata.description,
      modifiedTime: metadata.modifiedTime ?? metadata['article:modified_time'],
    },
  };
}
