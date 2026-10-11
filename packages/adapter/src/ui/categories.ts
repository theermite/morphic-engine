/**
 * Categories of <MorphicButton> and the summary of what differs from defaults.
 *
 * CDC ref : F-036. License : AGPL-3.0-or-later.
 *
 * Pure module (no React, no DOM): which axis lives in which category, and the
 * per-category list of settings that differ from their default. That list is
 * shown under each category title and lights the trigger's dot (Jay 2026-10-11).
 */

import type {
  ColorVisionCorrection,
  ContrastChoice,
  DensityChoice,
  FontFamilyChoice,
  FontSizeChoice,
  MotionChoice,
  ReadingBand,
  ReadingFocusIntensity,
  ThemeChoice,
} from '@theermite/morphic-engine';
import type { MorphicAxisKey, MorphicButtonLabels, MorphicCategoryKey } from './types.js';

/** Which axes each collapsible category holds, in display order. */
export const CATEGORY_AXES: Record<MorphicCategoryKey, readonly MorphicAxisKey[]> = {
  view: ['theme', 'motion', 'colorVision', 'contrast'],
  text: ['fontFamily', 'fontSize', 'density'],
  reading: ['readingFocus', 'readingGuide', 'waiSymbols'],
  energy: ['recoveryMode', 'pomodoro'],
};

/** Same stacks as morphic-base.css, so each font choice is written in itself. */
export const FONT_STACKS = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  atkinson: '"Atkinson Hyperlegible", Verdana, sans-serif',
  dyslexic: '"OpenDyslexic", "Comic Sans MS", Verdana, sans-serif',
} as const;

export function themeLabel(t: MorphicButtonLabels, v: ThemeChoice): string {
  return v === 'high-contrast' ? t.theme.highContrast : t.theme[v];
}

/** `custom` is only set programmatically and has no label: it shows as itself. */
export function contrastLabel(t: MorphicButtonLabels, v: ContrastChoice): string {
  if (v === 'no-preference' || v === 'auto') return t.contrast.noPreference;
  return v === 'custom' ? v : t.contrast[v];
}

/**
 * Current value of every axis. `null` = never chosen, and `auto` = follow the
 * system: both count as the default, never as a change.
 */
export interface AxisValues {
  theme: ThemeChoice | null;
  motion: MotionChoice | null;
  contrast: ContrastChoice | null;
  fontFamily: FontFamilyChoice | null;
  fontSize: FontSizeChoice | null;
  density: DensityChoice | null;
  colorVision: ColorVisionCorrection | null;
  readingFocus: ReadingFocusIntensity | null;
  band: ReadingBand | null;
  ruler: boolean;
  wai: 'before' | 'after' | null;
  recovery: boolean;
}

/**
 * Per category, the settings that differ from their default, as short phrases
 * (« Thème : Sépia », or the row name alone for an on/off setting). Only axes
 * the host asked for (`has`) are counted.
 */
export function describeChanges(
  v: AxisValues,
  t: MorphicButtonLabels,
  has: (axis: MorphicAxisKey) => boolean,
): Record<MorphicCategoryKey, string[]> {
  const pair = (row: string, value: string) => `${row} : ${value}`;
  /** A chosen value that is neither unset, nor `auto`, nor the default. */
  const differs = <T extends string>(value: T | null, def: T): value is Exclude<T, 'auto'> =>
    value !== null && value !== 'auto' && value !== def;
  const out: Record<MorphicCategoryKey, string[]> = { view: [], text: [], reading: [], energy: [] };

  const cvType = v.colorVision?.type;

  if (has('theme') && differs(v.theme, 'auto'))
    out.view.push(pair(t.rows.theme, themeLabel(t, v.theme)));
  if (has('motion') && differs(v.motion, 'full'))
    out.view.push(pair(t.rows.motion, t.motion[v.motion]));
  if (has('colorVision') && cvType !== undefined && cvType !== 'none')
    out.view.push(pair(t.rows.colorVision, t.colorVision[cvType]));
  if (has('contrast') && differs(v.contrast, 'no-preference'))
    out.view.push(pair(t.rows.contrast, contrastLabel(t, v.contrast)));

  if (has('fontFamily') && differs(v.fontFamily, 'system'))
    out.text.push(pair(t.rows.font, t.fontFamily[v.fontFamily]));
  if (has('fontSize') && differs(v.fontSize, 'md'))
    out.text.push(pair(t.rows.size, t.fontSize[v.fontSize]));
  if (has('density') && differs(v.density, 'comfortable'))
    out.text.push(pair(t.rows.density, t.density[v.density]));

  if (has('readingFocus') && v.readingFocus !== null)
    out.reading.push(pair(t.rows.readingFocus, t.readingFocus[v.readingFocus]));
  if (has('readingGuide') && v.band !== null)
    out.reading.push(pair(t.rows.readingGuide, t.readingGuide[v.band]));
  if (has('readingGuide') && v.ruler) out.reading.push(t.rows.readingRuler);
  if (has('waiSymbols') && v.wai !== null) out.reading.push(pair(t.rows.wai, t.wai[v.wai]));

  if (has('recoveryMode') && v.recovery) out.energy.push(t.rows.recoveryMode);
  return out;
}
