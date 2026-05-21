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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'tests/**'],
      // MNK-GoRin Quality.md floors — global / new code / critical paths
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
