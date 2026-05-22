/**
 * Tests for tokens.ts — DTCG schema + Zod validation
 *
 * CDC ref : F-004 (Token system W3C DTCG)
 * Brick   : B-005
 * Risk    : Sensitive (90% coverage target)
 * Anti-Circular : Layer 1 (PBT fast-check)
 *
 * Bidirectional traceability :
 *   - Each requirement (FMEA mode) → at least one test
 *   - Each test references the requirement it covers
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  VALID_CONTRASTS as INIT_CONTRASTS,
  VALID_MOTIONS as INIT_MOTIONS,
  VALID_THEMES as INIT_THEMES,
} from '../src/init.js';
import {
  CONTRASTS,
  ContrastSchema,
  DENSITIES,
  DensitySchema,
  FONT_SIZES,
  FontSizeSchema,
  MOTIONS,
  MorphicPrefsSchema,
  MotionSchema,
  morphicTokens,
  safeValidatePrefs,
  THEMES,
  ThemeSchema,
} from '../src/tokens.js';

// ---------------------------------------------------------------------------
// Enum constants (source of truth)
// ---------------------------------------------------------------------------

describe('Enum constants — source of truth', () => {
  it('THEMES contains exactly 5 values (FMEA #1 — closed enum poka-yoke)', () => {
    expect(THEMES).toEqual(['light', 'dark', 'auto', 'high-contrast', 'sepia']);
    expect(THEMES).toHaveLength(5);
  });

  it('MOTIONS contains exactly 3 values (FMEA #1)', () => {
    expect(MOTIONS).toEqual(['full', 'reduced', 'none']);
    expect(MOTIONS).toHaveLength(3);
  });

  it('CONTRASTS contains exactly 4 values (FMEA #1)', () => {
    expect(CONTRASTS).toEqual(['no-preference', 'more', 'less', 'custom']);
    expect(CONTRASTS).toHaveLength(4);
  });

  it('DENSITIES contains exactly 3 values (CDC F-008)', () => {
    expect(DENSITIES).toEqual(['compact', 'comfortable', 'spacious']);
    expect(DENSITIES).toHaveLength(3);
  });

  it('FONT_SIZES contains exactly 4 values (CDC F-009)', () => {
    expect(FONT_SIZES).toEqual(['sm', 'md', 'lg', 'xl']);
    expect(FONT_SIZES).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Cross-module enum consistency (FMEA #3 — sync init.ts ↔ tokens.ts)
// ---------------------------------------------------------------------------

describe('Cross-module enum sync (FMEA #3)', () => {
  it('THEMES (tokens) === VALID_THEMES (init)', () => {
    expect([...THEMES]).toEqual([...INIT_THEMES]);
  });

  it('MOTIONS (tokens) === VALID_MOTIONS (init)', () => {
    expect([...MOTIONS]).toEqual([...INIT_MOTIONS]);
  });

  it('CONTRASTS (tokens) === VALID_CONTRASTS (init)', () => {
    expect([...CONTRASTS]).toEqual([...INIT_CONTRASTS]);
  });
});

// ---------------------------------------------------------------------------
// Zod schemas — per axis (validation paths)
// ---------------------------------------------------------------------------

describe('ThemeSchema', () => {
  it.each(THEMES)('accepts valid theme "%s"', (theme) => {
    expect(() => ThemeSchema.parse(theme)).not.toThrow();
  });

  it('rejects unknown theme', () => {
    expect(() => ThemeSchema.parse('cyberpunk')).toThrow();
  });

  it('rejects non-string value (FMEA #1)', () => {
    expect(() => ThemeSchema.parse(42)).toThrow();
    expect(() => ThemeSchema.parse(null)).toThrow();
    expect(() => ThemeSchema.parse(undefined)).toThrow();
  });
});

describe('MotionSchema', () => {
  it.each(MOTIONS)('accepts valid motion "%s"', (motion) => {
    expect(() => MotionSchema.parse(motion)).not.toThrow();
  });

  it('rejects unknown motion', () => {
    expect(() => MotionSchema.parse('bouncy')).toThrow();
  });
});

describe('ContrastSchema', () => {
  it.each(CONTRASTS)('accepts valid contrast "%s"', (contrast) => {
    expect(() => ContrastSchema.parse(contrast)).not.toThrow();
  });

  it('rejects unknown contrast', () => {
    expect(() => ContrastSchema.parse('extreme')).toThrow();
  });
});

describe('DensitySchema', () => {
  it.each(DENSITIES)('accepts valid density "%s"', (density) => {
    expect(() => DensitySchema.parse(density)).not.toThrow();
  });

  it('rejects unknown density', () => {
    expect(() => DensitySchema.parse('tight')).toThrow();
  });
});

describe('FontSizeSchema', () => {
  it.each(FONT_SIZES)('accepts valid font size "%s"', (size) => {
    expect(() => FontSizeSchema.parse(size)).not.toThrow();
  });

  it('rejects unknown font size', () => {
    expect(() => FontSizeSchema.parse('xxl')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// MorphicPrefsSchema — combined
// ---------------------------------------------------------------------------

describe('MorphicPrefsSchema', () => {
  it('accepts empty object (all axes optional)', () => {
    expect(() => MorphicPrefsSchema.parse({})).not.toThrow();
  });

  it('accepts a complete valid preferences object', () => {
    const prefs = {
      theme: 'dark',
      motion: 'reduced',
      contrast: 'more',
      density: 'comfortable',
      fontSize: 'md',
    };
    expect(() => MorphicPrefsSchema.parse(prefs)).not.toThrow();
  });

  it('accepts partial preferences', () => {
    expect(() => MorphicPrefsSchema.parse({ theme: 'sepia' })).not.toThrow();
  });

  it('rejects non-object input (FMEA #1)', () => {
    expect(() => MorphicPrefsSchema.parse(null)).toThrow();
    expect(() => MorphicPrefsSchema.parse('string')).toThrow();
    expect(() => MorphicPrefsSchema.parse([])).toThrow();
  });

  it('rejects invalid axis value', () => {
    expect(() => MorphicPrefsSchema.parse({ theme: 'invalid' })).toThrow();
  });

  it('strips unknown properties (defensive)', () => {
    const parsed = MorphicPrefsSchema.parse({ theme: 'dark', evil: 'payload' });
    expect(parsed).not.toHaveProperty('evil');
    expect(parsed.theme).toBe('dark');
  });
});

// ---------------------------------------------------------------------------
// safeValidatePrefs — public API
// ---------------------------------------------------------------------------

describe('safeValidatePrefs', () => {
  it('returns { success: true, data } on valid input', () => {
    const result = safeValidatePrefs({ theme: 'dark', motion: 'reduced' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme).toBe('dark');
      expect(result.data.motion).toBe('reduced');
    }
  });

  it('returns { success: false, error } on invalid input', () => {
    const result = safeValidatePrefs({ theme: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('returns { success: false } on null', () => {
    const result = safeValidatePrefs(null);
    expect(result.success).toBe(false);
  });

  it('returns { success: false } on non-object', () => {
    const result = safeValidatePrefs('not-an-object');
    expect(result.success).toBe(false);
  });

  it('never throws on any input (defensive contract)', () => {
    expect(() => safeValidatePrefs(undefined)).not.toThrow();
    expect(() => safeValidatePrefs(42)).not.toThrow();
    expect(() => safeValidatePrefs([])).not.toThrow();
    expect(() => safeValidatePrefs({ recursive: { evil: true } })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// DTCG format conformity (FMEA #2)
// ---------------------------------------------------------------------------

describe('DTCG token format (W3C 2025.10)', () => {
  it('morphicTokens is a plain object', () => {
    expect(morphicTokens).toBeDefined();
    expect(typeof morphicTokens).toBe('object');
    expect(morphicTokens).not.toBeNull();
  });

  it('contains a top-level "morphic" group', () => {
    expect(morphicTokens).toHaveProperty('morphic');
  });

  it('exposes all 5 morphic axes as token groups', () => {
    expect(morphicTokens.morphic).toHaveProperty('theme');
    expect(morphicTokens.morphic).toHaveProperty('motion');
    expect(morphicTokens.morphic).toHaveProperty('contrast');
    expect(morphicTokens.morphic).toHaveProperty('density');
    expect(morphicTokens.morphic).toHaveProperty('fontSize');
  });

  it('every leaf token has $value and $type (DTCG spec)', () => {
    for (const axisName of Object.keys(morphicTokens.morphic)) {
      const axis = morphicTokens.morphic[axisName as keyof typeof morphicTokens.morphic];
      for (const tokenName of Object.keys(axis)) {
        const token = axis[tokenName as keyof typeof axis] as { $value: unknown; $type: unknown };
        expect(token.$value).toBeDefined();
        expect(token.$type).toBeDefined();
        expect(typeof token.$type).toBe('string');
      }
    }
  });

  it('theme group exposes a token per THEMES value', () => {
    for (const theme of THEMES) {
      expect(morphicTokens.morphic.theme).toHaveProperty(theme);
    }
  });

  it('motion group exposes a token per MOTIONS value', () => {
    for (const motion of MOTIONS) {
      expect(morphicTokens.morphic.motion).toHaveProperty(motion);
    }
  });

  it('contrast group exposes a token per CONTRASTS value', () => {
    for (const contrast of CONTRASTS) {
      expect(morphicTokens.morphic.contrast).toHaveProperty(contrast);
    }
  });
});

// ---------------------------------------------------------------------------
// PBT (Layer 1 Anti-Circular)
// ---------------------------------------------------------------------------

describe('Property-based tests (fast-check, Layer 1 Anti-Circular)', () => {
  it('any string NOT in any enum is rejected by MorphicPrefsSchema', () => {
    const allValid = [
      ...THEMES,
      ...MOTIONS,
      ...CONTRASTS,
      ...DENSITIES,
      ...FONT_SIZES,
    ] as readonly string[];

    fc.assert(
      fc.property(
        fc.string().filter((s) => !allValid.includes(s)),
        (junk) => {
          const result = safeValidatePrefs({ theme: junk });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('valid prefs combinations always round-trip', () => {
    fc.assert(
      fc.property(
        fc.record(
          {
            theme: fc.constantFrom(...THEMES),
            motion: fc.constantFrom(...MOTIONS),
            contrast: fc.constantFrom(...CONTRASTS),
            density: fc.constantFrom(...DENSITIES),
            fontSize: fc.constantFrom(...FONT_SIZES),
          },
          { requiredKeys: [] },
        ),
        (prefs) => {
          const result = safeValidatePrefs(prefs);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toEqual(prefs);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('safeValidatePrefs never throws on arbitrary input', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => safeValidatePrefs(input)).not.toThrow();
      }),
      { numRuns: 300 },
    );
  });
});
