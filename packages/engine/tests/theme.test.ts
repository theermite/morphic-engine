/**
 * Tests for theme.ts — Axe thème (theme axis) runtime API.
 *
 * CDC ref : F-006 (Axe sensoriel : thème light/dark/auto/high-contrast/sepia)
 * Brick   : B-007
 * Risk    : Standard 80%
 *
 * Coverage : setTheme + getTheme + resolveAutoTheme + persistence + auto resolution + edge cases.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';
import { getTheme, resolveAutoTheme, setTheme } from '../src/theme.js';
import { THEMES } from '../src/tokens.js';

beforeEach(() => {
  document.documentElement.removeAttribute('data-morphic-theme');
  document.documentElement.style.removeProperty('--morphic-theme');
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  document.documentElement.removeAttribute('data-morphic-theme');
  document.documentElement.style.removeProperty('--morphic-theme');
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// setTheme — DOM + persistence + return value
// ---------------------------------------------------------------------------

describe('setTheme — DOM updates', () => {
  it.each([
    'light',
    'dark',
    'high-contrast',
    'sepia',
  ] as const)('sets data-morphic-theme to "%s" for concrete themes', (theme) => {
    setTheme(theme);
    expect(document.documentElement.getAttribute('data-morphic-theme')).toBe(theme);
  });

  it.each([
    'light',
    'dark',
    'high-contrast',
    'sepia',
  ] as const)('sets --morphic-theme CSS var to "%s" for concrete themes', (theme) => {
    setTheme(theme);
    expect(document.documentElement.style.getPropertyValue('--morphic-theme')).toBe(theme);
  });

  it('resolves "auto" to "light" when prefers-color-scheme dark is NOT matched', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false } as MediaQueryList));
    const resolved = setTheme('auto');
    expect(resolved).toBe('light');
    expect(document.documentElement.getAttribute('data-morphic-theme')).toBe('light');
  });

  it('resolves "auto" to "dark" when prefers-color-scheme dark IS matched', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList));
    const resolved = setTheme('auto');
    expect(resolved).toBe('dark');
    expect(document.documentElement.getAttribute('data-morphic-theme')).toBe('dark');
  });

  it('returns the applied theme (concrete value)', () => {
    expect(setTheme('dark')).toBe('dark');
    expect(setTheme('high-contrast')).toBe('high-contrast');
  });
});

// ---------------------------------------------------------------------------
// setTheme — persistence
// ---------------------------------------------------------------------------

describe('setTheme — persistence', () => {
  it('persists the user choice (not the resolved value) for "auto"', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList));
    setTheme('auto');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    // User chose "auto" — that's what we persist, NOT the resolved "dark"
    expect(stored.theme).toBe('auto');
  });

  it('persists the chosen theme for concrete values', () => {
    setTheme('sepia');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.theme).toBe('sepia');
  });

  it('preserves other axes already present in storage', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ motion: 'reduced', density: 'compact' }),
    );
    setTheme('dark');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.theme).toBe('dark');
    expect(stored.motion).toBe('reduced');
    expect(stored.density).toBe('compact');
  });

  it('does not throw when localStorage is unavailable (private mode)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setTheme('dark')).not.toThrow();
    // DOM still updated even if storage failed
    expect(document.documentElement.getAttribute('data-morphic-theme')).toBe('dark');
    setItemSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// setTheme — input validation
// ---------------------------------------------------------------------------

describe('setTheme — defensive', () => {
  it('rejects unknown theme value (closed enum poka-yoke)', () => {
    expect(() => setTheme('cyberpunk' as never)).toThrow();
  });

  it('rejects null / undefined', () => {
    expect(() => setTheme(null as never)).toThrow();
    expect(() => setTheme(undefined as never)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// getTheme — reads back the persisted choice
// ---------------------------------------------------------------------------

describe('getTheme', () => {
  it('returns null when no theme has been persisted', () => {
    expect(getTheme()).toBeNull();
  });

  it.each(THEMES)('returns the persisted theme "%s"', (theme) => {
    setTheme(theme);
    expect(getTheme()).toBe(theme);
  });

  it('returns null when stored value is invalid', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'invalid' }));
    expect(getTheme()).toBeNull();
  });

  it('returns null when storage entry is malformed JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not-json');
    expect(getTheme()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveAutoTheme — matchMedia bridge
// ---------------------------------------------------------------------------

describe('resolveAutoTheme', () => {
  it('returns "dark" when prefers-color-scheme: dark matches', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList));
    expect(resolveAutoTheme()).toBe('dark');
  });

  it('returns "light" when prefers-color-scheme: dark does not match', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false } as MediaQueryList));
    expect(resolveAutoTheme()).toBe('light');
  });

  it('returns "light" when matchMedia is undefined (SSR / old browser)', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(resolveAutoTheme()).toBe('light');
  });

  it('queries the correct media feature', () => {
    const spy = vi.fn().mockReturnValue({ matches: false } as MediaQueryList);
    vi.stubGlobal('matchMedia', spy);
    resolveAutoTheme();
    expect(spy).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });
});

// ---------------------------------------------------------------------------
// Round-trip — set then get
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  it.each(THEMES)('setTheme("%s") then getTheme() returns the same value', (theme) => {
    setTheme(theme);
    expect(getTheme()).toBe(theme);
  });
});
