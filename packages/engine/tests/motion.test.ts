/**
 * Tests for motion.ts — Axe motion (motion axis) runtime API.
 *
 * CDC ref : F-007 (Axe sensoriel : motion full/reduced/none)
 * Brick   : B-008
 * Risk    : Standard 80%
 *
 * Coverage : setMotion + getMotion + resolveAutoMotion + persistence + auto resolution + edge cases.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';
import { getMotion, resolveAutoMotion, setMotion } from '../src/motion.js';
import { MOTIONS } from '../src/tokens.js';

beforeEach(() => {
  document.documentElement.style.removeProperty('--morphic-motion');
  document.documentElement.removeAttribute('data-morphic-motion');
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  document.documentElement.style.removeProperty('--morphic-motion');
  document.documentElement.removeAttribute('data-morphic-motion');
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// setMotion — DOM updates
// ---------------------------------------------------------------------------

describe('setMotion — DOM updates', () => {
  it.each([
    'full',
    'reduced',
    'none',
  ] as const)('sets --morphic-motion CSS var to "%s"', (motion) => {
    setMotion(motion);
    expect(document.documentElement.style.getPropertyValue('--morphic-motion')).toBe(motion);
  });

  it.each([
    'full',
    'reduced',
    'none',
  ] as const)('sets data-morphic-motion attribute to "%s" (selector cascade)', (motion) => {
    setMotion(motion);
    expect(document.documentElement.getAttribute('data-morphic-motion')).toBe(motion);
  });

  it('resolves "auto" to "reduced" when prefers-reduced-motion: reduce IS matched', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList));
    const resolved = setMotion('auto');
    expect(resolved).toBe('reduced');
    expect(document.documentElement.style.getPropertyValue('--morphic-motion')).toBe('reduced');
  });

  it('resolves "auto" to "full" when prefers-reduced-motion: reduce is NOT matched', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false } as MediaQueryList));
    const resolved = setMotion('auto');
    expect(resolved).toBe('full');
    expect(document.documentElement.style.getPropertyValue('--morphic-motion')).toBe('full');
  });

  it('returns the applied motion (concrete value)', () => {
    expect(setMotion('reduced')).toBe('reduced');
    expect(setMotion('none')).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// setMotion — persistence
// ---------------------------------------------------------------------------

describe('setMotion — persistence', () => {
  it('persists the user choice (not the resolved value) for "auto"', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList));
    setMotion('auto');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.motion).toBe('auto');
  });

  it('persists the chosen motion for concrete values', () => {
    setMotion('none');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.motion).toBe('none');
  });

  it('preserves other axes already present in storage', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', density: 'compact' }),
    );
    setMotion('reduced');
    const stored = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}');
    expect(stored.motion).toBe('reduced');
    expect(stored.theme).toBe('dark');
    expect(stored.density).toBe('compact');
  });

  it('does not throw when localStorage is unavailable (private mode)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setMotion('reduced')).not.toThrow();
    expect(document.documentElement.style.getPropertyValue('--morphic-motion')).toBe('reduced');
    setItemSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// setMotion — input validation
// ---------------------------------------------------------------------------

describe('setMotion — defensive', () => {
  it('rejects unknown motion value (closed enum poka-yoke)', () => {
    expect(() => setMotion('slow-mo' as never)).toThrow();
  });

  it('rejects null / undefined', () => {
    expect(() => setMotion(null as never)).toThrow();
    expect(() => setMotion(undefined as never)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// getMotion — reads back the persisted choice
// ---------------------------------------------------------------------------

describe('getMotion', () => {
  it('returns null when no motion has been persisted', () => {
    expect(getMotion()).toBeNull();
  });

  it.each(MOTIONS)('returns the persisted motion "%s"', (motion) => {
    setMotion(motion);
    expect(getMotion()).toBe(motion);
  });

  it('returns null when stored value is invalid', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ motion: 'invalid' }));
    expect(getMotion()).toBeNull();
  });

  it('returns null when storage entry is malformed JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not-json');
    expect(getMotion()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveAutoMotion — matchMedia bridge
// ---------------------------------------------------------------------------

describe('resolveAutoMotion', () => {
  it('returns "reduced" when prefers-reduced-motion: reduce matches', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList));
    expect(resolveAutoMotion()).toBe('reduced');
  });

  it('returns "full" when prefers-reduced-motion: reduce does not match', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false } as MediaQueryList));
    expect(resolveAutoMotion()).toBe('full');
  });

  it('returns "full" when matchMedia is undefined (SSR / old browser)', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(resolveAutoMotion()).toBe('full');
  });

  it('queries the correct media feature', () => {
    const spy = vi.fn().mockReturnValue({ matches: false } as MediaQueryList);
    vi.stubGlobal('matchMedia', spy);
    resolveAutoMotion();
    expect(spy).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });
});

// ---------------------------------------------------------------------------
// Round-trip — set then get
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  it.each(MOTIONS)('setMotion("%s") then getMotion() returns the same value', (motion) => {
    setMotion(motion);
    expect(getMotion()).toBe(motion);
  });
});
