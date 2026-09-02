/**
 * Axe thème — runtime API for the morphic theme axis.
 *
 * CDC ref : F-006 (Axe sensoriel : thème light/dark/auto/high-contrast/sepia).
 * Brick   : B-007.
 * Risk    : Standard (80% coverage).
 *
 * Spec :
 *   - `setTheme(theme)` updates `data-morphic-theme` + `--morphic-theme` CSS var
 *     + persists the USER choice (not the resolved value) to localStorage.
 *     Returns the concrete theme actually applied to the DOM.
 *   - `getTheme()` reads back the user's persisted choice (may be 'auto').
 *   - `resolveAutoTheme()` queries `prefers-color-scheme: dark` and returns
 *     the concrete light/dark resolution.
 *
 * Defensive contracts :
 *   - Unknown / null / undefined input throws (poka-yoke via closed enum).
 *   - localStorage failures (private mode, quota) do NOT throw — DOM still updated.
 *   - matchMedia undefined (SSR, old browser) → safe fallback to 'light'.
 *   - Other axes already in storage are preserved when setting theme.
 */

import { MORPHIC_STORAGE_KEY, VALID_THEMES } from './init.js';
import { getTarget } from './target.js';
import { safeStorage } from './storage-access.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** User-facing theme value (may include 'auto'). */
export type ThemeChoice = (typeof VALID_THEMES)[number];

/** Concrete theme actually applied to the DOM (no 'auto'). */
export type ResolvedTheme = Exclude<ThemeChoice, 'auto'>;

// ---------------------------------------------------------------------------
// Validation (closed enum — poka-yoke)
// ---------------------------------------------------------------------------

function isValidThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && (VALID_THEMES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// resolveAutoTheme — matchMedia bridge
// ---------------------------------------------------------------------------

/**
 * Resolve the 'auto' theme to a concrete 'light' or 'dark'.
 *
 * Reads `prefers-color-scheme: dark`. Returns 'light' if matchMedia is
 * unavailable (SSR or old browser).
 */
export function resolveAutoTheme(): ResolvedTheme {
  if (typeof matchMedia === 'undefined') return 'light';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ---------------------------------------------------------------------------
// setTheme — main mutation API
// ---------------------------------------------------------------------------

/**
 * Set the morphic theme.
 *
 * - Validates `theme` against the closed enum (throws on invalid input).
 * - Resolves 'auto' via `prefers-color-scheme`.
 * - Updates `data-morphic-theme` + `--morphic-theme` on `documentElement`.
 * - Persists the USER choice (the input, including 'auto') to localStorage.
 * - Returns the concrete theme applied to the DOM.
 *
 * @throws {TypeError} when `theme` is not in the closed enum.
 */
export function setTheme(theme: ThemeChoice): ResolvedTheme {
  if (!isValidThemeChoice(theme)) {
    throw new TypeError(
      `setTheme: invalid theme value. Expected one of ${VALID_THEMES.join(', ')}, got ${String(theme)}.`,
    );
  }

  const resolved: ResolvedTheme = theme === 'auto' ? resolveAutoTheme() : theme;

  // Apply to DOM first — this MUST succeed even if storage fails.
  // Target defaults to `document.documentElement` (see `target.ts`).
  const root = getTarget();
  root.setAttribute('data-morphic-theme', resolved);
  root.style.setProperty('--morphic-theme', resolved);

  // Persist the USER choice (not the resolved value), preserving other axes.
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
      // Malformed storage entry — overwrite with a fresh object.
      existing = {};
    }
    existing.theme = theme;
    safeStorage.set(MORPHIC_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable (private mode, quota) — DOM update still wins.
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// getTheme — read back persisted user choice
// ---------------------------------------------------------------------------

/**
 * Read back the user's persisted theme choice.
 *
 * Returns the value the user originally set via `setTheme` (which may be 'auto').
 * Returns `null` when:
 *   - localStorage is unavailable (SSR, private mode disabled).
 *   - No entry has been persisted.
 *   - Stored entry is malformed JSON.
 *   - Stored theme value is not in the closed enum.
 */
export function getTheme(): ThemeChoice | null {
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

  const stored = (parsed as { theme?: unknown }).theme;
  return isValidThemeChoice(stored) ? stored : null;
}
