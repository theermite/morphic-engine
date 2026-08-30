/**
 * @theermite/morphic-engine — pomodoro strip (B-035, F-035 ext.).
 *
 * A thin progress bar reflecting the current Pomodoro phase: a pale-grey
 * track, and a fill that grows and shifts colour as the phase elapses
 * (grey -> light blue -> orange near the end), then a slow breathing
 * green pulse for a few seconds when a phase completes. Same visual
 * language as Hibiki's desktop "liseré" (a native, borderless OS window
 * pinned to a screen edge) — an in-page DOM overlay here, since the
 * engine only has the DOM to work with, not native window APIs.
 *
 * Design spec: Jay 2026-08-30 (a first, flat per-phase-colour cut from
 * 2026-08-29 never shipped — replaced outright, no migration needed).
 *
 * Polls `getPomodoroState()` on a fixed interval (matching the pomodoro
 * tick cadence) rather than depending on pomodoro.ts's phase-change
 * events — `skipPhase`/`stopPomodoro` do not dispatch one on every
 * transition, so polling stays correct regardless, at the cost of at most
 * one poll interval of visual lag. The fill's "total duration" for the
 * current phase is captured from the first observed `remainingMs` after a
 * phase change — this is exact when the strip was already enabled at the
 * phase's start, and a reasonable approximation if enabled mid-phase.
 *
 * Scope: a visual companion to an already-running pomodoro session. No
 * new persisted preference — pomodoro.ts already owns session persistence.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 */

import { getPomodoroState, type PomodoroPhase } from './pomodoro.js';

/** Marker attribute on the track element, set to the current phase name. */
export const MORPHIC_POMODORO_STRIP_MARKER = 'data-morphic-pomodoro-strip';

/** Marker attribute on the fill (child) element. */
export const MORPHIC_POMODORO_STRIP_FILL_MARKER = 'data-morphic-pomodoro-strip-fill';

/** Default strip thickness in px. */
export const MORPHIC_POMODORO_STRIP_DEFAULT_HEIGHT = 4 as const;

/** Default z-index. */
export const MORPHIC_POMODORO_STRIP_DEFAULT_Z_INDEX = 9997 as const;

/**
 * Poll interval in ms. Shorter than pomodoro.ts's own 1s tick cadence
 * (Jay 2026-08-30: "il y a toujours un petit temps de décalage avant que
 * le liseré n'apparaisse" — a 1s poll meant up to ~1.2s of visible lag
 * after clicking start, on top of the 200ms opacity fade).
 */
export const MORPHIC_POMODORO_STRIP_POLL_MS = 250 as const;

/** How long the completion pulse breathes before the new phase's fill takes over. */
export const MORPHIC_POMODORO_STRIP_BREATHE_MS = 4_000 as const;

export type PomodoroStripPosition = 'top' | 'bottom';

/**
 * Fraction of the phase (0..1) at which the fill first reaches `midColor`.
 * Deliberately early (Jay 2026-08-30: "le bleu doit être plus visible" — a
 * gradient that only leaves grey near the end reads as "no progress" for
 * most of the phase).
 */
export const POMODORO_STRIP_DEFAULT_RAMP_UP_STOP = 0.35 as const;

/** Fraction (0..1) at which the fill starts leaving `midColor` toward `endColor`. */
export const POMODORO_STRIP_DEFAULT_RAMP_DOWN_STOP = 0.85 as const;

export const POMODORO_STRIP_START_COLOR = '#d1d5db' as const; // pale grey
export const POMODORO_STRIP_MID_COLOR = '#3b82f6' as const; // vivid blue
export const POMODORO_STRIP_END_COLOR = '#fb923c' as const; // orange
export const POMODORO_STRIP_COMPLETE_COLOR = '#22c55e' as const; // breathing green

export interface PomodoroStripOptions {
  readonly position?: PomodoroStripPosition;
  readonly height?: number;
  readonly zIndex?: number;
  readonly startColor?: string;
  readonly midColor?: string;
  readonly endColor?: string;
  readonly completeColor?: string;
  /** Fraction (0..1) at which the fill first reaches `midColor`. Default 0.35. */
  readonly rampUpStop?: number;
  /** Fraction (0..1) at which the fill starts leaving `midColor`. Default 0.85. */
  readonly rampDownStop?: number;
}

export interface PomodoroStripState {
  readonly active: true;
  readonly phase: PomodoroPhase;
  readonly completing: boolean;
}

interface ActiveStrip {
  root: HTMLElement;
  fill: HTMLElement;
  pollHandle: ReturnType<typeof setInterval>;
  lastPhase: PomodoroPhase;
  phaseTotalMs: number;
  /** Epoch ms (Date.now()) after which the breathing pulse ends; null = not breathing. */
  completingUntil: number | null;
  startColor: string;
  midColor: string;
  endColor: string;
  completeColor: string;
  rampUpStop: number;
  rampDownStop: number;
}

let active: ActiveStrip | null = null;

// ---------------------------------------------------------------------------
// Colour interpolation — pure, independently testable
// ---------------------------------------------------------------------------

type Rgb = readonly [number, number, number];

function parseHexColor(hex: string): Rgb {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a: Rgb, b: Rgb, t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/**
 * Computes the fill colour for a given elapsed fraction of a phase.
 * Three-segment gradient: `startColor` -> `midColor` up to `rampUpStop`,
 * a plateau exactly at `midColor` until `rampDownStop`, then `midColor` ->
 * `endColor` for the remainder. `elapsed` is clamped to [0, 1].
 */
export function computePomodoroStripFillColor(
  elapsed: number,
  startColor: string,
  midColor: string,
  endColor: string,
  rampUpStop: number,
  rampDownStop: number,
): string {
  const t = Math.max(0, Math.min(1, elapsed));
  const start = parseHexColor(startColor);
  const mid = parseHexColor(midColor);
  const end = parseHexColor(endColor);

  if (t <= rampUpStop) {
    const local = rampUpStop <= 0 ? 1 : t / rampUpStop;
    return mixRgb(start, mid, local);
  }
  if (t <= rampDownStop) {
    return `rgb(${mid[0]}, ${mid[1]}, ${mid[2]})`;
  }
  const local = rampDownStop >= 1 ? 0 : (t - rampDownStop) / (1 - rampDownStop);
  return mixRgb(mid, end, local);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0
  );
}

const BREATHE_STYLE_ID = 'morphic-pomodoro-strip-keyframes';

function ensureBreatheKeyframes(): void {
  if (typeof document === 'undefined' || document.getElementById(BREATHE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BREATHE_STYLE_ID;
  style.textContent =
    '@keyframes morphic-pomodoro-breathe { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }';
  document.head.appendChild(style);
}

/**
 * Reads engine state and updates the DOM: phase-change detection (captures
 * the new phase's total duration + starts the breathe window), the fill's
 * width/colour while active, and the breathing pulse right after a phase
 * completes.
 */
function applyState(strip: ActiveStrip): void {
  const state = getPomodoroState();
  const now = Date.now();

  strip.root.setAttribute(MORPHIC_POMODORO_STRIP_MARKER, state.phase);

  if (state.phase !== strip.lastPhase) {
    // Breathe only between two ACTIVE phases (work<->break) — a natural
    // completion worth celebrating. Landing on idle (session complete OR
    // a manual stop) fades out instead; the two are indistinguishable from
    // polled state alone, and a stop is a cancel, not a milestone.
    if (strip.lastPhase !== 'idle' && state.phase !== 'idle') {
      strip.completingUntil = now + MORPHIC_POMODORO_STRIP_BREATHE_MS;
    }
    strip.lastPhase = state.phase;
    strip.phaseTotalMs = state.phase === 'idle' ? 0 : state.remainingMs;
  }

  if (strip.completingUntil !== null && now >= strip.completingUntil) {
    strip.completingUntil = null;
  }
  const breathing = strip.completingUntil !== null;

  if (state.phase === 'idle' && !breathing) {
    strip.root.style.opacity = '0';
    strip.fill.style.animation = 'none';
    return;
  }

  strip.root.style.opacity = '1';

  if (breathing) {
    strip.fill.style.width = '100%';
    strip.fill.style.background = strip.completeColor;
    strip.fill.style.animation = isReducedMotion()
      ? 'none'
      : 'morphic-pomodoro-breathe 2.5s ease-in-out infinite';
    return;
  }

  strip.fill.style.animation = 'none';
  const elapsed = strip.phaseTotalMs > 0 ? 1 - state.remainingMs / strip.phaseTotalMs : 0;
  const clamped = Math.max(0, Math.min(1, elapsed));
  strip.fill.style.width = `${Math.round(clamped * 100)}%`;
  strip.fill.style.background = computePomodoroStripFillColor(
    clamped,
    strip.startColor,
    strip.midColor,
    strip.endColor,
    strip.rampUpStop,
    strip.rampDownStop,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Mount the strip and start polling pomodoro state. Replaces any previously
 * mounted strip (idempotent re-enable, same pattern as click-delay/dwell-click).
 *
 * @throws {TypeError} If `position` is not `'top'`/`'bottom'`, or `height`/
 *   `zIndex` is not a positive integer.
 */
export function enablePomodoroStrip(options: PomodoroStripOptions = {}): void {
  if (
    options.position !== undefined &&
    options.position !== 'top' &&
    options.position !== 'bottom'
  ) {
    throw new TypeError(
      `pomodoro-strip: position must be 'top' or 'bottom', got ${String(options.position)}`,
    );
  }
  if (options.height !== undefined && !isPositiveInteger(options.height)) {
    throw new TypeError(
      `pomodoro-strip: height must be a positive integer, got ${String(options.height)}`,
    );
  }
  if (options.zIndex !== undefined && !isPositiveInteger(options.zIndex)) {
    throw new TypeError(
      `pomodoro-strip: zIndex must be a positive integer, got ${String(options.zIndex)}`,
    );
  }

  disablePomodoroStrip();

  if (typeof document === 'undefined') return; // SSR — nothing to mount, nothing to persist

  ensureBreatheKeyframes();

  const position = options.position ?? 'top';
  const height = options.height ?? MORPHIC_POMODORO_STRIP_DEFAULT_HEIGHT;
  const zIndex = options.zIndex ?? MORPHIC_POMODORO_STRIP_DEFAULT_Z_INDEX;
  const startColor = options.startColor ?? POMODORO_STRIP_START_COLOR;
  const midColor = options.midColor ?? POMODORO_STRIP_MID_COLOR;
  const endColor = options.endColor ?? POMODORO_STRIP_END_COLOR;
  const completeColor = options.completeColor ?? POMODORO_STRIP_COMPLETE_COLOR;
  const rampUpStop = options.rampUpStop ?? POMODORO_STRIP_DEFAULT_RAMP_UP_STOP;
  const rampDownStop = options.rampDownStop ?? POMODORO_STRIP_DEFAULT_RAMP_DOWN_STOP;

  const root = document.createElement('div');
  root.setAttribute(MORPHIC_POMODORO_STRIP_MARKER, getPomodoroState().phase);
  root.style.position = 'fixed';
  root.style.left = '0';
  root.style.right = '0';
  if (position === 'top') root.style.top = '0';
  else root.style.bottom = '0';
  root.style.height = `${height}px`;
  root.style.pointerEvents = 'none';
  root.style.zIndex = String(zIndex);
  root.style.background = startColor;
  root.style.transition = isReducedMotion() ? 'none' : 'opacity 200ms ease';
  root.style.overflow = 'hidden';

  const fill = document.createElement('div');
  fill.setAttribute(MORPHIC_POMODORO_STRIP_FILL_MARKER, '');
  fill.style.position = 'absolute';
  fill.style.top = '0';
  fill.style.bottom = '0';
  fill.style.left = '0';
  fill.style.width = '0%';
  fill.style.background = startColor;
  fill.style.transition = isReducedMotion() ? 'none' : 'width 250ms linear, background 250ms ease';
  fill.style.animation = 'none';

  root.appendChild(fill);
  document.body.appendChild(root);

  const strip: ActiveStrip = {
    root,
    fill,
    pollHandle: setInterval(() => {
      if (active) applyState(active);
    }, MORPHIC_POMODORO_STRIP_POLL_MS),
    lastPhase: getPomodoroState().phase,
    phaseTotalMs: getPomodoroState().phase === 'idle' ? 0 : getPomodoroState().remainingMs,
    completingUntil: null,
    startColor,
    midColor,
    endColor,
    completeColor,
    rampUpStop,
    rampDownStop,
  };

  active = strip;
  applyState(strip);
}

/** Remove the strip and stop polling. Idempotent — safe when not active. */
export function disablePomodoroStrip(): void {
  if (!active) return;
  clearInterval(active.pollHandle);
  active.root.remove();
  active = null;
}

/** Current strip state, or `null` if not active. */
export function getPomodoroStripState(): PomodoroStripState | null {
  if (!active) return null;
  return {
    active: true,
    phase: active.lastPhase,
    completing: active.completingUntil !== null,
  };
}
