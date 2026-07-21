import { describe, expect, it } from 'vitest';

import { MAX_ATTEMPTS, shouldRetry } from './retry';

describe('shouldRetry', () => {
  it('retries while under the max attempts', () => {
    expect(shouldRetry(1)).toBe(true);
    expect(shouldRetry(MAX_ATTEMPTS - 1)).toBe(true);
  });

  it('dead-letters once attempts reach the max', () => {
    expect(shouldRetry(MAX_ATTEMPTS)).toBe(false);
    expect(shouldRetry(MAX_ATTEMPTS + 1)).toBe(false);
  });

  it('respects a custom max', () => {
    expect(shouldRetry(1, 1)).toBe(false);
    expect(shouldRetry(1, 2)).toBe(true);
  });
});
