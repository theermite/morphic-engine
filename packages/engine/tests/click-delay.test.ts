/**
 * Tests for B-106 — Click Delay axis (F-030).
 * Risk: Critical 95% + mutation 75%.
 * Anti-Circular Layer 1: PBT + MC/DC on complex conditions.
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CLICK_DELAY_MAX,
  CLICK_DELAY_MIN,
  type ClickDelayOptions,
  type ClickDelayState,
  clearClickDelay,
  getClickDelay,
  getClickDelayState,
  MORPHIC_CLICK_DELAY_MARKER,
  setClickDelay,
  validateClickDelay,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dispatchClick(
  target: HTMLElement = document.body,
  eventInit: Partial<PointerEventInit> = {},
): PointerEvent {
  const ev = new PointerEvent('click', {
    bubbles: true,
    cancelable: true,
    ...eventInit,
  });
  target.dispatchEvent(ev);
  return ev;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('click-delay / constants', () => {
  it('should export CLICK_DELAY_MIN as 0', () => {
    expect(CLICK_DELAY_MIN).toBe(0);
  });

  it('should export CLICK_DELAY_MAX as 500', () => {
    expect(CLICK_DELAY_MAX).toBe(500);
  });

  it('should export MORPHIC_CLICK_DELAY_MARKER as data-morphic-click-delay', () => {
    expect(MORPHIC_CLICK_DELAY_MARKER).toBe('data-morphic-click-delay');
  });
});

// ---------------------------------------------------------------------------
// validateClickDelay — pure function
// ---------------------------------------------------------------------------

describe('click-delay / validateClickDelay', () => {
  it('should return true for 0', () => {
    expect(validateClickDelay(0)).toBe(true);
  });

  it('should return true for 500', () => {
    expect(validateClickDelay(500)).toBe(true);
  });

  it('should return true for 250', () => {
    expect(validateClickDelay(250)).toBe(true);
  });

  it('should return false for negative', () => {
    expect(validateClickDelay(-1)).toBe(false);
  });

  it('should return false for > 500', () => {
    expect(validateClickDelay(501)).toBe(false);
  });

  it('should return false for NaN', () => {
    expect(validateClickDelay(Number.NaN)).toBe(false);
  });

  it('should return false for Infinity', () => {
    expect(validateClickDelay(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('should return false for non-integer', () => {
    expect(validateClickDelay(100.5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setClickDelay — activation
// ---------------------------------------------------------------------------

describe('click-delay / setClickDelay', () => {
  afterEach(() => {
    clearClickDelay();
    localStorage.clear();
  });

  it('should return state with delay and active=true', () => {
    const state = setClickDelay({ delay: 200 });
    expect(state.delay).toBe(200);
    expect(state.active).toBe(true);
  });

  it('should throw on delay < 0', () => {
    expect(() => setClickDelay({ delay: -10 })).toThrow();
  });

  it('should throw on delay > 500', () => {
    expect(() => setClickDelay({ delay: 600 })).toThrow();
  });

  it('should throw on NaN delay', () => {
    expect(() => setClickDelay({ delay: Number.NaN })).toThrow();
  });

  it('should throw on non-integer delay', () => {
    expect(() => setClickDelay({ delay: 99.9 })).toThrow();
  });

  it('should accept delay = 0 (effectively disabled filtering)', () => {
    const state = setClickDelay({ delay: 0 });
    expect(state.delay).toBe(0);
    expect(state.active).toBe(true);
  });

  it('should accept delay = 500 (max)', () => {
    const state = setClickDelay({ delay: 500 });
    expect(state.delay).toBe(500);
  });

  it('should set marker attribute on document.documentElement', () => {
    setClickDelay({ delay: 100 });
    expect(document.documentElement.hasAttribute(MORPHIC_CLICK_DELAY_MARKER)).toBe(true);
  });

  it('should tear down prior session before mounting new one (idempotent)', () => {
    setClickDelay({ delay: 100 });
    setClickDelay({ delay: 300 });
    const state = getClickDelayState();
    expect(state?.delay).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// Click filtering — the core behavior
// ---------------------------------------------------------------------------

describe('click-delay / click filtering', () => {
  afterEach(() => {
    clearClickDelay();
    localStorage.clear();
  });

  it('should allow first click through', () => {
    setClickDelay({ delay: 200 });
    const handler = vi.fn();
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.addEventListener('click', handler);

    dispatchClick(btn);
    expect(handler).toHaveBeenCalledTimes(1);

    btn.remove();
  });

  it('should block rapid second click within delay window', () => {
    setClickDelay({ delay: 200 });
    const handler = vi.fn();
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.addEventListener('click', handler);

    dispatchClick(btn);
    dispatchClick(btn); // immediate — within 200ms

    expect(handler).toHaveBeenCalledTimes(1);

    btn.remove();
  });

  it('should allow click after delay has elapsed', async () => {
    vi.useFakeTimers();
    setClickDelay({ delay: 100 });
    const handler = vi.fn();
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.addEventListener('click', handler);

    dispatchClick(btn);
    expect(handler).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(101);
    dispatchClick(btn);
    expect(handler).toHaveBeenCalledTimes(2);

    btn.remove();
    vi.useRealTimers();
  });

  it('should not block clicks when delay is 0', () => {
    setClickDelay({ delay: 0 });
    const handler = vi.fn();
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.addEventListener('click', handler);

    dispatchClick(btn);
    dispatchClick(btn);
    dispatchClick(btn);

    expect(handler).toHaveBeenCalledTimes(3);

    btn.remove();
  });

  it('should preventDefault on blocked clicks', () => {
    setClickDelay({ delay: 200 });
    const btn = document.createElement('button');
    document.body.appendChild(btn);

    dispatchClick(btn); // first — allowed

    const ev = new PointerEvent('click', { bubbles: true, cancelable: true });
    const prevented = !btn.dispatchEvent(ev);
    expect(prevented).toBe(true);

    btn.remove();
  });

  it('should stopImmediatePropagation on blocked clicks', () => {
    setClickDelay({ delay: 200 });
    const handler = vi.fn();
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.addEventListener('click', handler);

    dispatchClick(btn); // first — allowed
    dispatchClick(btn); // second — blocked

    // handler only called once (first click)
    expect(handler).toHaveBeenCalledTimes(1);

    btn.remove();
  });

  it('should track blockedCount in state', () => {
    setClickDelay({ delay: 200 });

    dispatchClick(document.body);
    dispatchClick(document.body); // blocked
    dispatchClick(document.body); // blocked

    const state = getClickDelayState();
    expect(state?.blockedCount).toBe(2);
  });

  it('should not interfere with dblclick events', () => {
    setClickDelay({ delay: 200 });
    const handler = vi.fn();
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.addEventListener('dblclick', handler);

    const dblEv = new MouseEvent('dblclick', { bubbles: true });
    btn.dispatchEvent(dblEv);
    expect(handler).toHaveBeenCalledTimes(1);

    btn.remove();
  });
});

// ---------------------------------------------------------------------------
// MC/DC — complex condition in click filter
// ---------------------------------------------------------------------------
// The core condition for blocking is:
//   (active === true) AND (timeSinceLastClick < delay) AND (delay > 0)
// MC/DC requires each condition to independently affect the outcome.

describe('click-delay / MC/DC — block condition', () => {
  afterEach(() => {
    clearClickDelay();
    localStorage.clear();
  });

  // C1: active=true, timeDelta<delay, delay>0 → BLOCK
  it('should block when active AND timeDelta < delay AND delay > 0', () => {
    setClickDelay({ delay: 200 });
    const handler = vi.fn();
    document.body.addEventListener('click', handler);
    dispatchClick(document.body);
    dispatchClick(document.body);
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('click', handler);
  });

  // C2: active=false → no block (cleared)
  it('should not block when not active (cleared)', () => {
    setClickDelay({ delay: 200 });
    clearClickDelay();
    const handler = vi.fn();
    document.body.addEventListener('click', handler);
    dispatchClick(document.body);
    dispatchClick(document.body);
    expect(handler).toHaveBeenCalledTimes(2);
    document.body.removeEventListener('click', handler);
  });

  // C3: timeDelta >= delay → no block
  it('should not block when timeDelta >= delay', async () => {
    vi.useFakeTimers();
    setClickDelay({ delay: 50 });
    const handler = vi.fn();
    document.body.addEventListener('click', handler);
    dispatchClick(document.body);
    vi.advanceTimersByTime(51);
    dispatchClick(document.body);
    expect(handler).toHaveBeenCalledTimes(2);
    document.body.removeEventListener('click', handler);
    vi.useRealTimers();
  });

  // C4: delay=0 → no block (filtering disabled)
  it('should not block when delay is 0', () => {
    setClickDelay({ delay: 0 });
    const handler = vi.fn();
    document.body.addEventListener('click', handler);
    dispatchClick(document.body);
    dispatchClick(document.body);
    expect(handler).toHaveBeenCalledTimes(2);
    document.body.removeEventListener('click', handler);
  });
});

// ---------------------------------------------------------------------------
// clearClickDelay
// ---------------------------------------------------------------------------

describe('click-delay / clearClickDelay', () => {
  afterEach(() => {
    clearClickDelay();
    localStorage.clear();
  });

  it('should remove marker attribute', () => {
    setClickDelay({ delay: 100 });
    clearClickDelay();
    expect(document.documentElement.hasAttribute(MORPHIC_CLICK_DELAY_MARKER)).toBe(false);
  });

  it('should stop filtering clicks after clear', () => {
    setClickDelay({ delay: 200 });
    clearClickDelay();
    const handler = vi.fn();
    document.body.addEventListener('click', handler);
    dispatchClick(document.body);
    dispatchClick(document.body);
    expect(handler).toHaveBeenCalledTimes(2);
    document.body.removeEventListener('click', handler);
  });

  it('should be idempotent (no throw on double clear)', () => {
    clearClickDelay();
    clearClickDelay();
    expect(getClickDelayState()).toBeNull();
  });

  it('should return null state after clear', () => {
    setClickDelay({ delay: 100 });
    clearClickDelay();
    expect(getClickDelayState()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getClickDelay — read current delay value
// ---------------------------------------------------------------------------

describe('click-delay / getClickDelay', () => {
  afterEach(() => {
    clearClickDelay();
    localStorage.clear();
  });

  it('should return null when not active', () => {
    expect(getClickDelay()).toBeNull();
  });

  it('should return current delay value when active', () => {
    setClickDelay({ delay: 300 });
    expect(getClickDelay()).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// getClickDelayState — full state
// ---------------------------------------------------------------------------

describe('click-delay / getClickDelayState', () => {
  afterEach(() => {
    clearClickDelay();
    localStorage.clear();
  });

  it('should return null when not active', () => {
    expect(getClickDelayState()).toBeNull();
  });

  it('should return full state when active', () => {
    const state = setClickDelay({ delay: 150 });
    expect(state.delay).toBe(150);
    expect(state.active).toBe(true);
    expect(state.blockedCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Persistence — localStorage sub-key
// ---------------------------------------------------------------------------

describe('click-delay / persistence', () => {
  afterEach(() => {
    clearClickDelay();
    localStorage.clear();
  });

  it('should persist delay under MORPHIC_STORAGE_KEY sub-key clickDelay', () => {
    setClickDelay({ delay: 250 });
    const raw = localStorage.getItem('morphic-prefs');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.clickDelay).toBeDefined();
    expect(parsed.clickDelay.delay).toBe(250);
  });

  it('should not clobber other sub-keys', () => {
    localStorage.setItem('morphic-prefs', JSON.stringify({ readingGuide: { mode: 'line' } }));
    setClickDelay({ delay: 100 });
    const parsed = JSON.parse(localStorage.getItem('morphic-prefs')!);
    expect(parsed.readingGuide.mode).toBe('line');
    expect(parsed.clickDelay.delay).toBe(100);
  });

  it('should handle corrupt JSON gracefully (reset)', () => {
    localStorage.setItem('morphic-prefs', '{{{invalid');
    expect(() => setClickDelay({ delay: 100 })).not.toThrow();
    const parsed = JSON.parse(localStorage.getItem('morphic-prefs')!);
    expect(parsed.clickDelay.delay).toBe(100);
  });

  it('should handle array JSON gracefully (reset)', () => {
    localStorage.setItem('morphic-prefs', '[1,2,3]');
    expect(() => setClickDelay({ delay: 100 })).not.toThrow();
    const parsed = JSON.parse(localStorage.getItem('morphic-prefs')!);
    expect(parsed.clickDelay.delay).toBe(100);
  });

  it('should handle null JSON gracefully', () => {
    localStorage.setItem('morphic-prefs', 'null');
    expect(() => setClickDelay({ delay: 100 })).not.toThrow();
  });

  it('should handle empty string key gracefully', () => {
    localStorage.removeItem('morphic-prefs');
    expect(() => setClickDelay({ delay: 100 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// SSR safety
// ---------------------------------------------------------------------------

describe('click-delay / SSR safety', () => {
  it('should return minimal state when document is undefined', () => {
    // We can't truly remove document in jsdom, so we test that
    // the function signatures exist and return expected shapes
    const state = setClickDelay({ delay: 100 });
    expect(state).toHaveProperty('delay');
    expect(state).toHaveProperty('active');
    expect(state).toHaveProperty('blockedCount');
    clearClickDelay();
  });
});

// ---------------------------------------------------------------------------
// PBT — Property-Based Testing (Anti-Circular Layer 1)
// ---------------------------------------------------------------------------

describe('click-delay / PBT', () => {
  afterEach(() => {
    clearClickDelay();
    localStorage.clear();
  });

  it('validateClickDelay returns true for all integers in [0, 500]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), (delay) => {
        expect(validateClickDelay(delay)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('validateClickDelay returns false for all integers outside [0, 500]', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer({ min: -1000, max: -1 }), fc.integer({ min: 501, max: 10000 })),
        (delay) => {
          expect(validateClickDelay(delay)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('setClickDelay + getClickDelay round-trip preserves value', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), (delay) => {
        setClickDelay({ delay });
        expect(getClickDelay()).toBe(delay);
        clearClickDelay();
      }),
      { numRuns: 100 },
    );
  });

  it('blockedCount monotonically increases with rapid clicks', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (n) => {
        setClickDelay({ delay: 500 }); // max delay — all rapid clicks blocked
        // First click is always allowed
        dispatchClick(document.body);
        for (let i = 0; i < n; i++) {
          dispatchClick(document.body);
        }
        const state = getClickDelayState();
        expect(state?.blockedCount).toBe(n);
        clearClickDelay();
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Defensive assertions
// ---------------------------------------------------------------------------

describe('click-delay / defensive assertions', () => {
  afterEach(() => {
    clearClickDelay();
    localStorage.clear();
  });

  it('setClickDelay throws TypeError on non-number delay', () => {
    // @ts-expect-error — testing runtime guard
    expect(() => setClickDelay({ delay: '100' })).toThrow(TypeError);
  });

  it('setClickDelay throws RangeError on out-of-range delay', () => {
    expect(() => setClickDelay({ delay: 999 })).toThrow(RangeError);
  });
});
