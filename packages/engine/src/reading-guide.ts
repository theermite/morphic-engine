/**
 * @theermite/morphic-engine — reading-guide axis (B-103, F-027).
 *
 * Two INDEPENDENT, cumulable families of visual reading assistance:
 *
 *  - band  : one of 'line' | 'mask' (mutually exclusive — both occupy the
 *            horizontal Y reading strip).
 *      'line'  : horizontal highlight band following cursor Y (light dim 0.3)
 *      'mask'  : strong dim everywhere except reading band (heavier dim 0.65)
 *  - ruler : vertical bar following cursor X (high-contrast guide).
 *
 * band and ruler are perpendicular, so they can be active AT THE SAME TIME —
 * e.g. 'mask' + 'ruler' forms a reading crosshair. 'line' and 'mask' remain
 * mutually exclusive because they are the same horizontal strip.
 *
 * Each mount uses `position: fixed` + `pointer-events: none`, so the page
 * underneath stays fully interactive. The overlay root carries
 * `data-morphic-reading-guide="<mode>"` for idempotent re-application and
 * clean teardown. All listeners are scoped to an AbortController so a single
 * clear removes every side effect of that family.
 *
 * Persistence: stored under sub-key `readingGuide` of MORPHIC_STORAGE_KEY as
 * `{ band: 'line'|'mask'|null, ruler: boolean }`, coexisting with other axes.
 * Legacy string values ('line'|'mask'|'ruler') from earlier versions are read
 * back transparently. Storage is the source of truth for *intent*, not for
 * live DOM — the host explicitly opts-in by calling `setReadingGuide`.
 *
 * Motion: cursor tracking itself is preserved when `prefers-reduced-motion`
 * is set (the user activated the tool and moves it intentionally) — only the
 * easing transition is stripped (per WCAG 2.3.3 Understanding).
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { hasLocalStorage, safeStorage } from './storage-access.js';

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

export const READING_GUIDE_MODES = Object.freeze(['line', 'mask', 'ruler'] as const);
export type ReadingGuideMode = (typeof READING_GUIDE_MODES)[number];

/** The horizontal-strip family — mutually exclusive members. */
export type ReadingBand = 'line' | 'mask';

/** Composite active state: a band (or none) plus an independent ruler flag. */
export interface ReadingGuideState {
  band: ReadingBand | null;
  ruler: boolean;
}

export const MORPHIC_READING_GUIDE_MARKER = 'data-morphic-reading-guide' as const;
export const MORPHIC_READING_GUIDE_DEFAULT_BAND_HEIGHT = 64 as const;
export const MORPHIC_READING_GUIDE_DEFAULT_RULER_WIDTH = 3 as const;
export const MORPHIC_READING_GUIDE_DEFAULT_Z_INDEX = 9998 as const;

const DIM_OPACITY_LINE = 0.3;
const DIM_OPACITY_MASK = 0.65;
const RULER_COLOR = 'rgba(120, 80, 200, 0.7)';
const HIGHLIGHT_COLOR = 'rgba(228, 239, 238, 0.18)';
const TRANSITION_DURATION_MS = 80;

const STORAGE_SUBKEY = 'readingGuide';
const BAND_MODES: readonly string[] = ['line', 'mask'];
const RULER_MODES: readonly string[] = ['ruler'];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ReadingGuideOptions {
  /** Height of the reading band in px for line/mask modes. Default 64. */
  bandHeight?: number;
  /** Width of the vertical ruler in px for ruler mode. Default 3. */
  rulerWidth?: number;
  /** Dim opacity for line/mask modes in [0, 1]. Defaults: line=0.3, mask=0.65. */
  dimOpacity?: number;
  /** z-index for overlays. Default 9998. */
  zIndex?: number;
  /**
   * Chrome-safe gap at the top of the viewport in px (B-021i). The overlay
   * (dim/mask/ruler) starts BELOW this gap so a fixed navbar remains
   * untouched and fully visible. Default 0.
   */
  topOffset?: number;
  /**
   * Chrome-safe gap at the bottom of the viewport in px (B-021i). The overlay
   * stops ABOVE this gap so a fixed footer / mobile tab bar remains
   * untouched and fully visible. Default 0.
   */
  bottomOffset?: number;
}

// ---------------------------------------------------------------------------
// Validation helpers (defensive — TypeError on bad input)
// ---------------------------------------------------------------------------

function isReadingGuideMode(value: unknown): value is ReadingGuideMode {
  return typeof value === 'string' && (READING_GUIDE_MODES as readonly string[]).includes(value);
}

function assertMode(mode: unknown): asserts mode is ReadingGuideMode {
  if (!isReadingGuideMode(mode)) {
    throw new TypeError(
      `reading-guide: mode must be one of ${READING_GUIDE_MODES.join(', ')}; got ${String(mode)}`,
    );
  }
}

function assertPositiveFinite(value: number | undefined, label: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`reading-guide: ${label} must be a positive finite number; got ${value}`);
  }
}

function assertNonNegativeFinite(value: number | undefined, label: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(
      `reading-guide: ${label} must be a non-negative finite number; got ${value}`,
    );
  }
}

function assertUnitInterval(value: number | undefined, label: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`reading-guide: ${label} must be in [0, 1]; got ${value}`);
  }
}

// ---------------------------------------------------------------------------
// Storage helpers (sub-key pattern, never throws)
// ---------------------------------------------------------------------------

function readStorageObject(): Record<string, unknown> {
  if (!hasLocalStorage()) return {};
  try {
    const raw = safeStorage.get(MORPHIC_STORAGE_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStorageObject(obj: Record<string, unknown>): void {
  if (!hasLocalStorage()) return;
  try {
    safeStorage.set(MORPHIC_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Quota / private mode — DOM remains the source of truth for this session.
  }
}

/** Coerce any stored value (new object shape OR legacy string) into a state. */
function coerceState(value: unknown): ReadingGuideState {
  if (value === 'line' || value === 'mask') return { band: value, ruler: false };
  if (value === 'ruler') return { band: null, ruler: true };
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const o = value as { band?: unknown; ruler?: unknown };
    const band = o.band === 'line' || o.band === 'mask' ? o.band : null;
    return { band, ruler: o.ruler === true };
  }
  return { band: null, ruler: false };
}

function readStoredState(): ReadingGuideState {
  return coerceState(readStorageObject()[STORAGE_SUBKEY]);
}

/** Persist a state; an empty state removes the sub-key (preserving others). */
function writeState(state: ReadingGuideState): void {
  const obj = readStorageObject();
  if (state.band === null && !state.ruler) {
    if (STORAGE_SUBKEY in obj) {
      delete obj[STORAGE_SUBKEY];
      writeStorageObject(obj);
    }
    return;
  }
  obj[STORAGE_SUBKEY] = state;
  writeStorageObject(obj);
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

interface ActiveGuide {
  mode: ReadingGuideMode;
  root: HTMLElement;
  abort: AbortController;
  // Mode-specific dependent elements (overlays, highlight strip).
  parts: HTMLElement[];
}

let activeBand: ActiveGuide | null = null;
let activeRuler: ActiveGuide | null = null;

function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function teardown(guide: ActiveGuide | null): void {
  if (guide === null) return;
  guide.abort.abort();
  for (const part of guide.parts) {
    part.remove();
  }
  guide.root.remove();
}

function removeBand(): void {
  teardown(activeBand);
  activeBand = null;
}

function removeRuler(): void {
  teardown(activeRuler);
  activeRuler = null;
}

// Defensively sweep stray roots for the given marker modes (e.g. duplicate
// roots from a previously crashed call). Scoped per family so sweeping the
// band never removes an active ruler and vice-versa.
function sweepStray(modes: readonly string[]): void {
  if (typeof document === 'undefined') return;
  for (const mode of modes) {
    const stray = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="${mode}"]`);
    for (const el of Array.from(stray)) {
      el.remove();
    }
  }
}

function currentDomState(): ReadingGuideState {
  return {
    band: activeBand !== null ? (activeBand.mode as ReadingBand) : null,
    ruler: activeRuler !== null,
  };
}

function applyCommonRootStyle(
  root: HTMLElement,
  zIndex: number,
  reducedMotion: boolean,
  topOffset: number,
  bottomOffset: number,
): void {
  root.style.position = 'fixed';
  // Chrome-safe gaps (B-021i) — overlay starts below topOffset, ends above
  // bottomOffset, leaving fixed navbars / tab bars untouched. Defaults are 0
  // so behavior is backward-compatible with v2.0.0-beta.3 consumers.
  root.style.top = `${topOffset}px`;
  root.style.left = '0';
  root.style.right = '0';
  root.style.bottom = `${bottomOffset}px`;
  root.style.pointerEvents = 'none';
  root.style.zIndex = String(zIndex);
  root.style.transition = reducedMotion ? 'none' : `clip-path ${TRANSITION_DURATION_MS}ms ease-out`;
}

// ---------------------------------------------------------------------------
// Mode renderers
// ---------------------------------------------------------------------------

function mountLineOrMask(
  mode: 'line' | 'mask',
  options: ReadingGuideOptions,
  reducedMotion: boolean,
): ActiveGuide {
  const bandHeight = options.bandHeight ?? MORPHIC_READING_GUIDE_DEFAULT_BAND_HEIGHT;
  const dimOpacity = options.dimOpacity ?? (mode === 'mask' ? DIM_OPACITY_MASK : DIM_OPACITY_LINE);
  const zIndex = options.zIndex ?? MORPHIC_READING_GUIDE_DEFAULT_Z_INDEX;
  const topOffset = options.topOffset ?? 0;
  const bottomOffset = options.bottomOffset ?? 0;

  const root = document.createElement('div');
  root.setAttribute(MORPHIC_READING_GUIDE_MARKER, mode);
  root.dataset.morphicBandHeight = String(bandHeight);
  root.dataset.morphicDimOpacity = String(dimOpacity);
  root.dataset.morphicTopOffset = String(topOffset);
  root.dataset.morphicBottomOffset = String(bottomOffset);
  applyCommonRootStyle(root, zIndex, reducedMotion, topOffset, bottomOffset);
  root.style.background = `rgba(0, 0, 0, ${dimOpacity})`;

  // Initial cursor position: viewport center.
  const initialY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
  root.dataset.morphicCursorY = String(Math.round(initialY));

  const updateClipPath = (centerY: number): void => {
    const half = bandHeight / 2;
    const top = Math.max(0, centerY - half);
    const bottom = centerY + half;
    root.style.clipPath = `polygon(0 0, 100% 0, 100% ${top}px, 0 ${top}px, 0 ${bottom}px, 100% ${bottom}px, 100% 100%, 0 100%)`;
  };
  updateClipPath(initialY);

  // Highlight strip — second element sitting inside the hole for subtle tint.
  // Tracked via parts[] for cleanup; NOT carrying the mode marker so that
  // `querySelectorAll([data-morphic-reading-guide="<mode>"])` returns exactly
  // one root per mode (idempotence invariant).
  const strip = document.createElement('div');
  strip.style.position = 'fixed';
  strip.style.left = '0';
  strip.style.right = '0';
  strip.style.height = `${bandHeight}px`;
  strip.style.top = `${initialY - bandHeight / 2}px`;
  strip.style.background = HIGHLIGHT_COLOR;
  strip.style.pointerEvents = 'none';
  strip.style.zIndex = String(zIndex + 1);
  strip.style.transition = reducedMotion ? 'none' : `top ${TRANSITION_DURATION_MS}ms ease-out`;

  document.body.appendChild(root);
  document.body.appendChild(strip);

  const abort = new AbortController();
  const onMove = (e: MouseEvent): void => {
    const y = e.clientY;
    root.dataset.morphicCursorY = String(y);
    updateClipPath(y);
    strip.style.top = `${y - bandHeight / 2}px`;
  };
  window.addEventListener('mousemove', onMove, { signal: abort.signal });

  return { mode, root, abort, parts: [strip] };
}

function mountRuler(options: ReadingGuideOptions, reducedMotion: boolean): ActiveGuide {
  const rulerWidth = options.rulerWidth ?? MORPHIC_READING_GUIDE_DEFAULT_RULER_WIDTH;
  const zIndex = options.zIndex ?? MORPHIC_READING_GUIDE_DEFAULT_Z_INDEX;
  const topOffset = options.topOffset ?? 0;
  const bottomOffset = options.bottomOffset ?? 0;

  const root = document.createElement('div');
  root.setAttribute(MORPHIC_READING_GUIDE_MARKER, 'ruler');
  root.dataset.morphicRulerWidth = String(rulerWidth);
  root.dataset.morphicTopOffset = String(topOffset);
  root.dataset.morphicBottomOffset = String(bottomOffset);
  root.style.position = 'fixed';
  // Chrome-safe gaps (B-021i) — ruler bar starts below topOffset and stops
  // above bottomOffset. Defaults are 0 so behavior is backward-compatible.
  root.style.top = `${topOffset}px`;
  root.style.bottom = `${bottomOffset}px`;
  root.style.width = `${rulerWidth}px`;
  root.style.background = RULER_COLOR;
  root.style.pointerEvents = 'none';
  root.style.zIndex = String(zIndex);
  root.style.transition = reducedMotion ? 'none' : `left ${TRANSITION_DURATION_MS}ms ease-out`;

  const initialX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
  root.dataset.morphicCursorX = String(Math.round(initialX));
  root.style.left = `${initialX - rulerWidth / 2}px`;

  document.body.appendChild(root);

  const abort = new AbortController();
  const onMove = (e: MouseEvent): void => {
    const x = e.clientX;
    root.dataset.morphicCursorX = String(x);
    root.style.left = `${x - rulerWidth / 2}px`;
  };
  window.addEventListener('mousemove', onMove, { signal: abort.signal });

  return { mode: 'ruler', root, abort, parts: [] };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Activate one reading-guide family. 'line' or 'mask' (re)mounts the band
 * slot, leaving any active ruler untouched; 'ruler' (re)mounts the ruler
 * slot, leaving any active band untouched. This is what makes band + ruler
 * cumulable. Validates input, mounts overlay(s), attaches a single mousemove
 * listener scoped to an AbortController, and persists the composite state.
 * Repeated calls for the same family are idempotent.
 */
export function setReadingGuide(mode: ReadingGuideMode, options: ReadingGuideOptions = {}): void {
  assertMode(mode);
  assertPositiveFinite(options.bandHeight, 'bandHeight');
  assertPositiveFinite(options.rulerWidth, 'rulerWidth');
  assertUnitInterval(options.dimOpacity, 'dimOpacity');
  assertPositiveFinite(options.zIndex, 'zIndex');
  // topOffset / bottomOffset accept 0 (default) — non-negative validator.
  assertNonNegativeFinite(options.topOffset, 'topOffset');
  assertNonNegativeFinite(options.bottomOffset, 'bottomOffset');

  // SSR / non-DOM — persist intent only, merging into the stored state.
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    const next = readStoredState();
    if (mode === 'ruler') next.ruler = true;
    else next.band = mode;
    writeState(next);
    return;
  }

  const reduced = isReducedMotion();
  if (mode === 'ruler') {
    removeRuler();
    sweepStray(RULER_MODES);
    activeRuler = mountRuler(options, reduced);
  } else {
    removeBand();
    sweepStray(BAND_MODES);
    activeBand = mountLineOrMask(mode, options, reduced);
  }

  writeState(currentDomState());
}

/**
 * Return the persisted composite state `{ band, ruler }`. Storage is the
 * source of truth for *intent*; the host must call `setReadingGuide` to
 * actually mount the DOM (no surprise overlays on load). Legacy string values
 * are coerced transparently.
 */
export function getReadingGuide(): ReadingGuideState {
  return readStoredState();
}

/**
 * Remove reading-guide side effects (overlays, listeners) and update the
 * persisted state. With no argument, clears BOTH families. Pass 'band' to
 * clear only the line/mask strip (keeping the ruler), or 'ruler' to clear
 * only the vertical ruler (keeping the band). Safe to call when nothing is
 * active.
 */
export function clearReadingGuide(which?: 'band' | 'ruler'): void {
  if (typeof document !== 'undefined') {
    if (which === undefined || which === 'band') {
      removeBand();
      sweepStray(BAND_MODES);
    }
    if (which === undefined || which === 'ruler') {
      removeRuler();
      sweepStray(RULER_MODES);
    }
    writeState(currentDomState());
    return;
  }

  // SSR — update stored intent without touching the DOM.
  if (which === undefined) {
    writeState({ band: null, ruler: false });
    return;
  }
  const next = readStoredState();
  if (which === 'band') next.band = null;
  else next.ruler = false;
  writeState(next);
}
