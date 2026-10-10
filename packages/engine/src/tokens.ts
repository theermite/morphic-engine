/**
 * Token system — DTCG (W3C Design Token Format 2025.10) + Zod validation.
 *
 * Values, types and the DTCG tree live in `tokens-values.ts` (zod-free) and are
 * re-exported here unchanged; this file adds the Zod schemas.
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
import {
  CONTRASTS,
  DENSITIES,
  FONT_FAMILIES,
  FONT_SIZES,
  MOTIONS,
  THEMES,
} from './tokens-values.js';

export * from './tokens-values.js';

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
