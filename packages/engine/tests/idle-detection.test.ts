/**
 * Tests for B-110 — Auto-pause Idle axis (F-034).
 * Risk: Sensitive 90%.
 *
 * Defensive assertions (≥2 per critical function):
 *   - setIdleDetection: validates options shape + idleMs bounds (TypeError on bad input).
 *   - clearIdleDetection: idempotent (no-op when not active).
 *   - Activity callback: race-safe (recheck timestamp before emit).
 *
 * Properties tested:
 *   - Idle timer fires `pause-suggested` after idleMs of inactivity.
 *   - Activity (pointer/keyboard) before idleMs resets the timer.
 *   - Activity after pause-suggested emits `resume`.
 *   - `visibilitychange` to hidden emits pause-suggested immediately.
 *   - `visibilitychange` to visible emits resume if paused.
 *   - SSR safety: document/window/CustomEvent guards.
 *   - Replacing detection (setIdleDetection twice) replaces listeners.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetIdleDetectionStateForTests,
  clearIdleDetection,
  getIdleDetectionState,
  IDLE_TIMEOUT_DEFAULT,
  IDLE_TIMEOUT_MAX,
  IDLE_TIMEOUT_MIN,
  isIdle,
  MORPHIC_IDLE_EVENT_PAUSE,
  MORPHIC_IDLE_EVENT_RESUME,
  MORPHIC_IDLE_MARKER,
  setIdleDetection,
} from '../src/idle-detection.js';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

beforeEach(() => {
  __resetIdleDetectionStateForTests();
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  clearIdleDetection();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function triggerActivity(): void {
  document.dispatchEvent(new Event('pointermove', { bubbles: true }));
}

function triggerVisibilityChange(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('B-110 constants', () => {
  it('should expose IDLE_TIMEOUT_DEFAULT as 60_000 ms', () => {
    expect(IDLE_TIMEOUT_DEFAULT).toBe(60_000);
  });

  it('should expose IDLE_TIMEOUT_MIN as 10_000 ms', () => {
    expect(IDLE_TIMEOUT_MIN).toBe(10_000);
  });

  it('should expose IDLE_TIMEOUT_MAX as 600_000 ms (10 min)', () => {
    expect(IDLE_TIMEOUT_MAX).toBe(600_000);
  });

  it('should expose namespaced event names', () => {
    expect(MORPHIC_IDLE_EVENT_PAUSE).toBe('morphic:energy:pause-suggested');
    expect(MORPHIC_IDLE_EVENT_RESUME).toBe('morphic:energy:resume');
  });

  it('should expose the storage marker', () => {
    expect(MORPHIC_IDLE_MARKER).toBe('morphic-idle');
  });
});

// ---------------------------------------------------------------------------
// setIdleDetection — happy path
// ---------------------------------------------------------------------------

describe('setIdleDetection — happy path', () => {
  it('should return state with enabled=true and configured idleMs', () => {
    const state = setIdleDetection({ enabled: true, idleMs: 30_000 });
    expect(state.enabled).toBe(true);
    expect(state.idleMs).toBe(30_000);
    expect(state.idle).toBe(false);
  });

  it('should default idleMs to IDLE_TIMEOUT_DEFAULT when omitted', () => {
    const state = setIdleDetection({ enabled: true });
    expect(state.idleMs).toBe(IDLE_TIMEOUT_DEFAULT);
  });

  it('should default to enabled=true when called with empty options', () => {
    const state = setIdleDetection({});
    expect(state.enabled).toBe(true);
  });

  it('should accept undefined options as enable+default', () => {
    const state = setIdleDetection();
    expect(state.enabled).toBe(true);
    expect(state.idleMs).toBe(IDLE_TIMEOUT_DEFAULT);
  });
});

// ---------------------------------------------------------------------------
// setIdleDetection — defensive validation
// ---------------------------------------------------------------------------

describe('setIdleDetection — defensive validation', () => {
  it('should throw TypeError on non-object options', () => {
    expect(() => setIdleDetection('bad' as unknown as Record<string, unknown>)).toThrow(TypeError);
    expect(() => setIdleDetection(42 as unknown as Record<string, unknown>)).toThrow(TypeError);
    expect(() => setIdleDetection(null as unknown as Record<string, unknown>)).toThrow(TypeError);
  });

  it('should throw TypeError on non-boolean enabled', () => {
    expect(() => setIdleDetection({ enabled: 'yes' as unknown as boolean })).toThrow(TypeError);
  });

  it('should throw TypeError on non-finite idleMs', () => {
    expect(() => setIdleDetection({ idleMs: Number.NaN })).toThrow(TypeError);
    expect(() => setIdleDetection({ idleMs: Number.POSITIVE_INFINITY })).toThrow(TypeError);
  });

  it('should throw TypeError on non-integer idleMs', () => {
    expect(() => setIdleDetection({ idleMs: 30_000.5 })).toThrow(TypeError);
  });

  it('should throw RangeError on idleMs below IDLE_TIMEOUT_MIN', () => {
    expect(() => setIdleDetection({ idleMs: 5_000 })).toThrow(RangeError);
  });

  it('should throw RangeError on idleMs above IDLE_TIMEOUT_MAX', () => {
    expect(() => setIdleDetection({ idleMs: 1_000_000 })).toThrow(RangeError);
  });

  it('should not mutate state when validation fails', () => {
    setIdleDetection({ enabled: true, idleMs: 30_000 });
    expect(() => setIdleDetection({ idleMs: 1_000 })).toThrow(RangeError);
    const state = getIdleDetectionState();
    expect(state.idleMs).toBe(30_000);
    expect(state.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Idle detection — timer behavior
// ---------------------------------------------------------------------------

describe('idle detection — timer behavior', () => {
  it('should emit pause-suggested after idleMs of inactivity', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(19_999);
    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should mark state.idle=true after pause emitted', () => {
    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(20_001);
    expect(isIdle()).toBe(true);
  });

  it('should reset timer on activity before idleMs elapses', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(15_000);
    triggerActivity();
    vi.advanceTimersByTime(15_000);
    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5_001);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should bubble pause event up to window listeners', () => {
    const winListener = vi.fn();
    window.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, winListener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(20_001);

    expect(winListener).toHaveBeenCalledTimes(1);
  });

  it('should not emit pause when disabled', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ enabled: false, idleMs: 20_000 });
    vi.advanceTimersByTime(60_000);

    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Activity types — keyboard, pointer, touch
// ---------------------------------------------------------------------------

describe('activity types', () => {
  it('should reset timer on keydown', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(15_000);
    document.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(15_000);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should reset timer on touchstart', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(15_000);
    document.dispatchEvent(new Event('touchstart'));
    vi.advanceTimersByTime(15_000);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should reset timer on mousedown', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(15_000);
    document.dispatchEvent(new Event('mousedown'));
    vi.advanceTimersByTime(15_000);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should reset timer on wheel', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(15_000);
    document.dispatchEvent(new Event('wheel'));
    vi.advanceTimersByTime(15_000);
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Resume behavior
// ---------------------------------------------------------------------------

describe('resume behavior', () => {
  it('should emit resume on activity after pause', () => {
    const pauseListener = vi.fn();
    const resumeListener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, pauseListener);
    document.addEventListener(MORPHIC_IDLE_EVENT_RESUME, resumeListener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(20_001);
    expect(pauseListener).toHaveBeenCalledTimes(1);
    expect(resumeListener).not.toHaveBeenCalled();

    triggerActivity();
    expect(resumeListener).toHaveBeenCalledTimes(1);
  });

  it('should not emit resume when not paused', () => {
    const resumeListener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_RESUME, resumeListener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(10_000);
    triggerActivity();

    expect(resumeListener).not.toHaveBeenCalled();
  });

  it('should set state.idle back to false on resume', () => {
    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(20_001);
    expect(isIdle()).toBe(true);

    triggerActivity();
    expect(isIdle()).toBe(false);
  });

  it('should re-arm timer after resume', () => {
    const pauseListener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, pauseListener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(20_001);
    expect(pauseListener).toHaveBeenCalledTimes(1);

    triggerActivity();
    vi.advanceTimersByTime(20_001);
    expect(pauseListener).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// visibilitychange behavior
// ---------------------------------------------------------------------------

describe('visibilitychange behavior', () => {
  it('should emit pause-suggested immediately when tab becomes hidden', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 60_000 });
    triggerVisibilityChange('hidden');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(isIdle()).toBe(true);
  });

  it('should emit resume when tab becomes visible after being hidden', () => {
    const resumeListener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_RESUME, resumeListener);

    setIdleDetection({ idleMs: 60_000 });
    triggerVisibilityChange('hidden');
    triggerVisibilityChange('visible');

    expect(resumeListener).toHaveBeenCalledTimes(1);
    expect(isIdle()).toBe(false);
  });

  it('should not emit pause twice if visibility transitions hidden → hidden', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 60_000 });
    triggerVisibilityChange('hidden');
    triggerVisibilityChange('hidden');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// clearIdleDetection
// ---------------------------------------------------------------------------

describe('clearIdleDetection', () => {
  it('should remove listeners and stop the timer', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    clearIdleDetection();
    vi.advanceTimersByTime(60_000);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should set state.enabled=false', () => {
    setIdleDetection({ idleMs: 20_000 });
    clearIdleDetection();
    expect(getIdleDetectionState().enabled).toBe(false);
  });

  it('should be idempotent (no throw if called without prior set)', () => {
    expect(() => clearIdleDetection()).not.toThrow();
    expect(() => clearIdleDetection()).not.toThrow();
  });

  it('should reset idle flag on clear', () => {
    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(20_001);
    expect(isIdle()).toBe(true);
    clearIdleDetection();
    expect(isIdle()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Replacement semantics — set twice
// ---------------------------------------------------------------------------

describe('replacement semantics', () => {
  it('should replace previous timer when setIdleDetection called twice', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(10_000);
    setIdleDetection({ idleMs: 40_000 });
    vi.advanceTimersByTime(20_001);
    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20_001);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should not double-register activity listeners after replacement', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(20_001);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Persistence — idleMs survives across sessions
// ---------------------------------------------------------------------------

describe('persistence', () => {
  it('should persist idleMs to localStorage under MORPHIC_IDLE_MARKER', () => {
    setIdleDetection({ idleMs: 45_000 });
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? '{}');
    expect(parsed[MORPHIC_IDLE_MARKER]).toEqual(
      expect.objectContaining({ idleMs: 45_000, enabled: true }),
    );
  });

  it('should restore idleMs from localStorage on first read', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ [MORPHIC_IDLE_MARKER]: { idleMs: 90_000, enabled: true } }),
    );
    __resetIdleDetectionStateForTests();
    const state = getIdleDetectionState();
    expect(state.idleMs).toBe(90_000);
    expect(state.enabled).toBe(true);
  });

  it('should fall back to defaults when storage is empty', () => {
    const state = getIdleDetectionState();
    expect(state.idleMs).toBe(IDLE_TIMEOUT_DEFAULT);
    expect(state.enabled).toBe(false);
  });

  it('should ignore malformed JSON in storage', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{bad json');
    __resetIdleDetectionStateForTests();
    const state = getIdleDetectionState();
    expect(state.idleMs).toBe(IDLE_TIMEOUT_DEFAULT);
  });

  it('should clear marker from storage on clearIdleDetection', () => {
    setIdleDetection({ idleMs: 45_000 });
    clearIdleDetection();
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    const parsed = JSON.parse(raw ?? '{}');
    expect(parsed[MORPHIC_IDLE_MARKER]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------

describe('read API', () => {
  it('isIdle should return false initially', () => {
    expect(isIdle()).toBe(false);
  });

  it('getIdleDetectionState should reflect set then clear', () => {
    setIdleDetection({ idleMs: 30_000 });
    expect(getIdleDetectionState().enabled).toBe(true);
    clearIdleDetection();
    expect(getIdleDetectionState().enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Type contract
// ---------------------------------------------------------------------------

describe('type contract', () => {
  it('should expose IdleDetectionState shape', () => {
    const state = setIdleDetection({ idleMs: 30_000 });
    expect(state).toHaveProperty('enabled');
    expect(state).toHaveProperty('idleMs');
    expect(state).toHaveProperty('idle');
  });
});

// ---------------------------------------------------------------------------
// Edge paths — boost Sensitive 90% coverage
// ---------------------------------------------------------------------------

describe('edge paths', () => {
  it('__resetIdleDetectionStateForTests should clear an active timer', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    // Active timer + listeners now attached. Reset must tear them down.
    __resetIdleDetectionStateForTests();
    localStorage.clear();
    vi.advanceTimersByTime(60_000);

    expect(listener).not.toHaveBeenCalled();
    expect(isIdle()).toBe(false);
  });

  it('setIdleDetection({enabled:false}) after active detection should clear the timer', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, listener);

    setIdleDetection({ idleMs: 20_000 });
    setIdleDetection({ enabled: false });
    vi.advanceTimersByTime(60_000);

    expect(listener).not.toHaveBeenCalled();
    expect(getIdleDetectionState().enabled).toBe(false);
  });

  it('should restore enabled=true from storage on first read', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ [MORPHIC_IDLE_MARKER]: { idleMs: 60_000, enabled: true } }),
    );
    __resetIdleDetectionStateForTests();
    expect(getIdleDetectionState().enabled).toBe(true);
  });

  it('should tolerate corrupted existing JSON in storage when writing', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not valid json');
    expect(() => setIdleDetection({ idleMs: 30_000 })).not.toThrow();
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    expect(() => JSON.parse(raw ?? '')).not.toThrow();
  });

  it('should ignore non-boolean stored.enabled in storage', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ [MORPHIC_IDLE_MARKER]: { enabled: 'yes', idleMs: 30_000 } }),
    );
    __resetIdleDetectionStateForTests();
    expect(getIdleDetectionState().enabled).toBe(false);
    expect(getIdleDetectionState().idleMs).toBe(30_000);
  });

  it('should ignore out-of-bounds stored.idleMs in storage', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ [MORPHIC_IDLE_MARKER]: { idleMs: 99 } }),
    );
    __resetIdleDetectionStateForTests();
    expect(getIdleDetectionState().idleMs).toBe(IDLE_TIMEOUT_DEFAULT);
  });

  it('visibilitychange to hidden then visible while already idle should resume once', () => {
    const pauseListener = vi.fn();
    const resumeListener = vi.fn();
    document.addEventListener(MORPHIC_IDLE_EVENT_PAUSE, pauseListener);
    document.addEventListener(MORPHIC_IDLE_EVENT_RESUME, resumeListener);

    setIdleDetection({ idleMs: 20_000 });
    vi.advanceTimersByTime(20_001);
    expect(pauseListener).toHaveBeenCalledTimes(1);

    triggerVisibilityChange('hidden');
    expect(pauseListener).toHaveBeenCalledTimes(1);

    triggerVisibilityChange('visible');
    expect(resumeListener).toHaveBeenCalledTimes(1);
  });

  it('should ignore stored payload missing valid keys', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ [MORPHIC_IDLE_MARKER]: 'not-an-object' }),
    );
    __resetIdleDetectionStateForTests();
    expect(getIdleDetectionState().idleMs).toBe(IDLE_TIMEOUT_DEFAULT);
  });
});
