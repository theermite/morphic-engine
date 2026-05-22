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
  getDecisionPointsCap,
  MORPHIC_DECISION_POINTS_CAP_DEFAULT,
  MORPHIC_DECISION_POINTS_CAP_MAX,
  setDecisionPointsCap,
  validateDecisionPoints,
} from './cognitive.js';
export {
  type ContrastChoice,
  getContrast,
  type ResolvedContrast,
  resolveAutoContrast,
  setContrast,
} from './contrast.js';
export {
  COLOR_VISION_TYPES,
  type ColorVisionCorrection,
  type ColorVisionType,
  clearColorVisionCorrection,
  computeDaltonizationMatrix,
  daltonize,
  delinearizeSrgb,
  getColorVisionCorrection,
  linearizeSrgb,
  MORPHIC_DALTONIZE_DEFAULT_SEVERITY,
  MORPHIC_DALTONIZE_FILTER_ID,
  setColorVisionCorrection,
} from './daltonization.js';
export {
  type DensityChoice,
  getDensity,
  type ResolvedDensity,
  resolveAutoDensity,
  setDensity,
} from './density.js';
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
  getMotion,
  type MotionChoice,
  type ResolvedMotion,
  resolveAutoMotion,
  setMotion,
} from './motion.js';
export {
  applyReadingFocus,
  clearReadingFocus,
  getReadingFocus,
  MORPHIC_READING_FOCUS_MARKER,
  MORPHIC_READING_FOCUS_RATIOS,
  READING_FOCUS_INTENSITIES,
  type ReadingFocusIntensity,
  type ReadingFocusOptions,
  setReadingFocus,
} from './reading-focus.js';
export {
  getTheme,
  type ResolvedTheme,
  resolveAutoTheme,
  setTheme,
  type ThemeChoice,
} from './theme.js';
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
  type MorphicPrefs as MorphicPrefsValidated,
  MorphicPrefsSchema,
  type Motion,
  MotionSchema,
  morphicTokens,
  safeValidatePrefs,
  THEMES,
  type Theme,
  ThemeSchema,
} from './tokens.js';
export {
  type FontSizeChoice,
  getFontSize,
  type ResolvedFontSize,
  resolveAutoFontSize,
  setFontSize,
} from './typography.js';
