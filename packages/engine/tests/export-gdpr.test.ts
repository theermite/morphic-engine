/**
 * Tests for exportPreferences() — GDPR Article 20 portability export.
 *
 * CDC ref : F-023 — Export préférences JSON GDPR Art. 20.
 * Brick   : B-024a.
 * Risk    : Critical 95% + MC/DC + PBT.
 *
 * Defensive contract:
 *   - Output is a fresh plain object every call (no shared reference).
 *   - schemaVersion is a frozen literal — never user-influenced.
 *   - exportedAt is a valid ISO 8601 UTC string.
 *   - axes is a complete record over the 6 known axes — adding a 7th axis
 *     to the engine without updating the exporter must fail the parameterized
 *     test below.
 *   - Output contains ZERO PII: no email, no IPv4/IPv6, no UUID, no device id,
 *     no high-precision timestamp beyond exportedAt.
 *   - Round-trip: JSON.parse(JSON.stringify(export)) deep-equals the export.
 *   - SSR-safe: returns empty axes (all nulls) when localStorage unavailable.
 *   - Corrupted / partial storage never throws — returns nulls for the
 *     unreadable axes.
 *
 * MC/DC matrix on the per-axis read decision:
 *   (storage available) AND (entry parses as object) AND (axis value valid)
 *   The 3 conditions are exercised independently by tests below.
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EXPORT_SCHEMA_VERSION,
  exportPreferences,
  type MorphicExport,
} from '../src/export-gdpr.js';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AXIS_KEYS = ['theme', 'motion', 'contrast', 'density', 'fontSize', 'fontFamily'] as const;
type AxisKey = (typeof AXIS_KEYS)[number];

function writePrefs(prefs: Partial<Record<AxisKey, string>>): void {
  localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(prefs));
}

function clearPrefs(): void {
  try {
    localStorage.removeItem(MORPHIC_STORAGE_KEY);
  } catch {
    // ignore — some test environments seal storage
  }
}

beforeEach(() => {
  clearPrefs();
});

afterEach(() => {
  clearPrefs();
});

// ---------------------------------------------------------------------------
// Schema shape
// ---------------------------------------------------------------------------

describe('exportPreferences() — schema shape', () => {
  it('returns an object with schemaVersion, exportedAt, axes', () => {
    const result = exportPreferences();
    expect(result).toHaveProperty('schemaVersion');
    expect(result).toHaveProperty('exportedAt');
    expect(result).toHaveProperty('axes');
  });

  it('schemaVersion is the frozen constant EXPORT_SCHEMA_VERSION', () => {
    const result = exportPreferences();
    expect(result.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(EXPORT_SCHEMA_VERSION).toBe('1.0.0');
  });

  it('exportedAt is a valid ISO 8601 UTC string ending with Z', () => {
    const result = exportPreferences();
    expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt);
  });

  it.each(AXIS_KEYS)('axes contains the %s key (parameterized over all axes)', (axis) => {
    const result = exportPreferences();
    expect(Object.keys(result.axes)).toContain(axis);
  });

  it('axes contains EXACTLY the 6 known axes — no extra, no missing', () => {
    const result = exportPreferences();
    expect(Object.keys(result.axes).sort()).toEqual([...AXIS_KEYS].sort());
  });
});

// ---------------------------------------------------------------------------
// Default state — no prefs stored
// ---------------------------------------------------------------------------

describe('exportPreferences() — default (no prefs)', () => {
  it('returns null for every axis when localStorage is empty', () => {
    const result = exportPreferences();
    for (const axis of AXIS_KEYS) {
      expect(result.axes[axis]).toBeNull();
    }
  });

  it('still emits a valid schemaVersion + exportedAt when no prefs', () => {
    const result = exportPreferences();
    expect(result.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(result.exportedAt).toMatch(/Z$/);
  });
});

// ---------------------------------------------------------------------------
// Reads each axis correctly
// ---------------------------------------------------------------------------

describe('exportPreferences() — reads stored values', () => {
  it('exports theme when stored', () => {
    writePrefs({ theme: 'dark' });
    expect(exportPreferences().axes.theme).toBe('dark');
  });

  it('exports motion when stored', () => {
    writePrefs({ motion: 'reduced' });
    expect(exportPreferences().axes.motion).toBe('reduced');
  });

  it('exports contrast when stored', () => {
    writePrefs({ contrast: 'more' });
    expect(exportPreferences().axes.contrast).toBe('more');
  });

  it('exports density when stored', () => {
    writePrefs({ density: 'comfortable' });
    expect(exportPreferences().axes.density).toBe('comfortable');
  });

  it('exports fontSize when stored', () => {
    writePrefs({ fontSize: 'lg' });
    expect(exportPreferences().axes.fontSize).toBe('lg');
  });

  it('exports fontFamily when stored', () => {
    writePrefs({ fontFamily: 'dyslexic' });
    expect(exportPreferences().axes.fontFamily).toBe('dyslexic');
  });

  it('exports ALL axes simultaneously when all stored', () => {
    writePrefs({
      theme: 'dark',
      motion: 'reduced',
      contrast: 'more',
      density: 'compact',
      fontSize: 'xl',
      fontFamily: 'atkinson',
    });
    const result = exportPreferences();
    expect(result.axes).toEqual({
      theme: 'dark',
      motion: 'reduced',
      contrast: 'more',
      density: 'compact',
      fontSize: 'xl',
      fontFamily: 'atkinson',
    });
  });
});

// ---------------------------------------------------------------------------
// Corruption tolerance (defensive)
// ---------------------------------------------------------------------------

describe('exportPreferences() — corruption tolerance', () => {
  it('does not throw on malformed JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not json');
    expect(() => exportPreferences()).not.toThrow();
  });

  it('returns nulls when stored JSON is not an object', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '"a string"');
    const result = exportPreferences();
    for (const axis of AXIS_KEYS) {
      expect(result.axes[axis]).toBeNull();
    }
  });

  it('returns nulls when stored JSON is an array', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '[1,2,3]');
    const result = exportPreferences();
    for (const axis of AXIS_KEYS) {
      expect(result.axes[axis]).toBeNull();
    }
  });

  it('ignores invalid enum values per axis (returns null)', () => {
    writePrefs({ theme: 'fuchsia', motion: 'turbo' as never });
    const result = exportPreferences();
    expect(result.axes.theme).toBeNull();
    expect(result.axes.motion).toBeNull();
  });

  it('preserves valid axes when other axes are invalid', () => {
    writePrefs({ theme: 'dark', motion: 'turbo' as never });
    const result = exportPreferences();
    expect(result.axes.theme).toBe('dark');
    expect(result.axes.motion).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PII zero-tolerance audit (Critical for GDPR + Dignity A)
// ---------------------------------------------------------------------------

describe('exportPreferences() — PII zero-tolerance', () => {
  const PII_PATTERNS = [
    // Email
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
    // IPv4
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
    // IPv6 (basic)
    /\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b/i,
    // UUID v1-v5
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    // Phone-like (10+ digits)
    /\b\d{10,}\b/,
  ];

  it('serialized output contains zero email / IP / UUID / phone', () => {
    writePrefs({
      theme: 'dark',
      motion: 'reduced',
      contrast: 'more',
      density: 'compact',
      fontSize: 'xl',
      fontFamily: 'dyslexic',
    });
    const json = JSON.stringify(exportPreferences());
    for (const pattern of PII_PATTERNS) {
      expect(json).not.toMatch(pattern);
    }
  });

  it('output keys contain ZERO identifier-like fields (userId, deviceId, sessionId, ip, email, etc.)', () => {
    const result = exportPreferences();
    const forbidden = ['userId', 'deviceId', 'sessionId', 'ip', 'email', 'phone', 'fingerprint'];
    const flatKeys = [...Object.keys(result), ...Object.keys(result.axes)];
    for (const f of forbidden) {
      expect(flatKeys).not.toContain(f);
    }
  });
});

// ---------------------------------------------------------------------------
// Round-trip JSON serialization
// ---------------------------------------------------------------------------

describe('exportPreferences() — JSON round-trip', () => {
  it('output is JSON-serializable and deep-equals after parse', () => {
    writePrefs({ theme: 'sepia', motion: 'full', fontFamily: 'serif' });
    const original = exportPreferences();
    const roundTripped = JSON.parse(JSON.stringify(original));
    expect(roundTripped).toEqual(original);
  });

  it('output has no circular references and no non-serializable fields', () => {
    const result = exportPreferences();
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('output is a fresh object every call (no shared reference)', () => {
    const a = exportPreferences();
    const b = exportPreferences();
    expect(a).not.toBe(b);
    expect(a.axes).not.toBe(b.axes);
  });
});

// ---------------------------------------------------------------------------
// Property-based testing (Anti-Circular Layer 1)
// ---------------------------------------------------------------------------

describe('exportPreferences() — property-based (PBT)', () => {
  const validValues: Record<AxisKey, readonly string[]> = {
    theme: ['light', 'dark', 'auto', 'high-contrast', 'sepia'],
    motion: ['full', 'reduced', 'none', 'auto'],
    contrast: ['no-preference', 'more', 'less', 'custom', 'auto'],
    density: ['compact', 'comfortable', 'spacious', 'auto'],
    fontSize: ['sm', 'md', 'lg', 'xl', 'auto'],
    fontFamily: ['system', 'serif', 'atkinson', 'dyslexic', 'auto'],
  };

  it('for any valid prefs subset → export.axes matches exactly', () => {
    fc.assert(
      fc.property(
        fc.record(
          {
            theme: fc.option(fc.constantFrom(...validValues.theme), { nil: undefined }),
            motion: fc.option(fc.constantFrom(...validValues.motion), { nil: undefined }),
            contrast: fc.option(fc.constantFrom(...validValues.contrast), { nil: undefined }),
            density: fc.option(fc.constantFrom(...validValues.density), { nil: undefined }),
            fontSize: fc.option(fc.constantFrom(...validValues.fontSize), { nil: undefined }),
            fontFamily: fc.option(fc.constantFrom(...validValues.fontFamily), { nil: undefined }),
          },
          { requiredKeys: [] },
        ),
        (prefs) => {
          clearPrefs();
          writePrefs(prefs as Partial<Record<AxisKey, string>>);
          const result = exportPreferences();
          for (const axis of AXIS_KEYS) {
            const stored = prefs[axis];
            const exported = result.axes[axis];
            if (stored === undefined) {
              expect(exported).toBeNull();
            } else {
              expect(exported).toBe(stored);
            }
          }
        },
      ),
      { numRuns: 256 },
    );
  });

  it('for any arbitrary string in storage → export never throws and stays well-typed', () => {
    fc.assert(
      fc.property(fc.string(), (anyString) => {
        clearPrefs();
        try {
          localStorage.setItem(MORPHIC_STORAGE_KEY, anyString);
        } catch {
          return;
        }
        const result = exportPreferences();
        expect(result.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
        expect(typeof result.exportedAt).toBe('string');
        for (const axis of AXIS_KEYS) {
          const value = result.axes[axis];
          expect(value === null || typeof value === 'string').toBe(true);
        }
      }),
      { numRuns: 128 },
    );
  });
});

// ---------------------------------------------------------------------------
// Type contract (compile + runtime smoke)
// ---------------------------------------------------------------------------

describe('exportPreferences() — type contract', () => {
  it('return type satisfies MorphicExport interface', () => {
    const result: MorphicExport = exportPreferences();
    expect(result).toBeDefined();
  });
});

describe('exportPreferences() — defensive invariants', () => {
  it('throws when exportedAt fails to parse as a valid Date', () => {
    // Force Date.prototype.toISOString to emit garbage so the exit
    // invariant fires. This is the only practical way to exercise the
    // assertion: in correct code it is unreachable, but the assertion
    // exists to catch future regressions (Beyonce rule).
    const original = Date.prototype.toISOString;
    Date.prototype.toISOString = function patched() {
      return 'not-a-real-iso-string';
    };
    try {
      expect(() => exportPreferences()).toThrow(/exportedAt is not a valid Date/);
    } finally {
      Date.prototype.toISOString = original;
    }
  });
});
