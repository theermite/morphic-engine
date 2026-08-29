/**
 * @theermite/morphic-engine — pomodoro strip (B-034, F-035 ext.).
 *
 * A thin, fixed-position colored bar reflecting the current Pomodoro phase —
 * same visual language as Hibiki's desktop "liseré" (a native, borderless OS
 * window pinned to a screen edge). The engine only has the DOM to work with,
 * not native window APIs, so this is an in-page overlay instead: same visual
 * effect, different mechanism. Requested by Jay 2026-08-29.
 *
 * Polls `getPomodoroState()` on a fixed interval (matching the pomodoro tick
 * cadence) rather than depending on pomodoro.ts's phase-change events —
 * `skipPhase`/`stopPomodoro` do not currently emit an event on every
 * transition, so polling stays correct regardless of that gap, at the cost
 * of at most one poll interval of visual lag.
 *
 * Scope: a visual companion to an already-running pomodoro session. No new
 * persisted preference — pomodoro.ts already owns session persistence.
 *
 * `prefers-reduced-motion` disables the color/opacity transition, never the
 * strip itself (it carries state information, not decoration).
 *
 * License: AGPL-3.0-or-later.
 */

import { getPomodoroState, type PomodoroPhase } from './pomodoro.js';

/** Marker attribute set to the current phase name on the strip element. */
export const MORPHIC_POMODORO_STRIP_MARKER = 'data-morphic-pomodoro-strip';

/** Default strip thickness in px. */
export const MORPHIC_POMODORO_STRIP_DEFAULT_HEIGHT = 4 as const;

/** Default z-index. */
export const MORPHIC_POMODORO_STRIP_DEFAULT_Z_INDEX = 9997 as const;

/** Poll interval in ms — matches pomodoro.ts's own tick cadence. */
export const MORPHIC_POMODORO_STRIP_POLL_MS = 1_000 as const;

export type PomodoroStripPosition = 'top' | 'bottom';

/** Default color per phase. Override via `options.colors`. `idle` hides the strip. */
export const POMODORO_STRIP_DEFAULT_COLORS: Record<PomodoroPhase, string> = {
  idle: 'transparent',
  work: '#ef4444',
  'short-break': '#22c55e',
  'long-break': '#3b82f6',
};

export interface PomodoroStripOptions {
  readonly position?: PomodoroStripPosition;
  readonly height?: number;
  readonly zIndex?: number;
  readonly colors?: Partial<Record<PomodoroPhase, string>>;
}

export interface PomodoroStripState {
  readonly active: true;
  readonly phase: PomodoroPhase;
}

interface ActiveStrip {
  root: HTMLElement;
  colors: Record<PomodoroPhase, string>;
  pollHandle: ReturnType<typeof setInterval>;
  lastPhase: PomodoroPhase;
}

let active: ActiveStrip | null = null;

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

function applyPhase(
  root: HTMLElement,
  colors: Record<PomodoroPhase, string>,
  phase: PomodoroPhase,
): void {
  root.setAttribute(MORPHIC_POMODORO_STRIP_MARKER, phase);
  root.style.background = colors[phase];
  root.style.opacity = phase === 'idle' ? '0' : '1';
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

  const colors = { ...POMODORO_STRIP_DEFAULT_COLORS, ...options.colors };
  const position = options.position ?? 'top';
  const height = options.height ?? MORPHIC_POMODORO_STRIP_DEFAULT_HEIGHT;
  const zIndex = options.zIndex ?? MORPHIC_POMODORO_STRIP_DEFAULT_Z_INDEX;

  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.left = '0';
  root.style.right = '0';
  if (position === 'top') root.style.top = '0';
  else root.style.bottom = '0';
  root.style.height = `${height}px`;
  root.style.pointerEvents = 'none';
  root.style.zIndex = String(zIndex);
  root.style.transition = isReducedMotion()
    ? 'none'
    : 'background-color 200ms ease, opacity 200ms ease';

  const initialPhase = getPomodoroState().phase;
  applyPhase(root, colors, initialPhase);
  document.body.appendChild(root);

  const pollHandle = setInterval(() => {
    if (!active) return;
    const phase = getPomodoroState().phase;
    if (phase !== active.lastPhase) {
      applyPhase(active.root, active.colors, phase);
      active.lastPhase = phase;
    }
  }, MORPHIC_POMODORO_STRIP_POLL_MS);

  active = { root, colors, pollHandle, lastPhase: initialPhase };
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
  return { active: true, phase: active.lastPhase };
}
