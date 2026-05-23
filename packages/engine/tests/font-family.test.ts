/**
 * Tests for font-family.ts — Axe font-family (typography axis) runtime API.
 *
 * CDC ref : F-112 (Axe sensoriel : font family — system / serif / atkinson / dyslexic).
 * Brick   : B-112.
 * Risk    : Standard (80% coverage target).
 *
 * Scope:
 *   - setFontFamily updates the CSS var + data attribute, persists user choice.
 *   - getFontFamily reads back the persisted choice (auto preserved).
 *   - resolveAutoFontFamily returns 'system' (no OS media query for font-family).
 *   - Defensive: closed enum, null/undefined rejected, localStorage failure
 *     does not throw, other axes preserved on write.
 *
 * Pattern mirrors typography.test.ts (B-010) — same axis structure.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFontFamily, resolveAutoFontFamily, setFontFamily } from '../src/font-family.js';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';
import { FONT_FAMILIES } from '../src/tokens.js';

beforeEach(() => {
  document.documentElement.style.removeProperty('--morphic-font-family');
  document.documentElement.removeAttribute('data-morphic-font-family');
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  document.documentElement.style.removeProperty('--morphic-font-family');
  document.documentElement.removeAttribute('data-morphic-font-family');
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// setFontFamily — DOM updates
// ---------------------------------------------------------------------------

describe('setFontFamily — DOM updates', () => {
  it.each([
    'system',
    'serif',
    'atkinson',
    'dyslexic',
  ] as const)('sets --morphic-font-family CSS var to "%s"', (family) => {
    setFontFamily(family);
    expect(document.documentElement.style.getPropertyValue('--morphic-font-family')).toBe(family);
  });

  it.each([
    'system',
    'serif',
    'atkinson',
    'dyslexic',
  ] as const)('sets data-morphic-font-family attribute to "%s"', (family) => {
    setFontFamily(family);
    expect(document.documentElement.getAttribute('data-morphic-font-family')).toBe(family);
  });

  it('resolves "auto" to "system" (no OS media query for font-family)', () => {
    const resolved = setFontFamily('auto');
    expect(resolved).toBe('system');
    expect(document.documentElement.style.getPropertyValue('--morphic-font-family')).toBe('system');
    expect(document.documentElement.getAttribute('data-morphic-font-family')).toBe('system');
  });

  it('returns the applied font family (concrete value)', () => {
    expect(setFontFamily('serif')).toBe('serif');
    expect(setFontFamily('atkinson')).toBe('atkinson');
    expect(setFontFamily('dyslexic')).toBe('dyslexic');
  });
});

// ---------------------------------------------------------------------------
// setFontFamily — persistence
// ---------------------------------------------------------------------------

describe('setFontFamily — persistence', () => {
  it('persists the user choice (not the resolved value) for "auto"', () => {
    setFontFamily('auto');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.fontFamily).toBe('auto');
  });

  it('persists the chosen font family for concrete values', () => {
    setFontFamily('dyslexic');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.fontFamily).toBe('dyslexic');
  });

  it('preserves other axes already present in storage', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', density: 'compact', fontSize: 'lg' }),
    );
    setFontFamily('atkinson');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.fontFamily).toBe('atkinson');
    expect(stored.theme).toBe('dark');
    expect(stored.density).toBe('compact');
    expect(stored.fontSize).toBe('lg');
  });

  it('does not throw when localStorage is unavailable (private mode)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setFontFamily('dyslexic')).not.toThrow();
    expect(document.documentElement.style.getPropertyValue('--morphic-font-family')).toBe(
      'dyslexic',
    );
    expect(document.documentElement.getAttribute('data-morphic-font-family')).toBe('dyslexic');
    setItemSpy.mockRestore();
  });

  it('recovers gracefully from corrupted existing storage', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not-json');
    expect(() => setFontFamily('serif')).not.toThrow();
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.fontFamily).toBe('serif');
  });
});

// ---------------------------------------------------------------------------
// setFontFamily — input validation (poka-yoke)
// ---------------------------------------------------------------------------

describe('setFontFamily — defensive', () => {
  it('rejects unknown font family value (closed enum poka-yoke)', () => {
    expect(() => setFontFamily('comic-sans' as never)).toThrow(TypeError);
  });

  it('rejects null and undefined', () => {
    expect(() => setFontFamily(null as never)).toThrow(TypeError);
    expect(() => setFontFamily(undefined as never)).toThrow(TypeError);
  });

  it('rejects empty string', () => {
    expect(() => setFontFamily('' as never)).toThrow(TypeError);
  });

  it('rejects non-string input (number, object)', () => {
    expect(() => setFontFamily(42 as never)).toThrow(TypeError);
    expect(() => setFontFamily({} as never)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// getFontFamily — reads back the persisted choice
// ---------------------------------------------------------------------------

describe('getFontFamily', () => {
  it('returns null when no font family has been persisted', () => {
    expect(getFontFamily()).toBeNull();
  });

  it.each(FONT_FAMILIES)('returns the persisted font family "%s"', (family) => {
    setFontFamily(family);
    expect(getFontFamily()).toBe(family);
  });

  it('returns "auto" when that was the stored choice', () => {
    setFontFamily('auto');
    expect(getFontFamily()).toBe('auto');
  });

  it('returns null when stored value is invalid', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ fontFamily: 'papyrus' }));
    expect(getFontFamily()).toBeNull();
  });

  it('returns null when storage entry is malformed JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not-json');
    expect(getFontFamily()).toBeNull();
  });

  it('returns null when stored value is an array (not a plain object)', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(['dyslexic']));
    expect(getFontFamily()).toBeNull();
  });

  it('does not throw when localStorage is unavailable', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Access denied');
    });
    expect(getFontFamily()).toBeNull();
    getItemSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// resolveAutoFontFamily — no media query, safe default
// ---------------------------------------------------------------------------

describe('resolveAutoFontFamily', () => {
  it('returns "system" (no OS media query exists for font-family)', () => {
    expect(resolveAutoFontFamily()).toBe('system');
  });
});

// ---------------------------------------------------------------------------
// Round-trip — set then get
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  it.each(
    FONT_FAMILIES,
  )('setFontFamily("%s") then getFontFamily() returns the same value', (family) => {
    setFontFamily(family);
    expect(getFontFamily()).toBe(family);
  });

  it('setFontFamily("auto") then getFontFamily() returns "auto"', () => {
    setFontFamily('auto');
    expect(getFontFamily()).toBe('auto');
  });
});
