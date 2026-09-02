/**
 * @theermite/morphic-engine — tremor-filter axis (B-108, F-032).
 *
 * Accessibility for motor tremor:
 *  - Intercepts `pointermove` events and smooths cursor positions
 *    using a moving average over a configurable window (1-20 frames).
 *  - Dispatches `morphic-pointermove` custom events with smoothed
 *    `FilteredPosition { x, y }` coordinates.
 *  - Ring buffer implementation: O(1) amortized per sample.
 *  - Composes with B-107 dwell-click (stable positions help dwell
 *    complete) and B-106 click-delay.
 *
 * Persistence:
 *  - Window size persisted under sub-key `tremorFilter` of
 *    `MORPHIC_STORAGE_KEY`.
 *
 * SSR safety:
 *  - All DOM access guarded by `typeof document`.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { hasLocalStorage, safeStorage } from './storage-access.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum window size (frames). */
export const TREMOR_FILTER_WINDOW_MIN = 1;

/** Maximum window size (frames). */
export const TREMOR_FILTER_WINDOW_MAX = 20;

/** Default window size (frames). */
export const TREMOR_FILTER_WINDOW_DEFAULT = 5;

/** Marker attribute set on `<html>` when tremor filter is active. */
export const MORPHIC_TREMOR_FILTER_MARKER = 'data-morphic-tremor-filter';

const STORAGE_SUBKEY = 'tremorFilter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Smoothed position emitted via `morphic-pointermove` custom event. */
export interface FilteredPosition {
  readonly x: number;
  readonly y: number;
}

/** Options for {@link setTremorFilter}. */
export interface TremorFilterOptions {
  /** Window size in frames (integer, 1-20). Defaults to 5. */
  readonly windowSize?: number;
}

/** Snapshot of the tremor filter state. */
export interface TremorFilterState {
  /** Current window size. */
  readonly windowSize: number;
  /** Whether the filter is active. */
  readonly active: boolean;
  /** Number of filtered events emitted since activation. */
  readonly filteredCount: number;
}

// ---------------------------------------------------------------------------
// Validation — pure
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `windowSize` is a finite integer in `[1, 20]`.
 */
export function validateWindowSize(windowSize: number): boolean {
  return (
    Number.isFinite(windowSize) &&
    Number.isInteger(windowSize) &&
    windowSize >= TREMOR_FILTER_WINDOW_MIN &&
    windowSize <= TREMOR_FILTER_WINDOW_MAX
  );
}

// ---------------------------------------------------------------------------
// Moving average — pure, exported for PBT
// ---------------------------------------------------------------------------

/**
 * Computes the arithmetic mean of an array of `{x, y}` samples.
 *
 * @param samples - Non-empty array of positions.
 * @returns The averaged position.
 * @throws {RangeError} If `samples` is empty.
 */
export function movingAverage(samples: readonly { x: number; y: number }[]): FilteredPosition {
  if (samples.length === 0) {
    throw new RangeError('tremor-filter: movingAverage requires at least one sample');
  }

  let sumX = 0;
  let sumY = 0;
  for (const s of samples) {
    sumX += s.x;
    sumY += s.y;
  }

  return {
    x: sumX / samples.length,
    y: sumY / samples.length,
  };
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function readStorageObject(): Record<string, unknown> {
  if (!hasLocalStorage()) return {};
  try {
    const raw = safeStorage.get(MORPHIC_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
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
    // Storage full or disabled — silent.
  }
}

function persistFilter(windowSize: number): void {
  const obj = readStorageObject();
  obj[STORAGE_SUBKEY] = { windowSize };
  writeStorageObject(obj);
}

// ---------------------------------------------------------------------------
// Ring buffer
// ---------------------------------------------------------------------------

interface RingBuffer {
  data: { x: number; y: number }[];
  head: number;
  size: number;
  capacity: number;
}

function createRingBuffer(capacity: number): RingBuffer {
  return {
    data: new Array<{ x: number; y: number }>(capacity),
    head: 0,
    size: 0,
    capacity,
  };
}

function pushSample(buf: RingBuffer, sample: { x: number; y: number }): void {
  buf.data[buf.head] = sample;
  buf.head = (buf.head + 1) % buf.capacity;
  if (buf.size < buf.capacity) {
    buf.size++;
  }
}

function getSamples(buf: RingBuffer): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  const start = (buf.head - buf.size + buf.capacity) % buf.capacity;
  for (let i = 0; i < buf.size; i++) {
    const sample = buf.data[(start + i) % buf.capacity];
    if (sample) result.push(sample);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Active state singleton
// ---------------------------------------------------------------------------

interface ActiveState {
  windowSize: number;
  filteredCount: number;
  abort: AbortController;
  ring: RingBuffer;
}

let active: ActiveState | null = null;

// ---------------------------------------------------------------------------
// Event handler
// ---------------------------------------------------------------------------

function onPointerMove(event: PointerEvent): void {
  if (!active) return;

  pushSample(active.ring, { x: event.clientX, y: event.clientY });

  const samples = getSamples(active.ring);
  const filtered = movingAverage(samples);

  active.filteredCount++;

  if (typeof document !== 'undefined') {
    const customEvent = new CustomEvent('morphic-pointermove', {
      bubbles: true,
      cancelable: false,
      detail: filtered,
    });
    document.dispatchEvent(customEvent);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Activate tremor filter with the given window size.
 *
 * @throws {TypeError} If `windowSize` is not a number.
 * @throws {RangeError} If `windowSize` is outside `[1, 20]` or not an integer.
 */
export function setTremorFilter(options: TremorFilterOptions): TremorFilterState {
  const { windowSize = TREMOR_FILTER_WINDOW_DEFAULT } = options;

  // Defensive assertion #1 — type guard
  if (typeof windowSize !== 'number') {
    throw new TypeError(`tremor-filter: windowSize must be a number, got ${typeof windowSize}`);
  }

  // Defensive assertion #2 — range guard
  if (!validateWindowSize(windowSize)) {
    throw new RangeError(
      `tremor-filter: windowSize must be an integer in [${TREMOR_FILTER_WINDOW_MIN}, ${TREMOR_FILTER_WINDOW_MAX}], got ${windowSize}`,
    );
  }

  // Tear down prior session
  clearTremorFilter();

  const abort = new AbortController();

  active = {
    windowSize,
    filteredCount: 0,
    abort,
    ring: createRingBuffer(windowSize),
  };

  // DOM registration
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(MORPHIC_TREMOR_FILTER_MARKER, '');

    document.addEventListener('pointermove', onPointerMove, {
      signal: abort.signal,
    });
  }

  persistFilter(windowSize);

  return {
    windowSize,
    active: true,
    filteredCount: 0,
  };
}

/**
 * Deactivate tremor filter and remove all listeners.
 * Idempotent.
 */
export function clearTremorFilter(): void {
  if (!active) return;

  active.abort.abort();

  if (typeof document !== 'undefined') {
    document.documentElement.removeAttribute(MORPHIC_TREMOR_FILTER_MARKER);
  }

  active = null;
}

/**
 * Returns the current window size, or `null` if not active.
 */
export function getTremorFilter(): number | null {
  return active ? active.windowSize : null;
}

/**
 * Returns a snapshot of the tremor filter state, or `null` if not active.
 */
export function getTremorFilterState(): TremorFilterState | null {
  if (!active) return null;
  return {
    windowSize: active.windowSize,
    active: true,
    filteredCount: active.filteredCount,
  };
}

/**
 * Returns diagnostics about the ring buffer, or `null` if not active.
 */
export function getDiagnostics(): { sampleCount: number } | null {
  if (!active) return null;
  return {
    sampleCount: active.ring.size,
  };
}
