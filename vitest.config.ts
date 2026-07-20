import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Unit tests for pure logic (e.g. prompt expansion). `@/` resolves to `src/` to match tsconfig.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
