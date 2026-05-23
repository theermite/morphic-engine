/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    env: {
      // React 19 CJS bundle only exports `act` when NODE_ENV !== 'production'.
      // Vitest forks may not inherit this; force it here to keep RTL happy.
      NODE_ENV: 'test',
    },
    pool: 'forks',
    forks: { maxForks: 2, minForks: 1 },
    isolate: true,
    maxConcurrency: 5,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'tests/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
