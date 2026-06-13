/**
 * @theermite/morphic-engine — click-delay axis (B-106, F-030).
 *
 * Accessibility for motor impairment (tremor, Parkinson):
 *  - Configurable delay (0-500 ms) between accepted clicks.
 *  - Global `click` event listener (capture phase) that blocks
 *    rapid successive clicks within the delay window.
 *  - First click always passes; subsequent clicks within the delay
 *    window are `preventDefault()` + `stopImmediatePropagation()`.
 *  - `dblclick` events are NOT intercepted (separate event path).
 *  - `delay = 0` effectively disables filtering (all clicks pass).
 *
 * Persistence:
 *  - Delay value persisted under sub-key `clickDelay` of
 *    `MORPHIC_STORAGE_KEY`. Corrupt JSON falls back silently.
 *
 * SSR safety:
 *  - All DOM access is guarded; SSR call paths return a minimal
 *    state object without registering listeners.
 *
 * License: AGPL-3.0-or-later.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum accepted click delay in milliseconds. */
export const CLICK_DELAY_MIN = 0;

/** Maximum accepted click delay in milliseconds. */
export const CLICK_DELAY_MAX = 500;

/** Marker attribute set on `<html>` when click delay is active. */
export const MORPHIC_CLICK_DELAY_MARKER = 'data-morphic-click-delay';

const STORAGE_SUBKEY = 'clickDelay';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for {@link setClickDelay}. */
export interface ClickDelayOptions {
  /** Delay in milliseconds (integer, 0–500). */
  readonly delay: number;
}

/** Snapshot of the click-delay axis state. */
export interface ClickDelayState {
  /** Current delay in ms. */
  readonly delay: number;
  /** Whether the filter is active. */
  readonly active: boolean;
  /** Number of clicks blocked since activation. */
  readonly blockedCount: number;
}

// ---------------------------------------------------------------------------
// Validation — pure
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `delay` is a finite integer in `[0, 500]`.
 *
 * Defensive assertion #1: rejects NaN, Infinity, floats, negatives,
 * and values above the ceiling.
 */
export function validateClickDelay(delay: number): boolean {
  return (
    Number.isFinite(delay) &&
    Number.isInteger(delay) &&
    delay >= CLICK_DELAY_MIN &&
    delay <= CLICK_DELAY_MAX
  );
}

// ---------------------------------------------------------------------------
// Storage helpers (same pattern as reading-guide / command-palette)
// ---------------------------------------------------------------------------

function readStorageObject(): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
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
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Storage full or disabled — silent.
  }
}

function persistDelay(delay: number): void {
  const obj = readStorageObject();
  obj[STORAGE_SUBKEY] = { delay };
  writeStorageObject(obj);
}

// ---------------------------------------------------------------------------
// Active state singleton
// ---------------------------------------------------------------------------

interface ActiveState {
  delay: number;
  blockedCount: number;
  lastClickTime: number;
  abort: AbortController;
}

let active: ActiveState | null = null;

// ---------------------------------------------------------------------------
// Click filter — capture-phase listener
// ---------------------------------------------------------------------------

function onClickCapture(event: Event): void {
  if (!active) return;
  // Defensive assertion #2: only process MouseEvent / PointerEvent clicks.
  if (!(event instanceof MouseEvent)) return;

  const { delay } = active;
  // delay === 0 means filtering is disabled — let everything through.
  if (delay === 0) return;

  const now = Date.now();
  const elapsed = now - active.lastClickTime;

  // Core blocking condition (MC/DC tested):
  //   active === true  AND  elapsed < delay  AND  delay > 0
  if (elapsed < delay) {
    event.preventDefault();
    event.stopImmediatePropagation();
    active.blockedCount++;
    return;
  }

  active.lastClickTime = now;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Activate click-delay filtering with the given delay.
 *
 * @throws {TypeError} If `delay` is not a number.
 * @throws {RangeError} If `delay` is outside `[0, 500]` or not an integer.
 */
export function setClickDelay(options: ClickDelayOptions): ClickDelayState {
  const { delay } = options;

  // Defensive assertion #1 — type guard.
  if (typeof delay !== 'number') {
    throw new TypeError(`click-delay: delay must be a number, got ${typeof delay}`);
  }

  // Defensive assertion #2 — range guard.
  if (!validateClickDelay(delay)) {
    throw new RangeError(
      `click-delay: delay must be an integer in [${CLICK_DELAY_MIN}, ${CLICK_DELAY_MAX}], got ${delay}`,
    );
  }

  // Tear down prior session (idempotent re-enable).
  clearClickDelay();

  const abort = new AbortController();

  active = {
    delay,
    blockedCount: 0,
    lastClickTime: 0,
    abort,
  };

  // DOM registration (skip in SSR).
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(MORPHIC_CLICK_DELAY_MARKER, '');

    // Capture phase so we intercept before any user handler.
    document.addEventListener('click', onClickCapture, {
      capture: true,
      signal: abort.signal,
    });
  }

  persistDelay(delay);

  return {
    delay,
    active: true,
    blockedCount: 0,
  };
}

/**
 * Deactivate click-delay filtering and remove the global listener.
 * Idempotent — safe to call when not active.
 */
export function clearClickDelay(): void {
  if (!active) return;

  active.abort.abort();

  if (typeof document !== 'undefined') {
    document.documentElement.removeAttribute(MORPHIC_CLICK_DELAY_MARKER);
  }

  active = null;
}

/**
 * Returns the current delay value, or `null` if not active.
 */
export function getClickDelay(): number | null {
  return active ? active.delay : null;
}

/**
 * Returns a snapshot of the click-delay axis state,
 * or `null` if not active.
 */
export function getClickDelayState(): ClickDelayState | null {
  if (!active) return null;
  return {
    delay: active.delay,
    active: true,
    blockedCount: active.blockedCount,
  };
}
