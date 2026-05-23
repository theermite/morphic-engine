/**
 * Token system — DTCG (W3C Design Token Format 2025.10) + Zod validation.
 *
 * CDC ref : F-004 (Token system W3C DTCG).
 * Brick   : B-005.
 * Risk    : Sensitive (90% coverage target).
 *
 * Responsibilities :
 *   - Single source of truth for morphic axis enums (theme/motion/contrast/density/fontSize).
 *   - Zod schemas for runtime validation of user preferences.
 *   - DTCG-compliant token tree exposable to Style Dictionary 5.x (B-006).
 *   - Pure module : no DOM, no side effects, SSR-safe.
 *
 * Defensive assertions (PET §5, ≥2 for Sensitive functions) :
 *   1. `safeValidatePrefs` never throws (Zod safeParse contract).
 *   2. Schemas reject non-string, non-object, and unknown enum values.
 *   3. Cross-module sync check enforced by tests (init.ts ↔ tokens.ts).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enum constants — source of truth for morphic axes
// ---------------------------------------------------------------------------

/** Valid theme values. Mirrors init.ts VALID_THEMES (sync enforced by tests). */
export const THEMES = ['light', 'dark', 'auto', 'high-contrast', 'sepia'] as const;

/** Valid motion values. Mirrors init.ts VALID_MOTIONS. */
export const MOTIONS = ['full', 'reduced', 'none'] as const;

/** Valid contrast values. Mirrors init.ts VALID_CONTRASTS. */
export const CONTRASTS = ['no-preference', 'more', 'less', 'custom'] as const;

/** Valid density values (CDC F-008 — cognitive load adaptation). */
export const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;

/** Valid font size values (CDC F-009 — reading comfort). */
export const FONT_SIZES = ['sm', 'md', 'lg', 'xl'] as const;

/**
 * Valid font family values (CDC F-112 — typography axis).
 *
 * - `system` : default host stack (system-ui / -apple-system / Segoe UI / ...)
 * - `serif`  : classic serif stack for prose-heavy reading
 * - `atkinson` : Atkinson Hyperlegible (Braille Institute — universal legibility)
 * - `dyslexic` : OpenDyslexic (dyslexia-friendly with weighted bottoms)
 *
 * The engine ships zero font binaries; the host site declares the @font-face
 * rules and CSS mapping `data-morphic-font-family` to the actual stack.
 */
export const FONT_FAMILIES = ['system', 'serif', 'atkinson', 'dyslexic'] as const;

// ---------------------------------------------------------------------------
// Type aliases — inferred from constants
// ---------------------------------------------------------------------------

export type Theme = (typeof THEMES)[number];
export type Motion = (typeof MOTIONS)[number];
export type Contrast = (typeof CONTRASTS)[number];
export type Density = (typeof DENSITIES)[number];
export type FontSize = (typeof FONT_SIZES)[number];
export type FontFamily = (typeof FONT_FAMILIES)[number];

// ---------------------------------------------------------------------------
// Zod schemas — per axis + combined
// ---------------------------------------------------------------------------

export const ThemeSchema = z.enum(THEMES);
export const MotionSchema = z.enum(MOTIONS);
export const ContrastSchema = z.enum(CONTRASTS);
export const DensitySchema = z.enum(DENSITIES);
export const FontSizeSchema = z.enum(FONT_SIZES);
export const FontFamilySchema = z.enum(FONT_FAMILIES);

/**
 * Combined morphic preferences schema.
 *
 * - All axes optional (partial preferences supported).
 * - Unknown properties stripped via `.strip()` (default in Zod 4.x).
 * - Non-object inputs rejected (FMEA #1 — defensive validation).
 */
export const MorphicPrefsSchema = z.object({
  theme: ThemeSchema.optional(),
  motion: MotionSchema.optional(),
  contrast: ContrastSchema.optional(),
  density: DensitySchema.optional(),
  fontSize: FontSizeSchema.optional(),
  fontFamily: FontFamilySchema.optional(),
});

export type MorphicPrefs = z.infer<typeof MorphicPrefsSchema>;

// ---------------------------------------------------------------------------
// Safe validator — public API (defensive contract: never throws)
// ---------------------------------------------------------------------------

/**
 * Validate a morphic preferences input without throwing.
 *
 * Returns the Zod safeParse result :
 *   - `{ success: true, data: MorphicPrefs }` when the input is a valid (possibly partial) prefs object.
 *   - `{ success: false, error: ZodError }` otherwise.
 *
 * Contract :
 *   - Never throws (Zod safeParse guarantee).
 *   - Strips unknown properties (no payload injection).
 *   - Rejects null, arrays, primitives.
 */
export function safeValidatePrefs(input: unknown): z.ZodSafeParseResult<MorphicPrefs> {
  return MorphicPrefsSchema.safeParse(input);
}

// ---------------------------------------------------------------------------
// DTCG token tree — W3C Design Token Format 2025.10
// ---------------------------------------------------------------------------

/**
 * DTCG leaf token (W3C 2025.10).
 *
 * Spec : every token has `$value` and `$type`. `$description` is optional but recommended.
 * Reference: designtokens.org/tr/drafts/format-spec-2025-10/
 */
export interface DtcgToken<T = string> {
  readonly $value: T;
  readonly $type: string;
  readonly $description?: string;
}

/**
 * Helper to build an enum-axis token group from a readonly tuple of allowed values.
 * Each value becomes a DTCG leaf token whose `$value` equals the value itself.
 */
function buildAxisGroup<T extends string>(
  values: readonly T[],
  type: string,
  axisLabel: string,
): { readonly [K in T]: DtcgToken<K> } {
  const group = {} as { [K in T]: DtcgToken<K> };
  for (const v of values) {
    group[v] = {
      $value: v,
      $type: type,
      $description: `${axisLabel} — ${v}`,
    };
  }
  return group;
}

/**
 * Morphic tokens exposed as a DTCG-compliant tree.
 *
 * Consumed by Style Dictionary 5.x (B-006) to generate :
 *   - CSS custom properties
 *   - Tailwind theme config
 *   - JSON exports for other design tools
 *
 * Structure :
 *   morphic.{theme,motion,contrast,density,fontSize}.<value> = { $value, $type, $description }
 */
export const morphicTokens = {
  morphic: {
    theme: buildAxisGroup(THEMES, 'string', 'Visual theme'),
    motion: buildAxisGroup(MOTIONS, 'string', 'Motion preference'),
    contrast: buildAxisGroup(CONTRASTS, 'string', 'Contrast preference'),
    density: buildAxisGroup(DENSITIES, 'string', 'Information density'),
    fontSize: buildAxisGroup(FONT_SIZES, 'string', 'Base font size'),
    fontFamily: buildAxisGroup(FONT_FAMILIES, 'string', 'Font family'),
  },
} as const;
