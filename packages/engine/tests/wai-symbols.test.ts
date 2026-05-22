/**
 * Tests for B-104 wai-symbols axis (F-028, Sensitive 90%).
 *
 * Coverage of:
 *  - parseBciIndices (pure helper, exhaustive cases)
 *  - enableWaiSymbols / disableWaiSymbols / getWaiSymbolsState lifecycle
 *  - DOM walker (single, compound, nested adapt-symbol attributes)
 *  - 3 modes (before / after / replace)
 *  - Resolver fallback (null → unresolved counter)
 *  - Idempotence (re-enable cleans previous)
 *  - Persistence (sub-key under MORPHIC_STORAGE_KEY, quota-safe, malformed-safe)
 *  - SSR safety
 *  - PBT properties on parseBciIndices + render counts
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MORPHIC_STORAGE_KEY } from '../src/init.js';
import {
  disableWaiSymbols,
  enableWaiSymbols,
  getWaiSymbolsState,
  MORPHIC_WAI_SYMBOLS_DEFAULT_Z_INDEX,
  MORPHIC_WAI_SYMBOLS_MARKER,
  MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR,
  parseBciIndices,
  type SymbolResolution,
  type SymbolResolver,
  WAI_SYMBOL_ATTRIBUTE,
  WAI_SYMBOLS_MODES,
  type WaiSymbolsMode,
} from '../src/wai-symbols.js';

const validResolver: SymbolResolver = (bci: number): SymbolResolution | null => ({
  src: `https://example.invalid/symbols/${bci}.svg`,
  alt: `BCI ${bci}`,
  width: 48,
  height: 48,
});

const nullResolver: SymbolResolver = () => null;

function queryRendered(): Element[] {
  return Array.from(document.querySelectorAll(`[${MORPHIC_WAI_SYMBOLS_MARKER}]`));
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

afterEach(() => {
  // Defensive: clean up active state even if a test missed it.
  try {
    disableWaiSymbols();
  } catch {
    // ignore
  }
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('WAI_SYMBOL_ATTRIBUTE matches the W3C spec literal', () => {
    expect(WAI_SYMBOL_ATTRIBUTE).toBe('adapt-symbol');
  });

  it('WAI_SYMBOLS_MODES is frozen and exposes 3 modes', () => {
    expect(Object.isFrozen(WAI_SYMBOLS_MODES)).toBe(true);
    expect(WAI_SYMBOLS_MODES).toEqual(['before', 'after', 'replace']);
  });

  it('MORPHIC_WAI_SYMBOLS_MARKER is the data attribute', () => {
    expect(MORPHIC_WAI_SYMBOLS_MARKER).toBe('data-morphic-wai-symbol');
  });

  it('MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR is the data attribute', () => {
    expect(MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR).toBe('data-morphic-wai-original-text');
  });

  it('default z-index is 9997 (under reading-guide 9998)', () => {
    expect(MORPHIC_WAI_SYMBOLS_DEFAULT_Z_INDEX).toBe(9997);
  });
});

// ---------------------------------------------------------------------------
// parseBciIndices — pure helper, exhaustive
// ---------------------------------------------------------------------------

describe('parseBciIndices', () => {
  it('single index', () => {
    expect(parseBciIndices('12345')).toEqual([12345]);
  });

  it('compound with +', () => {
    expect(parseBciIndices('12345+67890')).toEqual([12345, 67890]);
  });

  it('triple compound', () => {
    expect(parseBciIndices('1+2+3')).toEqual([1, 2, 3]);
  });

  it('empty string', () => {
    expect(parseBciIndices('')).toEqual([]);
  });

  it('trims whitespace', () => {
    expect(parseBciIndices('  12345  ')).toEqual([12345]);
  });

  it('skips non-numeric tokens', () => {
    expect(parseBciIndices('abc')).toEqual([]);
  });

  it('keeps valid, drops invalid in mixed', () => {
    expect(parseBciIndices('12345+abc+67890')).toEqual([12345, 67890]);
  });

  it('rejects negative numbers (BCI indices are positive)', () => {
    expect(parseBciIndices('-12345')).toEqual([]);
  });

  it('rejects decimals (BCI indices are integers)', () => {
    expect(parseBciIndices('123.45')).toEqual([]);
  });

  it('rejects zero (BCI indices start at 1)', () => {
    expect(parseBciIndices('0')).toEqual([]);
  });

  it('handles consecutive separators gracefully', () => {
    expect(parseBciIndices('12345++67890')).toEqual([12345, 67890]);
  });

  it('handles trailing separator', () => {
    expect(parseBciIndices('12345+')).toEqual([12345]);
  });
});

// ---------------------------------------------------------------------------
// enableWaiSymbols — validation
// ---------------------------------------------------------------------------

describe('enableWaiSymbols validation', () => {
  it('throws when resolver is missing', () => {
    expect(() =>
      // @ts-expect-error testing runtime guard
      enableWaiSymbols({}),
    ).toThrow(TypeError);
  });

  it('throws when resolver is not a function', () => {
    expect(() =>
      // @ts-expect-error testing runtime guard
      enableWaiSymbols({ resolver: 'nope' }),
    ).toThrow(TypeError);
  });

  it('throws when mode is invalid', () => {
    expect(() =>
      enableWaiSymbols({
        resolver: validResolver,
        // @ts-expect-error testing runtime guard
        mode: 'tooltip',
      }),
    ).toThrow(TypeError);
  });

  it('throws when zIndex is not finite', () => {
    expect(() => enableWaiSymbols({ resolver: validResolver, zIndex: Number.NaN })).toThrow(
      TypeError,
    );
  });

  it('throws when zIndex is zero or negative', () => {
    expect(() => enableWaiSymbols({ resolver: validResolver, zIndex: 0 })).toThrow(TypeError);
    expect(() => enableWaiSymbols({ resolver: validResolver, zIndex: -1 })).toThrow(TypeError);
  });

  it('throws when target is not an Element', () => {
    expect(() =>
      enableWaiSymbols({
        resolver: validResolver,
        // @ts-expect-error testing runtime guard
        target: 'document.body',
      }),
    ).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// DOM walker
// ---------------------------------------------------------------------------

describe('DOM walker', () => {
  it('renders a pictogram on a single adapt-symbol element', () => {
    document.body.innerHTML = `<p adapt-symbol="14885">Home</p>`;
    enableWaiSymbols({ resolver: validResolver });
    expect(queryRendered()).toHaveLength(1);
  });

  it('renders pictograms on multiple sibling elements', () => {
    document.body.innerHTML = `
      <p adapt-symbol="1">A</p>
      <p adapt-symbol="2">B</p>
      <p adapt-symbol="3">C</p>
    `;
    enableWaiSymbols({ resolver: validResolver });
    expect(queryRendered()).toHaveLength(3);
  });

  it('renders multiple pictograms for compound indices', () => {
    document.body.innerHTML = `<p adapt-symbol="1+2+3">Triple</p>`;
    enableWaiSymbols({ resolver: validResolver });
    expect(queryRendered()).toHaveLength(3);
  });

  it('ignores elements without adapt-symbol', () => {
    document.body.innerHTML = `
      <p adapt-symbol="1">Has</p>
      <p>No</p>
    `;
    enableWaiSymbols({ resolver: validResolver });
    expect(queryRendered()).toHaveLength(1);
  });

  it('processes nested adapt-symbol elements', () => {
    document.body.innerHTML = `
      <article>
        <p adapt-symbol="1">Outer</p>
        <div><span adapt-symbol="2">Inner</span></div>
      </article>
    `;
    enableWaiSymbols({ resolver: validResolver });
    expect(queryRendered()).toHaveLength(2);
  });

  it('skips elements with empty adapt-symbol', () => {
    document.body.innerHTML = `<p adapt-symbol="">Empty</p>`;
    enableWaiSymbols({ resolver: validResolver });
    expect(queryRendered()).toHaveLength(0);
  });

  it('respects the target option (scoped walk)', () => {
    document.body.innerHTML = `
      <p adapt-symbol="1">Outside</p>
      <section id="scoped"><p adapt-symbol="2">Inside</p></section>
    `;
    const target = document.getElementById('scoped') as HTMLElement;
    enableWaiSymbols({ resolver: validResolver, target });
    // Only the scoped one is rendered.
    expect(queryRendered()).toHaveLength(1);
    expect(target.querySelectorAll(`[${MORPHIC_WAI_SYMBOLS_MARKER}]`)).toHaveLength(1);
  });

  it('renders <img> with src from resolver', () => {
    document.body.innerHTML = `<p adapt-symbol="14885">Home</p>`;
    enableWaiSymbols({ resolver: validResolver });
    const img = document.querySelector(`[${MORPHIC_WAI_SYMBOLS_MARKER}] img`) as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toBe('https://example.invalid/symbols/14885.svg');
  });

  it('sets alt from resolver', () => {
    document.body.innerHTML = `<p adapt-symbol="14885">Home</p>`;
    enableWaiSymbols({ resolver: validResolver });
    const img = document.querySelector(`[${MORPHIC_WAI_SYMBOLS_MARKER}] img`) as HTMLImageElement;
    expect(img.alt).toBe('BCI 14885');
  });
});

// ---------------------------------------------------------------------------
// Resolution & fallback
// ---------------------------------------------------------------------------

describe('resolver behavior', () => {
  it('counts unresolved indices in state', () => {
    document.body.innerHTML = `<p adapt-symbol="14885">Home</p>`;
    const state = enableWaiSymbols({ resolver: nullResolver });
    expect(state.rendered).toBe(0);
    expect(state.unresolved).toBe(1);
  });

  it('counts both rendered and unresolved with a partial resolver', () => {
    const partial: SymbolResolver = (idx: number) =>
      idx === 1 ? { src: 'ok.svg', alt: '1' } : null;
    document.body.innerHTML = `
      <p adapt-symbol="1">Known</p>
      <p adapt-symbol="2">Unknown</p>
    `;
    const state = enableWaiSymbols({ resolver: partial });
    expect(state.rendered).toBe(1);
    expect(state.unresolved).toBe(1);
  });

  it('counts compound indices separately', () => {
    document.body.innerHTML = `<p adapt-symbol="1+2+3">Triple</p>`;
    const state = enableWaiSymbols({ resolver: validResolver });
    expect(state.rendered).toBe(3);
    expect(state.unresolved).toBe(0);
  });

  it('does not throw when resolver throws (counts as unresolved)', () => {
    const angryResolver: SymbolResolver = () => {
      throw new Error('boom');
    };
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    expect(() => enableWaiSymbols({ resolver: angryResolver })).not.toThrow();
    const state = getWaiSymbolsState();
    expect(state?.unresolved).toBe(1);
    expect(state?.rendered).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Mode rendering
// ---------------------------------------------------------------------------

describe('modes', () => {
  it('default mode is "before"', () => {
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    const state = enableWaiSymbols({ resolver: validResolver });
    expect(state.mode).toBe('before');
  });

  it('"before" mode prepends pictogram to element', () => {
    document.body.innerHTML = `<p adapt-symbol="1">Hello</p>`;
    enableWaiSymbols({ resolver: validResolver, mode: 'before' });
    const p = document.querySelector('p') as HTMLElement;
    const first = p.firstChild as HTMLElement;
    expect(first.nodeType).toBe(Node.ELEMENT_NODE);
    expect(first.hasAttribute(MORPHIC_WAI_SYMBOLS_MARKER)).toBe(true);
  });

  it('"after" mode appends pictogram to element', () => {
    document.body.innerHTML = `<p adapt-symbol="1">Hello</p>`;
    enableWaiSymbols({ resolver: validResolver, mode: 'after' });
    const p = document.querySelector('p') as HTMLElement;
    const last = p.lastChild as HTMLElement;
    expect(last.nodeType).toBe(Node.ELEMENT_NODE);
    expect(last.hasAttribute(MORPHIC_WAI_SYMBOLS_MARKER)).toBe(true);
  });

  it('"replace" mode replaces text content but stores original', () => {
    document.body.innerHTML = `<p adapt-symbol="1">Hello</p>`;
    enableWaiSymbols({ resolver: validResolver, mode: 'replace' });
    const p = document.querySelector('p') as HTMLElement;
    expect(p.getAttribute(MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR)).toBe('Hello');
    expect(p.textContent).not.toContain('Hello');
    expect(p.querySelector(`[${MORPHIC_WAI_SYMBOLS_MARKER}]`)).toBeTruthy();
  });

  it('"replace" mode with no resolver match keeps original text', () => {
    document.body.innerHTML = `<p adapt-symbol="1">Hello</p>`;
    enableWaiSymbols({ resolver: nullResolver, mode: 'replace' });
    const p = document.querySelector('p') as HTMLElement;
    // Nothing resolved → text untouched (no destructive op without a payload).
    expect(p.textContent).toBe('Hello');
  });
});

// ---------------------------------------------------------------------------
// Idempotence
// ---------------------------------------------------------------------------

describe('idempotence', () => {
  it('re-enable removes previous symbols then re-renders', () => {
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    enableWaiSymbols({ resolver: validResolver });
    enableWaiSymbols({ resolver: validResolver });
    expect(queryRendered()).toHaveLength(1);
  });

  it('changing mode between calls works', () => {
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    enableWaiSymbols({ resolver: validResolver, mode: 'before' });
    enableWaiSymbols({ resolver: validResolver, mode: 'after' });
    const p = document.querySelector('p') as HTMLElement;
    const last = p.lastChild as HTMLElement;
    expect(last.hasAttribute?.(MORPHIC_WAI_SYMBOLS_MARKER)).toBe(true);
  });

  it('three consecutive enables still leave exactly one set of symbols', () => {
    document.body.innerHTML = `<p adapt-symbol="1">A</p><p adapt-symbol="2">B</p>`;
    enableWaiSymbols({ resolver: validResolver });
    enableWaiSymbols({ resolver: validResolver });
    enableWaiSymbols({ resolver: validResolver });
    expect(queryRendered()).toHaveLength(2);
  });

  it('replace mode is idempotent (original text preserved across re-enables)', () => {
    document.body.innerHTML = `<p adapt-symbol="1">Hello</p>`;
    enableWaiSymbols({ resolver: validResolver, mode: 'replace' });
    enableWaiSymbols({ resolver: validResolver, mode: 'replace' });
    const p = document.querySelector('p') as HTMLElement;
    expect(p.getAttribute(MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR)).toBe('Hello');
  });
});

// ---------------------------------------------------------------------------
// disableWaiSymbols
// ---------------------------------------------------------------------------

describe('disableWaiSymbols', () => {
  it('removes all rendered pictograms', () => {
    document.body.innerHTML = `<p adapt-symbol="1">A</p><p adapt-symbol="2">B</p>`;
    enableWaiSymbols({ resolver: validResolver });
    disableWaiSymbols();
    expect(queryRendered()).toHaveLength(0);
  });

  it('restores original text for "replace" mode', () => {
    document.body.innerHTML = `<p adapt-symbol="1">Hello</p>`;
    enableWaiSymbols({ resolver: validResolver, mode: 'replace' });
    disableWaiSymbols();
    const p = document.querySelector('p') as HTMLElement;
    expect(p.textContent).toBe('Hello');
    expect(p.hasAttribute(MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR)).toBe(false);
  });

  it('preserves original element text for "before" / "after" modes', () => {
    document.body.innerHTML = `<p adapt-symbol="1">Hello</p>`;
    enableWaiSymbols({ resolver: validResolver, mode: 'before' });
    disableWaiSymbols();
    const p = document.querySelector('p') as HTMLElement;
    expect(p.textContent).toBe('Hello');
  });

  it('is safe to call when nothing is active', () => {
    expect(() => disableWaiSymbols()).not.toThrow();
  });

  it('clears persisted mode from storage', () => {
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    enableWaiSymbols({ resolver: validResolver });
    expect(localStorage.getItem(MORPHIC_STORAGE_KEY)).toContain('waiSymbols');
    disableWaiSymbols();
    expect(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '').not.toContain('waiSymbols');
  });

  it('getWaiSymbolsState returns null after disable', () => {
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    enableWaiSymbols({ resolver: validResolver });
    disableWaiSymbols();
    expect(getWaiSymbolsState()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe('persistence', () => {
  it('persists mode under waiSymbols sub-key', () => {
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    enableWaiSymbols({ resolver: validResolver, mode: 'after' });
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.waiSymbols).toBe('after');
  });

  it('preserves other axes in storage', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', readingGuide: 'line' }),
    );
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    enableWaiSymbols({ resolver: validResolver, mode: 'before' });
    const parsed = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) as string);
    expect(parsed.theme).toBe('dark');
    expect(parsed.readingGuide).toBe('line');
    expect(parsed.waiSymbols).toBe('before');
  });

  it('disable only removes waiSymbols, preserves other axes', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    enableWaiSymbols({ resolver: validResolver });
    disableWaiSymbols();
    const parsed = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) as string);
    expect(parsed.theme).toBe('dark');
    expect('waiSymbols' in parsed).toBe(false);
  });

  it('does not throw on quota exception', () => {
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(() => enableWaiSymbols({ resolver: validResolver })).not.toThrow();
    spy.mockRestore();
  });

  it('does not throw on malformed storage JSON', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not json');
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    expect(() => enableWaiSymbols({ resolver: validResolver })).not.toThrow();
  });

  it('does not throw on storage containing non-object', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '"a string"');
    document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
    expect(() => enableWaiSymbols({ resolver: validResolver })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// State accessor
// ---------------------------------------------------------------------------

describe('getWaiSymbolsState', () => {
  it('returns null when nothing is active', () => {
    expect(getWaiSymbolsState()).toBeNull();
  });

  it('returns the current state with counts after enable', () => {
    document.body.innerHTML = `<p adapt-symbol="1">A</p><p adapt-symbol="2">B</p>`;
    enableWaiSymbols({ resolver: validResolver, mode: 'after' });
    const state = getWaiSymbolsState();
    expect(state).not.toBeNull();
    expect(state?.mode).toBe('after');
    expect(state?.rendered).toBe(2);
    expect(state?.unresolved).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Lifecycle integration
// ---------------------------------------------------------------------------

describe('lifecycle integration', () => {
  it('full enable → mode switch → disable cycle', () => {
    document.body.innerHTML = `<p adapt-symbol="1+2">Compound</p>`;
    const s1 = enableWaiSymbols({ resolver: validResolver, mode: 'before' });
    expect(s1.rendered).toBe(2);
    expect(queryRendered()).toHaveLength(2);

    const s2 = enableWaiSymbols({ resolver: validResolver, mode: 'after' });
    expect(s2.mode).toBe('after');
    expect(queryRendered()).toHaveLength(2);

    disableWaiSymbols();
    expect(queryRendered()).toHaveLength(0);
    expect(getWaiSymbolsState()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Property-based tests (fast-check)
// ---------------------------------------------------------------------------

describe('PBT', () => {
  it('parseBciIndices output contains only positive integers', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = parseBciIndices(s);
        for (const n of out) {
          expect(Number.isInteger(n)).toBe(true);
          expect(n).toBeGreaterThan(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('parseBciIndices round-trip: joining valid indices with + yields the same set', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 999999 }), { minLength: 1, maxLength: 8 }),
        (arr) => {
          const joined = arr.join('+');
          expect(parseBciIndices(joined)).toEqual(arr);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('enableWaiSymbols is idempotent under N retriggers (count is bounded)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (n) => {
        document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
        for (let i = 0; i < n; i++) {
          enableWaiSymbols({ resolver: validResolver });
        }
        expect(queryRendered()).toHaveLength(1);
        disableWaiSymbols();
      }),
      { numRuns: 50 },
    );
  });

  it('mode is always one of the closed enum', () => {
    fc.assert(
      fc.property(fc.constantFrom<WaiSymbolsMode>('before', 'after', 'replace'), (mode) => {
        document.body.innerHTML = `<p adapt-symbol="1">A</p>`;
        const state = enableWaiSymbols({ resolver: validResolver, mode });
        expect(WAI_SYMBOLS_MODES).toContain(state.mode);
        disableWaiSymbols();
      }),
      { numRuns: 50 },
    );
  });
});
