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

/** Valid font-size values (closed enum). Exported for cross-module sync check (B-010). */
export const VALID_FONT_SIZES = ['sm', 'md', 'lg', 'xl'] as const;
type FontSize = (typeof VALID_FONT_SIZES)[number];

/** Valid font-family values (closed enum). Exported for cross-module sync check (B-112). */
export const VALID_FONT_FAMILIES = ['system', 'serif', 'atkinson', 'dyslexic'] as const;
type FontFamily = (typeof VALID_FONT_FAMILIES)[number];

/** Valid density values (closed enum). Exported for cross-module sync check (B-009). */
export const VALID_DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
type Density = (typeof VALID_DENSITIES)[number];

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/** Morphic preferences shape (partial — each axis is optional). */
export interface MorphicPrefs {
  theme?: string;
  motion?: string;
  contrast?: string;
  fontSize?: string;
  fontFamily?: string;
  density?: string;
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

function isValidFontSize(value: unknown): value is FontSize {
  return typeof value === 'string' && (VALID_FONT_SIZES as readonly string[]).includes(value);
}

function isValidFontFamily(value: unknown): value is FontFamily {
  return typeof value === 'string' && (VALID_FONT_FAMILIES as readonly string[]).includes(value);
}

function isValidDensity(value: unknown): value is Density {
  return typeof value === 'string' && (VALID_DENSITIES as readonly string[]).includes(value);
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
 * <script src="@theermite/morphic-engine/init.js"></script>
 * ```
 *
 * Reads stored preferences, validates, injects CSS vars, or falls back
 * to media queries. SSR-safe, idempotent, never throws.
 */
export function morphicInit(): void {
  // SSR guard — silent no-op when DOM globals are absent.
  if (typeof document === 'undefined') return;

  // No storage guard here, deliberately (independent review, 2026-08-31).
  // `readPrefs()` already wraps its own read and answers `null`, and every
  // branch below falls back to a media query. A guard on storage returned
  // early instead, so on a host that refuses storage — a privileged window, a
  // sandboxed iframe, an enterprise policy — the engine set NO attribute at
  // all: no contrast, no reduced motion, no font size. The people who need the
  // adaptation most were the ones who received none of it.
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
  root.setAttribute('data-morphic-motion', motion);

  // --- Contrast ---
  const contrast: Contrast =
    prefs !== null && isValidContrast(prefs.contrast) ? prefs.contrast : readMediaContrast();
  root.style.setProperty('--morphic-contrast', contrast);
  root.setAttribute('data-morphic-contrast', contrast);

  // --- Font Size ---
  const fontSize: FontSize =
    prefs !== null && isValidFontSize(prefs.fontSize) ? prefs.fontSize : 'md';
  root.style.setProperty('--morphic-font-size', fontSize);
  root.setAttribute('data-morphic-font-size', fontSize);

  // --- Font Family ---
  // No `prefers-font-family` media query exists. Default to 'system'.
  const fontFamily: FontFamily =
    prefs !== null && isValidFontFamily(prefs.fontFamily) ? prefs.fontFamily : 'system';
  root.style.setProperty('--morphic-font-family', fontFamily);
  root.setAttribute('data-morphic-font-family', fontFamily);

  // --- Density ---
  // No `prefers-density` media query exists. Default to 'comfortable'.
  const density: Density =
    prefs !== null && isValidDensity(prefs.density) ? prefs.density : 'comfortable';
  root.style.setProperty('--morphic-density', density);
  root.setAttribute('data-morphic-density', density);
}
