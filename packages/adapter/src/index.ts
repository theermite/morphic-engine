/**
 * @morphic/adapter — React adapter for the Morphic Adaptation Engine.
 *
 * CDC ref : F-020 (Démo theermite.com intégration drop-in) — adapter brick.
 * Brick   : B-021a.
 * License : AGPL-3.0-or-later.
 *
 * Public API:
 *   - <MorphicProvider> : wraps your app, runs morphicInit() on mount.
 *   - useMorphic()      : aggregated read-only snapshot of all axes.
 *   - useMorphicTheme / useMorphicMotion / useMorphicContrast /
 *     useMorphicDensity / useMorphicFontSize / useMorphicFontFamily :
 *     [choice, setter] tuples per axis.
 */

export const VERSION = '2.0.0-alpha.0' as const;

export { MorphicProvider, type MorphicProviderProps } from './MorphicProvider.js';
export {
  type MorphicSnapshot,
  useMorphic,
  useMorphicContrast,
  useMorphicDensity,
  useMorphicFontFamily,
  useMorphicFontSize,
  useMorphicMotion,
  useMorphicTheme,
} from './useMorphic.js';
