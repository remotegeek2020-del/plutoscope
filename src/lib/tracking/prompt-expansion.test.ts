import { describe, expect, it } from 'vitest';

import { expandTopicForTier, expandTopicToPrompts, normalizeTopic } from './prompt-expansion';

describe('normalizeTopic', () => {
  it('trims, collapses whitespace, and strips trailing punctuation', () => {
    expect(normalizeTopic('  best   CRM   software?  ')).toBe('best CRM software');
    expect(normalizeTopic('email tools!!!')).toBe('email tools');
  });

  it('returns empty string for blank input', () => {
    expect(normalizeTopic('   ')).toBe('');
  });
});

describe('expandTopicToPrompts', () => {
  it('returns the raw topic as the first (highest-signal) prompt', () => {
    const prompts = expandTopicToPrompts('best CRM software', 5);
    expect(prompts[0]).toBe('best CRM software');
  });

  it('respects the maxPrompts cap (the AI-API cost lever)', () => {
    expect(expandTopicToPrompts('best CRM software', 3)).toHaveLength(3);
    expect(expandTopicToPrompts('best CRM software', 1)).toHaveLength(1);
  });

  it('clamps a cap below 1 up to 1', () => {
    expect(expandTopicToPrompts('best CRM software', 0)).toHaveLength(1);
  });

  it('never exceeds the number of available templates', () => {
    const prompts = expandTopicToPrompts('best CRM software', 999);
    expect(prompts.length).toBeLessThanOrEqual(8);
  });

  it('produces only unique prompts', () => {
    const prompts = expandTopicToPrompts('best CRM software', 999);
    expect(new Set(prompts.map((p) => p.toLowerCase())).size).toBe(prompts.length);
  });

  it('returns an empty array for a blank topic', () => {
    expect(expandTopicToPrompts('   ', 5)).toEqual([]);
  });
});

describe('expandTopicForTier', () => {
  it('caps free tier tighter than consultant tier', () => {
    const free = expandTopicForTier('best CRM software', 'free');
    const consultant = expandTopicForTier('best CRM software', 'consultant');
    expect(free.length).toBe(3);
    expect(consultant.length).toBeGreaterThan(free.length);
  });
});
