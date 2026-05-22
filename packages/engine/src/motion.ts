/**
 * Axe motion — runtime API for the morphic motion axis.
 *
 * CDC ref : F-007 (Axe sensoriel : motion full/reduced/none).
 * Brick   : B-008.
 * Risk    : Standard (80% coverage).
 *
 * Spec :
 *   - `setMotion(motion)` updates `--morphic-motion` CSS var + persists the
 *     USER choice (not the resolved value) to localStorage.
 *     Returns the concrete motion actually applied to the DOM.
 *   - `getMotion()` reads back the user's persisted choice (may be 'auto').
 *   - `resolveAutoMotion()` queries `prefers-reduced-motion: reduce` and
 *     returns the concrete full/reduced resolution.
 *
 * Defensive contracts :
 *   - Unknown / null / undefined input throws (poka-yoke via closed enum).
 *   - localStorage failures (private mode, quota) do NOT throw — DOM still updated.
 *   - matchMedia undefined (SSR, old browser) → safe fallback to 'full'.
 *   - Other axes already in storage are preserved when setting motion.
 *
 * Note on 'auto' :
 *   CDC F-007 enum is full/reduced/none. CDC onboarding screen 2 says
 *   "défaut auto (respect prefers-reduced-motion)". We accept 'auto' as a
 *   storable choice that resolves at runtime. init.ts VALID_MOTIONS stays
 *   ['full','reduced','none'] — if init reads 'auto' from storage it won't
 *   match, falls through to readMediaMotion() = correct auto behavior.
 */

import { MORPHIC_STORAGE_KEY, VALID_MOTIONS } from './init.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Extended motion values including 'auto' (user can choose to follow OS). */
const VALID_MOTIONS_WITH_AUTO = [...VALID_MOTIONS, 'auto'] as const;

/** User-facing motion value (may include 'auto'). */
export type MotionChoice = (typeof VALID_MOTIONS_WITH_AUTO)[number];

/** Concrete motion actually applied to the DOM (no 'auto'). */
export type ResolvedMotion = (typeof VALID_MOTIONS)[number];

// ---------------------------------------------------------------------------
// Validation (closed enum — poka-yoke)
// ---------------------------------------------------------------------------

function isValidMotionChoice(value: unknown): value is MotionChoice {
  return (
    typeof value === 'string' && (VALID_MOTIONS_WITH_AUTO as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// resolveAutoMotion — matchMedia bridge
// ---------------------------------------------------------------------------

/**
 * Resolve the 'auto' motion to a concrete 'full' or 'reduced'.
 *
 * Reads `prefers-reduced-motion: reduce`. Returns 'full' if matchMedia is
 * unavailable (SSR or old browser).
 */
export function resolveAutoMotion(): ResolvedMotion {
  if (typeof matchMedia === 'undefined') return 'full';
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full';
}

// ---------------------------------------------------------------------------
// setMotion — main mutation API
// ---------------------------------------------------------------------------

/**
 * Set the morphic motion preference.
 *
 * - Validates `motion` against the closed enum (throws on invalid input).
 * - Resolves 'auto' via `prefers-reduced-motion`.
 * - Updates `--morphic-motion` on `documentElement`.
 * - Persists the USER choice (the input, including 'auto') to localStorage.
 * - Returns the concrete motion applied to the DOM.
 *
 * @throws {TypeError} when `motion` is not in the closed enum.
 */
export function setMotion(motion: MotionChoice): ResolvedMotion {
  if (!isValidMotionChoice(motion)) {
    throw new TypeError(
      `setMotion: invalid motion value. Expected one of ${VALID_MOTIONS_WITH_AUTO.join(', ')}, got ${String(motion)}.`,
    );
  }

  const resolved: ResolvedMotion = motion === 'auto' ? resolveAutoMotion() : motion;

  // Apply to DOM first — this MUST succeed even if storage fails.
  document.documentElement.style.setProperty('--morphic-motion', resolved);

  // Persist the USER choice (not the resolved value), preserving other axes.
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
    existing.motion = motion;
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable (private mode, quota) — DOM update still wins.
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// getMotion — read back persisted user choice
// ---------------------------------------------------------------------------

/**
 * Read back the user's persisted motion choice.
 *
 * Returns the value the user originally set via `setMotion` (which may be 'auto').
 * Returns `null` when storage is unavailable, empty, malformed, or invalid.
 */
export function getMotion(): MotionChoice | null {
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

  const stored = (parsed as { motion?: unknown }).motion;
  return isValidMotionChoice(stored) ? stored : null;
}
