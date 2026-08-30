/**
 * Tests for B-033 — Human Design profile schema (F-037 ext.).
 * Risk: Sensitive 90%.
 * Scope: schema + validation ONLY — no interpreter (see src/human-design-profile.ts header).
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  HUMAN_DESIGN_PROFILES,
  isValidHumanDesignHints,
  validateHumanDesignHints,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('human-design-profile / constants', () => {
  it('should export exactly the 12 valid Human Design profiles', () => {
    expect(HUMAN_DESIGN_PROFILES).toEqual([
      '1/3',
      '1/4',
      '2/4',
      '2/5',
      '3/5',
      '3/6',
      '4/6',
      '4/1',
      '5/1',
      '5/2',
      '6/2',
      '6/3',
    ]);
  });

  it('should contain no duplicates', () => {
    expect(new Set(HUMAN_DESIGN_PROFILES).size).toBe(HUMAN_DESIGN_PROFILES.length);
  });
});

// ---------------------------------------------------------------------------
// validateHumanDesignHints — happy paths
// ---------------------------------------------------------------------------

describe('human-design-profile / validateHumanDesignHints — valid inputs', () => {
  it('should accept an empty object (opt-in — no profile supplied is valid)', () => {
    expect(validateHumanDesignHints({})).toEqual({});
  });

  it.each(HUMAN_DESIGN_PROFILES)('should accept the valid profile %s', (profile) => {
    expect(validateHumanDesignHints({ profile })).toEqual({ profile });
  });
});

// ---------------------------------------------------------------------------
// validateHumanDesignHints — defensive assertions
// ---------------------------------------------------------------------------

describe('human-design-profile / validateHumanDesignHints — defensive assertions', () => {
  it('should throw TypeError on null', () => {
    expect(() => validateHumanDesignHints(null)).toThrow(TypeError);
  });

  it('should throw TypeError on an array', () => {
    expect(() => validateHumanDesignHints([])).toThrow(TypeError);
  });

  it('should throw TypeError on a string', () => {
    expect(() => validateHumanDesignHints('1/3')).toThrow(TypeError);
  });

  it('should throw RangeError on a non-existent profile combination (e.g. same line twice)', () => {
    expect(() => validateHumanDesignHints({ profile: '1/1' })).toThrow(RangeError);
  });

  it('should throw RangeError on a line pair that is not one of the 12 valid profiles', () => {
    expect(() => validateHumanDesignHints({ profile: '2/6' })).toThrow(RangeError);
  });

  it('should throw RangeError on an unrecognised key (closed-shape guard)', () => {
    expect(() => validateHumanDesignHints({ type: 'Projector' })).toThrow(RangeError);
  });

  it('should reject a computed "__proto__" key instead of silently dropping it (found by independent review 2026-08-30)', () => {
    const polluted = { ...{ profile: '1/3' as const }, ['__proto__']: { evil: true } };
    expect(Object.keys(polluted)).toContain('__proto__');
    expect(() => validateHumanDesignHints(polluted)).toThrow(RangeError);
    expect(isValidHumanDesignHints(polluted)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidHumanDesignHints — never throws
// ---------------------------------------------------------------------------

describe('human-design-profile / isValidHumanDesignHints', () => {
  it('should return true for an empty object', () => {
    expect(isValidHumanDesignHints({})).toBe(true);
  });

  it('should return true for a valid profile', () => {
    expect(isValidHumanDesignHints({ profile: '4/1' })).toBe(true);
  });

  it('should return false for an invalid profile without throwing', () => {
    expect(isValidHumanDesignHints({ profile: '3/3' })).toBe(false);
  });

  it('should return false for null without throwing', () => {
    expect(isValidHumanDesignHints(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests (Anti-Circular Layer 1)
// ---------------------------------------------------------------------------

describe('human-design-profile / properties', () => {
  it('should round-trip every valid profile unchanged', () => {
    fc.assert(
      fc.property(fc.constantFrom(...HUMAN_DESIGN_PROFILES), (profile) => {
        expect(validateHumanDesignHints({ profile })).toEqual({ profile });
        expect(isValidHumanDesignHints({ profile })).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('should reject any two-digit-slash string that is not one of the 12 valid profiles', () => {
    const allPairs = fc
      .tuple(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 1, max: 6 }))
      .map(([a, b]) => `${a}/${b}`);

    fc.assert(
      fc.property(allPairs, (candidate) => {
        const isKnownValid = (HUMAN_DESIGN_PROFILES as readonly string[]).includes(candidate);
        if (isKnownValid) return; // skip actual valid profiles, covered by the round-trip test
        expect(() => validateHumanDesignHints({ profile: candidate })).toThrow(RangeError);
        expect(isValidHumanDesignHints({ profile: candidate })).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});
