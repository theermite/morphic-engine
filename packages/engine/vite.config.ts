import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    forks: {
      maxForks: 2,
      minForks: 1,
    },
    isolate: true,
    maxConcurrency: 5,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    include: ['tests/**/*.test.ts'],
  },
});
