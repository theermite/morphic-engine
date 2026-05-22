/**
 * Tests for reading-focus.ts — Axe Reading Focus runtime API.
 *
 * CDC ref : F-026 (Axe lecture : Reading Focus toggle + intensité)
 * Brick   : B-102
 * Risk    : Standard 80%
 *
 * Coverage : applyReadingFocus (pure helper) + setReadingFocus + getReadingFocus
 * + clearReadingFocus + persistence + DOM walker + idempotency + edge cases.
 *
 * Naming note : "Reading Focus" — not "Bionic Reading" (registered US trademark
 * #5557651, BRCG Casutt GmbH). The typographic technique itself is not patentable.
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';
import {
  applyReadingFocus,
  clearReadingFocus,
  getReadingFocus,
  MORPHIC_READING_FOCUS_MARKER,
  MORPHIC_READING_FOCUS_RATIOS,
  READING_FOCUS_INTENSITIES,
  type ReadingFocusIntensity,
  setReadingFocus,
} from '../src/reading-focus.js';

beforeEach(() => {
  document.documentElement.innerHTML = '<head></head><body></body>';
  localStorage.clear();
});

afterEach(() => {
  document.documentElement.innerHTML = '<head></head><body></body>';
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('exposes the closed intensity enum', () => {
    expect(READING_FOCUS_INTENSITIES).toEqual(['low', 'medium', 'high']);
  });

  it('maps intensities to fixation ratios (low=0.3, medium=0.4, high=0.5)', () => {
    expect(MORPHIC_READING_FOCUS_RATIOS.low).toBeCloseTo(0.3);
    expect(MORPHIC_READING_FOCUS_RATIOS.medium).toBeCloseTo(0.4);
    expect(MORPHIC_READING_FOCUS_RATIOS.high).toBeCloseTo(0.5);
  });

  it('exposes a DOM marker attribute name', () => {
    expect(MORPHIC_READING_FOCUS_MARKER).toBe('data-morphic-reading-focus');
  });
});

// ---------------------------------------------------------------------------
// applyReadingFocus — pure helper
// ---------------------------------------------------------------------------

describe('applyReadingFocus — pure helper', () => {
  it('returns empty string on empty input', () => {
    expect(applyReadingFocus('', 0.4)).toBe('');
  });

  it('wraps the first N letters of a single word with <b>', () => {
    // "reading" length=7, ratio=0.4 → ceil(7*0.4)=3 → "<b>rea</b>ding"
    expect(applyReadingFocus('reading', 0.4)).toBe('<b>rea</b>ding');
  });

  it('uses Math.ceil for the fixation length', () => {
    // "is" length=2, ratio=0.3 → ceil(2*0.3)=1 → "<b>i</b>s"
    expect(applyReadingFocus('is', 0.3)).toBe('<b>i</b>s');
  });

  it('handles single-letter words', () => {
    // "a" length=1, ratio=0.4 → ceil(0.4)=1 → "<b>a</b>"
    expect(applyReadingFocus('a', 0.4)).toBe('<b>a</b>');
  });

  it('preserves whitespace between words', () => {
    expect(applyReadingFocus('hi yo', 0.4)).toBe('<b>h</b>i <b>y</b>o');
  });

  it('preserves punctuation', () => {
    expect(applyReadingFocus('hi, yo!', 0.4)).toBe('<b>h</b>i, <b>y</b>o!');
  });

  it('preserves digits (not bolded)', () => {
    expect(applyReadingFocus('test 42 word', 0.4)).toBe('<b>te</b>st 42 <b>wo</b>rd');
  });

  it('handles accented letters (Unicode \\p{L})', () => {
    // "café" length=4, ratio=0.4 → ceil(1.6)=2 → "<b>ca</b>fé"
    expect(applyReadingFocus('café', 0.4)).toBe('<b>ca</b>fé');
  });

  it('handles non-Latin scripts (Cyrillic, CJK)', () => {
    // Cyrillic "привет" length=6, ratio=0.4 → ceil(2.4)=3
    expect(applyReadingFocus('привет', 0.4)).toBe('<b>при</b>вет');
  });

  it('escapes HTML special chars to prevent injection', () => {
    expect(applyReadingFocus('<script>', 0.4)).toBe('&lt;<b>scr</b>ipt&gt;');
  });

  it('escapes ampersand', () => {
    expect(applyReadingFocus('a&b', 0.4)).toBe('<b>a</b>&amp;<b>b</b>');
  });

  it('escapes quotes', () => {
    expect(applyReadingFocus('"hi"', 0.4)).toBe('&quot;<b>h</b>i&quot;');
  });

  it('throws on ratio out of (0, 1]', () => {
    expect(() => applyReadingFocus('test', 0)).toThrow(TypeError);
    expect(() => applyReadingFocus('test', -0.1)).toThrow(TypeError);
    expect(() => applyReadingFocus('test', 1.1)).toThrow(TypeError);
  });

  it('throws on non-finite ratio', () => {
    expect(() => applyReadingFocus('test', Number.NaN)).toThrow(TypeError);
    expect(() => applyReadingFocus('test', Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it('throws on non-string text', () => {
    expect(() => applyReadingFocus(123 as unknown as string, 0.4)).toThrow(TypeError);
    expect(() => applyReadingFocus(null as unknown as string, 0.4)).toThrow(TypeError);
  });

  it('accepts ratio = 1 (whole word bolded)', () => {
    expect(applyReadingFocus('hi', 1)).toBe('<b>hi</b>');
  });
});

// ---------------------------------------------------------------------------
// applyReadingFocus — property-based tests (algorithmic invariants)
// ---------------------------------------------------------------------------

describe('applyReadingFocus — properties (fast-check)', () => {
  it('property: output stripped of <b> tags equals HTML-escaped input', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z ]{0,40}$/u),
        fc.double({ min: 0.01, max: 1, noNaN: true }),
        (text, ratio) => {
          const out = applyReadingFocus(text, ratio);
          const stripped = out.replace(/<\/?b>/gu, '');
          // The text contains no HTML special chars in this domain → strict equality
          expect(stripped).toBe(text);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('property: every <b> wraps at least one letter', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z ]{1,40}$/u),
        fc.double({ min: 0.01, max: 1, noNaN: true }),
        (text, ratio) => {
          const out = applyReadingFocus(text, ratio);
          const matches = out.matchAll(/<b>([^<]*)<\/b>/gu);
          for (const m of matches) {
            expect(m[1]?.length).toBeGreaterThanOrEqual(1);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('property: number of <b> equals number of letter-runs in input', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9 ]{0,40}$/u),
        fc.double({ min: 0.01, max: 1, noNaN: true }),
        (text, ratio) => {
          const out = applyReadingFocus(text, ratio);
          const bCount = (out.match(/<b>/gu) || []).length;
          const letterRuns = (text.match(/[a-zA-Z]+/gu) || []).length;
          expect(bCount).toBe(letterRuns);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('property: bolded prefix length = ceil(word.length * ratio)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z]{1,20}$/u),
        fc.double({ min: 0.01, max: 1, noNaN: true }),
        (word, ratio) => {
          const out = applyReadingFocus(word, ratio);
          const m = out.match(/^<b>([^<]+)<\/b>/u);
          expect(m).not.toBeNull();
          expect(m?.[1]?.length).toBe(Math.ceil(word.length * ratio));
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// setReadingFocus — DOM application
// ---------------------------------------------------------------------------

describe('setReadingFocus — DOM application', () => {
  it('throws on invalid intensity', () => {
    expect(() => setReadingFocus('xxx' as unknown as ReadingFocusIntensity)).toThrow(TypeError);
    expect(() => setReadingFocus(null as unknown as ReadingFocusIntensity)).toThrow(TypeError);
    expect(() => setReadingFocus(undefined as unknown as ReadingFocusIntensity)).toThrow(TypeError);
  });

  it('marks the target with data-morphic-reading-focus attribute', () => {
    const main = document.createElement('main');
    main.textContent = 'hello world';
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    expect(main.getAttribute('data-morphic-reading-focus')).toBe('medium');
  });

  it('wraps words inside text nodes with <b>', () => {
    const main = document.createElement('main');
    main.textContent = 'hi yo';
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    const bolds = main.querySelectorAll('b[data-morphic-reading-focus]');
    expect(bolds.length).toBe(2);
    expect(Array.from(bolds).map((b) => b.textContent)).toEqual(['h', 'y']);
  });

  it('defaults target to document.body when not specified', () => {
    const p = document.createElement('p');
    p.textContent = 'hi yo';
    document.body.appendChild(p);
    setReadingFocus('medium');
    expect(document.body.getAttribute('data-morphic-reading-focus')).toBe('medium');
    const bolds = p.querySelectorAll('b[data-morphic-reading-focus]');
    expect(bolds.length).toBeGreaterThanOrEqual(1);
    expect(bolds[0]?.textContent).toBe('h');
  });

  it('does NOT transform text inside <script>', () => {
    const main = document.createElement('main');
    main.innerHTML = 'hello <script>var x = "world";</script>';
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    expect(main.querySelector('script')?.textContent).toBe('var x = "world";');
  });

  it('does NOT transform text inside <style>', () => {
    const main = document.createElement('main');
    main.innerHTML = 'hello <style>body { color: red; }</style>';
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    expect(main.querySelector('style')?.textContent).toBe('body { color: red; }');
  });

  it('does NOT transform text inside <textarea>', () => {
    const main = document.createElement('main');
    const ta = document.createElement('textarea');
    ta.value = 'hello world';
    main.appendChild(ta);
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    expect(main.querySelector('textarea')?.value).toBe('hello world');
  });

  it('is idempotent — running twice produces the same result', () => {
    const main = document.createElement('main');
    main.textContent = 'hello world reading';
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    const after1 = main.innerHTML;
    setReadingFocus('medium', { target: main });
    const after2 = main.innerHTML;
    expect(after2).toBe(after1);
  });

  it('updates from a previous intensity to a new one', () => {
    const main = document.createElement('main');
    main.textContent = 'reading';
    document.body.appendChild(main);
    setReadingFocus('low', { target: main });
    // low=0.3 → ceil(7*0.3)=3 → bold "rea"
    expect(main.querySelector('b[data-morphic-reading-focus]')?.textContent).toBe('rea');
    setReadingFocus('high', { target: main });
    // high=0.5 → ceil(7*0.5)=4 → bold "read"
    expect(main.querySelector('b[data-morphic-reading-focus]')?.textContent).toBe('read');
    expect(main.getAttribute('data-morphic-reading-focus')).toBe('high');
  });

  it('preserves nested HTML structure (links, spans)', () => {
    const main = document.createElement('main');
    main.innerHTML = 'click <a href="#">here</a> please';
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    const link = main.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('#');
    // Link text content also processed
    expect(link?.querySelector('b[data-morphic-reading-focus]')?.textContent).toBe('he');
  });
});

// ---------------------------------------------------------------------------
// clearReadingFocus — DOM cleanup
// ---------------------------------------------------------------------------

describe('clearReadingFocus — DOM cleanup', () => {
  it('removes the data-morphic-reading-focus attribute', () => {
    const main = document.createElement('main');
    main.textContent = 'hello';
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    expect(main.getAttribute('data-morphic-reading-focus')).toBe('medium');
    clearReadingFocus({ target: main });
    expect(main.hasAttribute('data-morphic-reading-focus')).toBe(false);
  });

  it('restores the original text content (unwraps <b>)', () => {
    const main = document.createElement('main');
    main.textContent = 'hello world';
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    clearReadingFocus({ target: main });
    expect(main.textContent).toBe('hello world');
    expect(main.querySelectorAll('b[data-morphic-reading-focus]').length).toBe(0);
  });

  it('defaults target to document.body when not specified', () => {
    document.body.appendChild(Object.assign(document.createElement('p'), { textContent: 'hi yo' }));
    setReadingFocus('medium');
    clearReadingFocus();
    expect(document.body.hasAttribute('data-morphic-reading-focus')).toBe(false);
    expect(document.body.querySelectorAll('b[data-morphic-reading-focus]').length).toBe(0);
  });

  it('is safe to call on a non-marked target (no-op)', () => {
    const main = document.createElement('main');
    main.textContent = 'plain text';
    document.body.appendChild(main);
    expect(() => clearReadingFocus({ target: main })).not.toThrow();
    expect(main.textContent).toBe('plain text');
  });

  it('does NOT unwrap user <b> tags (only our marker)', () => {
    const main = document.createElement('main');
    main.innerHTML = 'this is <b>user bold</b> text';
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    clearReadingFocus({ target: main });
    // User's <b> survives
    expect(main.querySelector('b')?.textContent).toBe('user bold');
  });
});

// ---------------------------------------------------------------------------
// Persistence — localStorage round-trip
// ---------------------------------------------------------------------------

describe('persistence', () => {
  it('writes the intensity to MORPHIC_STORAGE_KEY under sub-key readingFocus', () => {
    setReadingFocus('high');
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as Record<string, unknown>;
    expect(parsed.readingFocus).toBe('high');
  });

  it('getReadingFocus reads back the persisted intensity', () => {
    setReadingFocus('low');
    expect(getReadingFocus()).toBe('low');
  });

  it('getReadingFocus returns null when nothing persisted', () => {
    expect(getReadingFocus()).toBeNull();
  });

  it('clearReadingFocus removes the readingFocus sub-key', () => {
    setReadingFocus('medium');
    clearReadingFocus();
    expect(getReadingFocus()).toBeNull();
  });

  it('clearReadingFocus preserves other axes in storage', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', readingFocus: 'medium' }),
    );
    setReadingFocus('high');
    clearReadingFocus();
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    const parsed = JSON.parse(raw as string) as Record<string, unknown>;
    expect(parsed.theme).toBe('dark');
    expect(parsed.readingFocus).toBeUndefined();
  });

  it('setReadingFocus preserves other axes', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));
    setReadingFocus('low');
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    const parsed = JSON.parse(raw as string) as Record<string, unknown>;
    expect(parsed.theme).toBe('dark');
    expect(parsed.readingFocus).toBe('low');
  });

  it('getReadingFocus returns null on malformed storage', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not json');
    expect(getReadingFocus()).toBeNull();
  });

  it('getReadingFocus returns null when sub-key is not a valid intensity', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ readingFocus: 'xxx' }));
    expect(getReadingFocus()).toBeNull();
  });

  it('getReadingFocus returns null when stored value is null', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(null));
    expect(getReadingFocus()).toBeNull();
  });

  it('getReadingFocus returns null when stored value is an array', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify([]));
    expect(getReadingFocus()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration — set/clear/set cycles
// ---------------------------------------------------------------------------

describe('integration cycles', () => {
  it('full cycle: set → clear → set restores correctly', () => {
    const main = document.createElement('main');
    main.textContent = 'reading focus test';
    document.body.appendChild(main);

    setReadingFocus('low', { target: main });
    expect(main.getAttribute('data-morphic-reading-focus')).toBe('low');

    clearReadingFocus({ target: main });
    expect(main.textContent).toBe('reading focus test');
    expect(main.hasAttribute('data-morphic-reading-focus')).toBe(false);

    setReadingFocus('high', { target: main });
    expect(main.getAttribute('data-morphic-reading-focus')).toBe('high');
    // high=0.5 → ceil(7*0.5)=4 → bold "read"
    expect(main.querySelector('b[data-morphic-reading-focus]')?.textContent).toBe('read');
  });

  it('clear is idempotent', () => {
    const main = document.createElement('main');
    main.textContent = 'hi';
    document.body.appendChild(main);
    setReadingFocus('medium', { target: main });
    clearReadingFocus({ target: main });
    expect(() => clearReadingFocus({ target: main })).not.toThrow();
    expect(main.textContent).toBe('hi');
  });
});
