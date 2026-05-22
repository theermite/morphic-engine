/**
 * Tests for density.ts — Axe density (density axis) runtime API.
 *
 * CDC ref : F-008 (Axe sensoriel : density compact/comfortable/spacious)
 * Brick   : B-009
 * Risk    : Standard 80%
 *
 * Coverage : setDensity + getDensity + resolveAutoDensity + persistence + edge cases.
 *
 * Key difference from theme/motion: NO prefers-* media query for density.
 * resolveAutoDensity() returns 'comfortable' (safe default).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDensity, resolveAutoDensity, setDensity } from '../src/density.js';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';
import { DENSITIES } from '../src/tokens.js';

beforeEach(() => {
  document.documentElement.style.removeProperty('--morphic-density');
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  document.documentElement.style.removeProperty('--morphic-density');
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// setDensity — DOM updates
// ---------------------------------------------------------------------------

describe('setDensity — DOM updates', () => {
  it.each([
    'compact',
    'comfortable',
    'spacious',
  ] as const)('sets --morphic-density CSS var to "%s"', (density) => {
    setDensity(density);
    expect(document.documentElement.style.getPropertyValue('--morphic-density')).toBe(density);
  });

  it('resolves "auto" to "comfortable" (no OS media query for density)', () => {
    const resolved = setDensity('auto');
    expect(resolved).toBe('comfortable');
    expect(document.documentElement.style.getPropertyValue('--morphic-density')).toBe(
      'comfortable',
    );
  });

  it('returns the applied density (concrete value)', () => {
    expect(setDensity('compact')).toBe('compact');
    expect(setDensity('spacious')).toBe('spacious');
  });
});

// ---------------------------------------------------------------------------
// setDensity — persistence
// ---------------------------------------------------------------------------

describe('setDensity — persistence', () => {
  it('persists the user choice (not the resolved value) for "auto"', () => {
    setDensity('auto');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.density).toBe('auto');
  });

  it('persists the chosen density for concrete values', () => {
    setDensity('compact');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.density).toBe('compact');
  });

  it('preserves other axes already present in storage', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark', motion: 'reduced' }));
    setDensity('spacious');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.density).toBe('spacious');
    expect(stored.theme).toBe('dark');
    expect(stored.motion).toBe('reduced');
  });

  it('does not throw when localStorage is unavailable (private mode)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setDensity('compact')).not.toThrow();
    expect(document.documentElement.style.getPropertyValue('--morphic-density')).toBe('compact');
    setItemSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// setDensity — input validation
// ---------------------------------------------------------------------------

describe('setDensity — defensive', () => {
  it('rejects unknown density value (closed enum poka-yoke)', () => {
    expect(() => setDensity('ultra-wide' as never)).toThrow();
  });

  it('rejects null / undefined', () => {
    expect(() => setDensity(null as never)).toThrow();
    expect(() => setDensity(undefined as never)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// getDensity — reads back the persisted choice
// ---------------------------------------------------------------------------

describe('getDensity', () => {
  it('returns null when no density has been persisted', () => {
    expect(getDensity()).toBeNull();
  });

  it.each(DENSITIES)('returns the persisted density "%s"', (density) => {
    setDensity(density);
    expect(getDensity()).toBe(density);
  });

  it('returns "auto" when that was the stored choice', () => {
    setDensity('auto');
    expect(getDensity()).toBe('auto');
  });

  it('returns null when stored value is invalid', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ density: 'invalid' }));
    expect(getDensity()).toBeNull();
  });

  it('returns null when storage entry is malformed JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not-json');
    expect(getDensity()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveAutoDensity — no media query, returns safe default
// ---------------------------------------------------------------------------

describe('resolveAutoDensity', () => {
  it('returns "comfortable" (no OS media query exists for density)', () => {
    expect(resolveAutoDensity()).toBe('comfortable');
  });
});

// ---------------------------------------------------------------------------
// Round-trip — set then get
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  it.each(DENSITIES)('setDensity("%s") then getDensity() returns the same value', (density) => {
    setDensity(density);
    expect(getDensity()).toBe(density);
  });

  it('setDensity("auto") then getDensity() returns "auto"', () => {
    setDensity('auto');
    expect(getDensity()).toBe('auto');
  });
});
