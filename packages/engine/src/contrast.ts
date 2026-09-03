/**
 * Axe contrast — runtime API for the morphic contrast axis.
 *
 * CDC ref : F-010 (Axe sensoriel : contrast).
 * Brick   : B-011.
 * Risk    : Standard (80% coverage).
 *
 * Spec :
 *   - `setContrast(contrast)` updates `--morphic-contrast` CSS var + persists
 *     the USER choice to localStorage. Returns the concrete contrast applied.
 *   - `getContrast()` reads back the user's persisted choice (may be 'auto').
 *   - `resolveAutoContrast()` bridges `prefers-contrast` media query.
 *     Falls back to 'no-preference' when matchMedia is unavailable (SSR).
 *
 * Defensive contracts :
 *   - Unknown / null / undefined input throws (poka-yoke via closed enum).
 *   - localStorage failures do NOT throw — DOM still updated.
 *   - Other axes in storage are preserved.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { getTarget } from './target.js';
import { CONTRASTS } from './tokens.js';
import { safeStorage } from './storage-access.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Extended contrast values including 'auto'. */
const VALID_CONTRASTS_WITH_AUTO = [...CONTRASTS, 'auto'] as const;

/** User-facing contrast value (may include 'auto'). */
export type ContrastChoice = (typeof VALID_CONTRASTS_WITH_AUTO)[number];

/** Concrete contrast actually applied to the DOM (no 'auto'). */
export type ResolvedContrast = (typeof CONTRASTS)[number];

// ---------------------------------------------------------------------------
// Validation (closed enum — poka-yoke)
// ---------------------------------------------------------------------------

function isValidContrastChoice(value: unknown): value is ContrastChoice {
  return (
    typeof value === 'string' && (VALID_CONTRASTS_WITH_AUTO as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// resolveAutoContrast — bridges OS prefers-contrast media query
// ---------------------------------------------------------------------------

/**
 * Resolve 'auto' contrast via `prefers-contrast` media query.
 * Falls back to 'no-preference' when matchMedia is unavailable (SSR).
 */
export function resolveAutoContrast(): ResolvedContrast {
  if (typeof matchMedia === 'undefined') return 'no-preference';
  if (matchMedia('(prefers-contrast: more)').matches) return 'more';
  if (matchMedia('(prefers-contrast: less)').matches) return 'less';
  return 'no-preference';
}

// ---------------------------------------------------------------------------
// setContrast — main mutation API
// ---------------------------------------------------------------------------

/**
 * Set the morphic contrast preference.
 *
 * @throws {TypeError} when `contrast` is not in the closed enum.
 */
export function setContrast(contrast: ContrastChoice): ResolvedContrast {
  if (!isValidContrastChoice(contrast)) {
    throw new TypeError(
      `setContrast: invalid contrast value. Expected one of ${VALID_CONTRASTS_WITH_AUTO.join(', ')}, got ${String(contrast)}.`,
    );
  }

  const resolved: ResolvedContrast = contrast === 'auto' ? resolveAutoContrast() : contrast;

  // Write BOTH the CSS var (legacy) AND the data attribute (selector cascade).
  // CSS attribute selectors cannot target custom properties, so the
  // `data-morphic-contrast` attribute is required for consumer stylesheets.
  // Target defaults to `document.documentElement` (see `target.ts`).
  const root = getTarget();
  root.style.setProperty('--morphic-contrast', resolved);
  root.setAttribute('data-morphic-contrast', resolved);

  try {
    let existing: Record<string, unknown> = {};
    try {
      const raw = safeStorage.get(MORPHIC_STORAGE_KEY);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          existing = parsed as Record<string, unknown>;
        }
      }
    } catch {
      existing = {};
    }
    existing.contrast = contrast;
    safeStorage.set(MORPHIC_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable — DOM update still wins.
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// getContrast — read back persisted user choice
// ---------------------------------------------------------------------------

/**
 * Read back the user's persisted contrast choice.
 * Returns `null` when storage is unavailable, empty, malformed, or invalid.
 */
export function getContrast(): ContrastChoice | null {
  let raw: string | null;
  try {
    raw = safeStorage.get(MORPHIC_STORAGE_KEY);
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

  const stored = (parsed as { contrast?: unknown }).contrast;
  return isValidContrastChoice(stored) ? stored : null;
}
