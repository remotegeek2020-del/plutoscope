import { describe, expect, it } from 'vitest';

import {
  type BriefStructure,
  briefToFaqSchema,
  briefToHtml,
  briefToMarkdown,
  parseBrief,
} from './brief-render';

const SAMPLE: BriefStructure = {
  h1: 'Best Merchant Services for Small Business',
  directAnswer: 'The best merchant services combine low fees with fast payouts.',
  faqs: [
    { question: 'What are merchant services?', answer: 'Tools that let a business accept payments.' },
    { question: 'How much do they cost?', answer: 'Typically 2–3% per transaction.' },
  ],
  keyPoints: ['Compare transaction fees', 'Mention payout speed'],
};

describe('parseBrief', () => {
  it('parses a clean JSON object', () => {
    const b = parseBrief(JSON.stringify(SAMPLE));
    expect(b.h1).toBe(SAMPLE.h1);
    expect(b.faqs).toHaveLength(2);
  });

  it('tolerates code fences and surrounding prose', () => {
    const raw = 'Here you go:\n```json\n' + JSON.stringify(SAMPLE) + '\n```';
    expect(parseBrief(raw).h1).toBe(SAMPLE.h1);
  });

  it('throws on non-JSON or missing fields', () => {
    expect(() => parseBrief('no json here')).toThrow();
    expect(() => parseBrief('{"h1":"only"}')).toThrow();
  });
});

describe('briefToHtml', () => {
  it('renders a semantic page and escapes HTML', () => {
    const html = briefToHtml({
      ...SAMPLE,
      h1: 'Fees <under> 3% & rising',
      faqs: [{ question: 'Is it <safe>?', answer: 'Yes & always' }],
    });
    expect(html).toContain('<h1>Fees &lt;under&gt; 3% &amp; rising</h1>');
    expect(html).toContain('<h3>Is it &lt;safe&gt;?</h3>');
    expect(html).toContain('<h2>Frequently asked questions</h2>');
  });
});

describe('briefToFaqSchema', () => {
  it('emits a valid FAQPage JSON-LD script with one entity per FAQ', () => {
    const script = briefToFaqSchema(SAMPLE);
    expect(script.startsWith('<script type="application/ld+json">')).toBe(true);
    const json = JSON.parse(script.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
    expect(json['@type']).toBe('FAQPage');
    expect(json.mainEntity).toHaveLength(2);
    expect(json.mainEntity[0].acceptedAnswer.text).toBe(SAMPLE.faqs[0].answer);
  });
});

describe('briefToMarkdown', () => {
  it('includes the h1, direct answer, FAQs and key points', () => {
    const md = briefToMarkdown(SAMPLE);
    expect(md).toContain('# Best Merchant Services for Small Business');
    expect(md).toContain('**Direct answer:**');
    expect(md).toContain('### What are merchant services?');
    expect(md).toContain('- Compare transaction fees');
  });
});
