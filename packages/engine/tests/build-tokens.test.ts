// @vitest-environment node

/**
 * Tests for build-tokens.ts — Style Dictionary 5.x pipeline
 *
 * CDC ref : F-005 (Style Dictionary build pipeline)
 * Brick   : B-006
 * Risk    : Tooling 60% (build script, no runtime user impact)
 *
 * Coverage : config shape + output files + content correctness + idempotency.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildMorphicTokens,
  CONTRASTS,
  DENSITIES,
  FONT_SIZES,
  getStyleDictionaryConfig,
  MOTIONS,
  THEMES,
} from '../src/build-tokens.js';

let outDir: string;

beforeEach(() => {
  outDir = mkdtempSync(join(tmpdir(), 'morphic-tokens-'));
});

afterEach(() => {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// getStyleDictionaryConfig
// ---------------------------------------------------------------------------

describe('getStyleDictionaryConfig', () => {
  it('returns a config object with usesDtcg=true (DTCG mode)', () => {
    const config = getStyleDictionaryConfig(outDir);
    expect(config.usesDtcg).toBe(true);
  });

  it('embeds the morphicTokens tree (inline tokens, no file source)', () => {
    const config = getStyleDictionaryConfig(outDir);
    expect(config.tokens).toBeDefined();
    expect(config.tokens).toHaveProperty('morphic');
  });

  it('declares 3 platforms: css, json, tailwind', () => {
    const config = getStyleDictionaryConfig(outDir);
    expect(config.platforms).toBeDefined();
    expect(Object.keys(config.platforms ?? {})).toEqual(
      expect.arrayContaining(['css', 'json', 'tailwind']),
    );
  });

  it('css platform writes to morphic.css (namespace from token tree)', () => {
    const config = getStyleDictionaryConfig(outDir);
    const css = config.platforms?.css;
    expect(css).toBeDefined();
    // No SD-level prefix — the `morphic` namespace comes from the token tree itself,
    // producing `--morphic-<axis>-<value>` without doubling.
    expect(css?.prefix).toBeUndefined();
    expect(css?.files?.[0].destination).toBe('morphic.css');
  });

  it('json platform writes to morphic.json', () => {
    const config = getStyleDictionaryConfig(outDir);
    const json = config.platforms?.json;
    expect(json?.files?.[0].destination).toBe('morphic.json');
  });

  it('tailwind platform writes to morphic.tailwind.js', () => {
    const config = getStyleDictionaryConfig(outDir);
    const tailwind = config.platforms?.tailwind;
    expect(tailwind?.files?.[0].destination).toBe('morphic.tailwind.js');
  });

  it('all platforms use the provided outDir as buildPath', () => {
    const config = getStyleDictionaryConfig(outDir);
    for (const platformName of ['css', 'json', 'tailwind'] as const) {
      const platform = config.platforms?.[platformName];
      expect(platform?.buildPath).toBe(`${outDir}/`);
    }
  });
});

// ---------------------------------------------------------------------------
// buildMorphicTokens — file output
// ---------------------------------------------------------------------------

describe('buildMorphicTokens — output files', () => {
  it('produces morphic.css', async () => {
    await buildMorphicTokens(outDir);
    expect(existsSync(join(outDir, 'morphic.css'))).toBe(true);
  });

  it('produces morphic.json', async () => {
    await buildMorphicTokens(outDir);
    expect(existsSync(join(outDir, 'morphic.json'))).toBe(true);
  });

  it('produces morphic.tailwind.js', async () => {
    await buildMorphicTokens(outDir);
    expect(existsSync(join(outDir, 'morphic.tailwind.js'))).toBe(true);
  });

  it('is idempotent (second build produces same content)', async () => {
    await buildMorphicTokens(outDir);
    const css1 = readFileSync(join(outDir, 'morphic.css'), 'utf-8');
    const json1 = readFileSync(join(outDir, 'morphic.json'), 'utf-8');

    await buildMorphicTokens(outDir);
    const css2 = readFileSync(join(outDir, 'morphic.css'), 'utf-8');
    const json2 = readFileSync(join(outDir, 'morphic.json'), 'utf-8');

    expect(css2).toBe(css1);
    expect(json2).toBe(json1);
  });
});

// ---------------------------------------------------------------------------
// CSS output content
// ---------------------------------------------------------------------------

describe('buildMorphicTokens — CSS content', () => {
  it('contains a :root selector', async () => {
    await buildMorphicTokens(outDir);
    const css = readFileSync(join(outDir, 'morphic.css'), 'utf-8');
    expect(css).toContain(':root');
  });

  it('exposes a CSS var per theme value', async () => {
    await buildMorphicTokens(outDir);
    const css = readFileSync(join(outDir, 'morphic.css'), 'utf-8');
    for (const theme of THEMES) {
      expect(css).toContain(`--morphic-theme-${theme}`);
    }
  });

  it('exposes a CSS var per motion value', async () => {
    await buildMorphicTokens(outDir);
    const css = readFileSync(join(outDir, 'morphic.css'), 'utf-8');
    for (const motion of MOTIONS) {
      expect(css).toContain(`--morphic-motion-${motion}`);
    }
  });

  it('exposes a CSS var per contrast value', async () => {
    await buildMorphicTokens(outDir);
    const css = readFileSync(join(outDir, 'morphic.css'), 'utf-8');
    for (const contrast of CONTRASTS) {
      expect(css).toContain(`--morphic-contrast-${contrast}`);
    }
  });

  it('exposes a CSS var per density value', async () => {
    await buildMorphicTokens(outDir);
    const css = readFileSync(join(outDir, 'morphic.css'), 'utf-8');
    for (const density of DENSITIES) {
      expect(css).toContain(`--morphic-density-${density}`);
    }
  });

  it('exposes a CSS var per font-size value', async () => {
    await buildMorphicTokens(outDir);
    const css = readFileSync(join(outDir, 'morphic.css'), 'utf-8');
    for (const size of FONT_SIZES) {
      expect(css).toContain(`--morphic-font-size-${size}`);
    }
  });
});

// ---------------------------------------------------------------------------
// JSON output content
// ---------------------------------------------------------------------------

describe('buildMorphicTokens — JSON content', () => {
  it('produces valid JSON', async () => {
    await buildMorphicTokens(outDir);
    const raw = readFileSync(join(outDir, 'morphic.json'), 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('contains every theme value', async () => {
    await buildMorphicTokens(outDir);
    const raw = readFileSync(join(outDir, 'morphic.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    const flat = JSON.stringify(parsed);
    for (const theme of THEMES) {
      expect(flat).toContain(theme);
    }
  });

  it('contains every motion value', async () => {
    await buildMorphicTokens(outDir);
    const raw = readFileSync(join(outDir, 'morphic.json'), 'utf-8');
    const flat = JSON.stringify(JSON.parse(raw));
    for (const motion of MOTIONS) {
      expect(flat).toContain(motion);
    }
  });
});

// ---------------------------------------------------------------------------
// Tailwind output
// ---------------------------------------------------------------------------

describe('buildMorphicTokens — Tailwind output', () => {
  it('exports a JS module (ESM default export)', async () => {
    await buildMorphicTokens(outDir);
    const raw = readFileSync(join(outDir, 'morphic.tailwind.js'), 'utf-8');
    expect(raw).toMatch(/export\s+default/);
  });

  it('contains the 5 morphic axis names', async () => {
    await buildMorphicTokens(outDir);
    const raw = readFileSync(join(outDir, 'morphic.tailwind.js'), 'utf-8');
    for (const axis of ['theme', 'motion', 'contrast', 'density', 'fontSize']) {
      expect(raw).toContain(axis);
    }
  });
});
