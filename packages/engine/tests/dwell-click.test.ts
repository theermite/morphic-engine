/**
 * Tests for B-107 — Dwell Click axis (F-031).
 * Risk: Critical 95% + mutation 75%.
 * Anti-Circular Layer 1: PBT + MC/DC on dwell trigger condition.
 */

import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearDwellClick,
  DWELL_CLICK_DELAY_MAX,
  DWELL_CLICK_DELAY_MIN,
  DWELL_CLICK_RADIUS_DEFAULT,
  getDwellClick,
  getDwellClickState,
  MORPHIC_DWELL_CLICK_MARKER,
  MORPHIC_DWELL_CLICK_PROGRESS_CLASS,
  setDwellClick,
  validateDwellDelay,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeButton(id = 'btn'): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = id;
  btn.textContent = 'Click me';
  document.body.appendChild(btn);
  return btn;
}

function makeLink(): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = 'Link';
  document.body.appendChild(a);
  return a;
}

function makeDiv(): HTMLDivElement {
  const div = document.createElement('div');
  div.textContent = 'Not interactive';
  document.body.appendChild(div);
  return div;
}

function makeTabindexDiv(): HTMLDivElement {
  const div = document.createElement('div');
  div.setAttribute('tabindex', '0');
  div.setAttribute('role', 'button');
  div.textContent = 'Custom button';
  document.body.appendChild(div);
  return div;
}

function dispatchPointerMove(target: HTMLElement, x: number, y: number): void {
  const ev = new PointerEvent('pointermove', {
    bubbles: true,
    clientX: x,
    clientY: y,
  });
  target.dispatchEvent(ev);
}

function dispatchPointerLeave(target: HTMLElement): void {
  const ev = new PointerEvent('pointerleave', { bubbles: false });
  target.dispatchEvent(ev);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('dwell-click / constants', () => {
  it('should export DWELL_CLICK_DELAY_MIN as 500', () => {
    expect(DWELL_CLICK_DELAY_MIN).toBe(500);
  });

  it('should export DWELL_CLICK_DELAY_MAX as 3000', () => {
    expect(DWELL_CLICK_DELAY_MAX).toBe(3000);
  });

  it('should export DWELL_CLICK_RADIUS_DEFAULT as 10', () => {
    expect(DWELL_CLICK_RADIUS_DEFAULT).toBe(10);
  });

  it('should export MORPHIC_DWELL_CLICK_MARKER', () => {
    expect(MORPHIC_DWELL_CLICK_MARKER).toBe('data-morphic-dwell-click');
  });
});

// ---------------------------------------------------------------------------
// validateDwellDelay — pure
// ---------------------------------------------------------------------------

describe('dwell-click / validateDwellDelay', () => {
  it('should return true for 500', () => {
    expect(validateDwellDelay(500)).toBe(true);
  });

  it('should return true for 3000', () => {
    expect(validateDwellDelay(3000)).toBe(true);
  });

  it('should return true for 1500', () => {
    expect(validateDwellDelay(1500)).toBe(true);
  });

  it('should return false for 499', () => {
    expect(validateDwellDelay(499)).toBe(false);
  });

  it('should return false for 3001', () => {
    expect(validateDwellDelay(3001)).toBe(false);
  });

  it('should return false for NaN', () => {
    expect(validateDwellDelay(Number.NaN)).toBe(false);
  });

  it('should return false for non-integer', () => {
    expect(validateDwellDelay(1500.5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setDwellClick — activation
// ---------------------------------------------------------------------------

describe('dwell-click / setDwellClick', () => {
  afterEach(() => {
    clearDwellClick();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('should return state with delay, radius, and active=true', () => {
    const state = setDwellClick({ delay: 1000 });
    expect(state.delay).toBe(1000);
    expect(state.active).toBe(true);
    expect(state.radius).toBe(DWELL_CLICK_RADIUS_DEFAULT);
  });

  it('should accept custom radius', () => {
    const state = setDwellClick({ delay: 1000, radius: 20 });
    expect(state.radius).toBe(20);
  });

  it('should throw on delay < 500', () => {
    expect(() => setDwellClick({ delay: 100 })).toThrow(RangeError);
  });

  it('should throw on delay > 3000', () => {
    expect(() => setDwellClick({ delay: 5000 })).toThrow(RangeError);
  });

  it('should throw on non-number delay', () => {
    // @ts-expect-error — testing runtime guard
    expect(() => setDwellClick({ delay: '1000' })).toThrow(TypeError);
  });

  it('should set marker attribute on documentElement', () => {
    setDwellClick({ delay: 1000 });
    expect(document.documentElement.hasAttribute(MORPHIC_DWELL_CLICK_MARKER)).toBe(true);
  });

  it('should tear down prior session (idempotent)', () => {
    setDwellClick({ delay: 1000 });
    setDwellClick({ delay: 2000 });
    expect(getDwellClickState()?.delay).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// Dwell trigger — core behavior
// ---------------------------------------------------------------------------

describe('dwell-click / dwell trigger', () => {
  afterEach(() => {
    clearDwellClick();
    localStorage.clear();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should fire click on interactive element after dwell delay', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const btn = makeButton();
    const handler = vi.fn();
    btn.addEventListener('click', handler);

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(1);
    btn.remove();
  });

  it('should NOT fire click before delay elapsed', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 1000 });
    const btn = makeButton();
    const handler = vi.fn();
    btn.addEventListener('click', handler);

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(999);

    expect(handler).toHaveBeenCalledTimes(0);
    btn.remove();
  });

  it('should fire click on anchor elements', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const a = makeLink();
    const handler = vi.fn();
    a.addEventListener('click', handler);

    dispatchPointerMove(a, 50, 50);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(1);
    a.remove();
  });

  it('should fire click on elements with tabindex', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const div = makeTabindexDiv();
    const handler = vi.fn();
    div.addEventListener('click', handler);

    dispatchPointerMove(div, 50, 50);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(1);
    div.remove();
  });

  it('should fire click on element with role=button (no tabindex)', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const div = document.createElement('div');
    div.setAttribute('role', 'button');
    div.textContent = 'Role button';
    document.body.appendChild(div);
    const handler = vi.fn();
    div.addEventListener('click', handler);

    dispatchPointerMove(div, 50, 50);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(1);
    div.remove();
  });

  it('should fire click on element with role=link', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const span = document.createElement('span');
    span.setAttribute('role', 'link');
    span.textContent = 'Role link';
    document.body.appendChild(span);
    const handler = vi.fn();
    span.addEventListener('click', handler);

    dispatchPointerMove(span, 50, 50);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(1);
    span.remove();
  });

  it('should fire click on input elements', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const input = document.createElement('input');
    document.body.appendChild(input);
    const handler = vi.fn();
    input.addEventListener('click', handler);

    dispatchPointerMove(input, 50, 50);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it('should NOT fire click on div with unknown role', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const div = document.createElement('div');
    div.setAttribute('role', 'presentation');
    div.textContent = 'Not interactive';
    document.body.appendChild(div);
    const handler = vi.fn();
    div.addEventListener('click', handler);

    dispatchPointerMove(div, 50, 50);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(0);
    div.remove();
  });

  it('should NOT fire click on non-interactive elements', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const div = makeDiv();
    const handler = vi.fn();
    div.addEventListener('click', handler);

    dispatchPointerMove(div, 50, 50);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(0);
    div.remove();
  });

  it('should reset timer when pointer moves beyond radius', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500, radius: 10 });
    const btn = makeButton();
    const handler = vi.fn();
    btn.addEventListener('click', handler);

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(400);
    // Move beyond radius
    dispatchPointerMove(btn, 200, 200);
    vi.advanceTimersByTime(200);

    expect(handler).toHaveBeenCalledTimes(0);
    btn.remove();
  });

  it('should NOT reset timer for micro-movements within radius', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500, radius: 10 });
    const btn = makeButton();
    const handler = vi.fn();
    btn.addEventListener('click', handler);

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(200);
    // Micro-movement within radius (5px)
    dispatchPointerMove(btn, 105, 100);
    vi.advanceTimersByTime(301);

    expect(handler).toHaveBeenCalledTimes(1);
    btn.remove();
  });

  it('should cancel dwell on pointerleave', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const btn = makeButton();
    const handler = vi.fn();
    btn.addEventListener('click', handler);

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(400);
    dispatchPointerLeave(btn);
    vi.advanceTimersByTime(200);

    expect(handler).toHaveBeenCalledTimes(0);
    btn.remove();
  });

  it('should track dwellCount in state', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const btn = makeButton();

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(501);

    expect(getDwellClickState()?.dwellCount).toBe(1);
    btn.remove();
  });

  it('should not fire dwell when disabled', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    clearDwellClick();
    const btn = makeButton();
    const handler = vi.fn();
    btn.addEventListener('click', handler);

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(0);
    btn.remove();
  });
});

// ---------------------------------------------------------------------------
// MC/DC — dwell trigger condition
// ---------------------------------------------------------------------------
// Trigger condition:
//   (active) AND (target is interactive) AND (stable for >= delay) AND (within radius)

describe('dwell-click / MC/DC — trigger condition', () => {
  afterEach(() => {
    clearDwellClick();
    localStorage.clear();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  // C1: all true → fires
  it('should fire when active AND interactive AND stable AND within radius', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500, radius: 10 });
    const btn = makeButton();
    const handler = vi.fn();
    btn.addEventListener('click', handler);

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(1);
    btn.remove();
  });

  // C2: not active → no fire
  it('should not fire when not active', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    clearDwellClick();
    const btn = makeButton();
    const handler = vi.fn();
    btn.addEventListener('click', handler);

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(0);
    btn.remove();
  });

  // C3: not interactive → no fire
  it('should not fire on non-interactive target', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const div = makeDiv();
    const handler = vi.fn();
    div.addEventListener('click', handler);

    dispatchPointerMove(div, 100, 100);
    vi.advanceTimersByTime(501);

    expect(handler).toHaveBeenCalledTimes(0);
    div.remove();
  });

  // C4: not stable (moved beyond radius) → no fire
  it('should not fire when moved beyond radius', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500, radius: 5 });
    const btn = makeButton();
    const handler = vi.fn();
    btn.addEventListener('click', handler);

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(400);
    dispatchPointerMove(btn, 120, 120); // 28px move > 5px radius
    vi.advanceTimersByTime(200);

    expect(handler).toHaveBeenCalledTimes(0);
    btn.remove();
  });
});

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------

describe('dwell-click / progress indicator', () => {
  afterEach(() => {
    clearDwellClick();
    localStorage.clear();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should add progress class during dwell', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 1000 });
    const btn = makeButton();

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(100);

    expect(btn.classList.contains(MORPHIC_DWELL_CLICK_PROGRESS_CLASS)).toBe(true);
    btn.remove();
  });

  it('should remove progress class after dwell fires', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 500 });
    const btn = makeButton();

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(501);

    expect(btn.classList.contains(MORPHIC_DWELL_CLICK_PROGRESS_CLASS)).toBe(false);
    btn.remove();
  });

  it('should remove progress class on pointerleave', () => {
    vi.useFakeTimers();
    setDwellClick({ delay: 1000 });
    const btn = makeButton();

    dispatchPointerMove(btn, 100, 100);
    vi.advanceTimersByTime(200);
    dispatchPointerLeave(btn);

    expect(btn.classList.contains(MORPHIC_DWELL_CLICK_PROGRESS_CLASS)).toBe(false);
    btn.remove();
  });
});

// ---------------------------------------------------------------------------
// clearDwellClick
// ---------------------------------------------------------------------------

describe('dwell-click / clearDwellClick', () => {
  afterEach(() => {
    clearDwellClick();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('should remove marker attribute', () => {
    setDwellClick({ delay: 1000 });
    clearDwellClick();
    expect(document.documentElement.hasAttribute(MORPHIC_DWELL_CLICK_MARKER)).toBe(false);
  });

  it('should be idempotent', () => {
    clearDwellClick();
    clearDwellClick();
    expect(getDwellClickState()).toBeNull();
  });

  it('should return null state after clear', () => {
    setDwellClick({ delay: 1000 });
    clearDwellClick();
    expect(getDwellClickState()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getDwellClick / getDwellClickState
// ---------------------------------------------------------------------------

describe('dwell-click / getDwellClick', () => {
  afterEach(() => {
    clearDwellClick();
    localStorage.clear();
  });

  it('should return null when not active', () => {
    expect(getDwellClick()).toBeNull();
  });

  it('should return current delay when active', () => {
    setDwellClick({ delay: 1500 });
    expect(getDwellClick()).toBe(1500);
  });
});

describe('dwell-click / getDwellClickState', () => {
  afterEach(() => {
    clearDwellClick();
    localStorage.clear();
  });

  it('should return null when not active', () => {
    expect(getDwellClickState()).toBeNull();
  });

  it('should return full state when active', () => {
    const state = setDwellClick({ delay: 2000 });
    expect(state.delay).toBe(2000);
    expect(state.active).toBe(true);
    expect(state.dwellCount).toBe(0);
    expect(state.radius).toBe(DWELL_CLICK_RADIUS_DEFAULT);
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe('dwell-click / persistence', () => {
  afterEach(() => {
    clearDwellClick();
    localStorage.clear();
  });

  it('should persist under MORPHIC_STORAGE_KEY sub-key dwellClick', () => {
    setDwellClick({ delay: 1000 });
    const parsed = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    expect(parsed.dwellClick).toBeDefined();
    expect(parsed.dwellClick.delay).toBe(1000);
  });

  it('should not clobber other sub-keys', () => {
    localStorage.setItem('morphic-prefs', JSON.stringify({ clickDelay: { delay: 200 } }));
    setDwellClick({ delay: 1000 });
    const parsed = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    expect(parsed.clickDelay.delay).toBe(200);
    expect(parsed.dwellClick.delay).toBe(1000);
  });

  it('should handle corrupt JSON gracefully', () => {
    localStorage.setItem('morphic-prefs', 'INVALID');
    expect(() => setDwellClick({ delay: 1000 })).not.toThrow();
  });

  it('should handle array JSON gracefully', () => {
    localStorage.setItem('morphic-prefs', '[1,2]');
    expect(() => setDwellClick({ delay: 1000 })).not.toThrow();
    const parsed = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    expect(parsed.dwellClick.delay).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// PBT — Anti-Circular Layer 1
// ---------------------------------------------------------------------------

describe('dwell-click / PBT', () => {
  afterEach(() => {
    clearDwellClick();
    localStorage.clear();
  });

  it('validateDwellDelay returns true for all integers in [500, 3000]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 500, max: 3000 }), (delay) => {
        expect(validateDwellDelay(delay)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('validateDwellDelay returns false for all integers outside [500, 3000]', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer({ min: -1000, max: 499 }), fc.integer({ min: 3001, max: 10000 })),
        (delay) => {
          expect(validateDwellDelay(delay)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('setDwellClick + getDwellClick round-trip preserves value', () => {
    fc.assert(
      fc.property(fc.integer({ min: 500, max: 3000 }), (delay) => {
        setDwellClick({ delay });
        expect(getDwellClick()).toBe(delay);
        clearDwellClick();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Defensive assertions
// ---------------------------------------------------------------------------

describe('dwell-click / defensive assertions', () => {
  afterEach(() => {
    clearDwellClick();
    localStorage.clear();
  });

  it('setDwellClick throws TypeError on non-number delay', () => {
    // @ts-expect-error — testing runtime guard
    expect(() => setDwellClick({ delay: '1000' })).toThrow(TypeError);
  });

  it('setDwellClick throws RangeError on out-of-range delay', () => {
    expect(() => setDwellClick({ delay: 100 })).toThrow(RangeError);
  });

  it('setDwellClick throws RangeError on non-integer delay', () => {
    expect(() => setDwellClick({ delay: 1500.5 })).toThrow(RangeError);
  });
});
