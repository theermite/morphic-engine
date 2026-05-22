/**
 * Tests for typography.ts — Axe font-size (typography axis) runtime API.
 *
 * CDC ref : F-009 (Axe sensoriel : font size sm/md/lg/xl)
 * Brick   : B-010
 * Risk    : Standard 80%
 *
 * Coverage : setFontSize + getFontSize + resolveAutoFontSize + persistence + edge cases.
 *
 * Key difference from theme/motion: NO prefers-* media query for font-size.
 * resolveAutoFontSize() returns 'md' (safe default — 16px equivalent).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';
import { FONT_SIZES } from '../src/tokens.js';
import { getFontSize, resolveAutoFontSize, setFontSize } from '../src/typography.js';

beforeEach(() => {
  document.documentElement.style.removeProperty('--morphic-font-size');
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  document.documentElement.style.removeProperty('--morphic-font-size');
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// setFontSize — DOM updates
// ---------------------------------------------------------------------------

describe('setFontSize — DOM updates', () => {
  it.each(['sm', 'md', 'lg', 'xl'] as const)('sets --morphic-font-size CSS var to "%s"', (size) => {
    setFontSize(size);
    expect(document.documentElement.style.getPropertyValue('--morphic-font-size')).toBe(size);
  });

  it('resolves "auto" to "md" (no OS media query for font-size)', () => {
    const resolved = setFontSize('auto');
    expect(resolved).toBe('md');
    expect(document.documentElement.style.getPropertyValue('--morphic-font-size')).toBe('md');
  });

  it('returns the applied font size (concrete value)', () => {
    expect(setFontSize('sm')).toBe('sm');
    expect(setFontSize('xl')).toBe('xl');
  });
});

// ---------------------------------------------------------------------------
// setFontSize — persistence
// ---------------------------------------------------------------------------

describe('setFontSize — persistence', () => {
  it('persists the user choice (not the resolved value) for "auto"', () => {
    setFontSize('auto');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.fontSize).toBe('auto');
  });

  it('persists the chosen font size for concrete values', () => {
    setFontSize('lg');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.fontSize).toBe('lg');
  });

  it('preserves other axes already present in storage', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', density: 'compact' }),
    );
    setFontSize('xl');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.fontSize).toBe('xl');
    expect(stored.theme).toBe('dark');
    expect(stored.density).toBe('compact');
  });

  it('does not throw when localStorage is unavailable (private mode)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setFontSize('lg')).not.toThrow();
    expect(document.documentElement.style.getPropertyValue('--morphic-font-size')).toBe('lg');
    setItemSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// setFontSize — input validation
// ---------------------------------------------------------------------------

describe('setFontSize — defensive', () => {
  it('rejects unknown font size value (closed enum poka-yoke)', () => {
    expect(() => setFontSize('xxl' as never)).toThrow();
  });

  it('rejects null / undefined', () => {
    expect(() => setFontSize(null as never)).toThrow();
    expect(() => setFontSize(undefined as never)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// getFontSize — reads back the persisted choice
// ---------------------------------------------------------------------------

describe('getFontSize', () => {
  it('returns null when no font size has been persisted', () => {
    expect(getFontSize()).toBeNull();
  });

  it.each(FONT_SIZES)('returns the persisted font size "%s"', (size) => {
    setFontSize(size);
    expect(getFontSize()).toBe(size);
  });

  it('returns "auto" when that was the stored choice', () => {
    setFontSize('auto');
    expect(getFontSize()).toBe('auto');
  });

  it('returns null when stored value is invalid', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ fontSize: 'invalid' }));
    expect(getFontSize()).toBeNull();
  });

  it('returns null when storage entry is malformed JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not-json');
    expect(getFontSize()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveAutoFontSize — no media query, returns safe default
// ---------------------------------------------------------------------------

describe('resolveAutoFontSize', () => {
  it('returns "md" (no OS media query exists for font-size)', () => {
    expect(resolveAutoFontSize()).toBe('md');
  });
});

// ---------------------------------------------------------------------------
// Round-trip — set then get
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  it.each(FONT_SIZES)('setFontSize("%s") then getFontSize() returns the same value', (size) => {
    setFontSize(size);
    expect(getFontSize()).toBe(size);
  });

  it('setFontSize("auto") then getFontSize() returns "auto"', () => {
    setFontSize('auto');
    expect(getFontSize()).toBe('auto');
  });
});
