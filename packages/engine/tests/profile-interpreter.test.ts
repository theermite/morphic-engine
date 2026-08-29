/**
 * Tests for B-032 — Profile Hints interpreter (F-037).
 * Risk: Critical 95%.
 * Anti-Circular Layer 1: PBT on the purity / no-side-effect invariant.
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SENSITIVITY_LEVELS, suggestAxesFromProfileHints } from '../src/index.js';

// ---------------------------------------------------------------------------
// Empty / neutral input
// ---------------------------------------------------------------------------

describe('profile-interpreter / suggestAxesFromProfileHints — no hints', () => {
  it('should return an empty list for an empty profile', () => {
    expect(suggestAxesFromProfileHints({})).toEqual([]);
  });

  it('should return an empty list when every trait is low or medium', () => {
    expect(
      suggestAxesFromProfileHints({
        sensorySensitivity: 'low',
        attentionPattern: 'medium',
        emotionalLoad: 'low',
      }),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// sensorySensitivity: high
// ---------------------------------------------------------------------------

describe('profile-interpreter / sensorySensitivity high', () => {
  const suggestions = suggestAxesFromProfileHints({ sensorySensitivity: 'high' });

  it('should suggest motion=reduced', () => {
    const s = suggestions.find((x) => x.axis === 'motion');
    expect(s).toMatchObject({
      axis: 'motion',
      suggestedValue: 'reduced',
      sourceTrait: 'sensorySensitivity',
      sourceLevel: 'high',
    });
    expect(s?.reason.length).toBeGreaterThan(0);
  });

  it('should suggest density=spacious', () => {
    const s = suggestions.find((x) => x.axis === 'density');
    expect(s).toMatchObject({
      axis: 'density',
      suggestedValue: 'spacious',
      sourceTrait: 'sensorySensitivity',
      sourceLevel: 'high',
    });
    expect(s?.reason.length).toBeGreaterThan(0);
  });

  it('should return exactly 2 suggestions', () => {
    expect(suggestions).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// attentionPattern: high
// ---------------------------------------------------------------------------

describe('profile-interpreter / attentionPattern high', () => {
  it('should suggest pomodoroEngine=enabled', () => {
    const suggestions = suggestAxesFromProfileHints({ attentionPattern: 'high' });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      axis: 'pomodoroEngine',
      suggestedValue: 'enabled',
      sourceTrait: 'attentionPattern',
      sourceLevel: 'high',
    });
    expect(suggestions[0]?.reason.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// emotionalLoad: high
// ---------------------------------------------------------------------------

describe('profile-interpreter / emotionalLoad high', () => {
  it('should suggest recoveryMode=recommended', () => {
    const suggestions = suggestAxesFromProfileHints({ emotionalLoad: 'high' });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      axis: 'recoveryMode',
      suggestedValue: 'recommended',
      sourceTrait: 'emotionalLoad',
      sourceLevel: 'high',
    });
    expect(suggestions[0]?.reason.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Combined profile
// ---------------------------------------------------------------------------

describe('profile-interpreter / combined profile', () => {
  it('should return one suggestion group per high trait, in trait declaration order', () => {
    const suggestions = suggestAxesFromProfileHints({
      sensorySensitivity: 'high',
      attentionPattern: 'high',
      emotionalLoad: 'high',
    });
    expect(suggestions.map((s) => s.axis)).toEqual([
      'motion',
      'density',
      'pomodoroEngine',
      'recoveryMode',
    ]);
  });

  it('should never show a single dominant trait alone when multiple are high (weighting, not a box)', () => {
    const suggestions = suggestAxesFromProfileHints({
      sensorySensitivity: 'high',
      emotionalLoad: 'high',
    });
    const traits = new Set(suggestions.map((s) => s.sourceTrait));
    expect(traits.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Defensive assertions — reuses validateProfileHints, same error contract
// ---------------------------------------------------------------------------

describe('profile-interpreter / defensive assertions', () => {
  it('should throw TypeError on a non-object input', () => {
    // @ts-expect-error deliberate invalid input for the defensive test
    expect(() => suggestAxesFromProfileHints('nope')).toThrow(TypeError);
  });

  it('should throw RangeError on an invalid hints object', () => {
    // @ts-expect-error deliberate invalid input for the defensive test
    expect(() => suggestAxesFromProfileHints({ sensorySensitivity: 'extreme' })).toThrow(
      RangeError,
    );
  });
});

// ---------------------------------------------------------------------------
// Purity — never applies a suggestion, never touches storage or DOM
// ---------------------------------------------------------------------------

describe('profile-interpreter / purity (free-will guarantee)', () => {
  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should never write to localStorage while computing suggestions', () => {
    suggestAxesFromProfileHints({
      sensorySensitivity: 'high',
      attentionPattern: 'high',
      emotionalLoad: 'high',
    });
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Property-based tests (Anti-Circular Layer 1)
// ---------------------------------------------------------------------------

describe('profile-interpreter / properties', () => {
  const levelOrUndefined = fc.option(fc.constantFrom(...SENSITIVITY_LEVELS), {
    nil: undefined,
  });

  const hintsArbitrary = fc
    .record({
      sensorySensitivity: levelOrUndefined,
      attentionPattern: levelOrUndefined,
      emotionalLoad: levelOrUndefined,
    })
    .map((record) => {
      const entries = Object.entries(record).filter(([, v]) => v !== undefined);
      return Object.fromEntries(entries) as Record<string, string>;
    });

  it('should only ever produce suggestions traceable to a trait set to high', () => {
    fc.assert(
      fc.property(hintsArbitrary, (hints) => {
        const suggestions = suggestAxesFromProfileHints(hints);
        for (const s of suggestions) {
          expect(hints[s.sourceTrait]).toBe('high');
          expect(s.sourceLevel).toBe('high');
        }
      }),
      { numRuns: 200 },
    );
  });

  it('should be a pure function — same input always yields deep-equal output', () => {
    fc.assert(
      fc.property(hintsArbitrary, (hints) => {
        expect(suggestAxesFromProfileHints(hints)).toEqual(suggestAxesFromProfileHints(hints));
      }),
      { numRuns: 200 },
    );
  });
});
