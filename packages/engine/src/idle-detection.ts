/**
 * Axe Auto-pause Idle — runtime API for the morphic energetic axis.
 *
 * CDC ref : F-034 (Auto-pause idle, visibilitychange + idle ≥60s configurable).
 * Brick   : B-110.
 * Risk    : Sensitive 90%.
 *
 * Spec :
 *   - `setIdleDetection(options?)` enables idle detection with a configurable
 *     `idleMs` threshold. Attaches activity listeners (pointer/keyboard/touch)
 *     + visibilitychange listener. Emits `morphic:energy:pause-suggested` after
 *     `idleMs` of inactivity, or immediately when the tab becomes hidden.
 *     Emits `morphic:energy:resume` when activity returns (or tab visible).
 *   - `clearIdleDetection()` detaches all listeners and stops the timer.
 *   - `isIdle()` / `getIdleDetectionState()` read the current state.
 *
 * Defensive contracts (≥2 per critical function per PET §5) :
 *   - setIdleDetection validates options shape + idleMs bounds (poka-yoke).
 *   - clearIdleDetection is idempotent (safe to call when not active).
 *   - State NOT mutated when validation fails.
 *   - Race-safe : pause emit checks current idle flag (no duplicate emits).
 *   - SSR-safe : document/window/CustomEvent guards.
 *   - Replacement : calling setIdleDetection twice replaces listeners,
 *     never double-registers.
 *
 * Persistence layout : the idle state lives under a sub-key
 * `MORPHIC_IDLE_MARKER` inside `MORPHIC_STORAGE_KEY`, preserving other axes.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { hasLocalStorage, safeStorage } from './storage-access.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default idle threshold : 60 seconds. */
export const IDLE_TIMEOUT_DEFAULT = 60_000 as const;

/** Minimum allowed idle threshold : 10 seconds. */
export const IDLE_TIMEOUT_MIN = 10_000 as const;

/** Maximum allowed idle threshold : 10 minutes. */
export const IDLE_TIMEOUT_MAX = 600_000 as const;

/** Storage sub-key under MORPHIC_STORAGE_KEY for idle detection state. */
export const MORPHIC_IDLE_MARKER = 'morphic-idle' as const;

/** Document event dispatched when idle threshold is reached or tab hidden. */
export const MORPHIC_IDLE_EVENT_PAUSE = 'morphic:energy:pause-suggested' as const;

/** Document event dispatched when user activity returns after pause. */
export const MORPHIC_IDLE_EVENT_RESUME = 'morphic:energy:resume' as const;

/** Activity events that reset the idle timer. */
const ACTIVITY_EVENTS = [
  'pointermove',
  'pointerdown',
  'mousedown',
  'mousemove',
  'keydown',
  'touchstart',
  'wheel',
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Runtime state of the idle detection axis. */
export type IdleDetectionState = {
  /** True when detection is armed (listeners attached, timer running). */
  enabled: boolean;
  /** Configured idle threshold in milliseconds. */
  idleMs: number;
  /** True between `pause-suggested` and `resume` events. */
  idle: boolean;
};

/** Options accepted by `setIdleDetection`. */
export type IdleDetectionOptions = {
  /** Enable or disable detection. Defaults to true. */
  enabled?: boolean;
  /** Idle threshold in ms. Defaults to IDLE_TIMEOUT_DEFAULT (60_000). */
  idleMs?: number;
};

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

let currentState: IdleDetectionState = {
  enabled: false,
  idleMs: IDLE_TIMEOUT_DEFAULT,
  idle: false,
};

let timerHandle: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;
let stateLoadedFromStorage = false;

/** Test-only reset hook. */
export function __resetIdleDetectionStateForTests(): void {
  detachListeners();
  if (timerHandle !== null) {
    clearTimeout(timerHandle);
    timerHandle = null;
  }
  currentState = { enabled: false, idleMs: IDLE_TIMEOUT_DEFAULT, idle: false };
  stateLoadedFromStorage = false;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateOptions(options: IdleDetectionOptions): void {
  if ('enabled' in options && typeof options.enabled !== 'boolean') {
    throw new TypeError(
      `setIdleDetection: options.enabled must be boolean, got ${String(options.enabled)}.`,
    );
  }
  if ('idleMs' in options) {
    const v = options.idleMs;
    if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
      throw new TypeError(
        `setIdleDetection: options.idleMs must be a finite integer, got ${String(v)}.`,
      );
    }
    if (v < IDLE_TIMEOUT_MIN || v > IDLE_TIMEOUT_MAX) {
      throw new RangeError(
        `setIdleDetection: options.idleMs must be in [${IDLE_TIMEOUT_MIN}..${IDLE_TIMEOUT_MAX}], got ${v}.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Storage I/O
// ---------------------------------------------------------------------------

function readStorageState(): Partial<IdleDetectionState> | null {
  if (!hasLocalStorage()) return null;
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
  if (!isPlainObject(parsed)) return null;

  const stored = parsed[MORPHIC_IDLE_MARKER];
  if (!isPlainObject(stored)) return null;

  const result: Partial<IdleDetectionState> = {};
  if (typeof stored.enabled === 'boolean') result.enabled = stored.enabled;
  if (
    typeof stored.idleMs === 'number' &&
    Number.isInteger(stored.idleMs) &&
    stored.idleMs >= IDLE_TIMEOUT_MIN &&
    stored.idleMs <= IDLE_TIMEOUT_MAX
  ) {
    result.idleMs = stored.idleMs;
  }
  return result;
}

function writeStorageState(state: IdleDetectionState | null): void {
  if (!hasLocalStorage()) return;
  try {
    let existing: Record<string, unknown> = {};
    try {
      const raw = safeStorage.get(MORPHIC_STORAGE_KEY);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (isPlainObject(parsed)) existing = parsed;
      }
    } catch {
      existing = {};
    }
    if (state === null) {
      delete existing[MORPHIC_IDLE_MARKER];
    } else {
      existing[MORPHIC_IDLE_MARKER] = { enabled: state.enabled, idleMs: state.idleMs };
    }
    safeStorage.set(MORPHIC_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable — in-memory wins.
  }
}

function ensureStateLoaded(): void {
  if (stateLoadedFromStorage) return;
  stateLoadedFromStorage = true;
  const fromStorage = readStorageState();
  if (fromStorage !== null) {
    if (fromStorage.idleMs !== undefined) currentState.idleMs = fromStorage.idleMs;
    if (fromStorage.enabled !== undefined) currentState.enabled = fromStorage.enabled;
  }
}

// ---------------------------------------------------------------------------
// Event dispatch (SSR-safe)
// ---------------------------------------------------------------------------

function emitIdleEvent(name: string): void {
  if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
  document.dispatchEvent(new CustomEvent(name, { detail: { ...currentState }, bubbles: true }));
}

// ---------------------------------------------------------------------------
// Timer + listeners
// ---------------------------------------------------------------------------

function onActivity(): void {
  if (!currentState.enabled) return;

  if (currentState.idle) {
    currentState.idle = false;
    emitIdleEvent(MORPHIC_IDLE_EVENT_RESUME);
  }
  armTimer();
}

function onVisibilityChange(): void {
  if (!currentState.enabled) return;
  if (typeof document === 'undefined') return;

  if (document.visibilityState === 'hidden') {
    if (!currentState.idle) {
      currentState.idle = true;
      if (timerHandle !== null) {
        clearTimeout(timerHandle);
        timerHandle = null;
      }
      emitIdleEvent(MORPHIC_IDLE_EVENT_PAUSE);
    }
  } else if (document.visibilityState === 'visible') {
    if (currentState.idle) {
      currentState.idle = false;
      emitIdleEvent(MORPHIC_IDLE_EVENT_RESUME);
      armTimer();
    }
  }
}

function armTimer(): void {
  if (timerHandle !== null) {
    clearTimeout(timerHandle);
    timerHandle = null;
  }
  if (!currentState.enabled) return;
  timerHandle = setTimeout(() => {
    if (!currentState.enabled) return;
    if (currentState.idle) return;
    currentState.idle = true;
    emitIdleEvent(MORPHIC_IDLE_EVENT_PAUSE);
  }, currentState.idleMs);
}

function attachListeners(): void {
  if (listenersAttached) return;
  if (typeof document === 'undefined') return;
  for (const evt of ACTIVITY_EVENTS) {
    document.addEventListener(evt, onActivity, { passive: true });
  }
  document.addEventListener('visibilitychange', onVisibilityChange);
  listenersAttached = true;
}

function detachListeners(): void {
  if (!listenersAttached) return;
  if (typeof document === 'undefined') return;
  for (const evt of ACTIVITY_EVENTS) {
    document.removeEventListener(evt, onActivity);
  }
  document.removeEventListener('visibilitychange', onVisibilityChange);
  listenersAttached = false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enable idle detection. Attaches activity + visibilitychange listeners.
 * Calling twice replaces the timer without double-registering listeners.
 *
 * @throws {TypeError} when options are malformed.
 * @throws {RangeError} when idleMs is outside [IDLE_TIMEOUT_MIN, IDLE_TIMEOUT_MAX].
 */
export function setIdleDetection(options?: IdleDetectionOptions): IdleDetectionState {
  ensureStateLoaded();

  if (options !== undefined && !isPlainObject(options)) {
    throw new TypeError(
      `setIdleDetection: options must be a plain object, got ${String(options)}.`,
    );
  }

  if (options !== undefined) validateOptions(options);

  const enabled = options?.enabled ?? true;
  const idleMs = options?.idleMs ?? currentState.idleMs ?? IDLE_TIMEOUT_DEFAULT;

  currentState = {
    enabled,
    idleMs,
    idle: false,
  };

  if (enabled) {
    attachListeners();
    armTimer();
  } else {
    detachListeners();
    if (timerHandle !== null) {
      clearTimeout(timerHandle);
      timerHandle = null;
    }
  }

  writeStorageState(currentState);
  return { ...currentState };
}

/**
 * Disable idle detection : detach listeners, stop timer, clear storage marker.
 * Idempotent : safe to call when not enabled.
 */
export function clearIdleDetection(): IdleDetectionState {
  detachListeners();
  if (timerHandle !== null) {
    clearTimeout(timerHandle);
    timerHandle = null;
  }
  currentState = {
    enabled: false,
    idleMs: currentState.idleMs,
    idle: false,
  };
  writeStorageState(null);
  return { ...currentState };
}

/** Returns true iff the idle threshold has been reached and resume not yet emitted. */
export function isIdle(): boolean {
  return currentState.idle;
}

/** Returns the current idle detection state. */
export function getIdleDetectionState(): IdleDetectionState {
  ensureStateLoaded();
  return { ...currentState };
}
