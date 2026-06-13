import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: {
    port: 5173,
    strictPort: false,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@theermite/morphic-engine': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
});
