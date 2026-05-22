/**
 * Tests for contrast.ts — Axe contrast (contrast axis) runtime API.
 *
 * CDC ref : F-010 (Axe sensoriel : contrast)
 * Brick   : B-011
 * Risk    : Standard 80%
 *
 * Coverage : setContrast + getContrast + resolveAutoContrast + persistence + edge cases.
 *
 * Key difference from density/font-size: contrast HAS a prefers-contrast media query.
 * resolveAutoContrast() bridges to the OS preference (like theme/motion).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getContrast, resolveAutoContrast, setContrast } from '../src/contrast.js';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';
import { CONTRASTS } from '../src/tokens.js';

beforeEach(() => {
  document.documentElement.style.removeProperty('--morphic-contrast');
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  document.documentElement.style.removeProperty('--morphic-contrast');
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// setContrast — DOM updates
// ---------------------------------------------------------------------------

describe('setContrast — DOM updates', () => {
  it.each([
    'no-preference',
    'more',
    'less',
    'custom',
  ] as const)('sets --morphic-contrast CSS var to "%s"', (contrast) => {
    setContrast(contrast);
    expect(document.documentElement.style.getPropertyValue('--morphic-contrast')).toBe(contrast);
  });

  it('resolves "auto" via media query and sets CSS var', () => {
    const resolved = setContrast('auto');
    expect(['no-preference', 'more', 'less']).toContain(resolved);
    expect(document.documentElement.style.getPropertyValue('--morphic-contrast')).toBe(resolved);
  });

  it('returns the applied contrast (concrete value)', () => {
    expect(setContrast('more')).toBe('more');
    expect(setContrast('less')).toBe('less');
  });
});

// ---------------------------------------------------------------------------
// setContrast — persistence
// ---------------------------------------------------------------------------

describe('setContrast — persistence', () => {
  it('persists the user choice (not the resolved value) for "auto"', () => {
    setContrast('auto');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.contrast).toBe('auto');
  });

  it('persists the chosen contrast for concrete values', () => {
    setContrast('more');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.contrast).toBe('more');
  });

  it('preserves other axes already present in storage', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark', fontSize: 'lg' }));
    setContrast('less');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.contrast).toBe('less');
    expect(stored.theme).toBe('dark');
    expect(stored.fontSize).toBe('lg');
  });

  it('does not throw when localStorage is unavailable (private mode)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setContrast('more')).not.toThrow();
    expect(document.documentElement.style.getPropertyValue('--morphic-contrast')).toBe('more');
    setItemSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// setContrast — input validation
// ---------------------------------------------------------------------------

describe('setContrast — defensive', () => {
  it('rejects unknown contrast value (closed enum poka-yoke)', () => {
    expect(() => setContrast('ultra' as never)).toThrow();
  });

  it('rejects null / undefined', () => {
    expect(() => setContrast(null as never)).toThrow();
    expect(() => setContrast(undefined as never)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// getContrast — reads back the persisted choice
// ---------------------------------------------------------------------------

describe('getContrast', () => {
  it('returns null when no contrast has been persisted', () => {
    expect(getContrast()).toBeNull();
  });

  it.each(CONTRASTS)('returns the persisted contrast "%s"', (contrast) => {
    setContrast(contrast);
    expect(getContrast()).toBe(contrast);
  });

  it('returns "auto" when that was the stored choice', () => {
    setContrast('auto');
    expect(getContrast()).toBe('auto');
  });

  it('returns null when stored value is invalid', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ contrast: 'invalid' }));
    expect(getContrast()).toBeNull();
  });

  it('returns null when storage entry is malformed JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not-json');
    expect(getContrast()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveAutoContrast — bridges OS media query
// ---------------------------------------------------------------------------

describe('resolveAutoContrast', () => {
  it('returns "no-preference" when matchMedia is unavailable (SSR)', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(resolveAutoContrast()).toBe('no-preference');
    vi.unstubAllGlobals();
  });

  it('returns "more" when prefers-contrast: more matches', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-contrast: more)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    expect(resolveAutoContrast()).toBe('more');
    vi.unstubAllGlobals();
  });

  it('returns "less" when prefers-contrast: less matches', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-contrast: less)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    expect(resolveAutoContrast()).toBe('less');
    vi.unstubAllGlobals();
  });

  it('returns "no-preference" when no contrast preference matches', () => {
    vi.stubGlobal('matchMedia', (_query: string) => ({
      matches: false,
      media: _query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    expect(resolveAutoContrast()).toBe('no-preference');
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// Round-trip — set then get
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  it.each(CONTRASTS)('setContrast("%s") then getContrast() returns the same value', (contrast) => {
    setContrast(contrast);
    expect(getContrast()).toBe(contrast);
  });

  it('setContrast("auto") then getContrast() returns "auto"', () => {
    setContrast('auto');
    expect(getContrast()).toBe('auto');
  });
});
