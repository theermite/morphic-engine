/**
 * `morphicInit()` — Synchronous head-read for zero-flash adaptation.
 *
 * CDC ref : F-003 (Synchronous localStorage read in `<head>`, zero flash).
 * Brick   : B-004.
 * Risk    : Critical (95% coverage + MC/DC + PBT).
 *
 * Spec :
 *   - Reads morphic preferences synchronously from localStorage.
 *   - Validates each preference value against a closed enum.
 *   - Injects CSS custom properties `--morphic-*` on `document.documentElement`.
 *   - Sets `data-morphic-theme` attribute for CSS cascade selectors.
 *   - Falls back to `prefers-*` media queries when localStorage is empty,
 *     invalid, or inaccessible (disabled storage, SSR).
 *   - SSR-safe: no-op when `document` or `localStorage` is undefined.
 *   - Idempotent: safe to call multiple times.
 *
 * Defensive assertions (PET §5, ≥2 per critical function):
 *   1. localStorage value is parseable JSON (try/catch guard).
 *   2. Parsed value is a non-null plain object (typeof + null check).
 *   3. Each preference value is in its closed enum (validation functions).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key for morphic preferences. */
export const MORPHIC_STORAGE_KEY = 'morphic-prefs' as const;

/** Valid theme values (closed enum). Exported for cross-module sync check (B-005). */
export const VALID_THEMES = ['light', 'dark', 'auto', 'high-contrast', 'sepia'] as const;
type Theme = (typeof VALID_THEMES)[number];

/** Valid motion values (closed enum). Exported for cross-module sync check (B-005). */
export const VALID_MOTIONS = ['full', 'reduced', 'none'] as const;
type Motion = (typeof VALID_MOTIONS)[number];

/** Valid contrast values (closed enum). Exported for cross-module sync check (B-005). */
export const VALID_CONTRASTS = ['no-preference', 'more', 'less', 'custom'] as const;
type Contrast = (typeof VALID_CONTRASTS)[number];

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/** Morphic preferences shape (partial — each axis is optional). */
export interface MorphicPrefs {
  theme?: string;
  motion?: string;
  contrast?: string;
}

// ---------------------------------------------------------------------------
// Validation (closed enums — poka-yoke)
// ---------------------------------------------------------------------------

function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (VALID_THEMES as readonly string[]).includes(value);
}

function isValidMotion(value: unknown): value is Motion {
  return typeof value === 'string' && (VALID_MOTIONS as readonly string[]).includes(value);
}

function isValidContrast(value: unknown): value is Contrast {
  return typeof value === 'string' && (VALID_CONTRASTS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// readPrefs — pure synchronous localStorage reader
// ---------------------------------------------------------------------------

/**
 * Read morphic preferences from localStorage synchronously.
 *
 * Returns the parsed object if valid, or `null` if:
 *   - localStorage is inaccessible (disabled, SSR)
 *   - No entry exists for MORPHIC_STORAGE_KEY
 *   - Entry is not valid JSON
 *   - Parsed value is not a non-null plain object
 */
export function readPrefs(): MorphicPrefs | null {
  // Defensive assertion #1 — localStorage may be disabled (private browsing,
  // iframe sandbox, SSR). Wrap in try/catch, never throw.
  let raw: string | null;
  try {
    raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  // Defensive assertion #2 — content must be parseable JSON.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  // Defensive assertion #3 — parsed value must be a non-null plain object.
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  return parsed as MorphicPrefs;
}

// ---------------------------------------------------------------------------
// Media query fallback readers
// ---------------------------------------------------------------------------

function readMediaTheme(): Theme {
  if (typeof matchMedia === 'undefined') return 'light';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readMediaMotion(): Motion {
  if (typeof matchMedia === 'undefined') return 'full';
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full';
}

function readMediaContrast(): Contrast {
  if (typeof matchMedia === 'undefined') return 'no-preference';
  if (matchMedia('(prefers-contrast: more)').matches) return 'more';
  if (matchMedia('(prefers-contrast: less)').matches) return 'less';
  return 'no-preference';
}

// ---------------------------------------------------------------------------
// morphicInit — main entry point
// ---------------------------------------------------------------------------

/**
 * Synchronous head-read initializer.
 *
 * Designed to run in `<head>` BEFORE first paint:
 * ```html
 * <script src="@shinkofa/morphic-engine/init.js"></script>
 * ```
 *
 * Reads stored preferences, validates, injects CSS vars, or falls back
 * to media queries. SSR-safe, idempotent, never throws.
 */
export function morphicInit(): void {
  // SSR guard — silent no-op when DOM globals are absent.
  if (typeof document === 'undefined') return;
  if (typeof localStorage === 'undefined') return;

  const prefs = readPrefs();
  const root = document.documentElement;

  // --- Theme ---
  const theme: Theme = prefs !== null && isValidTheme(prefs.theme) ? prefs.theme : readMediaTheme();
  root.style.setProperty('--morphic-theme', theme);
  root.setAttribute('data-morphic-theme', theme);

  // --- Motion ---
  const motion: Motion =
    prefs !== null && isValidMotion(prefs.motion) ? prefs.motion : readMediaMotion();
  root.style.setProperty('--morphic-motion', motion);

  // --- Contrast ---
  const contrast: Contrast =
    prefs !== null && isValidContrast(prefs.contrast) ? prefs.contrast : readMediaContrast();
  root.style.setProperty('--morphic-contrast', contrast);
}
