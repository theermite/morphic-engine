/**
 * Tests for B-108 — Tremor Filter axis (F-032).
 * Risk: Critical 95% + mutation 75%.
 * Anti-Circular Layer 1: PBT on moving average invariants.
 */

import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearTremorFilter,
  type FilteredPosition,
  getDiagnostics,
  getTremorFilter,
  getTremorFilterState,
  MORPHIC_TREMOR_FILTER_MARKER,
  movingAverage,
  setTremorFilter,
  TREMOR_FILTER_WINDOW_DEFAULT,
  TREMOR_FILTER_WINDOW_MAX,
  TREMOR_FILTER_WINDOW_MIN,
  type TremorFilterOptions,
  type TremorFilterState,
  validateWindowSize,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dispatchPointerMove(x: number, y: number): void {
  const ev = new PointerEvent('pointermove', {
    bubbles: true,
    clientX: x,
    clientY: y,
  });
  document.dispatchEvent(ev);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('tremor-filter / constants', () => {
  it('should export TREMOR_FILTER_WINDOW_MIN as 1', () => {
    expect(TREMOR_FILTER_WINDOW_MIN).toBe(1);
  });

  it('should export TREMOR_FILTER_WINDOW_MAX as 20', () => {
    expect(TREMOR_FILTER_WINDOW_MAX).toBe(20);
  });

  it('should export TREMOR_FILTER_WINDOW_DEFAULT as 5', () => {
    expect(TREMOR_FILTER_WINDOW_DEFAULT).toBe(5);
  });

  it('should export MORPHIC_TREMOR_FILTER_MARKER', () => {
    expect(MORPHIC_TREMOR_FILTER_MARKER).toBe('data-morphic-tremor-filter');
  });
});

// ---------------------------------------------------------------------------
// validateWindowSize — pure
// ---------------------------------------------------------------------------

describe('tremor-filter / validateWindowSize', () => {
  it('should return true for 1', () => {
    expect(validateWindowSize(1)).toBe(true);
  });

  it('should return true for 20', () => {
    expect(validateWindowSize(20)).toBe(true);
  });

  it('should return true for 5', () => {
    expect(validateWindowSize(5)).toBe(true);
  });

  it('should return false for 0', () => {
    expect(validateWindowSize(0)).toBe(false);
  });

  it('should return false for 21', () => {
    expect(validateWindowSize(21)).toBe(false);
  });

  it('should return false for NaN', () => {
    expect(validateWindowSize(Number.NaN)).toBe(false);
  });

  it('should return false for non-integer', () => {
    expect(validateWindowSize(5.5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// movingAverage — pure algorithmic function
// ---------------------------------------------------------------------------

describe('tremor-filter / movingAverage (pure)', () => {
  it('should return the single value for window of 1 sample', () => {
    const result = movingAverage([{ x: 10, y: 20 }]);
    expect(result).toEqual({ x: 10, y: 20 });
  });

  it('should return the average of all samples', () => {
    const result = movingAverage([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ]);
    expect(result).toEqual({ x: 10, y: 10 });
  });

  it('should handle negative values', () => {
    const result = movingAverage([
      { x: -10, y: -20 },
      { x: 10, y: 20 },
    ]);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('should return exact value for identical samples', () => {
    const result = movingAverage([
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ]);
    expect(result).toEqual({ x: 5, y: 5 });
  });
});

// ---------------------------------------------------------------------------
// setTremorFilter — activation
// ---------------------------------------------------------------------------

describe('tremor-filter / setTremorFilter', () => {
  afterEach(() => {
    clearTremorFilter();
    localStorage.clear();
  });

  it('should return state with windowSize and active=true', () => {
    const state = setTremorFilter({ windowSize: 5 });
    expect(state.windowSize).toBe(5);
    expect(state.active).toBe(true);
  });

  it('should use default windowSize when not provided', () => {
    const state = setTremorFilter({});
    expect(state.windowSize).toBe(TREMOR_FILTER_WINDOW_DEFAULT);
  });

  it('should throw on windowSize < 1', () => {
    expect(() => setTremorFilter({ windowSize: 0 })).toThrow(RangeError);
  });

  it('should throw on windowSize > 20', () => {
    expect(() => setTremorFilter({ windowSize: 25 })).toThrow(RangeError);
  });

  it('should throw on non-number windowSize', () => {
    // @ts-expect-error — testing runtime guard
    expect(() => setTremorFilter({ windowSize: '5' })).toThrow(TypeError);
  });

  it('should throw on non-integer windowSize', () => {
    expect(() => setTremorFilter({ windowSize: 5.5 })).toThrow(RangeError);
  });

  it('should set marker attribute on documentElement', () => {
    setTremorFilter({ windowSize: 5 });
    expect(
      document.documentElement.hasAttribute(MORPHIC_TREMOR_FILTER_MARKER),
    ).toBe(true);
  });

  it('should tear down prior session (idempotent)', () => {
    setTremorFilter({ windowSize: 3 });
    setTremorFilter({ windowSize: 10 });
    expect(getTremorFilterState()?.windowSize).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Smoothing behavior — integration with pointermove
// ---------------------------------------------------------------------------

describe('tremor-filter / smoothing', () => {
  afterEach(() => {
    clearTremorFilter();
    localStorage.clear();
  });

  it('should emit morphic-pointermove with smoothed position', () => {
    setTremorFilter({ windowSize: 3 });
    const positions: FilteredPosition[] = [];
    document.addEventListener('morphic-pointermove', ((e: CustomEvent) => {
      positions.push(e.detail);
    }) as EventListener);

    dispatchPointerMove(0, 0);
    dispatchPointerMove(10, 10);
    dispatchPointerMove(20, 20);

    expect(positions.length).toBe(3);
    // After 3 samples with window=3, average should be (0+10+20)/3 = 10
    expect(positions[2].x).toBe(10);
    expect(positions[2].y).toBe(10);
  });

  it('should smooth jittery input into stable output', () => {
    setTremorFilter({ windowSize: 5 });
    const positions: FilteredPosition[] = [];
    document.addEventListener('morphic-pointermove', ((e: CustomEvent) => {
      positions.push(e.detail);
    }) as EventListener);

    // Simulate tremor: intent is to hold at (100, 100) but hand shakes
    const jitter = [
      [98, 102],
      [103, 97],
      [99, 101],
      [101, 99],
      [100, 100],
    ];
    for (const [x, y] of jitter) {
      dispatchPointerMove(x, y);
    }

    // The last smoothed position should be close to (100, 100)
    const last = positions[positions.length - 1];
    expect(Math.abs(last.x - 100.2)).toBeLessThan(0.01);
    expect(Math.abs(last.y - 99.8)).toBeLessThan(0.01);
  });

  it('should track sample count in diagnostics', () => {
    setTremorFilter({ windowSize: 3 });
    dispatchPointerMove(10, 10);
    dispatchPointerMove(20, 20);

    const diag = getDiagnostics();
    expect(diag?.sampleCount).toBe(2);
  });

  it('should not emit events when not active', () => {
    setTremorFilter({ windowSize: 3 });
    clearTremorFilter();

    const handler = vi.fn();
    document.addEventListener('morphic-pointermove', handler);
    dispatchPointerMove(10, 10);

    expect(handler).not.toHaveBeenCalled();
    document.removeEventListener('morphic-pointermove', handler);
  });

  it('should use window=1 as passthrough (no smoothing)', () => {
    setTremorFilter({ windowSize: 1 });
    const positions: FilteredPosition[] = [];
    document.addEventListener('morphic-pointermove', ((e: CustomEvent) => {
      positions.push(e.detail);
    }) as EventListener);

    dispatchPointerMove(42, 84);

    expect(positions[0].x).toBe(42);
    expect(positions[0].y).toBe(84);
  });
});

// ---------------------------------------------------------------------------
// MC/DC — filter application condition
// ---------------------------------------------------------------------------
// Condition: (active) AND (windowSize > 0) AND (samples.length > 0)
// windowSize > 0 is always true after validation — test by proxy via passthrough (window=1)

describe('tremor-filter / MC/DC — filter condition', () => {
  afterEach(() => {
    clearTremorFilter();
    localStorage.clear();
  });

  // C1: all true → smoothed output
  it('should smooth when active and samples exist', () => {
    setTremorFilter({ windowSize: 3 });
    const positions: FilteredPosition[] = [];
    document.addEventListener('morphic-pointermove', ((e: CustomEvent) => {
      positions.push(e.detail);
    }) as EventListener);

    dispatchPointerMove(0, 0);
    dispatchPointerMove(30, 30);

    // Window=3, 2 samples: avg = (0+30)/2 = 15
    expect(positions[1].x).toBe(15);
  });

  // C2: not active → no event
  it('should not emit when cleared', () => {
    setTremorFilter({ windowSize: 3 });
    clearTremorFilter();
    const handler = vi.fn();
    document.addEventListener('morphic-pointermove', handler);
    dispatchPointerMove(10, 10);
    expect(handler).not.toHaveBeenCalled();
    document.removeEventListener('morphic-pointermove', handler);
  });

  // C3: window=1 → passthrough (each sample = its own average)
  it('should passthrough with window=1', () => {
    setTremorFilter({ windowSize: 1 });
    const positions: FilteredPosition[] = [];
    document.addEventListener('morphic-pointermove', ((e: CustomEvent) => {
      positions.push(e.detail);
    }) as EventListener);

    dispatchPointerMove(77, 33);
    expect(positions[0].x).toBe(77);
    expect(positions[0].y).toBe(33);
  });
});

// ---------------------------------------------------------------------------
// Ring buffer — overflow behavior
// ---------------------------------------------------------------------------

describe('tremor-filter / ring buffer', () => {
  afterEach(() => {
    clearTremorFilter();
    localStorage.clear();
  });

  it('should keep only windowSize most recent samples', () => {
    setTremorFilter({ windowSize: 3 });
    const positions: FilteredPosition[] = [];
    document.addEventListener('morphic-pointermove', ((e: CustomEvent) => {
      positions.push(e.detail);
    }) as EventListener);

    // Push 5 samples, window=3 → only last 3 count
    dispatchPointerMove(0, 0);
    dispatchPointerMove(0, 0);
    dispatchPointerMove(10, 10);
    dispatchPointerMove(20, 20);
    dispatchPointerMove(30, 30);

    // Last 3 samples: (10,10), (20,20), (30,30) → avg = (20, 20)
    const last = positions[positions.length - 1];
    expect(last.x).toBe(20);
    expect(last.y).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// clearTremorFilter
// ---------------------------------------------------------------------------

describe('tremor-filter / clearTremorFilter', () => {
  afterEach(() => {
    clearTremorFilter();
    localStorage.clear();
  });

  it('should remove marker attribute', () => {
    setTremorFilter({ windowSize: 5 });
    clearTremorFilter();
    expect(
      document.documentElement.hasAttribute(MORPHIC_TREMOR_FILTER_MARKER),
    ).toBe(false);
  });

  it('should be idempotent', () => {
    clearTremorFilter();
    clearTremorFilter();
    expect(getTremorFilterState()).toBeNull();
  });

  it('should return null state after clear', () => {
    setTremorFilter({ windowSize: 5 });
    clearTremorFilter();
    expect(getTremorFilterState()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getTremorFilter / getTremorFilterState
// ---------------------------------------------------------------------------

describe('tremor-filter / getTremorFilter', () => {
  afterEach(() => {
    clearTremorFilter();
    localStorage.clear();
  });

  it('should return null when not active', () => {
    expect(getTremorFilter()).toBeNull();
  });

  it('should return windowSize when active', () => {
    setTremorFilter({ windowSize: 7 });
    expect(getTremorFilter()).toBe(7);
  });
});

describe('tremor-filter / getTremorFilterState', () => {
  afterEach(() => {
    clearTremorFilter();
    localStorage.clear();
  });

  it('should return null when not active', () => {
    expect(getTremorFilterState()).toBeNull();
  });

  it('should return full state when active', () => {
    const state = setTremorFilter({ windowSize: 10 });
    expect(state.windowSize).toBe(10);
    expect(state.active).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe('tremor-filter / persistence', () => {
  afterEach(() => {
    clearTremorFilter();
    localStorage.clear();
  });

  it('should persist under sub-key tremorFilter', () => {
    setTremorFilter({ windowSize: 8 });
    const parsed = JSON.parse(localStorage.getItem('morphic-prefs')!);
    expect(parsed.tremorFilter.windowSize).toBe(8);
  });

  it('should not clobber other sub-keys', () => {
    localStorage.setItem(
      'morphic-prefs',
      JSON.stringify({ clickDelay: { delay: 100 } }),
    );
    setTremorFilter({ windowSize: 5 });
    const parsed = JSON.parse(localStorage.getItem('morphic-prefs')!);
    expect(parsed.clickDelay.delay).toBe(100);
    expect(parsed.tremorFilter.windowSize).toBe(5);
  });

  it('should handle corrupt JSON gracefully', () => {
    localStorage.setItem('morphic-prefs', 'BROKEN');
    expect(() => setTremorFilter({ windowSize: 5 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// PBT — Anti-Circular Layer 1 (algorithmic)
// ---------------------------------------------------------------------------

describe('tremor-filter / PBT', () => {
  afterEach(() => {
    clearTremorFilter();
    localStorage.clear();
  });

  it('movingAverage of identical points returns that point', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.integer({ min: 1, max: 20 }),
        (x, y, n) => {
          const samples = Array.from({ length: n }, () => ({ x, y }));
          const result = movingAverage(samples);
          expect(Math.abs(result.x - x)).toBeLessThan(0.001);
          expect(Math.abs(result.y - y)).toBeLessThan(0.001);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('movingAverage output is within the bounding box of inputs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            x: fc.double({ min: -500, max: 500, noNaN: true }),
            y: fc.double({ min: -500, max: 500, noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (samples) => {
          const result = movingAverage(samples);
          const minX = Math.min(...samples.map((s) => s.x));
          const maxX = Math.max(...samples.map((s) => s.x));
          const minY = Math.min(...samples.map((s) => s.y));
          const maxY = Math.max(...samples.map((s) => s.y));
          expect(result.x).toBeGreaterThanOrEqual(minX - 0.001);
          expect(result.x).toBeLessThanOrEqual(maxX + 0.001);
          expect(result.y).toBeGreaterThanOrEqual(minY - 0.001);
          expect(result.y).toBeLessThanOrEqual(maxY + 0.001);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('validateWindowSize returns true for all integers in [1, 20]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (w) => {
        expect(validateWindowSize(w)).toBe(true);
      }),
      { numRuns: 20 },
    );
  });

  it('setTremorFilter + getTremorFilter round-trip', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (w) => {
        setTremorFilter({ windowSize: w });
        expect(getTremorFilter()).toBe(w);
        clearTremorFilter();
      }),
      { numRuns: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// Defensive assertions
// ---------------------------------------------------------------------------

describe('tremor-filter / defensive assertions', () => {
  afterEach(() => {
    clearTremorFilter();
    localStorage.clear();
  });

  it('setTremorFilter throws TypeError on non-number windowSize', () => {
    // @ts-expect-error — testing runtime guard
    expect(() => setTremorFilter({ windowSize: '5' })).toThrow(TypeError);
  });

  it('setTremorFilter throws RangeError on out-of-range windowSize', () => {
    expect(() => setTremorFilter({ windowSize: 50 })).toThrow(RangeError);
  });
});
