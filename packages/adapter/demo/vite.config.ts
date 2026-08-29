import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/**
 * Mockup demo — NOT part of the published package. Local exploration tool
 * only, so Jay can see the real <MorphicButton> plus every axis that isn't
 * in it yet, and decide what belongs in the drop-in UI. See demo/main.tsx
 * header for the full explanation.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: {
    port: 5190,
    strictPort: false,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@theermite/morphic-engine': fileURLToPath(new URL('../../engine/src/index.ts', import.meta.url)),
      '@theermite/morphic-adapter/ui': fileURLToPath(new URL('../src/ui/index.ts', import.meta.url)),
      '@theermite/morphic-adapter': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
});
