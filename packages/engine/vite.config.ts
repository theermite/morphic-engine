import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
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
    // The sweep's fixture tree holds a file named like a test on purpose: the
    // guard must prove it skips test files. It is data, never a suite to run.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/storage-door/fake-src/**'],
    // Watches the storage lock itself for the whole suite, whatever spelling a
    // module uses to reach it. Reading the source cannot see a name assembled
    // at runtime; this can. See tests/storage-door/runtime-trap.ts.
    setupFiles: ['./tests/storage-door/runtime-trap.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'json'],
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
