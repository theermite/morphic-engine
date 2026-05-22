/**
 * Axe font-size — runtime API for the morphic typography axis.
 *
 * CDC ref : F-009 (Axe sensoriel : font size sm/md/lg/xl).
 * Brick   : B-010.
 * Risk    : Standard (80% coverage).
 *
 * Spec :
 *   - `setFontSize(size)` updates `--morphic-font-size` CSS var + persists
 *     the USER choice to localStorage. Returns the concrete size applied.
 *   - `getFontSize()` reads back the user's persisted choice (may be 'auto').
 *   - `resolveAutoFontSize()` returns 'md' (no OS media query for
 *     font-size — unlike theme/motion, there is no `prefers-font-size`).
 *
 * Defensive contracts :
 *   - Unknown / null / undefined input throws (poka-yoke via closed enum).
 *   - localStorage failures do NOT throw — DOM still updated.
 *   - Other axes in storage are preserved.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { FONT_SIZES } from './tokens.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Extended font-size values including 'auto'. */
const VALID_FONT_SIZES_WITH_AUTO = [...FONT_SIZES, 'auto'] as const;

/** User-facing font-size value (may include 'auto'). */
export type FontSizeChoice = (typeof VALID_FONT_SIZES_WITH_AUTO)[number];

/** Concrete font-size actually applied to the DOM (no 'auto'). */
export type ResolvedFontSize = (typeof FONT_SIZES)[number];

// ---------------------------------------------------------------------------
// Validation (closed enum — poka-yoke)
// ---------------------------------------------------------------------------

function isValidFontSizeChoice(value: unknown): value is FontSizeChoice {
  return (
    typeof value === 'string' && (VALID_FONT_SIZES_WITH_AUTO as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// resolveAutoFontSize — no OS media query, safe default
// ---------------------------------------------------------------------------

/**
 * Resolve 'auto' font-size. No `prefers-font-size` media query exists,
 * so we return 'md' as the safe default (16px equivalent).
 */
export function resolveAutoFontSize(): ResolvedFontSize {
  return 'md';
}

// ---------------------------------------------------------------------------
// setFontSize — main mutation API
// ---------------------------------------------------------------------------

/**
 * Set the morphic font-size preference.
 *
 * @throws {TypeError} when `size` is not in the closed enum.
 */
export function setFontSize(size: FontSizeChoice): ResolvedFontSize {
  if (!isValidFontSizeChoice(size)) {
    throw new TypeError(
      `setFontSize: invalid font-size value. Expected one of ${VALID_FONT_SIZES_WITH_AUTO.join(', ')}, got ${String(size)}.`,
    );
  }

  const resolved: ResolvedFontSize = size === 'auto' ? resolveAutoFontSize() : size;

  document.documentElement.style.setProperty('--morphic-font-size', resolved);

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
    existing.fontSize = size;
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable — DOM update still wins.
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// getFontSize — read back persisted user choice
// ---------------------------------------------------------------------------

/**
 * Read back the user's persisted font-size choice.
 * Returns `null` when storage is unavailable, empty, malformed, or invalid.
 */
export function getFontSize(): FontSizeChoice | null {
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

  const stored = (parsed as { fontSize?: unknown }).fontSize;
  return isValidFontSizeChoice(stored) ? stored : null;
}
