/**
 * Tests for B-034 — Pomodoro Strip (F-035 ext.).
 * Risk: Standard 80% (pure visual companion, no new persisted state).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetPomodoroStateForTests,
  disablePomodoroStrip,
  enablePomodoroStrip,
  getPomodoroStripState,
  MORPHIC_POMODORO_STRIP_MARKER,
  MORPHIC_POMODORO_STRIP_POLL_MS,
  skipPhase,
  startPomodoro,
  stopPomodoro,
} from '../src/index.js';

function strip(): HTMLElement | null {
  return document.querySelector(`[${MORPHIC_POMODORO_STRIP_MARKER}]`);
}

beforeEach(() => {
  vi.useFakeTimers();
  __resetPomodoroStateForTests();
});

afterEach(() => {
  disablePomodoroStrip();
  vi.useRealTimers();
});

describe('pomodoro-strip / enablePomodoroStrip', () => {
  it('should mount a fixed strip reflecting the current phase', () => {
    startPomodoro();
    enablePomodoroStrip();
    const el = strip();
    expect(el).not.toBeNull();
    expect(el?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('work');
    expect(el?.style.background).toBe('rgb(239, 68, 68)'); // jsdom normalizes #ef4444
  });

  it('should hide the strip (opacity 0) when idle', () => {
    enablePomodoroStrip();
    const el = strip();
    expect(el?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('idle');
    expect(el?.style.opacity).toBe('0');
  });

  it('should accept custom colors, position and height', () => {
    startPomodoro();
    enablePomodoroStrip({ position: 'bottom', height: 8, colors: { work: '#000000' } });
    const el = strip();
    expect(el?.style.bottom).toBe('0px');
    expect(el?.style.top).toBe('');
    expect(el?.style.height).toBe('8px');
    expect(el?.style.background).toBe('rgb(0, 0, 0)');
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

describe('pomodoro-strip / polling — self-corrects even without an event', () => {
  it('should update color after skipPhase (which emits no event)', () => {
    startPomodoro();
    enablePomodoroStrip();
    expect(strip()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('work');

    skipPhase(); // work -> short-break, no event fired by pomodoro.ts
    expect(strip()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('work'); // not yet polled

    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);
    expect(strip()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('short-break');
  });

  it('should fade out after stopPomodoro once polled', () => {
    startPomodoro();
    enablePomodoroStrip();

    stopPomodoro();
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    const el = strip();
    expect(el?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('idle');
    expect(el?.style.opacity).toBe('0');
  });

  it('should stop polling once disabled (no stray timer/DOM leaks)', () => {
    startPomodoro();
    enablePomodoroStrip();
    disablePomodoroStrip();

    expect(strip()).toBeNull();
    // Advancing timers after disable must not throw or resurrect the strip.
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS * 3);
    expect(strip()).toBeNull();
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

  it('should return the active phase once enabled', () => {
    startPomodoro();
    enablePomodoroStrip();
    expect(getPomodoroStripState()).toEqual({ active: true, phase: 'work' });
  });
});
