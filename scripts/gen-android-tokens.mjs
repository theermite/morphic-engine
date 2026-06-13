#!/usr/bin/env node
/**
 * Generate the Android Kotlin token file from the shared DTCG source (A-1).
 *
 * The morphic axes have a single source of truth: packages/engine/src/tokens.ts.
 * This script routes the Style Dictionary `kotlin/object` output into the
 * `android/` subtree, so the Android target reuses the exact same values as the
 * web build (no hand-maintained duplicate). The web outputs (css/json/tailwind)
 * are written to a throwaway temp dir and discarded — only MorphicTokens.kt is
 * a committed artifact.
 *
 * Prerequisite: the engine must be built first (needs the compiled
 * packages/engine/dist/build-tokens.js). Run:
 *   pnpm -r run build && node scripts/gen-android-tokens.mjs
 *
 * CI re-runs this and asserts `git diff --exit-code` on the .kt file, proving
 * the committed Kotlin stays in lockstep with the token source.
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMorphicTokens } from '../packages/engine/dist/build-tokens.js';

const here = dirname(fileURLToPath(import.meta.url));
const androidTokensDir = join(
  here,
  '..',
  'android',
  'morphic',
  'src',
  'main',
  'kotlin',
  'com',
  'theermite',
  'morphic',
  'tokens',
);

mkdirSync(androidTokensDir, { recursive: true });
const webThrowaway = mkdtempSync(join(tmpdir(), 'morphic-web-'));
try {
  await buildMorphicTokens(webThrowaway, androidTokensDir);
  console.log(`Generated ${join(androidTokensDir, 'MorphicTokens.kt')}`);
} finally {
  rmSync(webThrowaway, { recursive: true, force: true });
}
