/**
 * Axe Pomodoro Engine — runtime API for the morphic energetic axis.
 *
 * CDC ref : F-035 (state machine work/break + drift-corrected timer).
 * Brick   : B-111.
 * Risk    : Critical 95% + mutation 75%.
 *
 * Spec :
 *   - `startPomodoro(options?)` initializes a session in phase=work and
 *     starts a 1s tick timer with drift correction (performance.now()).
 *   - `pausePomodoro()` / `resumePomodoro()` pause/resume the current
 *     phase, preserving remainingMs exactly.
 *   - `skipPhase()` advances to the next phase immediately.
 *   - `stopPomodoro()` returns to idle and clears storage.
 *   - `getPomodoroState()` reads the current state (in-memory cache first,
 *     then localStorage fallback).
 *
 * State machine (phases) :
 *   idle → work → short-break → work → ... → long-break (every N work
 *   phases) → idle (session-complete).
 *
 * Events dispatched on `document` with bubbles:true :
 *   - morphic:energy:pomodoro-tick         (every 1s)
 *   - morphic:energy:pomodoro-work-end     (work phase completed)
 *   - morphic:energy:pomodoro-break-start  (break phase started)
 *   - morphic:energy:pomodoro-break-end    (break phase completed)
 *   - morphic:energy:pomodoro-session-complete (long-break ended)
 *
 * Defensive contracts (>=2 per critical function per PET §5) :
 *   - startPomodoro validates options shape + bounds (poka-yoke).
 *   - State NOT mutated when validation fails.
 *   - All mutators are idempotent (calling pause/resume/stop in unrelated
 *     states is safe and a no-op).
 *   - Replacement : calling startPomodoro twice replaces the timer,
 *     never double-registers.
 *   - SSR-safe : document/window/CustomEvent/performance/localStorage guards.
 *   - Drift correction : remainingMs is recomputed at each tick from
 *     phaseStartedAt (performance.now()) + phaseDuration, not by
 *     subtracting TICK_MS (which accumulates jitter).
 *
 * Persistence layout : pomodoro state lives under MORPHIC_POMODORO_MARKER
 * sub-key inside MORPHIC_STORAGE_KEY, preserving other axes.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { hasLocalStorage } from './storage-access.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default work duration : 25 minutes. */
export const MORPHIC_POMODORO_WORK_DEFAULT = 25 * 60_000;

/** Default short break duration : 5 minutes. */
export const MORPHIC_POMODORO_SHORT_BREAK_DEFAULT = 5 * 60_000;

/** Default long break duration : 15 minutes. */
export const MORPHIC_POMODORO_LONG_BREAK_DEFAULT = 15 * 60_000;

/** Default number of work cycles before a long break. */
export const MORPHIC_POMODORO_CYCLES_DEFAULT = 4;

/** Tick interval in ms (1 second). */
export const MORPHIC_POMODORO_TICK_MS = 1_000;

/** Storage sub-key under MORPHIC_STORAGE_KEY for pomodoro state. */
export const MORPHIC_POMODORO_MARKER = 'morphic-pomodoro' as const;

/** Phase enum (frozen tuple). */
export const POMODORO_PHASES = ['idle', 'work', 'short-break', 'long-break'] as const;

/** Document events. */
export const MORPHIC_POMODORO_EVENT_TICK = 'morphic:energy:pomodoro-tick' as const;
export const MORPHIC_POMODORO_EVENT_WORK_END = 'morphic:energy:pomodoro-work-end' as const;
export const MORPHIC_POMODORO_EVENT_BREAK_START = 'morphic:energy:pomodoro-break-start' as const;
export const MORPHIC_POMODORO_EVENT_BREAK_END = 'morphic:energy:pomodoro-break-end' as const;
export const MORPHIC_POMODORO_EVENT_SESSION_COMPLETE =
  'morphic:energy:pomodoro-session-complete' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Pomodoro phase. */
export type PomodoroPhase = (typeof POMODORO_PHASES)[number];

/** Options for `startPomodoro`. */
export type PomodoroOptions = {
  workMs?: number;
  shortBreakMs?: number;
  longBreakMs?: number;
  cyclesBeforeLong?: number;
};

/** Runtime state. */
export type PomodoroState = {
  phase: PomodoroPhase;
  remainingMs: number;
  cycle: number;
  paused: boolean;
};

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

type InternalConfig = {
  workMs: number;
  shortBreakMs: number;
  longBreakMs: number;
  cyclesBeforeLong: number;
};

let currentState: PomodoroState = {
  phase: 'idle',
  remainingMs: 0,
  cycle: 0,
  paused: false,
};

let currentConfig: InternalConfig = {
  workMs: MORPHIC_POMODORO_WORK_DEFAULT,
  shortBreakMs: MORPHIC_POMODORO_SHORT_BREAK_DEFAULT,
  longBreakMs: MORPHIC_POMODORO_LONG_BREAK_DEFAULT,
  cyclesBeforeLong: MORPHIC_POMODORO_CYCLES_DEFAULT,
};

let timerHandle: ReturnType<typeof setTimeout> | null = null;
let phaseStartedAt = 0;
let phaseDurationMs = 0;

/** Test-only reset hook. */
export function __resetPomodoroStateForTests(): void {
  clearTimer();
  currentState = { phase: 'idle', remainingMs: 0, cycle: 0, paused: false };
  currentConfig = {
    workMs: MORPHIC_POMODORO_WORK_DEFAULT,
    shortBreakMs: MORPHIC_POMODORO_SHORT_BREAK_DEFAULT,
    longBreakMs: MORPHIC_POMODORO_LONG_BREAK_DEFAULT,
    cyclesBeforeLong: MORPHIC_POMODORO_CYCLES_DEFAULT,
  };
  phaseStartedAt = 0;
  phaseDurationMs = 0;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validatePositiveDuration(name: string, v: unknown): asserts v is number {
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
    throw new TypeError(
      `startPomodoro: options.${name} must be a finite integer, got ${String(v)}.`,
    );
  }
  if (v <= 0) {
    throw new RangeError(`startPomodoro: options.${name} must be > 0, got ${v}.`);
  }
}

function validateCycles(v: unknown): asserts v is number {
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
    throw new TypeError(
      `startPomodoro: options.cyclesBeforeLong must be a finite integer, got ${String(v)}.`,
    );
  }
  if (v < 1) {
    throw new RangeError(`startPomodoro: options.cyclesBeforeLong must be >= 1, got ${v}.`);
  }
}

function validateOptions(options: PomodoroOptions): void {
  if ('workMs' in options) validatePositiveDuration('workMs', options.workMs);
  if ('shortBreakMs' in options) validatePositiveDuration('shortBreakMs', options.shortBreakMs);
  if ('longBreakMs' in options) validatePositiveDuration('longBreakMs', options.longBreakMs);
  if ('cyclesBeforeLong' in options) validateCycles(options.cyclesBeforeLong);
}

// ---------------------------------------------------------------------------
// Time helpers (SSR-safe)
// ---------------------------------------------------------------------------

function now(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

// ---------------------------------------------------------------------------
// Storage I/O
// ---------------------------------------------------------------------------

function readRoot(): Record<string, unknown> {
  if (!hasLocalStorage()) return {};
  let raw: string | null;
  try {
    raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
  } catch {
    return {};
  }
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isPlainObject(parsed)) return parsed;
    return {};
  } catch {
    return {};
  }
}

function writeStorageState(state: PomodoroState | null): void {
  if (!hasLocalStorage()) return;
  try {
    const existing = readRoot();
    if (state === null) {
      delete existing[MORPHIC_POMODORO_MARKER];
    } else {
      existing[MORPHIC_POMODORO_MARKER] = {
        phase: state.phase,
        cycle: state.cycle,
        remainingMs: state.remainingMs,
        paused: state.paused,
      };
    }
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // In-memory wins
  }
}

// ---------------------------------------------------------------------------
// Event dispatch (SSR-safe)
// ---------------------------------------------------------------------------

function emitEvent(name: string): void {
  if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
  document.dispatchEvent(new CustomEvent(name, { detail: { ...currentState }, bubbles: true }));
}

// ---------------------------------------------------------------------------
// Timer (drift-corrected)
// ---------------------------------------------------------------------------

function clearTimer(): void {
  if (timerHandle !== null) {
    clearTimeout(timerHandle);
    timerHandle = null;
  }
}

function scheduleNextTick(): void {
  if (currentState.paused) return;
  if (currentState.phase === 'idle') return;
  const elapsed = now() - phaseStartedAt;
  const remaining = phaseDurationMs - elapsed;
  if (remaining <= 0) {
    timerHandle = setTimeout(onTick, 0);
    return;
  }
  // Next tick at the next 1s boundary, OR at phase end, whichever comes first.
  const nextTickTarget =
    Math.ceil((elapsed + 1) / MORPHIC_POMODORO_TICK_MS) * MORPHIC_POMODORO_TICK_MS;
  const delayToTick = Math.max(0, nextTickTarget - elapsed);
  const delay = Math.min(delayToTick, remaining);
  timerHandle = setTimeout(onTick, delay);
}

function onTick(): void {
  if (currentState.paused) return;
  if (currentState.phase === 'idle') return;

  const elapsed = now() - phaseStartedAt;
  const remaining = Math.max(0, phaseDurationMs - elapsed);

  if (remaining <= 0) {
    completePhase();
    return;
  }

  currentState = { ...currentState, remainingMs: remaining };
  writeStorageState(currentState);
  emitEvent(MORPHIC_POMODORO_EVENT_TICK);
  scheduleNextTick();
}

function completePhase(): void {
  clearTimer();
  const finishedPhase = currentState.phase;

  if (finishedPhase === 'work') {
    const newCycle = currentState.cycle + 1;
    currentState = { ...currentState, cycle: newCycle };
    emitEvent(MORPHIC_POMODORO_EVENT_WORK_END);
    if (newCycle % currentConfig.cyclesBeforeLong === 0) {
      transitionTo('long-break');
    } else {
      transitionTo('short-break');
    }
    emitEvent(MORPHIC_POMODORO_EVENT_BREAK_START);
  } else if (finishedPhase === 'short-break') {
    emitEvent(MORPHIC_POMODORO_EVENT_BREAK_END);
    transitionTo('work');
  } else if (finishedPhase === 'long-break') {
    transitionToIdle();
    emitEvent(MORPHIC_POMODORO_EVENT_SESSION_COMPLETE);
  }
}

function transitionTo(phase: PomodoroPhase): void {
  const durations: Record<PomodoroPhase, number> = {
    idle: 0,
    work: currentConfig.workMs,
    'short-break': currentConfig.shortBreakMs,
    'long-break': currentConfig.longBreakMs,
  };
  phaseDurationMs = durations[phase];
  phaseStartedAt = now();
  currentState = {
    phase,
    remainingMs: phaseDurationMs,
    cycle: currentState.cycle,
    paused: false,
  };
  writeStorageState(currentState);
  scheduleNextTick();
}

function transitionToIdle(): void {
  clearTimer();
  currentState = { phase: 'idle', remainingMs: 0, cycle: 0, paused: false };
  phaseDurationMs = 0;
  phaseStartedAt = 0;
  writeStorageState(null);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start a pomodoro session. Replaces any in-progress session.
 *
 * @throws {TypeError} when options are malformed.
 * @throws {RangeError} when durations are <= 0 or cyclesBeforeLong < 1.
 */
export function startPomodoro(options?: PomodoroOptions): PomodoroState {
  if (options !== undefined && !isPlainObject(options)) {
    throw new TypeError(`startPomodoro: options must be a plain object, got ${String(options)}.`);
  }
  if (options !== undefined) validateOptions(options);

  clearTimer();

  currentConfig = {
    workMs: options?.workMs ?? MORPHIC_POMODORO_WORK_DEFAULT,
    shortBreakMs: options?.shortBreakMs ?? MORPHIC_POMODORO_SHORT_BREAK_DEFAULT,
    longBreakMs: options?.longBreakMs ?? MORPHIC_POMODORO_LONG_BREAK_DEFAULT,
    cyclesBeforeLong: options?.cyclesBeforeLong ?? MORPHIC_POMODORO_CYCLES_DEFAULT,
  };
  currentState = { phase: 'idle', remainingMs: 0, cycle: 0, paused: false };
  transitionTo('work');
  return { ...currentState };
}

/** Pause the current phase. Idempotent on idle / already-paused. */
export function pausePomodoro(): PomodoroState {
  if (currentState.phase === 'idle') return { ...currentState };
  if (currentState.paused) return { ...currentState };

  clearTimer();
  const elapsed = now() - phaseStartedAt;
  const remaining = Math.max(0, phaseDurationMs - elapsed);
  currentState = { ...currentState, remainingMs: remaining, paused: true };
  // Stash remaining as the new phase duration so resume starts fresh
  phaseDurationMs = remaining;
  writeStorageState(currentState);
  return { ...currentState };
}

/** Resume from pause. Idempotent on idle / non-paused. */
export function resumePomodoro(): PomodoroState {
  if (currentState.phase === 'idle') return { ...currentState };
  if (!currentState.paused) return { ...currentState };

  phaseStartedAt = now();
  currentState = { ...currentState, paused: false };
  writeStorageState(currentState);
  scheduleNextTick();
  return { ...currentState };
}

/** Skip the current phase, transitioning immediately to the next. */
export function skipPhase(): PomodoroState {
  if (currentState.phase === 'idle') return { ...currentState };

  const current = currentState.phase;
  clearTimer();
  // Clear paused on skip
  currentState = { ...currentState, paused: false };

  if (current === 'work') {
    const newCycle = currentState.cycle + 1;
    currentState = { ...currentState, cycle: newCycle };
    if (newCycle % currentConfig.cyclesBeforeLong === 0) {
      transitionTo('long-break');
    } else {
      transitionTo('short-break');
    }
  } else if (current === 'short-break') {
    transitionTo('work');
  } else if (current === 'long-break') {
    transitionToIdle();
  }

  return { ...currentState };
}

/** Stop the session and return to idle. Clears storage. Idempotent. */
export function stopPomodoro(): PomodoroState {
  transitionToIdle();
  return { ...currentState };
}

/** Read the current pomodoro state. SSR-safe. */
export function getPomodoroState(): PomodoroState {
  return { ...currentState };
}
