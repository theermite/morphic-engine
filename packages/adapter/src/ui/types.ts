/**
 * Public types for <MorphicButton>.
 *
 * CDC ref : F-036 (Bouton morphique publiable drop-in).
 * Brick   : B-030a.
 * License : AGPL-3.0-or-later.
 */

import type { SymbolResolver } from '@theermite/morphic-engine';
import type { CSSProperties } from 'react';

/** Identifier of each configurable section the button can render. */
export type MorphicAxisKey =
  | 'fontFamily'
  | 'fontSize'
  | 'theme'
  | 'motion'
  | 'density'
  | 'contrast'
  | 'readingFocus'
  | 'readingGuide'
  | 'waiSymbols'
  | 'colorVision'
  | 'recoveryMode';

/** All axes, in display order. Used as the default `axes` value. */
export const ALL_AXES: readonly MorphicAxisKey[] = [
  'fontFamily',
  'fontSize',
  'theme',
  'motion',
  'density',
  'contrast',
  'readingFocus',
  'readingGuide',
  'waiSymbols',
  'colorVision',
  'recoveryMode',
] as const;

/**
 * Axes shown without needing to expand anything (Jay 2026-08-29 — a fixed
 * baseline so every site that drops in the button shows the same defaults,
 * instead of each integration picking its own subset). Any axis in `axes`
 * but NOT in this list renders behind the "Plus d'adaptations" fold.
 */
export const DEFAULT_VISIBLE_AXES: readonly MorphicAxisKey[] = [
  'theme',
  'fontFamily',
  'fontSize',
  'motion',
  'density',
  'readingFocus',
  'readingGuide',
  'colorVision',
  'recoveryMode',
] as const;

/** Every user-facing string. Override any subset via the `labels` prop. */
export interface MorphicButtonLabels {
  triggerAria: string;
  title: string;
  closeAria: string;
  reset: string;
  resetAria: string;
  footnote: string;
  sections: { text: string; display: string; reading: string; visual: string };
  rows: {
    font: string;
    size: string;
    theme: string;
    motion: string;
    density: string;
    contrast: string;
    readingFocus: string;
    readingGuide: string;
    readingRuler: string;
    wai: string;
    colorVision: string;
    recoveryMode: string;
  };
  fontFamily: { system: string; serif: string; atkinson: string; dyslexic: string };
  fontSize: { sm: string; md: string; lg: string; xl: string };
  theme: { dark: string; light: string; auto: string; sepia: string; highContrast: string };
  motion: { full: string; reduced: string; none: string };
  density: { compact: string; comfortable: string; spacious: string };
  contrast: { noPreference: string; more: string; less: string };
  readingFocus: { off: string; low: string; medium: string; high: string };
  readingGuide: { off: string; line: string; mask: string };
  readingRuler: { off: string; on: string };
  wai: { off: string; before: string; after: string };
  colorVision: { off: string; protan: string; deutan: string; tritan: string };
  recoveryMode: { on: string; off: string };
  advancedToggle: { more: string; less: string };
}

/** A deep-partial of {@link MorphicButtonLabels} (one level of nesting). */
export type PartialLabels = {
  [K in keyof MorphicButtonLabels]?: MorphicButtonLabels[K] extends object
    ? Partial<MorphicButtonLabels[K]>
    : MorphicButtonLabels[K];
};

export interface MorphicButtonProps {
  /** Override any subset of the FR default labels (i18n). */
  labels?: PartialLabels;
  /** Restrict which sections render. Defaults to all axes. */
  axes?: readonly MorphicAxisKey[];
  /** Maps a BCI index to a pictogram. Defaults to a Unicode-emoji resolver. */
  waiResolver?: SymbolResolver;
  /** Extra class on the root wrapper. */
  className?: string;
  /** Extra inline style on the root wrapper (e.g. CSS-var theming). */
  style?: CSSProperties;
}
