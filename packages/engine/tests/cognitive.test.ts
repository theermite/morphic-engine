/**
 * Tests for cognitive.ts — Decision points cap runtime API.
 *
 * CDC ref : F-010 (Axe cognitif : decision points cap ≤3/écran morphique)
 * Brick   : B-012
 * Risk    : Critical 95% (Cognitive Load BLOCKING per Dignity §a)
 *
 * Coverage : MORPHIC_DECISION_POINTS_CAP_DEFAULT + setDecisionPointsCap +
 *            getDecisionPointsCap + validateDecisionPoints + persistence + edge cases.
 *
 * Anti-Circular Layer 1 : PBT via fast-check on validateDecisionPoints.
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetCognitiveStateForTests,
  getDecisionPointsCap,
  MORPHIC_DECISION_POINTS_CAP_DEFAULT,
  MORPHIC_DECISION_POINTS_CAP_MAX,
  setDecisionPointsCap,
  validateDecisionPoints,
} from '../src/cognitive.js';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';

beforeEach(() => {
  __resetCognitiveStateForTests();
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  __resetCognitiveStateForTests();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Constants — Dignity §a default
// ---------------------------------------------------------------------------

describe('MORPHIC_DECISION_POINTS_CAP_DEFAULT', () => {
  it('is 3 — the Cognitive Load BLOCKING ceiling per Dignity §a', () => {
    expect(MORPHIC_DECISION_POINTS_CAP_DEFAULT).toBe(3);
  });

  it('exposes a sane upper bound (DoS guard)', () => {
    expect(MORPHIC_DECISION_POINTS_CAP_MAX).toBeGreaterThan(MORPHIC_DECISION_POINTS_CAP_DEFAULT);
    expect(MORPHIC_DECISION_POINTS_CAP_MAX).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// validateDecisionPoints — pure predicate
// ---------------------------------------------------------------------------

describe('validateDecisionPoints — happy path', () => {
  it.each([0, 1, 2, 3])('returns true for count %s ≤ default cap (3)', (count) => {
    expect(validateDecisionPoints(count)).toBe(true);
  });

  it.each([4, 5, 10])('returns false for count %s > default cap (3)', (count) => {
    expect(validateDecisionPoints(count)).toBe(false);
  });

  it('uses the user-set cap when provided', () => {
    setDecisionPointsCap(5);
    expect(validateDecisionPoints(5)).toBe(true);
    expect(validateDecisionPoints(6)).toBe(false);
  });
});

describe('validateDecisionPoints — defensive', () => {
  it('throws on negative count', () => {
    expect(() => validateDecisionPoints(-1)).toThrow(TypeError);
  });

  it('throws on NaN', () => {
    expect(() => validateDecisionPoints(Number.NaN)).toThrow(TypeError);
  });

  it('throws on Infinity', () => {
    expect(() => validateDecisionPoints(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it('throws on non-integer', () => {
    expect(() => validateDecisionPoints(2.5)).toThrow(TypeError);
  });

  it('throws on non-number', () => {
    expect(() => validateDecisionPoints('3' as never)).toThrow(TypeError);
    expect(() => validateDecisionPoints(null as never)).toThrow(TypeError);
    expect(() => validateDecisionPoints(undefined as never)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests (Anti-Circular Layer 1)
// ---------------------------------------------------------------------------

describe('validateDecisionPoints — PBT properties', () => {
  it('property: count ≤ cap ⟺ validateDecisionPoints returns true', () => {
    fc.assert(
      fc.property(fc.nat({ max: 20 }), (count) => {
        const cap = getDecisionPointsCap();
        expect(validateDecisionPoints(count)).toBe(count <= cap);
      }),
      { numRuns: 200 },
    );
  });

  it('property: cap is the boundary — cap accepts, cap+1 rejects', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (cap) => {
        setDecisionPointsCap(cap);
        expect(validateDecisionPoints(cap)).toBe(true);
        expect(validateDecisionPoints(cap + 1)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it('property: invalid numeric inputs always throw', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -100, max: -1 }),
          fc.double({ min: 0.1, max: 99.9, noNaN: true, noDefaultInfinity: true }),
          fc.constant(Number.NaN),
          fc.constant(Number.POSITIVE_INFINITY),
          fc.constant(Number.NEGATIVE_INFINITY),
        ),
        (badInput) => {
          expect(() => validateDecisionPoints(badInput)).toThrow(TypeError);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// setDecisionPointsCap — mutation + persistence
// ---------------------------------------------------------------------------

describe('setDecisionPointsCap', () => {
  it('updates the active cap', () => {
    setDecisionPointsCap(5);
    expect(getDecisionPointsCap()).toBe(5);
  });

  it('persists the cap to localStorage', () => {
    setDecisionPointsCap(2);
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.decisionPointsCap).toBe(2);
  });

  it('preserves other axes in storage', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark', fontSize: 'lg' }));
    setDecisionPointsCap(4);
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.decisionPointsCap).toBe(4);
    expect(stored.theme).toBe('dark');
    expect(stored.fontSize).toBe('lg');
  });

  it('does not throw when localStorage is unavailable', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setDecisionPointsCap(2)).not.toThrow();
    expect(getDecisionPointsCap()).toBe(2);
    setItemSpy.mockRestore();
  });

  it('rejects cap of 0 (no decision points at all = unusable)', () => {
    expect(() => setDecisionPointsCap(0)).toThrow(TypeError);
  });

  it('rejects negative cap', () => {
    expect(() => setDecisionPointsCap(-1)).toThrow(TypeError);
  });

  it('rejects cap > MORPHIC_DECISION_POINTS_CAP_MAX (DoS guard)', () => {
    expect(() => setDecisionPointsCap(MORPHIC_DECISION_POINTS_CAP_MAX + 1)).toThrow(TypeError);
  });

  it('rejects non-integer cap', () => {
    expect(() => setDecisionPointsCap(2.5)).toThrow(TypeError);
  });

  it('rejects non-number cap', () => {
    expect(() => setDecisionPointsCap('3' as never)).toThrow(TypeError);
    expect(() => setDecisionPointsCap(null as never)).toThrow(TypeError);
    expect(() => setDecisionPointsCap(undefined as never)).toThrow(TypeError);
    expect(() => setDecisionPointsCap(Number.NaN)).toThrow(TypeError);
  });

  it('overwrites cleanly when existing storage is malformed JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not-json');
    expect(() => setDecisionPointsCap(2)).not.toThrow();
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.decisionPointsCap).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getDecisionPointsCap — defaults + persistence read
// ---------------------------------------------------------------------------

describe('getDecisionPointsCap', () => {
  it('returns the default when no cap has been persisted', () => {
    expect(getDecisionPointsCap()).toBe(MORPHIC_DECISION_POINTS_CAP_DEFAULT);
  });

  it('returns the persisted cap', () => {
    setDecisionPointsCap(5);
    expect(getDecisionPointsCap()).toBe(5);
  });

  it('returns the default when stored value is invalid', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ decisionPointsCap: 'abc' }));
    expect(getDecisionPointsCap()).toBe(MORPHIC_DECISION_POINTS_CAP_DEFAULT);
  });

  it('returns the default when stored value is out of range', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ decisionPointsCap: -5 }));
    expect(getDecisionPointsCap()).toBe(MORPHIC_DECISION_POINTS_CAP_DEFAULT);

    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ decisionPointsCap: MORPHIC_DECISION_POINTS_CAP_MAX + 100 }),
    );
    expect(getDecisionPointsCap()).toBe(MORPHIC_DECISION_POINTS_CAP_DEFAULT);
  });

  it('returns the default when storage is malformed JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not-json');
    expect(getDecisionPointsCap()).toBe(MORPHIC_DECISION_POINTS_CAP_DEFAULT);
  });

  it('returns the default when stored value is an array (not a plain object)', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(getDecisionPointsCap()).toBe(MORPHIC_DECISION_POINTS_CAP_DEFAULT);
  });

  it('returns the default when localStorage is unavailable', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(getDecisionPointsCap()).toBe(MORPHIC_DECISION_POINTS_CAP_DEFAULT);
    getItemSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  it.each([1, 2, 3, 4, 5])('setDecisionPointsCap(%s) then getDecisionPointsCap()', (cap) => {
    setDecisionPointsCap(cap);
    expect(getDecisionPointsCap()).toBe(cap);
  });
});
