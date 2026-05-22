/**
 * @morphic/engine — Shinkofa Morphic Adaptation Engine
 *
 * Framework-agnostic core engine. Drop-in universal adapter for
 * presentation, navigation, ergonomics, and accessibility based on
 * the user's holistic profile.
 *
 * Specification: docs/CDC.md + docs/PET.md.
 * License: AGPL-3.0-or-later.
 */

export const VERSION = '2.0.0-alpha.0' as const;

export {
  MORPHIC_STORAGE_KEY,
  type MorphicPrefs,
  morphicInit,
  readPrefs,
} from './init.js';
export {
  defineMorphicProvider,
  MORPHIC_PROVIDER_TAG,
  MorphicProvider,
} from './morphic-provider.js';
export {
  CONTRASTS,
  type Contrast,
  ContrastSchema,
  DENSITIES,
  type Density,
  DensitySchema,
  type DtcgToken,
  FONT_SIZES,
  type FontSize,
  FontSizeSchema,
  MOTIONS,
  type Motion,
  MotionSchema,
  type MorphicPrefs as MorphicPrefsValidated,
  MorphicPrefsSchema,
  morphicTokens,
  safeValidatePrefs,
  THEMES,
  type Theme,
  ThemeSchema,
} from './tokens.js';
