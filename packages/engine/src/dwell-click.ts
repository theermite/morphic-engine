/**
 * @theermite/morphic-engine — dwell-click axis (B-107, F-031).
 *
 * Accessibility for severe motor impairment:
 *  - Hovering over an interactive element for a configurable delay
 *    (500-3000 ms) synthesizes a `click` event on that element.
 *  - "Interactive" = `<a>`, `<button>`, `<input>`, `<select>`,
 *    `<textarea>`, `[tabindex]`, `[role=button]`, `[role=link]`,
 *    `[role=menuitem]`. Non-interactive elements are ignored.
 *  - Radius tolerance: micro-movements within `radius` px do NOT
 *    reset the dwell timer (essential for tremor users).
 *  - Progress indicator: a CSS class is added during dwell countdown,
 *    removed on fire or cancel. Host provides the visual via CSS.
 *  - Dwell-synthesized clicks go through the normal click pipeline
 *    (B-106 click-delay filter applies naturally).
 *
 * Persistence:
 *  - Delay + radius persisted under sub-key `dwellClick` of
 *    `MORPHIC_STORAGE_KEY`.
 *
 * SSR safety:
 *  - All DOM access guarded by `typeof document`.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { hasLocalStorage } from './storage-access.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum dwell delay in milliseconds. */
export const DWELL_CLICK_DELAY_MIN = 500;

/** Maximum dwell delay in milliseconds. */
export const DWELL_CLICK_DELAY_MAX = 3000;

/** Default tolerance radius in pixels. */
export const DWELL_CLICK_RADIUS_DEFAULT = 10;

/** Marker attribute set on `<html>` when dwell-click is active. */
export const MORPHIC_DWELL_CLICK_MARKER = 'data-morphic-dwell-click';

/** CSS class added to the target during dwell countdown. */
export const MORPHIC_DWELL_CLICK_PROGRESS_CLASS = 'morphic-dwell-progress';

const STORAGE_SUBKEY = 'dwellClick';

/** Tags considered interactive without explicit tabindex/role. */
const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);

/** ARIA roles considered interactive. */
const INTERACTIVE_ROLES = new Set(['button', 'link', 'menuitem']);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for {@link setDwellClick}. */
export interface DwellClickOptions {
  /** Dwell delay in milliseconds (integer, 500–3000). */
  readonly delay: number;
  /** Tolerance radius in pixels (default 10). */
  readonly radius?: number;
}

/** Snapshot of the dwell-click axis state. */
export interface DwellClickState {
  /** Current dwell delay in ms. */
  readonly delay: number;
  /** Tolerance radius in px. */
  readonly radius: number;
  /** Whether dwell-click is active. */
  readonly active: boolean;
  /** Number of dwell-clicks fired since activation. */
  readonly dwellCount: number;
}

// ---------------------------------------------------------------------------
// Validation — pure
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `delay` is a finite integer in `[500, 3000]`.
 */
export function validateDwellDelay(delay: number): boolean {
  return (
    Number.isFinite(delay) &&
    Number.isInteger(delay) &&
    delay >= DWELL_CLICK_DELAY_MIN &&
    delay <= DWELL_CLICK_DELAY_MAX
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isInteractive(el: Element): boolean {
  if (INTERACTIVE_TAGS.has(el.tagName)) return true;
  if (el.hasAttribute('tabindex')) return true;
  const role = el.getAttribute('role');
  if (role && INTERACTIVE_ROLES.has(role)) return true;
  return false;
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function readStorageObject(): Record<string, unknown> {
  if (!hasLocalStorage()) return {};
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
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Storage full or disabled — silent.
  }
}

function persistDwell(delay: number, radius: number): void {
  const obj = readStorageObject();
  obj[STORAGE_SUBKEY] = { delay, radius };
  writeStorageObject(obj);
}

// ---------------------------------------------------------------------------
// Active state singleton
// ---------------------------------------------------------------------------

interface ActiveState {
  delay: number;
  radius: number;
  dwellCount: number;
  abort: AbortController;
  // Dwell tracking
  timer: ReturnType<typeof setTimeout> | null;
  anchorX: number;
  anchorY: number;
  currentTarget: Element | null;
}

let active: ActiveState | null = null;

// ---------------------------------------------------------------------------
// Dwell lifecycle
// ---------------------------------------------------------------------------

function cancelDwell(): void {
  if (!active) return;
  if (active.timer !== null) {
    clearTimeout(active.timer);
    active.timer = null;
  }
  if (active.currentTarget) {
    active.currentTarget.classList.remove(MORPHIC_DWELL_CLICK_PROGRESS_CLASS);
    active.currentTarget = null;
  }
}

function fireDwell(target: Element): void {
  if (!active) return;

  // Remove progress class before firing
  target.classList.remove(MORPHIC_DWELL_CLICK_PROGRESS_CLASS);

  // Synthesize click
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(clickEvent);

  active.dwellCount++;
  active.timer = null;
  active.currentTarget = null;
}

function startDwell(target: Element, x: number, y: number): void {
  if (!active) return;

  cancelDwell();

  // Only dwell on interactive elements
  if (!isInteractive(target)) return;

  active.anchorX = x;
  active.anchorY = y;
  active.currentTarget = target;

  // Add progress class
  target.classList.add(MORPHIC_DWELL_CLICK_PROGRESS_CLASS);

  active.timer = setTimeout(() => {
    fireDwell(target);
  }, active.delay);
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function onPointerMove(event: PointerEvent): void {
  if (!active) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  // Find the nearest interactive ancestor (event.target may be a text node's parent)
  const interactive = target.closest(
    'a, button, input, select, textarea, [tabindex], [role=button], [role=link], [role=menuitem]',
  );

  if (!interactive) {
    cancelDwell();
    return;
  }

  // If we're already dwelling on this element, check radius
  if (active.currentTarget === interactive && active.timer !== null) {
    const dist = distance(active.anchorX, active.anchorY, event.clientX, event.clientY);
    if (dist <= active.radius) {
      // Within tolerance — keep timer running
      return;
    }
    // Moved beyond radius — restart
  }

  // Start new dwell on this interactive element
  startDwell(interactive, event.clientX, event.clientY);
}

function onPointerLeave(): void {
  cancelDwell();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Activate dwell-click with the given delay and optional radius.
 *
 * @throws {TypeError} If `delay` is not a number.
 * @throws {RangeError} If `delay` is outside `[500, 3000]` or not an integer.
 */
export function setDwellClick(options: DwellClickOptions): DwellClickState {
  const { delay, radius = DWELL_CLICK_RADIUS_DEFAULT } = options;

  // Defensive assertion #1 — type guard
  if (typeof delay !== 'number') {
    throw new TypeError(`dwell-click: delay must be a number, got ${typeof delay}`);
  }

  // Defensive assertion #2 — range guard
  if (!validateDwellDelay(delay)) {
    throw new RangeError(
      `dwell-click: delay must be an integer in [${DWELL_CLICK_DELAY_MIN}, ${DWELL_CLICK_DELAY_MAX}], got ${delay}`,
    );
  }

  // Tear down prior session
  clearDwellClick();

  const abort = new AbortController();

  active = {
    delay,
    radius,
    dwellCount: 0,
    abort,
    timer: null,
    anchorX: 0,
    anchorY: 0,
    currentTarget: null,
  };

  // DOM registration
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(MORPHIC_DWELL_CLICK_MARKER, '');

    document.addEventListener('pointermove', onPointerMove, {
      signal: abort.signal,
    });
    document.addEventListener('pointerleave', onPointerLeave, {
      capture: true,
      signal: abort.signal,
    });
  }

  persistDwell(delay, radius);

  return {
    delay,
    radius,
    active: true,
    dwellCount: 0,
  };
}

/**
 * Deactivate dwell-click and remove all listeners.
 * Idempotent.
 */
export function clearDwellClick(): void {
  if (!active) return;

  cancelDwell();
  active.abort.abort();

  if (typeof document !== 'undefined') {
    document.documentElement.removeAttribute(MORPHIC_DWELL_CLICK_MARKER);
  }

  active = null;
}

/**
 * Returns the current dwell delay, or `null` if not active.
 */
export function getDwellClick(): number | null {
  return active ? active.delay : null;
}

/**
 * Returns a snapshot of the dwell-click state, or `null` if not active.
 */
export function getDwellClickState(): DwellClickState | null {
  if (!active) return null;
  return {
    delay: active.delay,
    radius: active.radius,
    active: true,
    dwellCount: active.dwellCount,
  };
}
