/**
 * Tests TDG — B-004 `morphicInit()` synchronous head-read (zero flash).
 * Risk level : Critical (95% coverage + MC/DC + PBT Layer 1).
 * CDC ref    : F-003.
 *
 * Spec : `morphicInit()` reads morphic preferences synchronously from
 *        localStorage BEFORE first paint, injects CSS custom properties
 *        `--morphic-*` on `document.documentElement` via adopted
 *        stylesheet, and falls back to `prefers-*` media queries when
 *        localStorage is unavailable or data is invalid.
 *
 * Anti-Circular Layer 1 : PBT (fast-check) for arbitrary preference
 *        shapes + defensive assertions invariant tests.
 */

import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';

// --- Module under test (not yet created → tests will fail RED) ---
import { MORPHIC_STORAGE_KEY, morphicInit, readPrefs } from '../src/init.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'morphic-prefs';

function setStoragePrefs(prefs: Record<string, unknown>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function getCssVar(name: string): string {
  return document.documentElement.style.getPropertyValue(name).trim();
}

// ---------------------------------------------------------------------------
// Describe : readPrefs (pure function — reads + validates localStorage)
// ---------------------------------------------------------------------------

describe('readPrefs — localStorage synchronous read', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should return stored prefs when localStorage contains valid JSON', () => {
    const prefs = { theme: 'dark', motion: 'reduced', contrast: 'more' };
    setStoragePrefs(prefs);
    const result = readPrefs();
    expect(result).toEqual(prefs);
  });

  it('should return null when localStorage is empty', () => {
    const result = readPrefs();
    expect(result).toBeNull();
  });

  it('should return null when localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json!!!');
    const result = readPrefs();
    expect(result).toBeNull();
  });

  it('should return null when localStorage contains a non-object (string)', () => {
    localStorage.setItem(STORAGE_KEY, '"just a string"');
    const result = readPrefs();
    expect(result).toBeNull();
  });

  it('should return null when localStorage contains a non-object (array)', () => {
    localStorage.setItem(STORAGE_KEY, '[1,2,3]');
    const result = readPrefs();
    expect(result).toBeNull();
  });

  it('should return null when localStorage contains null JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'null');
    const result = readPrefs();
    expect(result).toBeNull();
  });

  it('should return null when localStorage.getItem throws (disabled storage)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage disabled');
    });
    const result = readPrefs();
    expect(result).toBeNull();
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// Describe : morphicInit — full init (read + inject CSS vars + fallback)
// ---------------------------------------------------------------------------

describe('morphicInit — CSS vars injection', () => {
  afterEach(() => {
    localStorage.clear();
    // Clean CSS vars from documentElement
    document.documentElement.removeAttribute('style');
  });

  it('should inject --morphic-theme from stored prefs', () => {
    setStoragePrefs({ theme: 'dark' });
    morphicInit();
    expect(getCssVar('--morphic-theme')).toBe('dark');
  });

  it('should inject --morphic-motion from stored prefs', () => {
    setStoragePrefs({ motion: 'reduced' });
    morphicInit();
    expect(getCssVar('--morphic-motion')).toBe('reduced');
  });

  it('should inject --morphic-contrast from stored prefs', () => {
    setStoragePrefs({ contrast: 'more' });
    morphicInit();
    expect(getCssVar('--morphic-contrast')).toBe('more');
  });

  it('should inject multiple CSS vars at once', () => {
    setStoragePrefs({ theme: 'dark', motion: 'reduced', contrast: 'more' });
    morphicInit();
    expect(getCssVar('--morphic-theme')).toBe('dark');
    expect(getCssVar('--morphic-motion')).toBe('reduced');
    expect(getCssVar('--morphic-contrast')).toBe('more');
  });

  it('should set data-morphic-theme attribute on documentElement', () => {
    setStoragePrefs({ theme: 'dark' });
    morphicInit();
    expect(document.documentElement.getAttribute('data-morphic-theme')).toBe('dark');
  });
});

// ---------------------------------------------------------------------------
// Describe : morphicInit — fallback to prefers-* media queries
// ---------------------------------------------------------------------------

describe('morphicInit — media query fallback', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-morphic-theme');
    vi.restoreAllMocks();
  });

  it('should fallback to prefers-color-scheme: dark when no localStorage', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));
    morphicInit();
    expect(getCssVar('--morphic-theme')).toBe('dark');
    vi.unstubAllGlobals();
  });

  it('should fallback to prefers-color-scheme: light when no localStorage and no dark preference', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query !== '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));
    morphicInit();
    expect(getCssVar('--morphic-theme')).toBe('light');
    vi.unstubAllGlobals();
  });

  it('should fallback to prefers-reduced-motion: reduce when no localStorage', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));
    morphicInit();
    expect(getCssVar('--morphic-motion')).toBe('reduced');
    vi.unstubAllGlobals();
  });

  it('should fallback to prefers-contrast: less when no localStorage', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-contrast: less)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));
    morphicInit();
    expect(getCssVar('--morphic-contrast')).toBe('less');
    vi.unstubAllGlobals();
  });

  it('should fallback to prefers-contrast: more when no localStorage', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-contrast: more)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));
    morphicInit();
    expect(getCssVar('--morphic-contrast')).toBe('more');
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// Describe : morphicInit — validation (theme in enum)
// ---------------------------------------------------------------------------

describe('morphicInit — preference validation', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-morphic-theme');
  });

  it('should reject unknown theme values and fallback to media query', () => {
    setStoragePrefs({ theme: 'neon-pink' });
    morphicInit();
    // Fallback to media query default (light in jsdom)
    expect(getCssVar('--morphic-theme')).not.toBe('neon-pink');
  });

  it('should reject unknown motion values and fallback', () => {
    setStoragePrefs({ motion: 'ultra-fast' });
    morphicInit();
    expect(getCssVar('--morphic-motion')).not.toBe('ultra-fast');
  });

  it('should reject unknown contrast values and fallback', () => {
    setStoragePrefs({ contrast: 'extreme' });
    morphicInit();
    expect(getCssVar('--morphic-contrast')).not.toBe('extreme');
  });

  it('should accept valid theme: light', () => {
    setStoragePrefs({ theme: 'light' });
    morphicInit();
    expect(getCssVar('--morphic-theme')).toBe('light');
  });

  it('should accept valid theme: high-contrast', () => {
    setStoragePrefs({ theme: 'high-contrast' });
    morphicInit();
    expect(getCssVar('--morphic-theme')).toBe('high-contrast');
  });

  it('should accept valid theme: sepia', () => {
    setStoragePrefs({ theme: 'sepia' });
    morphicInit();
    expect(getCssVar('--morphic-theme')).toBe('sepia');
  });
});

// ---------------------------------------------------------------------------
// Describe : morphicInit — SSR safety
// ---------------------------------------------------------------------------

describe('morphicInit — SSR / non-DOM environment', () => {
  it('should be a silent no-op when document is undefined', () => {
    const origDoc = globalThis.document;
    // @ts-expect-error — intentionally removing document for SSR test
    delete globalThis.document;
    expect(() => morphicInit()).not.toThrow();
    globalThis.document = origDoc;
  });

  it('should be a silent no-op when localStorage is undefined', () => {
    const origStorage = globalThis.localStorage;
    // @ts-expect-error — intentionally removing localStorage for SSR test
    delete globalThis.localStorage;
    expect(() => morphicInit()).not.toThrow();
    globalThis.localStorage = origStorage;
  });
});

// ---------------------------------------------------------------------------
// Describe : morphicInit — defensive assertions (PET §5)
// ---------------------------------------------------------------------------

describe('morphicInit — defensive assertions', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-morphic-theme');
  });

  it('should export MORPHIC_STORAGE_KEY as "morphic-prefs"', () => {
    expect(MORPHIC_STORAGE_KEY).toBe('morphic-prefs');
  });

  it('should be idempotent — calling morphicInit() twice produces same result', () => {
    setStoragePrefs({ theme: 'dark', motion: 'reduced' });
    morphicInit();
    const theme1 = getCssVar('--morphic-theme');
    const motion1 = getCssVar('--morphic-motion');
    morphicInit();
    expect(getCssVar('--morphic-theme')).toBe(theme1);
    expect(getCssVar('--morphic-motion')).toBe(motion1);
  });
});

// ---------------------------------------------------------------------------
// Describe : PBT — Anti-Circular Layer 1 (fast-check)
// ---------------------------------------------------------------------------

describe('readPrefs — PBT (Anti-Circular Layer 1)', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should never throw regardless of localStorage content', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        localStorage.setItem(STORAGE_KEY, raw);
        // Must not throw, ever.
        const result = readPrefs();
        // Result is either null or a plain object
        expect(result === null || typeof result === 'object').toBe(true);
        localStorage.clear();
      }),
      { numRuns: 200 },
    );
  });

  it('should always return stored object when input is valid JSON object', () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.string()), (obj) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        const result = readPrefs();
        expect(result).toEqual(obj);
        localStorage.clear();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Describe : MC/DC — complex condition coverage (Critical path)
// ---------------------------------------------------------------------------

describe('morphicInit — MC/DC condition coverage', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-morphic-theme');
  });

  // MC/DC for: if (prefs !== null && isValidTheme(prefs.theme))
  // Condition A: prefs !== null
  // Condition B: isValidTheme(prefs.theme)

  it('MC/DC: A=false → theme from media query (no prefs)', () => {
    // prefs = null → skip validation, use media fallback
    morphicInit();
    const theme = getCssVar('--morphic-theme');
    expect(['light', 'dark', '']).toContain(theme);
  });

  it('MC/DC: A=true, B=false → theme from media query (invalid theme)', () => {
    setStoragePrefs({ theme: 'INVALID' });
    morphicInit();
    const theme = getCssVar('--morphic-theme');
    expect(theme).not.toBe('INVALID');
  });

  it('MC/DC: A=true, B=true → theme from prefs', () => {
    setStoragePrefs({ theme: 'dark' });
    morphicInit();
    expect(getCssVar('--morphic-theme')).toBe('dark');
  });
});
