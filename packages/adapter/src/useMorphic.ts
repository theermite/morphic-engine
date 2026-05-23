/**
 * useMorphic — React hooks for the morphic adaptation engine.
 *
 * CDC ref : F-020 — adapter brick.
 * Brick   : B-021a.
 * Risk    : Standard (80% coverage).
 *
 * Hooks contract:
 *   - Each per-axis hook returns a [choice, setter] tuple.
 *     - choice : the user's persisted choice (may include 'auto') or null
 *       when no preference has been stored yet.
 *     - setter : a function that proxies to the engine's setter AND triggers
 *       a re-render through the MorphicContext tick counter.
 *   - useMorphic() returns the aggregated read-only snapshot of all axes.
 *   - All hooks throw a clear error when used outside <MorphicProvider>.
 */

'use client';

import {
  type ContrastChoice,
  type DensityChoice,
  setContrast as engineSetContrast,
  setDensity as engineSetDensity,
  setFontFamily as engineSetFontFamily,
  setFontSize as engineSetFontSize,
  setMotion as engineSetMotion,
  setTheme as engineSetTheme,
  type FontFamilyChoice,
  type FontSizeChoice,
  getContrast,
  getDensity,
  getFontFamily,
  getFontSize,
  getMotion,
  getTheme,
  type MotionChoice,
  type ThemeChoice,
} from '@morphic/engine';
import { useCallback, useContext } from 'react';
import { MorphicContext } from './MorphicProvider.js';

function useMorphicContext(): { bump: () => void } {
  const ctx = useContext(MorphicContext);
  if (ctx === null) {
    throw new Error(
      'useMorphic hooks must be used inside <MorphicProvider>. ' +
        'Wrap your app or the consuming subtree with <MorphicProvider>.',
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Per-axis hooks — [choice, setter] tuples
// ---------------------------------------------------------------------------

export function useMorphicTheme(): readonly [ThemeChoice | null, (choice: ThemeChoice) => void] {
  const { bump } = useMorphicContext();
  const setter = useCallback(
    (choice: ThemeChoice) => {
      engineSetTheme(choice);
      bump();
    },
    [bump],
  );
  return [getTheme(), setter] as const;
}

export function useMorphicMotion(): readonly [MotionChoice | null, (choice: MotionChoice) => void] {
  const { bump } = useMorphicContext();
  const setter = useCallback(
    (choice: MotionChoice) => {
      engineSetMotion(choice);
      bump();
    },
    [bump],
  );
  return [getMotion(), setter] as const;
}

export function useMorphicContrast(): readonly [
  ContrastChoice | null,
  (choice: ContrastChoice) => void,
] {
  const { bump } = useMorphicContext();
  const setter = useCallback(
    (choice: ContrastChoice) => {
      engineSetContrast(choice);
      bump();
    },
    [bump],
  );
  return [getContrast(), setter] as const;
}

export function useMorphicDensity(): readonly [
  DensityChoice | null,
  (choice: DensityChoice) => void,
] {
  const { bump } = useMorphicContext();
  const setter = useCallback(
    (choice: DensityChoice) => {
      engineSetDensity(choice);
      bump();
    },
    [bump],
  );
  return [getDensity(), setter] as const;
}

export function useMorphicFontSize(): readonly [
  FontSizeChoice | null,
  (choice: FontSizeChoice) => void,
] {
  const { bump } = useMorphicContext();
  const setter = useCallback(
    (choice: FontSizeChoice) => {
      engineSetFontSize(choice);
      bump();
    },
    [bump],
  );
  return [getFontSize(), setter] as const;
}

export function useMorphicFontFamily(): readonly [
  FontFamilyChoice | null,
  (choice: FontFamilyChoice) => void,
] {
  const { bump } = useMorphicContext();
  const setter = useCallback(
    (choice: FontFamilyChoice) => {
      engineSetFontFamily(choice);
      bump();
    },
    [bump],
  );
  return [getFontFamily(), setter] as const;
}

// ---------------------------------------------------------------------------
// Aggregate snapshot
// ---------------------------------------------------------------------------

export interface MorphicSnapshot {
  readonly theme: ThemeChoice | null;
  readonly motion: MotionChoice | null;
  readonly contrast: ContrastChoice | null;
  readonly density: DensityChoice | null;
  readonly fontSize: FontSizeChoice | null;
  readonly fontFamily: FontFamilyChoice | null;
}

export function useMorphic(): MorphicSnapshot {
  useMorphicContext();
  return {
    theme: getTheme(),
    motion: getMotion(),
    contrast: getContrast(),
    density: getDensity(),
    fontSize: getFontSize(),
    fontFamily: getFontFamily(),
  };
}
