/**
 * Axe density — runtime API for the morphic density axis.
 *
 * CDC ref : F-008 (Axe sensoriel : density compact/comfortable/spacious).
 * Brick   : B-009.
 * Risk    : Standard (80% coverage).
 *
 * Spec :
 *   - `setDensity(density)` updates `--morphic-density` CSS var + persists
 *     the USER choice to localStorage. Returns the concrete density applied.
 *   - `getDensity()` reads back the user's persisted choice (may be 'auto').
 *   - `resolveAutoDensity()` returns 'comfortable' (no OS media query for
 *     density — unlike theme/motion, there is no `prefers-density`).
 *
 * Defensive contracts :
 *   - Unknown / null / undefined input throws (poka-yoke via closed enum).
 *   - localStorage failures do NOT throw — DOM still updated.
 *   - Other axes in storage are preserved.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { DENSITIES } from './tokens.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Extended density values including 'auto'. */
const VALID_DENSITIES_WITH_AUTO = [...DENSITIES, 'auto'] as const;

/** User-facing density value (may include 'auto'). */
export type DensityChoice = (typeof VALID_DENSITIES_WITH_AUTO)[number];

/** Concrete density actually applied to the DOM (no 'auto'). */
export type ResolvedDensity = (typeof DENSITIES)[number];

// ---------------------------------------------------------------------------
// Validation (closed enum — poka-yoke)
// ---------------------------------------------------------------------------

function isValidDensityChoice(value: unknown): value is DensityChoice {
  return (
    typeof value === 'string' && (VALID_DENSITIES_WITH_AUTO as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// resolveAutoDensity — no OS media query, safe default
// ---------------------------------------------------------------------------

/**
 * Resolve 'auto' density. No `prefers-density` media query exists,
 * so we return 'comfortable' as the safe default.
 */
export function resolveAutoDensity(): ResolvedDensity {
  return 'comfortable';
}

// ---------------------------------------------------------------------------
// setDensity — main mutation API
// ---------------------------------------------------------------------------

/**
 * Set the morphic density preference.
 *
 * @throws {TypeError} when `density` is not in the closed enum.
 */
export function setDensity(density: DensityChoice): ResolvedDensity {
  if (!isValidDensityChoice(density)) {
    throw new TypeError(
      `setDensity: invalid density value. Expected one of ${VALID_DENSITIES_WITH_AUTO.join(', ')}, got ${String(density)}.`,
    );
  }

  const resolved: ResolvedDensity = density === 'auto' ? resolveAutoDensity() : density;

  document.documentElement.style.setProperty('--morphic-density', resolved);

  try {
    let existing: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          existing = parsed as Record<string, unknown>;
        }
      }
    } catch {
      existing = {};
    }
    existing.density = density;
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable — DOM update still wins.
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// getDensity — read back persisted user choice
// ---------------------------------------------------------------------------

/**
 * Read back the user's persisted density choice.
 * Returns `null` when storage is unavailable, empty, malformed, or invalid.
 */
export function getDensity(): DensityChoice | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const stored = (parsed as { density?: unknown }).density;
  return isValidDensityChoice(stored) ? stored : null;
}
