/**
 * Tests for B-031 — Profile Hints schema (F-037).
 * Risk: Sensitive 90%.
 * Anti-Circular Layer 1: PBT on the closed-shape / round-trip invariants.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { isValidProfileHints, SENSITIVITY_LEVELS, validateProfileHints } from '../src/index.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('profile-hints / constants', () => {
  it('should export SENSITIVITY_LEVELS as low/medium/high', () => {
    expect(SENSITIVITY_LEVELS).toEqual(['low', 'medium', 'high']);
  });
});

// ---------------------------------------------------------------------------
// validateProfileHints — happy paths
// ---------------------------------------------------------------------------

describe('profile-hints / validateProfileHints — valid inputs', () => {
  it('should accept an empty object (zero hints is valid — free will preserved)', () => {
    expect(validateProfileHints({})).toEqual({});
  });

  it('should accept a single valid field', () => {
    expect(validateProfileHints({ sensorySensitivity: 'high' })).toEqual({
      sensorySensitivity: 'high',
    });
  });

  it('should accept all three fields set to valid levels', () => {
    const input = {
      sensorySensitivity: 'high',
      attentionPattern: 'medium',
      emotionalLoad: 'low',
    };
    expect(validateProfileHints(input)).toEqual(input);
  });

  it.each(SENSITIVITY_LEVELS)('should accept level %s on attentionPattern', (level) => {
    expect(validateProfileHints({ attentionPattern: level })).toEqual({
      attentionPattern: level,
    });
  });
});

// ---------------------------------------------------------------------------
// validateProfileHints — defensive assertions
// ---------------------------------------------------------------------------

describe('profile-hints / validateProfileHints — defensive assertions', () => {
  it('should throw TypeError on null', () => {
    expect(() => validateProfileHints(null)).toThrow(TypeError);
  });

  it('should throw TypeError on an array', () => {
    expect(() => validateProfileHints([])).toThrow(TypeError);
  });

  it('should throw TypeError on a string', () => {
    expect(() => validateProfileHints('high')).toThrow(TypeError);
  });

  it('should throw TypeError on a number', () => {
    expect(() => validateProfileHints(42)).toThrow(TypeError);
  });

  it('should throw TypeError on undefined', () => {
    expect(() => validateProfileHints(undefined)).toThrow(TypeError);
  });

  it('should throw RangeError on an invalid level value', () => {
    expect(() => validateProfileHints({ sensorySensitivity: 'extreme' })).toThrow(RangeError);
  });

  it('should throw RangeError on an unrecognised key (closed-shape guard)', () => {
    expect(() => validateProfileHints({ birthDate: '1990-01-01' })).toThrow(RangeError);
  });

  it('should throw RangeError when a valid key is mixed with an unknown key', () => {
    expect(() => validateProfileHints({ sensorySensitivity: 'low', unknownTrait: 'high' })).toThrow(
      RangeError,
    );
  });

  it('should reject a computed "__proto__" key instead of silently dropping it (found by independent review 2026-08-30)', () => {
    // A computed/string key bypasses the object-literal __proto__ special
    // case and creates a REAL own property — Zod's .strict() alone drops it
    // silently instead of flagging it. Object.keys must see it.
    const polluted = { ...{ sensorySensitivity: 'low' as const }, ['__proto__']: { evil: true } };
    expect(Object.keys(polluted)).toContain('__proto__');
    expect(() => validateProfileHints(polluted)).toThrow(RangeError);
    expect(isValidProfileHints(polluted)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidProfileHints — never throws
// ---------------------------------------------------------------------------

describe('profile-hints / isValidProfileHints', () => {
  it('should return true for an empty object', () => {
    expect(isValidProfileHints({})).toBe(true);
  });

  it('should return true for a fully valid object', () => {
    expect(
      isValidProfileHints({
        sensorySensitivity: 'high',
        attentionPattern: 'low',
        emotionalLoad: 'medium',
      }),
    ).toBe(true);
  });

  it('should return false for an invalid level', () => {
    expect(isValidProfileHints({ emotionalLoad: 'extreme' })).toBe(false);
  });

  it('should return false for null without throwing', () => {
    expect(isValidProfileHints(null)).toBe(false);
  });

  it('should return false for an array without throwing', () => {
    expect(isValidProfileHints([])).toBe(false);
  });

  it('should return false for a primitive without throwing', () => {
    expect(isValidProfileHints('nope')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests (Anti-Circular Layer 1)
// ---------------------------------------------------------------------------

describe('profile-hints / properties', () => {
  const levelOrUndefined = fc.option(fc.constantFrom(...SENSITIVITY_LEVELS), {
    nil: undefined,
  });

  const validHintsArbitrary = fc
    .record({
      sensorySensitivity: levelOrUndefined,
      attentionPattern: levelOrUndefined,
      emotionalLoad: levelOrUndefined,
    })
    .map((record) => {
      // Drop keys explicitly set to undefined so the fixture matches what a
      // real caller would send (an omitted key, not a `key: undefined` entry).
      const entries = Object.entries(record).filter(([, v]) => v !== undefined);
      return Object.fromEntries(entries) as Record<string, string>;
    });

  it('should round-trip any combination of valid fields unchanged', () => {
    fc.assert(
      fc.property(validHintsArbitrary, (hints) => {
        expect(validateProfileHints(hints)).toEqual(hints);
        expect(isValidProfileHints(hints)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('should always reject an object carrying an unexpected key', () => {
    fc.assert(
      fc.property(
        validHintsArbitrary,
        fc
          .string({ minLength: 1 })
          .filter((k) => !['sensorySensitivity', 'attentionPattern', 'emotionalLoad'].includes(k)),
        fc.anything(),
        (hints, extraKey, extraValue) => {
          const polluted = { ...hints, [extraKey]: extraValue };
          expect(() => validateProfileHints(polluted)).toThrow(RangeError);
          expect(isValidProfileHints(polluted)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});
