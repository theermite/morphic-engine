/**
 * Axe font-family — runtime API for the morphic typography font-family axis.
 *
 * CDC ref : F-112 (Axe sensoriel : font family — system / serif / atkinson / dyslexic).
 * Brick   : B-112.
 * Risk    : Standard (80% coverage).
 *
 * Spec :
 *   - `setFontFamily(family)` updates `--morphic-font-family` CSS var AND
 *     `data-morphic-font-family` attribute, persists the USER choice to
 *     localStorage. Returns the concrete family applied.
 *   - `getFontFamily()` reads back the user's persisted choice (may be 'auto').
 *   - `resolveAutoFontFamily()` returns 'system' (no OS media query for
 *     font-family — unlike theme/motion, there is no `prefers-font-family`).
 *
 * Architecture note :
 *   The engine exposes only the CSS var + data attribute. The host site is
 *   responsible for declaring `@font-face` rules (OpenDyslexic SIL OFL,
 *   Atkinson Hyperlegible SIL OFL-1.1) and CSS that maps the data attribute
 *   to the actual font stack. The engine ships zero font binaries.
 *
 * Defensive contracts :
 *   - Unknown / null / undefined input throws (poka-yoke via closed enum).
 *   - localStorage failures do NOT throw — DOM still updated.
 *   - Other axes in storage are preserved.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { getTarget } from './target.js';
import { FONT_FAMILIES } from './tokens.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Extended font-family values including 'auto'. */
const VALID_FONT_FAMILIES_WITH_AUTO = [...FONT_FAMILIES, 'auto'] as const;

/** User-facing font-family value (may include 'auto'). */
export type FontFamilyChoice = (typeof VALID_FONT_FAMILIES_WITH_AUTO)[number];

/** Concrete font-family actually applied to the DOM (no 'auto'). */
export type ResolvedFontFamily = (typeof FONT_FAMILIES)[number];

// ---------------------------------------------------------------------------
// Validation (closed enum — poka-yoke)
// ---------------------------------------------------------------------------

function isValidFontFamilyChoice(value: unknown): value is FontFamilyChoice {
  return (
    typeof value === 'string' &&
    (VALID_FONT_FAMILIES_WITH_AUTO as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// resolveAutoFontFamily — no OS media query, safe default
// ---------------------------------------------------------------------------

/**
 * Resolve 'auto' font-family. No `prefers-font-family` media query exists,
 * so we return 'system' as the safe default (host's default system stack).
 */
export function resolveAutoFontFamily(): ResolvedFontFamily {
  return 'system';
}

// ---------------------------------------------------------------------------
// setFontFamily — main mutation API
// ---------------------------------------------------------------------------

/**
 * Set the morphic font-family preference.
 *
 * Updates both the CSS custom property and the `data-morphic-font-family`
 * attribute on `<html>`. Host CSS may target either; the data attribute is
 * typically used to switch `@font-face` font stacks.
 *
 * @throws {TypeError} when `family` is not in the closed enum.
 */
export function setFontFamily(family: FontFamilyChoice): ResolvedFontFamily {
  if (!isValidFontFamilyChoice(family)) {
    throw new TypeError(
      `setFontFamily: invalid font-family value. Expected one of ${VALID_FONT_FAMILIES_WITH_AUTO.join(', ')}, got ${String(family)}.`,
    );
  }

  const resolved: ResolvedFontFamily = family === 'auto' ? resolveAutoFontFamily() : family;

  // Target defaults to `document.documentElement` (see `target.ts`).
  const root = getTarget();
  root.style.setProperty('--morphic-font-family', resolved);
  root.setAttribute('data-morphic-font-family', resolved);

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
    existing.fontFamily = family;
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable — DOM update still wins.
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// getFontFamily — read back persisted user choice
// ---------------------------------------------------------------------------

/**
 * Read back the user's persisted font-family choice.
 * Returns `null` when storage is unavailable, empty, malformed, or invalid.
 */
export function getFontFamily(): FontFamilyChoice | null {
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

  const stored = (parsed as { fontFamily?: unknown }).fontFamily;
  return isValidFontFamilyChoice(stored) ? stored : null;
}
