/**
 * Tests for daltonization.ts — Axe daltonization corrective runtime API.
 *
 * CDC ref : F-025 (Axe visuel : daltonization corrective — protan/deutan/tritan)
 * Brick   : B-101
 * Risk    : Critical 95% + mutation 75%
 *
 * Coverage targets :
 *   - Pure math (linearize, delinearize, daltonize, computeDaltonizationMatrix)
 *   - Public API (setColorVisionCorrection, getColorVisionCorrection, clearColorVisionCorrection)
 *   - SVG filter injection + DOM side effects
 *   - localStorage persistence
 *   - Defensive validation (closed enum + severity range)
 *
 * Anti-Circular Layer 1 (PBT via fast-check) :
 *   - sRGB linearize/delinearize round-trip = identity
 *   - severity=0 returns identity (no change to input)
 *   - type='none' returns input unchanged
 *   - output values clamped to [0, 1]
 *   - matrix dimensions always 9 values, all finite
 *
 * Sources :
 *   - Brettel et al. 1997, J. Opt. Soc. Am. A — half-plane projection matrices
 *   - Viénot et al. 1999, Wiley — single 3x3 matrices for protan/deutan
 *   - daltonlens.org — LMS-shift correction algorithm reference
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COLOR_VISION_TYPES,
  type ColorVisionCorrection,
  type ColorVisionType,
  __resetColorVisionTargetForTests,
  clearColorVisionCorrection,
  computeDaltonizationMatrix,
  daltonize,
  delinearizeSrgb,
  getColorVisionCorrection,
  getColorVisionTarget,
  linearizeSrgb,
  MORPHIC_DALTONIZE_DEFAULT_SEVERITY,
  MORPHIC_DALTONIZE_FILTER_ID,
  setColorVisionCorrection,
  setColorVisionTarget,
} from '../src/daltonization.js';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';

beforeEach(() => {
  clearColorVisionCorrection();
  __resetColorVisionTargetForTests();
  localStorage.clear();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

afterEach(() => {
  clearColorVisionCorrection();
  __resetColorVisionTargetForTests();
  localStorage.clear();
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('COLOR_VISION_TYPES', () => {
  it('exposes the closed enum of supported CVD types', () => {
    expect(COLOR_VISION_TYPES).toEqual(['none', 'protan', 'deutan', 'tritan']);
  });

  it('exposes a stable filter id for SVG injection', () => {
    expect(MORPHIC_DALTONIZE_FILTER_ID).toBe('morphic-daltonize');
  });

  it('exposes a default severity of 1 (full correction)', () => {
    expect(MORPHIC_DALTONIZE_DEFAULT_SEVERITY).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// linearizeSrgb / delinearizeSrgb — sRGB transfer function
// ---------------------------------------------------------------------------

describe('linearizeSrgb', () => {
  it('returns 0 for 0', () => {
    expect(linearizeSrgb(0)).toBe(0);
  });

  it('returns 1 for 1', () => {
    expect(linearizeSrgb(1)).toBeCloseTo(1, 6);
  });

  it('uses linear segment below 0.04045 threshold', () => {
    // c / 12.92 for c ≤ 0.04045
    expect(linearizeSrgb(0.04)).toBeCloseTo(0.04 / 12.92, 10);
  });

  it('uses power curve above 0.04045 threshold', () => {
    // ((c + 0.055) / 1.055) ** 2.4 for c > 0.04045
    const expected = ((0.5 + 0.055) / 1.055) ** 2.4;
    expect(linearizeSrgb(0.5)).toBeCloseTo(expected, 10);
  });
});

describe('delinearizeSrgb', () => {
  it('returns 0 for 0', () => {
    expect(delinearizeSrgb(0)).toBe(0);
  });

  it('returns 1 for 1', () => {
    expect(delinearizeSrgb(1)).toBeCloseTo(1, 6);
  });

  it('uses linear segment below 0.0031308 threshold', () => {
    expect(delinearizeSrgb(0.003)).toBeCloseTo(0.003 * 12.92, 10);
  });

  it('uses power curve above 0.0031308 threshold', () => {
    const expected = 1.055 * 0.5 ** (1 / 2.4) - 0.055;
    expect(delinearizeSrgb(0.5)).toBeCloseTo(expected, 10);
  });
});

describe('linearize/delinearize — PBT round-trip identity', () => {
  it('linearize ∘ delinearize ≈ identity over [0, 1]', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (c) => {
        const roundTrip = linearizeSrgb(delinearizeSrgb(c));
        expect(roundTrip).toBeCloseTo(c, 6);
      }),
      { numRuns: 200 },
    );
  });

  it('delinearize ∘ linearize ≈ identity over [0, 1]', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (c) => {
        const roundTrip = delinearizeSrgb(linearizeSrgb(c));
        expect(roundTrip).toBeCloseTo(c, 6);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// computeDaltonizationMatrix — pure math, deterministic
// ---------------------------------------------------------------------------

describe('computeDaltonizationMatrix', () => {
  const IDENTITY_3X3 = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;

  it("returns identity for type='none'", () => {
    expect(computeDaltonizationMatrix('none', 1)).toEqual([...IDENTITY_3X3]);
  });

  it.each([
    'protan',
    'deutan',
    'tritan',
  ] as const)('returns identity for type=%s when severity=0', (type) => {
    const m = computeDaltonizationMatrix(type, 0);
    for (let i = 0; i < 9; i++) {
      expect(m[i]).toBeCloseTo(IDENTITY_3X3[i], 10);
    }
  });

  it('returns a 9-element row-major matrix', () => {
    const m = computeDaltonizationMatrix('protan', 1);
    expect(m).toHaveLength(9);
  });

  it.each([
    'none',
    'protan',
    'deutan',
    'tritan',
  ] as const)('produces only finite values for type=%s', (type) => {
    for (const severity of [0, 0.25, 0.5, 0.75, 1]) {
      const m = computeDaltonizationMatrix(type, severity);
      for (const v of m) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('preserves identity row for red-blind axis (shift row 0 = 0)', () => {
    // The error shift matrix has row 0 = [0,0,0], so the red row of M_dalt
    // is always [1, 0, 0] (identity row preserved).
    for (const type of ['protan', 'deutan', 'tritan'] as const) {
      const m = computeDaltonizationMatrix(type, 1);
      expect(m[0]).toBeCloseTo(1, 10);
      expect(m[1]).toBeCloseTo(0, 10);
      expect(m[2]).toBeCloseTo(0, 10);
    }
  });

  it('is linear in severity (M(s) = I + s*(M(1) - I))', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('protan', 'deutan', 'tritan'),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (type, severity) => {
          const m1 = computeDaltonizationMatrix(type, 1);
          const ms = computeDaltonizationMatrix(type, severity);
          // Each entry ms[i] should equal I[i] + severity * (m1[i] - I[i])
          const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
          for (let i = 0; i < 9; i++) {
            const expected = identity[i] + severity * (m1[i] - identity[i]);
            expect(ms[i]).toBeCloseTo(expected, 6);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('throws on invalid type', () => {
    expect(() => computeDaltonizationMatrix('blue' as ColorVisionType, 1)).toThrow(TypeError);
  });

  it('throws on severity out of [0, 1]', () => {
    expect(() => computeDaltonizationMatrix('protan', -0.1)).toThrow(TypeError);
    expect(() => computeDaltonizationMatrix('protan', 1.1)).toThrow(TypeError);
  });

  it('throws on NaN/Infinity severity', () => {
    expect(() => computeDaltonizationMatrix('protan', Number.NaN)).toThrow(TypeError);
    expect(() => computeDaltonizationMatrix('protan', Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// daltonize — pure pixel transform
// ---------------------------------------------------------------------------

describe('daltonize', () => {
  it.each([
    [0, 0, 0],
    [1, 1, 1],
    [0.5, 0.5, 0.5],
  ])('grayscale input (%s, %s, %s) returns equal RGB output (no chroma to shift)', (r, g, b) => {
    for (const type of ['protan', 'deutan', 'tritan'] as const) {
      const [or, og, ob] = daltonize([r, g, b], type, 1);
      expect(or).toBeCloseTo(r, 4);
      expect(og).toBeCloseTo(g, 4);
      expect(ob).toBeCloseTo(b, 4);
    }
  });

  it.each([
    'none',
    'protan',
    'deutan',
    'tritan',
  ] as const)('returns input unchanged for type=%s when severity=0', (type) => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
        ),
        ([r, g, b]) => {
          const [or, og, ob] = daltonize([r, g, b], type, 0);
          expect(or).toBeCloseTo(r, 4);
          expect(og).toBeCloseTo(g, 4);
          expect(ob).toBeCloseTo(b, 4);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns input unchanged for type='none' regardless of severity", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
        ),
        fc.double({ min: 0, max: 1, noNaN: true }),
        ([r, g, b], severity) => {
          const [or, og, ob] = daltonize([r, g, b], 'none', severity);
          expect(or).toBeCloseTo(r, 4);
          expect(og).toBeCloseTo(g, 4);
          expect(ob).toBeCloseTo(b, 4);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('output is always clamped to [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
        ),
        fc.constantFrom('protan', 'deutan', 'tritan'),
        fc.double({ min: 0, max: 1, noNaN: true }),
        ([r, g, b], type, severity) => {
          const out = daltonize([r, g, b], type, severity);
          for (const v of out) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
            expect(Number.isFinite(v)).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('black input stays black for all types/severities', () => {
    for (const type of COLOR_VISION_TYPES) {
      for (const severity of [0, 0.5, 1]) {
        const [r, g, b] = daltonize([0, 0, 0], type, severity);
        expect(r).toBeCloseTo(0, 6);
        expect(g).toBeCloseTo(0, 6);
        expect(b).toBeCloseTo(0, 6);
      }
    }
  });

  it('white input stays white for all types/severities', () => {
    for (const type of COLOR_VISION_TYPES) {
      for (const severity of [0, 0.5, 1]) {
        const [r, g, b] = daltonize([1, 1, 1], type, severity);
        expect(r).toBeCloseTo(1, 4);
        expect(g).toBeCloseTo(1, 4);
        expect(b).toBeCloseTo(1, 4);
      }
    }
  });

  it("shifts pure red's lost information into blue/green channels for protan", () => {
    // A protanope can't distinguish pure red from dark colors.
    // Correction shifts the red signal into other channels.
    const [, g, b] = daltonize([1, 0, 0], 'protan', 1);
    // Either green or blue must have increased (correction visible).
    expect(g + b).toBeGreaterThan(0);
  });

  it('throws on invalid rgb tuple length', () => {
    expect(() => daltonize([1, 0] as unknown as [number, number, number], 'protan', 1)).toThrow(
      TypeError,
    );
  });

  it('throws on non-finite rgb values', () => {
    expect(() => daltonize([Number.NaN, 0, 0], 'protan', 1)).toThrow(TypeError);
    expect(() => daltonize([Number.POSITIVE_INFINITY, 0, 0], 'protan', 1)).toThrow(TypeError);
  });

  it('throws on rgb values out of [0, 1]', () => {
    expect(() => daltonize([-0.1, 0, 0], 'protan', 1)).toThrow(TypeError);
    expect(() => daltonize([1.5, 0, 0], 'protan', 1)).toThrow(TypeError);
  });

  it('throws on invalid type', () => {
    expect(() => daltonize([0.5, 0.5, 0.5], 'rainbow' as ColorVisionType, 1)).toThrow(TypeError);
  });

  it('throws on severity out of [0, 1]', () => {
    expect(() => daltonize([0.5, 0.5, 0.5], 'protan', -0.1)).toThrow(TypeError);
    expect(() => daltonize([0.5, 0.5, 0.5], 'protan', 1.5)).toThrow(TypeError);
  });

  it('throws on non-finite severity', () => {
    expect(() => daltonize([0.5, 0.5, 0.5], 'protan', Number.NaN)).toThrow(TypeError);
    expect(() => daltonize([0.5, 0.5, 0.5], 'protan', Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// setColorVisionCorrection — DOM + persistence
// ---------------------------------------------------------------------------

describe('setColorVisionCorrection — DOM injection', () => {
  it.each([
    'protan',
    'deutan',
    'tritan',
  ] as const)('injects SVG filter into DOM for type=%s', (type) => {
    setColorVisionCorrection(type);
    const svg = document.getElementById(MORPHIC_DALTONIZE_FILTER_ID);
    expect(svg).not.toBeNull();
    const fe = document.querySelector(`#${MORPHIC_DALTONIZE_FILTER_ID} feColorMatrix`);
    expect(fe).not.toBeNull();
  });

  it('applies the CSS filter to <html>', () => {
    setColorVisionCorrection('protan');
    // jsdom normalises `url(#x)` to `url("#x")` — accept either form.
    expect(document.documentElement.style.filter).toMatch(
      new RegExp(`^url\\("?#${MORPHIC_DALTONIZE_FILTER_ID}"?\\)$`),
    );
  });

  it("removes the filter when type='none'", () => {
    setColorVisionCorrection('protan');
    setColorVisionCorrection('none');
    expect(document.getElementById(MORPHIC_DALTONIZE_FILTER_ID)).toBeNull();
    expect(document.documentElement.style.filter).toBe('');
  });

  it('replaces an existing filter when switching CVD types', () => {
    setColorVisionCorrection('protan');
    const firstMatrix = document
      .querySelector(`#${MORPHIC_DALTONIZE_FILTER_ID} feColorMatrix`)
      ?.getAttribute('values');
    setColorVisionCorrection('tritan');
    const secondMatrix = document
      .querySelector(`#${MORPHIC_DALTONIZE_FILTER_ID} feColorMatrix`)
      ?.getAttribute('values');
    expect(firstMatrix).not.toBe(secondMatrix);
  });

  it('emits 20 values in feColorMatrix (4x5 spec)', () => {
    setColorVisionCorrection('protan');
    const matrix = document
      .querySelector(`#${MORPHIC_DALTONIZE_FILTER_ID} feColorMatrix`)
      ?.getAttribute('values');
    const values = matrix?.trim().split(/\s+/) ?? [];
    expect(values).toHaveLength(20);
  });

  it('uses color-interpolation-filters=linearRGB for correctness', () => {
    setColorVisionCorrection('protan');
    const filter = document.querySelector(`#${MORPHIC_DALTONIZE_FILTER_ID} filter`);
    expect(filter?.getAttribute('color-interpolation-filters')).toBe('linearRGB');
  });
});

describe('setColorVisionCorrection — persistence', () => {
  it('persists the choice to localStorage', () => {
    setColorVisionCorrection('deutan', 0.6);
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as {
      colorVision?: { type: string; severity: number };
    };
    expect(parsed.colorVision).toEqual({ type: 'deutan', severity: 0.6 });
  });

  it('uses default severity = 1 when omitted', () => {
    setColorVisionCorrection('protan');
    const stored = getColorVisionCorrection();
    expect(stored?.severity).toBe(1);
  });

  it('preserves other axes in storage', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark', motion: 'reduced' }));
    setColorVisionCorrection('protan');
    const raw = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) as string) as Record<
      string,
      unknown
    >;
    expect(raw.theme).toBe('dark');
    expect(raw.motion).toBe('reduced');
    expect(raw.colorVision).toBeDefined();
  });

  it("clears persisted entry when type='none'", () => {
    setColorVisionCorrection('protan');
    setColorVisionCorrection('none');
    const stored = getColorVisionCorrection();
    expect(stored).toBeNull();
  });

  it('does not throw when localStorage fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => setColorVisionCorrection('protan')).not.toThrow();
    // DOM update still happens
    expect(document.getElementById(MORPHIC_DALTONIZE_FILTER_ID)).not.toBeNull();
    spy.mockRestore();
  });
});

describe('setColorVisionCorrection — return value', () => {
  it('returns the applied correction object', () => {
    const result = setColorVisionCorrection('protan', 0.5);
    expect(result).toEqual<ColorVisionCorrection>({ type: 'protan', severity: 0.5 });
  });
});

describe('setColorVisionCorrection — defensive', () => {
  it('throws on invalid type', () => {
    expect(() => setColorVisionCorrection('rainbow' as ColorVisionType)).toThrow(TypeError);
  });

  it('throws on severity out of [0, 1]', () => {
    expect(() => setColorVisionCorrection('protan', -0.1)).toThrow(TypeError);
    expect(() => setColorVisionCorrection('protan', 1.5)).toThrow(TypeError);
  });

  it('throws on non-finite severity', () => {
    expect(() => setColorVisionCorrection('protan', Number.NaN)).toThrow(TypeError);
    expect(() => setColorVisionCorrection('protan', Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// getColorVisionCorrection — read back persisted choice
// ---------------------------------------------------------------------------

describe('getColorVisionCorrection', () => {
  it('returns null when no persisted choice', () => {
    expect(getColorVisionCorrection()).toBeNull();
  });

  it('returns the persisted choice', () => {
    setColorVisionCorrection('tritan', 0.8);
    expect(getColorVisionCorrection()).toEqual<ColorVisionCorrection>({
      type: 'tritan',
      severity: 0.8,
    });
  });

  it('returns null when persisted type is invalid', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ colorVision: { type: 'rainbow', severity: 1 } }),
    );
    expect(getColorVisionCorrection()).toBeNull();
  });

  it('returns null when persisted severity is invalid', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ colorVision: { type: 'protan', severity: 1.5 } }),
    );
    expect(getColorVisionCorrection()).toBeNull();
  });

  it('returns null when localStorage contains malformed JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not json');
    expect(getColorVisionCorrection()).toBeNull();
  });

  it('returns null when localStorage entry is an array', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(getColorVisionCorrection()).toBeNull();
  });

  it('returns null when colorVision entry is missing', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));
    expect(getColorVisionCorrection()).toBeNull();
  });

  it('returns null when localStorage read fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(getColorVisionCorrection()).toBeNull();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// clearColorVisionCorrection — full cleanup
// ---------------------------------------------------------------------------

describe('clearColorVisionCorrection', () => {
  it('removes the SVG filter from DOM', () => {
    setColorVisionCorrection('protan');
    clearColorVisionCorrection();
    expect(document.getElementById(MORPHIC_DALTONIZE_FILTER_ID)).toBeNull();
  });

  it('clears the filter style on <html>', () => {
    setColorVisionCorrection('protan');
    clearColorVisionCorrection();
    expect(document.documentElement.style.filter).toBe('');
  });

  it('clears the persisted entry from localStorage', () => {
    setColorVisionCorrection('protan');
    clearColorVisionCorrection();
    expect(getColorVisionCorrection()).toBeNull();
  });

  it('preserves other axes in storage', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));
    setColorVisionCorrection('protan');
    clearColorVisionCorrection();
    const raw = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) as string) as Record<
      string,
      unknown
    >;
    expect(raw.theme).toBe('dark');
    expect(raw.colorVision).toBeUndefined();
  });

  it('is idempotent (safe to call multiple times)', () => {
    expect(() => {
      clearColorVisionCorrection();
      clearColorVisionCorrection();
      clearColorVisionCorrection();
    }).not.toThrow();
  });

  it('does not throw when localStorage fails', () => {
    setColorVisionCorrection('protan');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => clearColorVisionCorrection()).not.toThrow();
    // DOM cleanup still happens
    expect(document.getElementById(MORPHIC_DALTONIZE_FILTER_ID)).toBeNull();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// setColorVisionTarget / getColorVisionTarget — B-021h chrome-safe scoping
// ---------------------------------------------------------------------------
//
// Default scope = <html> (backward-compatible with v2.0.0-beta.3 consumers).
// Opt-in scope via setColorVisionTarget(selector) keeps host chrome (navbar,
// brand colors) untouched while still correcting the main content area.
// ---------------------------------------------------------------------------

describe('setColorVisionTarget — input validation', () => {
  it('accepts a non-empty string selector', () => {
    expect(() => setColorVisionTarget('main')).not.toThrow();
    expect(setColorVisionTarget('#app')).toBe('#app');
  });

  it('accepts null (reset to default <html> scope)', () => {
    expect(() => setColorVisionTarget(null)).not.toThrow();
    expect(setColorVisionTarget(null)).toBeNull();
  });

  it('throws TypeError on empty string', () => {
    expect(() => setColorVisionTarget('')).toThrow(TypeError);
  });

  it('throws TypeError on whitespace-only string', () => {
    expect(() => setColorVisionTarget('   ')).toThrow(TypeError);
  });

  it('throws TypeError on number input', () => {
    expect(() => setColorVisionTarget(42 as unknown as string)).toThrow(TypeError);
  });

  it('throws TypeError on undefined input', () => {
    expect(() => setColorVisionTarget(undefined as unknown as string)).toThrow(TypeError);
  });

  it('throws TypeError on object input', () => {
    expect(() => setColorVisionTarget({} as unknown as string)).toThrow(TypeError);
  });
});

describe('setColorVisionTarget — DOM scoping behavior', () => {
  it('applies the filter to the matched element, not <html>, when correction follows', () => {
    const main = document.createElement('main');
    document.body.appendChild(main);
    setColorVisionTarget('main');
    setColorVisionCorrection('protan');

    // <html> stays untouched, the target carries the filter.
    expect(document.documentElement.style.filter).toBe('');
    expect(main.style.filter).toMatch(
      new RegExp(`^url\\("?#${MORPHIC_DALTONIZE_FILTER_ID}"?\\)$`),
    );
  });

  it('falls back silently to <html> when the selector matches nothing', () => {
    // No <main> in the DOM — Dignity §a : user's corrective need wins over
    // chrome-safety intent. Engine never denies the correction.
    setColorVisionTarget('main');
    setColorVisionCorrection('protan');

    expect(document.documentElement.style.filter).toMatch(
      new RegExp(`^url\\("?#${MORPHIC_DALTONIZE_FILTER_ID}"?\\)$`),
    );
  });

  it('keeps the SVG defs container on documentElement regardless of target', () => {
    const main = document.createElement('main');
    document.body.appendChild(main);
    setColorVisionTarget('main');
    setColorVisionCorrection('protan');

    // The <svg> container injecting <filter id="morphic-daltonize"> stays on
    // documentElement so url(#id) resolves regardless of where the filter
    // CSS reference is applied.
    const svg = document.getElementById(MORPHIC_DALTONIZE_FILTER_ID);
    expect(svg).not.toBeNull();
  });

  it('migrates an active correction from <html> to a new target atomically', () => {
    // 1) Start with default scope, correction active on <html>.
    setColorVisionCorrection('protan');
    expect(document.documentElement.style.filter).not.toBe('');

    // 2) Mount the target and scope to it — no flash, no double-filter.
    const main = document.createElement('main');
    document.body.appendChild(main);
    setColorVisionTarget('main');

    expect(document.documentElement.style.filter).toBe('');
    expect(main.style.filter).toMatch(
      new RegExp(`^url\\("?#${MORPHIC_DALTONIZE_FILTER_ID}"?\\)$`),
    );
  });

  it('migrates an active correction back to <html> when target is reset to null', () => {
    const main = document.createElement('main');
    document.body.appendChild(main);
    setColorVisionTarget('main');
    setColorVisionCorrection('protan');
    expect(main.style.filter).not.toBe('');

    setColorVisionTarget(null);

    expect(main.style.filter).toBe('');
    expect(document.documentElement.style.filter).toMatch(
      new RegExp(`^url\\("?#${MORPHIC_DALTONIZE_FILTER_ID}"?\\)$`),
    );
  });

  it('is a no-op on DOM when no correction is currently active', () => {
    const main = document.createElement('main');
    document.body.appendChild(main);
    // No prior setColorVisionCorrection — DOM stays clean.
    setColorVisionTarget('main');

    expect(document.documentElement.style.filter).toBe('');
    expect(main.style.filter).toBe('');
    expect(document.getElementById(MORPHIC_DALTONIZE_FILTER_ID)).toBeNull();
  });

  it("removes the filter from the scoped target on clear/'none'", () => {
    const main = document.createElement('main');
    document.body.appendChild(main);
    setColorVisionTarget('main');
    setColorVisionCorrection('protan');
    expect(main.style.filter).not.toBe('');

    setColorVisionCorrection('none');

    expect(main.style.filter).toBe('');
    expect(document.getElementById(MORPHIC_DALTONIZE_FILTER_ID)).toBeNull();
  });
});

describe('setColorVisionTarget — persistence', () => {
  it('persists the selector under the colorVisionTarget sub-key', () => {
    setColorVisionTarget('main');
    const raw = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) as string) as {
      colorVisionTarget?: string;
    };
    expect(raw.colorVisionTarget).toBe('main');
  });

  it('clears the persisted entry when target is reset to null', () => {
    setColorVisionTarget('main');
    setColorVisionTarget(null);
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    if (raw === null) return; // both axes empty — also acceptable
    const parsed = JSON.parse(raw) as { colorVisionTarget?: string };
    expect(parsed.colorVisionTarget).toBeUndefined();
  });

  it('preserves other axes in storage', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', colorVision: { type: 'protan', severity: 1 } }),
    );
    setColorVisionTarget('#app');
    const raw = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) as string) as Record<
      string,
      unknown
    >;
    expect(raw.theme).toBe('dark');
    expect(raw.colorVision).toBeDefined();
    expect(raw.colorVisionTarget).toBe('#app');
  });

  it('does not throw when localStorage fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => setColorVisionTarget('main')).not.toThrow();
    spy.mockRestore();
  });
});

describe('getColorVisionTarget', () => {
  it('returns null by default (no opt-in scope)', () => {
    expect(getColorVisionTarget()).toBeNull();
  });

  it('returns the selector set via setColorVisionTarget', () => {
    setColorVisionTarget('main');
    expect(getColorVisionTarget()).toBe('main');
  });

  it('reads from storage when in-memory state is null', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ colorVisionTarget: '#app' }),
    );
    // In-memory state is null (fresh module / reset for tests).
    expect(getColorVisionTarget()).toBe('#app');
  });

  it('returns null when storage holds a non-string value', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ colorVisionTarget: 42 }),
    );
    expect(getColorVisionTarget()).toBeNull();
  });
});
