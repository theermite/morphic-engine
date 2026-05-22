/**
 * Axe cognitif — Decision points cap runtime API.
 *
 * CDC ref : F-010 (Axe cognitif : decision points cap ≤3/écran morphique).
 * Brick   : B-012.
 * Risk    : Critical 95% (Cognitive Load BLOCKING per Dignity §a).
 *
 * Spec :
 *   - `MORPHIC_DECISION_POINTS_CAP_DEFAULT = 3` — the Dignity §a ceiling.
 *   - `setDecisionPointsCap(cap)` updates the active cap + persists to
 *     localStorage. Rejects 0, negative, >MAX, non-integer, non-number.
 *   - `getDecisionPointsCap()` reads the active cap (in-memory first, then
 *     localStorage, then DEFAULT).
 *   - `validateDecisionPoints(count)` returns `count <= cap`. Throws on
 *     invalid count (NaN, Infinity, negative, non-integer, non-number).
 *
 * Defensive contracts (≥2 per critical function per PET §5) :
 *   - All public functions guard input type, finiteness, and integer-ness.
 *   - localStorage failures do NOT throw — in-memory cap still updated.
 *   - Other axes in storage are preserved on write.
 *
 * In-memory cache : setDecisionPointsCap writes to a module-local
 * variable so that getDecisionPointsCap can return the active value even
 * if localStorage write failed (private browsing, quota exceeded).
 */

import { MORPHIC_STORAGE_KEY } from './init.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default decision points cap — the Cognitive Load BLOCKING ceiling (Dignity §a). */
export const MORPHIC_DECISION_POINTS_CAP_DEFAULT = 3 as const;

/** Hard upper bound on the cap. DoS guard — refuses absurd values. */
export const MORPHIC_DECISION_POINTS_CAP_MAX = 20 as const;

// ---------------------------------------------------------------------------
// In-memory cache (survives localStorage failures)
// ---------------------------------------------------------------------------

let activeCap: number | null = null;

/**
 * Test-only reset hook.
 * Module-level `activeCap` survives across vitest test cases within the same
 * file (modules are shared per worker). Tests call this in `beforeEach` to
 * guarantee a clean slate. Prefixed `__` to signal non-public API.
 */
export function __resetCognitiveStateForTests(): void {
  activeCap = null;
}

// ---------------------------------------------------------------------------
// Input validation helpers
// ---------------------------------------------------------------------------

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0
  );
}

function isValidCapValue(value: unknown): value is number {
  return isPositiveInteger(value) && value <= MORPHIC_DECISION_POINTS_CAP_MAX;
}

// ---------------------------------------------------------------------------
// setDecisionPointsCap — mutation + persistence
// ---------------------------------------------------------------------------

/**
 * Set the active decision points cap.
 *
 * @throws {TypeError} when `cap` is not a positive integer ≤ MAX.
 */
export function setDecisionPointsCap(cap: number): void {
  if (!isValidCapValue(cap)) {
    throw new TypeError(
      `setDecisionPointsCap: invalid cap. Expected integer 1..${MORPHIC_DECISION_POINTS_CAP_MAX}, got ${String(cap)}.`,
    );
  }

  activeCap = cap;

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
    existing.decisionPointsCap = cap;
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable — in-memory cap still wins.
  }
}

// ---------------------------------------------------------------------------
// getDecisionPointsCap — read with fallback chain
// ---------------------------------------------------------------------------

/**
 * Read the active decision points cap.
 *
 * Resolution order:
 *   1. In-memory cache (set via setDecisionPointsCap in this session).
 *   2. localStorage persisted value (validated).
 *   3. MORPHIC_DECISION_POINTS_CAP_DEFAULT.
 */
export function getDecisionPointsCap(): number {
  if (activeCap !== null) return activeCap;

  let raw: string | null;
  try {
    raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
  } catch {
    return MORPHIC_DECISION_POINTS_CAP_DEFAULT;
  }
  if (raw === null) return MORPHIC_DECISION_POINTS_CAP_DEFAULT;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return MORPHIC_DECISION_POINTS_CAP_DEFAULT;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return MORPHIC_DECISION_POINTS_CAP_DEFAULT;
  }

  const stored = (parsed as { decisionPointsCap?: unknown }).decisionPointsCap;
  return isValidCapValue(stored) ? stored : MORPHIC_DECISION_POINTS_CAP_DEFAULT;
}

// ---------------------------------------------------------------------------
// validateDecisionPoints — pure predicate
// ---------------------------------------------------------------------------

/**
 * Validate that a count of decision points is within the active cap.
 *
 * @throws {TypeError} when `count` is not a non-negative integer.
 */
export function validateDecisionPoints(count: number): boolean {
  if (!isNonNegativeInteger(count)) {
    throw new TypeError(
      `validateDecisionPoints: invalid count. Expected non-negative integer, got ${String(count)}.`,
    );
  }
  return count <= getDecisionPointsCap();
}
