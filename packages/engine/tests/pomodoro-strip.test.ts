/**
 * Tests for B-035 — Pomodoro Strip, progress-fill redesign (F-035 ext.).
 * Risk: Standard 80%.
 *
 * Redesigned per Jay 2026-08-30: pale grey track, fill grows + shifts
 * colour (grey -> light blue -> orange near the end) as the phase elapses,
 * then a slow breathing green pulse for a few seconds when a phase
 * completes. Not published yet (B-034's flat per-phase colour never
 * shipped), so this replaces it outright rather than deprecating.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetPomodoroStateForTests,
  computePomodoroStripFillColor,
  disablePomodoroStrip,
  enablePomodoroStrip,
  getPomodoroStripState,
  MORPHIC_POMODORO_STRIP_BREATHE_MS,
  MORPHIC_POMODORO_STRIP_FILL_MARKER,
  MORPHIC_POMODORO_STRIP_MARKER,
  MORPHIC_POMODORO_STRIP_POLL_MS,
  POMODORO_STRIP_DEFAULT_RAMP_DOWN_STOP,
  POMODORO_STRIP_DEFAULT_RAMP_UP_STOP,
  POMODORO_STRIP_END_COLOR,
  POMODORO_STRIP_MID_COLOR,
  POMODORO_STRIP_START_COLOR,
  skipPhase,
  startPomodoro,
  stopPomodoro,
} from '../src/index.js';

function track(): HTMLElement | null {
  return document.querySelector(`[${MORPHIC_POMODORO_STRIP_MARKER}]`);
}

function fill(): HTMLElement | null {
  return document.querySelector(`[${MORPHIC_POMODORO_STRIP_FILL_MARKER}]`);
}

beforeEach(() => {
  vi.useFakeTimers();
  __resetPomodoroStateForTests();
});

afterEach(() => {
  disablePomodoroStrip();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// computePomodoroStripFillColor — pure algorithm, hand-verified reference
// values (Anti-Circular Layer 1: never test a formula against itself).
// ---------------------------------------------------------------------------

describe('pomodoro-strip / computePomodoroStripFillColor', () => {
  const start = POMODORO_STRIP_START_COLOR; // #d1d5db -> [209,213,219]
  const mid = POMODORO_STRIP_MID_COLOR; // #3b82f6 -> [59,130,246]
  const end = POMODORO_STRIP_END_COLOR; // #fb923c -> [251,146,60]
  const rampUp = 0.35;
  const rampDown = 0.85;

  it('should return the exact start colour at elapsed=0', () => {
    expect(computePomodoroStripFillColor(0, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(209, 213, 219)',
    );
  });

  it('should return the exact mid colour at elapsed=rampUpStop', () => {
    expect(computePomodoroStripFillColor(rampUp, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(59, 130, 246)',
    );
  });

  it('should hold the exact mid colour throughout the plateau', () => {
    expect(computePomodoroStripFillColor(0.6, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(59, 130, 246)',
    );
  });

  it('should return the exact mid colour at elapsed=rampDownStop', () => {
    expect(computePomodoroStripFillColor(rampDown, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(59, 130, 246)',
    );
  });

  it('should return the exact end colour at elapsed=1', () => {
    expect(computePomodoroStripFillColor(1, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(251, 146, 60)',
    );
  });

  it('should interpolate halfway between start and mid before rampUpStop', () => {
    // t = 0.175, rampUp = 0.35 -> local fraction 0.5 between start and mid.
    // R: 209 + (59-209)*0.5 = 134
    // G: 213 + (130-213)*0.5 = 171.5 -> 172
    // B: 219 + (246-219)*0.5 = 232.5 -> 233
    expect(computePomodoroStripFillColor(0.175, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(134, 172, 233)',
    );
  });

  it('should interpolate halfway between mid and end after rampDownStop', () => {
    // t = 0.925, rampDown = 0.85 -> local fraction 0.5 between mid and end.
    // R: 59 + (251-59)*0.5 = 155
    // G: 130 + (146-130)*0.5 = 138
    // B: 246 + (60-246)*0.5 = 153
    expect(computePomodoroStripFillColor(0.925, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(155, 138, 153)',
    );
  });

  it('should clamp elapsed below 0 to the start colour', () => {
    expect(computePomodoroStripFillColor(-0.5, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(209, 213, 219)',
    );
  });

  it('should clamp elapsed above 1 to the end colour', () => {
    expect(computePomodoroStripFillColor(1.5, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(251, 146, 60)',
    );
  });
});

// ---------------------------------------------------------------------------
// Mounting + progressive fill
// ---------------------------------------------------------------------------

describe('pomodoro-strip / enablePomodoroStrip', () => {
  it('should mount a pale-grey track + a 0%-width fill when a phase just started', () => {
    startPomodoro({ workMs: 100_000 });
    enablePomodoroStrip();
    const t = track();
    const f = fill();
    expect(t).not.toBeNull();
    expect(f).not.toBeNull();
    expect(t?.style.background).toBe('rgb(209, 213, 219)');
    expect(f?.style.width).toBe('0%');
  });

  it('should hide the track (opacity 0) when idle', () => {
    enablePomodoroStrip();
    expect(track()?.style.opacity).toBe('0');
  });

  it('should replace a previous strip rather than mounting a second one', () => {
    enablePomodoroStrip();
    enablePomodoroStrip();
    expect(document.querySelectorAll(`[${MORPHIC_POMODORO_STRIP_MARKER}]`)).toHaveLength(1);
  });

  it('should throw TypeError on an invalid position', () => {
    // @ts-expect-error deliberate invalid input for the defensive test
    expect(() => enablePomodoroStrip({ position: 'left' })).toThrow(TypeError);
  });

  it('should throw TypeError on a non-positive-integer height', () => {
    expect(() => enablePomodoroStrip({ height: 0 })).toThrow(TypeError);
    expect(() => enablePomodoroStrip({ height: 1.5 })).toThrow(TypeError);
  });

  it('should throw TypeError on a non-positive-integer zIndex', () => {
    expect(() => enablePomodoroStrip({ zIndex: -1 })).toThrow(TypeError);
  });
});

describe('pomodoro-strip / progressive fill as the phase elapses', () => {
  it('should grow the fill width and shift its colour toward mid at the halfway point', () => {
    startPomodoro({ workMs: 100_000 });
    enablePomodoroStrip();

    vi.advanceTimersByTime(50_000); // 50% elapsed
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    expect(fill()?.style.width).toBe('50%');
    expect(fill()?.style.background).toBe(
      computePomodoroStripFillColor(
        0.5,
        POMODORO_STRIP_START_COLOR,
        POMODORO_STRIP_MID_COLOR,
        POMODORO_STRIP_END_COLOR,
        POMODORO_STRIP_DEFAULT_RAMP_UP_STOP,
        POMODORO_STRIP_DEFAULT_RAMP_DOWN_STOP,
      ),
    );
    // Sanity: by the halfway point the fill should already be plainly blue,
    // not a barely-tinted grey (Jay 2026-08-30: "le bleu doit être plus visible").
    expect(fill()?.style.background).toBe('rgb(59, 130, 246)');
  });

  it('should shift toward orange near the end of the phase', () => {
    startPomodoro({ workMs: 100_000 });
    enablePomodoroStrip();

    vi.advanceTimersByTime(95_000); // 95% elapsed
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    const bg = fill()?.style.background ?? '';
    expect(bg).toBe(
      computePomodoroStripFillColor(
        0.95,
        POMODORO_STRIP_START_COLOR,
        POMODORO_STRIP_MID_COLOR,
        POMODORO_STRIP_END_COLOR,
        POMODORO_STRIP_DEFAULT_RAMP_UP_STOP,
        POMODORO_STRIP_DEFAULT_RAMP_DOWN_STOP,
      ),
    );
    // Sanity: at 95% the fill should have moved on from pure mid-blue.
    expect(bg).not.toBe('rgb(59, 130, 246)');
  });
});

// ---------------------------------------------------------------------------
// Completion — slow breathing green pulse
// ---------------------------------------------------------------------------

describe('pomodoro-strip / completion breathes green', () => {
  it('should fill 100% green and animate when a phase completes', () => {
    startPomodoro({ workMs: 10_000, shortBreakMs: 50_000 });
    enablePomodoroStrip();

    vi.advanceTimersByTime(10_000); // work phase ends naturally
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    expect(fill()?.style.width).toBe('100%');
    expect(fill()?.style.background).toBe('rgb(34, 197, 94)'); // #22c55e
    expect(fill()?.style.animation).toContain('morphic-pomodoro-breathe');
  });

  it('should stop breathing and resume the normal fill after the breathe window', () => {
    startPomodoro({ workMs: 10_000, shortBreakMs: 50_000 });
    enablePomodoroStrip();

    vi.advanceTimersByTime(10_000);
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS); // enters breathing

    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_BREATHE_MS);
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS); // breathe window elapsed

    expect(fill()?.style.animation).toBe('none');
    expect(track()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('short-break');
  });

  it('should skip the animation under prefers-reduced-motion, staying solid green', () => {
    const matchMediaMock = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('matchMedia', matchMediaMock);

    startPomodoro({ workMs: 10_000, shortBreakMs: 50_000 });
    enablePomodoroStrip();
    vi.advanceTimersByTime(10_000);
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    expect(fill()?.style.background).toBe('rgb(34, 197, 94)');
    expect(fill()?.style.animation).toBe('none');

    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// Self-correction without relying on pomodoro.ts events
// ---------------------------------------------------------------------------

describe('pomodoro-strip / polling — self-corrects even without an event', () => {
  it('should pick up a skipPhase transition (which emits no event) on the next poll', () => {
    startPomodoro({ workMs: 100_000 });
    enablePomodoroStrip();
    expect(track()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('work');

    skipPhase(); // work -> short-break, no event fired by pomodoro.ts
    expect(track()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('work'); // not yet polled

    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);
    expect(track()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('short-break');
  });

  it('should fade out after stopPomodoro once polled', () => {
    startPomodoro();
    enablePomodoroStrip();

    stopPomodoro();
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    expect(track()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('idle');
    expect(track()?.style.opacity).toBe('0');
  });

  it('should stop polling once disabled (no stray timer/DOM leaks)', () => {
    startPomodoro();
    enablePomodoroStrip();
    disablePomodoroStrip();

    expect(track()).toBeNull();
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS * 3);
    expect(track()).toBeNull();
  });
});

describe('pomodoro-strip / disablePomodoroStrip', () => {
  it('should be idempotent when nothing is active', () => {
    expect(() => disablePomodoroStrip()).not.toThrow();
    expect(() => disablePomodoroStrip()).not.toThrow();
  });
});

describe('pomodoro-strip / getPomodoroStripState', () => {
  it('should return null when inactive', () => {
    expect(getPomodoroStripState()).toBeNull();
  });

  it('should return the active phase and completing=false once enabled', () => {
    startPomodoro();
    enablePomodoroStrip();
    expect(getPomodoroStripState()).toEqual({ active: true, phase: 'work', completing: false });
  });

  it('should report completing=true during the breathe window', () => {
    startPomodoro({ workMs: 10_000, shortBreakMs: 50_000 });
    enablePomodoroStrip();
    vi.advanceTimersByTime(10_000);
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    expect(getPomodoroStripState()).toEqual({
      active: true,
      phase: 'short-break',
      completing: true,
    });
  });
});
