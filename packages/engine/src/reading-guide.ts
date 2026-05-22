/**
 * @morphic/engine — reading-guide axis (B-103, F-027).
 *
 * Three modes for visual reading assistance:
 *  - 'line'  : horizontal highlight band following cursor Y (light dim 0.3)
 *  - 'mask'  : strong dim everywhere except reading band (heavier dim 0.65)
 *  - 'ruler' : vertical bar following cursor X (high-contrast guide)
 *
 * Each mode mounts overlays as `position: fixed` with `pointer-events: none`,
 * so the page underneath remains fully interactive. The overlay root carries
 * `data-morphic-reading-guide="<mode>"` for idempotent re-application and
 * clean teardown. All listeners are scoped to an AbortController so a single
 * `clearReadingGuide()` call removes every side effect.
 *
 * Persistence: stored under sub-key `readingGuide` of MORPHIC_STORAGE_KEY,
 * coexisting with other axes. Storage is the source of truth for *intent*,
 * not for live DOM — the host explicitly opts-in by calling `setReadingGuide`.
 *
 * Motion: cursor tracking itself is preserved when `prefers-reduced-motion`
 * is set (the user activated the tool and moves it intentionally) — only the
 * easing transition is stripped (per WCAG 2.3.3 Understanding).
 *
 * License: AGPL-3.0-or-later.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

export const READING_GUIDE_MODES = Object.freeze(['line', 'mask', 'ruler'] as const);
export type ReadingGuideMode = (typeof READING_GUIDE_MODES)[number];

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
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
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
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Quota / private mode — DOM remains the source of truth for this session.
  }
}

function persistMode(mode: ReadingGuideMode): void {
  const obj = readStorageObject();
  obj[STORAGE_SUBKEY] = mode;
  writeStorageObject(obj);
}

function unpersistMode(): void {
  const obj = readStorageObject();
  if (STORAGE_SUBKEY in obj) {
    delete obj[STORAGE_SUBKEY];
    writeStorageObject(obj);
  }
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

let activeGuide: ActiveGuide | null = null;

function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function removeActiveGuide(): void {
  if (activeGuide === null) return;
  activeGuide.abort.abort();
  for (const part of activeGuide.parts) {
    part.remove();
  }
  activeGuide.root.remove();
  activeGuide = null;
}

// Also defensively sweep any stray markers that did not go through activeGuide
// (e.g. duplicate roots from a previously crashed setReadingGuide call).
function sweepStrayMarkers(): void {
  if (typeof document === 'undefined') return;
  const stray = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}]`);
  for (const el of Array.from(stray)) {
    el.remove();
  }
}

function applyCommonRootStyle(root: HTMLElement, zIndex: number, reducedMotion: boolean): void {
  root.style.position = 'fixed';
  root.style.top = '0';
  root.style.left = '0';
  root.style.right = '0';
  root.style.bottom = '0';
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

  const root = document.createElement('div');
  root.setAttribute(MORPHIC_READING_GUIDE_MARKER, mode);
  root.dataset.morphicBandHeight = String(bandHeight);
  root.dataset.morphicDimOpacity = String(dimOpacity);
  applyCommonRootStyle(root, zIndex, reducedMotion);
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

  const root = document.createElement('div');
  root.setAttribute(MORPHIC_READING_GUIDE_MARKER, 'ruler');
  root.dataset.morphicRulerWidth = String(rulerWidth);
  root.style.position = 'fixed';
  root.style.top = '0';
  root.style.bottom = '0';
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
 * Activate the reading guide in the given mode. Validates input, mounts
 * overlay(s) in the DOM, attaches a single mousemove listener scoped to an
 * AbortController, and persists the active mode under the readingGuide
 * sub-key. Repeated calls are idempotent — only the latest mode is active.
 */
export function setReadingGuide(mode: ReadingGuideMode, options: ReadingGuideOptions = {}): void {
  assertMode(mode);
  assertPositiveFinite(options.bandHeight, 'bandHeight');
  assertPositiveFinite(options.rulerWidth, 'rulerWidth');
  assertUnitInterval(options.dimOpacity, 'dimOpacity');
  assertPositiveFinite(options.zIndex, 'zIndex');

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    persistMode(mode);
    return;
  }

  // Idempotence — tear down any previous guide (same or different mode).
  removeActiveGuide();
  sweepStrayMarkers();

  const reduced = isReducedMotion();
  let guide: ActiveGuide;
  switch (mode) {
    case 'line':
    case 'mask':
      guide = mountLineOrMask(mode, options, reduced);
      break;
    case 'ruler':
      guide = mountRuler(options, reduced);
      break;
  }
  activeGuide = guide;

  persistMode(mode);
}

/**
 * Return the persisted mode, or null when nothing valid is stored.
 * Storage is the source of truth for *intent*; the host must call
 * `setReadingGuide` to actually mount the DOM (no surprise overlays on load).
 */
export function getReadingGuide(): ReadingGuideMode | null {
  const obj = readStorageObject();
  const value = obj[STORAGE_SUBKEY];
  return isReadingGuideMode(value) ? value : null;
}

/**
 * Remove every DOM side effect of the active guide (overlays, listeners) and
 * clear the persisted sub-key. Safe to call when nothing is active.
 */
export function clearReadingGuide(): void {
  if (typeof document !== 'undefined') {
    removeActiveGuide();
    sweepStrayMarkers();
  }
  unpersistMode();
}
