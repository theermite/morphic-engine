/**
 * Axe daltonization corrective — runtime API for color vision deficiency correction.
 *
 * CDC ref : F-025 (Axe visuel : daltonization corrective — protan/deutan/tritan).
 * Brick   : B-101.
 * Risk    : Critical (95% coverage + mutation 75% + PBT).
 *
 * Spec :
 *   - `setColorVisionCorrection(type, severity?)` injects an SVG feColorMatrix
 *     filter on `document.documentElement` and persists the choice.
 *   - `getColorVisionCorrection()` reads back the persisted choice.
 *   - `clearColorVisionCorrection()` removes filter + clears storage.
 *   - Pure math helpers (`linearizeSrgb`, `delinearizeSrgb`,
 *     `computeDaltonizationMatrix`, `daltonize`) are exposed for tests and
 *     consumers needing per-pixel correction (canvas / image processing).
 *
 * Algorithm :
 *   LMS-shift daltonization (Fidaner 2005) on top of grayscale-preserving
 *   sRGB simulation matrices (Machado-Oliveira 2009 family) :
 *     M_dalt = I + S · (I − M_sim)
 *   where S has row 0 = [0, 0, 0] (red channel passthrough), so lost chroma
 *   information is shifted to the green / blue channels (visible to users
 *   with red-green or blue-yellow deficiency).
 *
 * Defensive contracts (≥2 per critical function) :
 *   - Closed enum on `type` (poka-yoke).
 *   - `severity` finite and in [0, 1] (range guard).
 *   - rgb tuple length 3, each value finite and in [0, 1].
 *   - localStorage failures NEVER throw — DOM update wins.
 *
 * Sources :
 *   - Brettel et al. 1997, J. Opt. Soc. Am. A — half-plane projection.
 *   - Viénot et al. 1999, Color Res. Appl. — single 3x3 dichromat matrices.
 *   - Fidaner et al. 2005 — daltonization LMS-shift correction.
 *   - Machado & Oliveira 2009 — grayscale-preserving simulation matrices.
 *   - WHATWG SVG 2 Filter Effects — feColorMatrix 4x5 spec.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { hasLocalStorage, safeStorage } from './storage-access.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Closed enum of supported color-vision-deficiency types. */
export const COLOR_VISION_TYPES = ['none', 'protan', 'deutan', 'tritan'] as const;

/** DOM id used for the injected SVG container. */
export const MORPHIC_DALTONIZE_FILTER_ID = 'morphic-daltonize' as const;

/** Default severity when `setColorVisionCorrection` is called without one. */
export const MORPHIC_DALTONIZE_DEFAULT_SEVERITY = 1 as const;

/** Storage sub-key for the persisted correction choice. */
const STORAGE_SUBKEY = 'colorVision' as const;

/** Storage sub-key for the persisted chrome-safe target selector (B-021h). */
const STORAGE_SUBKEY_TARGET = 'colorVisionTarget' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Color vision deficiency type (closed enum). */
export type ColorVisionType = (typeof COLOR_VISION_TYPES)[number];

/** Persisted correction choice. */
export interface ColorVisionCorrection {
  type: ColorVisionType;
  severity: number;
}

/** 3x3 row-major matrix as a 9-element tuple. */
type Matrix3x3 = readonly [number, number, number, number, number, number, number, number, number];

/** 3-component RGB tuple in [0, 1]. */
type Rgb = readonly [number, number, number];

// ---------------------------------------------------------------------------
// Validation (closed enum + finite range — poka-yoke)
// ---------------------------------------------------------------------------

function isValidColorVisionType(value: unknown): value is ColorVisionType {
  return typeof value === 'string' && (COLOR_VISION_TYPES as readonly string[]).includes(value);
}

function isValidSeverity(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isValidRgbComponent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isValidRgbTuple(value: unknown): value is Rgb {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    isValidRgbComponent(value[0]) &&
    isValidRgbComponent(value[1]) &&
    isValidRgbComponent(value[2])
  );
}

// ---------------------------------------------------------------------------
// sRGB transfer function (IEC 61966-2-1)
// ---------------------------------------------------------------------------

/** sRGB → linear-light (EOTF). */
export function linearizeSrgb(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Linear-light → sRGB (OETF). */
export function delinearizeSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

// ---------------------------------------------------------------------------
// Simulation matrices — Machado & Oliveira 2009 family (grayscale-preserving)
// ---------------------------------------------------------------------------

/**
 * Protanopia simulation matrix (sRGB, severity = 1).
 * Row sums = 1 → preserves the gray axis exactly.
 */
const M_SIM_PROTAN: Matrix3x3 = [
  0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998,
];

/** Deuteranopia simulation matrix (Machado-Oliveira 2009). */
const M_SIM_DEUTAN: Matrix3x3 = [
  0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881,
];

/** Tritanopia simulation matrix (Machado-Oliveira 2009). */
const M_SIM_TRITAN: Matrix3x3 = [
  1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039,
];

/**
 * Daltonization shift matrix (Fidaner 2005).
 *
 * Row 0 = [0, 0, 0] → red channel is passthrough, shifted error never lands
 * on red. Used uniformly for all three CVD types so that the corrected red
 * row of `M_dalt` is always [1, 0, 0] (an invariant tested in PBT).
 */
const SHIFT_MATRIX: Matrix3x3 = [0, 0, 0, 0.7, 1, 0, 0.7, 0, 1];

function getSimulationMatrix(type: Exclude<ColorVisionType, 'none'>): Matrix3x3 {
  switch (type) {
    case 'protan':
      return M_SIM_PROTAN;
    case 'deutan':
      return M_SIM_DEUTAN;
    case 'tritan':
      return M_SIM_TRITAN;
  }
}

// ---------------------------------------------------------------------------
// computeDaltonizationMatrix — M_dalt = I + severity · S · (I − M_sim)
// ---------------------------------------------------------------------------

const IDENTITY_3X3: Matrix3x3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/**
 * Compute the 3x3 daltonization correction matrix for a given CVD type
 * and severity.
 *
 * @param type     'none' | 'protan' | 'deutan' | 'tritan'
 * @param severity 0 (no correction) … 1 (full correction)
 * @returns 9-element row-major matrix.
 * @throws  TypeError on invalid type or severity.
 */
export function computeDaltonizationMatrix(type: ColorVisionType, severity: number): number[] {
  if (!isValidColorVisionType(type)) {
    throw new TypeError(
      `computeDaltonizationMatrix: invalid type. Expected one of ${COLOR_VISION_TYPES.join(', ')}, got ${String(type)}.`,
    );
  }
  if (!isValidSeverity(severity)) {
    throw new TypeError(
      `computeDaltonizationMatrix: severity must be a finite number in [0, 1], got ${String(severity)}.`,
    );
  }

  if (type === 'none') {
    return [...IDENTITY_3X3];
  }

  const M_sim = getSimulationMatrix(type);

  // err = I − M_sim
  const err: number[] = new Array(9);
  for (let i = 0; i < 9; i++) {
    err[i] = (IDENTITY_3X3[i] ?? 0) - (M_sim[i] ?? 0);
  }

  // shift_err = S · err   (row-major 3x3 product)
  const shiftErr: number[] = new Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += (SHIFT_MATRIX[r * 3 + k] ?? 0) * (err[k * 3 + c] ?? 0);
      }
      shiftErr[r * 3 + c] = sum;
    }
  }

  // M_dalt = I + severity · shift_err
  const out: number[] = new Array(9);
  for (let i = 0; i < 9; i++) {
    out[i] = (IDENTITY_3X3[i] ?? 0) + severity * (shiftErr[i] ?? 0);
  }
  return out;
}

// ---------------------------------------------------------------------------
// daltonize — per-pixel correction
// ---------------------------------------------------------------------------

/**
 * Apply daltonization correction to a single sRGB pixel.
 *
 * @param rgb      [r, g, b] each in [0, 1].
 * @param type     CVD type.
 * @param severity 0 … 1.
 * @returns [r', g', b'] clamped to [0, 1].
 * @throws TypeError on invalid input.
 */
export function daltonize(
  rgb: [number, number, number],
  type: ColorVisionType,
  severity: number,
): [number, number, number] {
  if (!isValidColorVisionType(type)) {
    throw new TypeError(
      `daltonize: invalid type. Expected one of ${COLOR_VISION_TYPES.join(', ')}, got ${String(type)}.`,
    );
  }
  if (!isValidSeverity(severity)) {
    throw new TypeError(
      `daltonize: severity must be a finite number in [0, 1], got ${String(severity)}.`,
    );
  }
  if (!isValidRgbTuple(rgb)) {
    throw new TypeError(
      `daltonize: rgb must be a 3-tuple of finite numbers in [0, 1], got ${JSON.stringify(rgb)}.`,
    );
  }

  if (type === 'none' || severity === 0) {
    return [rgb[0], rgb[1], rgb[2]];
  }

  // `computeDaltonizationMatrix` is guaranteed to return 9 finite numbers
  // (above branches caught invalid input; algorithm is deterministic).
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = computeDaltonizationMatrix(type, severity) as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const [r, g, b] = rgb;
  const or = m0 * r + m1 * g + m2 * b;
  const og = m3 * r + m4 * g + m5 * b;
  const ob = m6 * r + m7 * g + m8 * b;

  return [clamp01(or), clamp01(og), clamp01(ob)];
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

// ---------------------------------------------------------------------------
// Chrome-safe target (B-021h)
// ---------------------------------------------------------------------------

/**
 * Module-level scoped target for the daltonization filter.
 *
 * `null` (default) means the engine applies the filter on `documentElement`,
 * which is the v2.0.0-beta.3 behavior. Hosts that need to spare a chrome
 * region (navbar logo, brand colors) opt in via `setColorVisionTarget(sel)`.
 */
let targetSelector: string | null = null;

function isValidTargetSelector(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string') return false;
  // Empty / whitespace-only string is not a valid selector.
  return value.trim().length > 0;
}

// ---------------------------------------------------------------------------
// SVG filter injection (DOM side effects)
// ---------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg' as const;

/** Format a 3x3 matrix as the 20-value feColorMatrix `values` attribute. */
function matrix3x3ToFeColorMatrix(m: readonly number[]): string {
  // SVG feColorMatrix expects a 4x5 row-major matrix:
  //   [a11 a12 a13 0 0]
  //   [a21 a22 a23 0 0]
  //   [a31 a32 a33 0 0]
  //   [0   0   0   1 0]
  // (alpha row passes through unchanged)
  return [
    m[0],
    m[1],
    m[2],
    0,
    0,
    m[3],
    m[4],
    m[5],
    0,
    0,
    m[6],
    m[7],
    m[8],
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ].join(' ');
}

/**
 * Resolve the DOM target the daltonization filter should be applied to.
 *
 * Backward-compatibility contract (BLOCKING) :
 *   - When no target selector is set (default) → `document.documentElement`.
 *     Existing consumers continue to receive the v2.0.0-beta.3 behavior.
 *   - When a selector is set AND it matches → the matched element.
 *   - When a selector is set BUT misses → silent fallback to documentElement
 *     (the host's chrome-safety intent loses to the user's correction need).
 */
function resolveFilterTarget(): HTMLElement {
  if (typeof document === 'undefined') {
    // Caller-side guards already short-circuit before reaching here; this
    // branch only exists to satisfy the type system in SSR-style imports.
    return null as unknown as HTMLElement;
  }
  if (targetSelector === null) return document.documentElement;
  try {
    const el = document.querySelector(targetSelector);
    if (el instanceof HTMLElement) return el;
  } catch {
    // Invalid CSS selector at runtime — fall through to documentElement.
  }
  return document.documentElement;
}

function removeFilterDom(): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(MORPHIC_DALTONIZE_FILTER_ID);
  if (existing !== null) existing.remove();
  // Clear style on the current resolved target AND documentElement, in case
  // the target was changed mid-correction (defensive — guarantees no stale
  // `filter: url(...)` left on a previously-targeted element).
  document.documentElement.style.filter = '';
  const current = resolveFilterTarget();
  if (current !== document.documentElement) {
    current.style.filter = '';
  }
}

function injectFilterDom(type: Exclude<ColorVisionType, 'none'>, severity: number): void {
  if (typeof document === 'undefined') return;

  // Idempotent — remove any prior filter first.
  const existing = document.getElementById(MORPHIC_DALTONIZE_FILTER_ID);
  if (existing !== null) existing.remove();

  const matrix = computeDaltonizationMatrix(type, severity);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('id', MORPHIC_DALTONIZE_FILTER_ID);
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('style', 'position:absolute;overflow:hidden');
  svg.setAttribute('aria-hidden', 'true');

  const filter = document.createElementNS(SVG_NS, 'filter');
  // linearRGB so the matrix operates on light values, not gamma-encoded sRGB.
  filter.setAttribute('color-interpolation-filters', 'linearRGB');

  const fe = document.createElementNS(SVG_NS, 'feColorMatrix');
  fe.setAttribute('type', 'matrix');
  fe.setAttribute('values', matrix3x3ToFeColorMatrix(matrix));

  filter.appendChild(fe);
  svg.appendChild(filter);
  // SVG defs container always lives on documentElement so the `url(#id)`
  // reference resolves regardless of where the consumer scopes the filter.
  document.documentElement.appendChild(svg);

  // Apply the filter on the configured target (defaults to documentElement
  // for backward-compat with v2.0.0-beta.3 and earlier consumers).
  const target = resolveFilterTarget();
  // Clear documentElement style first if the target is something else, so we
  // do not double-filter (target inherits from html in some setups).
  if (target !== document.documentElement) {
    document.documentElement.style.filter = '';
  }
  target.style.filter = `url(#${MORPHIC_DALTONIZE_FILTER_ID})`;
}

// ---------------------------------------------------------------------------
// localStorage persistence — never throws
// ---------------------------------------------------------------------------

function readStorageObject(): Record<string, unknown> {
  if (!hasLocalStorage()) return {};
  let raw: string | null;
  try {
    raw = safeStorage.get(MORPHIC_STORAGE_KEY);
  } catch {
    return {};
  }
  if (raw === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed as Record<string, unknown>;
}

function writeStorageObject(obj: Record<string, unknown>): void {
  if (!hasLocalStorage()) return;
  try {
    safeStorage.set(MORPHIC_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Storage unavailable — DOM update wins.
  }
}

function persistCorrection(correction: ColorVisionCorrection): void {
  const obj = readStorageObject();
  obj[STORAGE_SUBKEY] = { type: correction.type, severity: correction.severity };
  writeStorageObject(obj);
}

function unpersistCorrection(): void {
  const obj = readStorageObject();
  if (STORAGE_SUBKEY in obj) {
    delete obj[STORAGE_SUBKEY];
    writeStorageObject(obj);
  }
}

function persistTarget(selector: string | null): void {
  const obj = readStorageObject();
  if (selector === null) {
    if (STORAGE_SUBKEY_TARGET in obj) {
      delete obj[STORAGE_SUBKEY_TARGET];
      writeStorageObject(obj);
    }
    return;
  }
  obj[STORAGE_SUBKEY_TARGET] = selector;
  writeStorageObject(obj);
}

function readPersistedTarget(): string | null {
  const obj = readStorageObject();
  const stored = obj[STORAGE_SUBKEY_TARGET];
  return isValidTargetSelector(stored) ? stored : null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Set the user's color-vision-deficiency correction.
 *
 * @param type     'none' clears the correction. Otherwise applies a daltonization filter.
 * @param severity 0 … 1, defaults to 1 (full correction).
 * @returns The applied correction.
 * @throws  TypeError on invalid type / severity.
 */
export function setColorVisionCorrection(
  type: ColorVisionType,
  severity: number = MORPHIC_DALTONIZE_DEFAULT_SEVERITY,
): ColorVisionCorrection {
  if (!isValidColorVisionType(type)) {
    throw new TypeError(
      `setColorVisionCorrection: invalid type. Expected one of ${COLOR_VISION_TYPES.join(', ')}, got ${String(type)}.`,
    );
  }
  if (!isValidSeverity(severity)) {
    throw new TypeError(
      `setColorVisionCorrection: severity must be a finite number in [0, 1], got ${String(severity)}.`,
    );
  }

  if (type === 'none') {
    removeFilterDom();
    unpersistCorrection();
    return { type: 'none', severity };
  }

  injectFilterDom(type, severity);
  persistCorrection({ type, severity });
  return { type, severity };
}

/**
 * Read back the persisted correction choice, or `null` when none / invalid.
 */
export function getColorVisionCorrection(): ColorVisionCorrection | null {
  const obj = readStorageObject();
  const stored = obj[STORAGE_SUBKEY];
  if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) {
    return null;
  }
  const { type, severity } = stored as { type?: unknown; severity?: unknown };
  if (!isValidColorVisionType(type) || !isValidSeverity(severity)) {
    return null;
  }
  if (type === 'none') return null;
  return { type, severity };
}

/**
 * Remove the SVG filter from the DOM and clear the persisted choice.
 * Idempotent — safe to call multiple times.
 */
export function clearColorVisionCorrection(): void {
  removeFilterDom();
  unpersistCorrection();
}

// ---------------------------------------------------------------------------
// Chrome-safe target API (B-021h)
// ---------------------------------------------------------------------------

/**
 * Scope the daltonization SVG filter to a specific DOM element instead of
 * `documentElement`. This lets a host spare its chrome (navbar logo, brand
 * colors) from the color shift.
 *
 * Contract :
 *   - `null` (or omitted) restores the default behavior (filter on `<html>`).
 *   - A CSS selector string targets `document.querySelector(selector)`.
 *   - If the selector misses at apply-time, the engine silently falls back to
 *     `documentElement` — the user's correction need wins over the host's
 *     chrome-safety intent (Dignity §a: never deny a corrective tool over a
 *     cosmetic concern).
 *   - When an active correction is currently applied, calling this function
 *     migrates the filter from the old target to the new one in a single
 *     atomic operation (no flash, no double-filter).
 *   - The selector is persisted under sub-key `colorVisionTarget` so that the
 *     scope survives reloads and follows `setColorVisionCorrection` calls
 *     after `init()` rehydrates state.
 *
 * @param selector CSS selector string (e.g. `'main'`, `'#morphic-zone'`) or
 *                 `null` to restore default `<html>` scope.
 * @returns The selector that was applied (echo, including `null`).
 * @throws  TypeError on non-null, non-string, or empty-string input.
 */
export function setColorVisionTarget(selector: string | null): string | null {
  if (!isValidTargetSelector(selector)) {
    throw new TypeError(
      `setColorVisionTarget: selector must be a non-empty string or null, got ${String(selector)}.`,
    );
  }

  const previousTarget: HTMLElement | null =
    typeof document === 'undefined' ? null : resolveFilterTarget();

  targetSelector = selector;
  persistTarget(selector);

  // If a correction is currently active in the DOM, migrate it to the new
  // target without flashing the page (clear old target style, apply new).
  if (typeof document !== 'undefined') {
    const filterEl = document.getElementById(MORPHIC_DALTONIZE_FILTER_ID);
    if (filterEl !== null && previousTarget !== null) {
      previousTarget.style.filter = '';
      const newTarget = resolveFilterTarget();
      newTarget.style.filter = `url(#${MORPHIC_DALTONIZE_FILTER_ID})`;
    }
  }

  return selector;
}

/**
 * Read back the currently-scoped target selector for the daltonization filter.
 * Returns `null` when the engine uses its default `documentElement` scope.
 */
export function getColorVisionTarget(): string | null {
  // In-memory state wins over storage to avoid stale reads after a runtime
  // `setColorVisionTarget(null)` call within the same session.
  if (targetSelector !== null) return targetSelector;
  return readPersistedTarget();
}

/**
 * Test-only reset of the in-memory target. Not exported through the package
 * barrel (`index.ts`) — used by unit tests to isolate cases.
 *
 * @internal
 */
export function __resetColorVisionTargetForTests(): void {
  targetSelector = null;
}
