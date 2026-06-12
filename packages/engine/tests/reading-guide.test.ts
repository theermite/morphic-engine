/**
 * Tests for reading-guide axis (B-103, F-027).
 * Risk: Sensitive — coverage floor 90%.
 *
 * Three modes:
 *  - 'line'  : horizontal highlight band following cursor Y
 *  - 'mask'  : strong dim everywhere except reading band
 *  - 'ruler' : vertical bar following cursor X
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';
import {
  clearReadingGuide,
  getReadingGuide,
  MORPHIC_READING_GUIDE_DEFAULT_BAND_HEIGHT,
  MORPHIC_READING_GUIDE_DEFAULT_RULER_WIDTH,
  MORPHIC_READING_GUIDE_DEFAULT_Z_INDEX,
  MORPHIC_READING_GUIDE_MARKER,
  READING_GUIDE_MODES,
  type ReadingGuideMode,
  setReadingGuide,
} from '../src/reading-guide.js';

const MODES: readonly ReadingGuideMode[] = ['line', 'mask', 'ruler'];

function queryMarkers(): Element[] {
  return Array.from(document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}]`));
}

function dispatchMouseMove(clientX: number, clientY: number): void {
  const event = new MouseEvent('mousemove', {
    clientX,
    clientY,
    bubbles: true,
  });
  window.dispatchEvent(event);
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('class');
  localStorage.clear();
});

afterEach(() => {
  try {
    clearReadingGuide();
  } catch {
    // ignore
  }
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('reading-guide — constants', () => {
  it('exposes a frozen closed enum of modes', () => {
    expect(READING_GUIDE_MODES).toEqual(['line', 'mask', 'ruler']);
    expect(Object.isFrozen(READING_GUIDE_MODES)).toBe(true);
  });

  it('exposes a stable marker attribute name', () => {
    expect(MORPHIC_READING_GUIDE_MARKER).toBe('data-morphic-reading-guide');
  });

  it('exposes sensible default band height for line/mask modes', () => {
    expect(MORPHIC_READING_GUIDE_DEFAULT_BAND_HEIGHT).toBeGreaterThan(20);
    expect(MORPHIC_READING_GUIDE_DEFAULT_BAND_HEIGHT).toBeLessThan(200);
  });

  it('exposes sensible default ruler width', () => {
    expect(MORPHIC_READING_GUIDE_DEFAULT_RULER_WIDTH).toBeGreaterThan(0);
    expect(MORPHIC_READING_GUIDE_DEFAULT_RULER_WIDTH).toBeLessThan(20);
  });

  it('exposes a high default z-index to sit above page content', () => {
    expect(MORPHIC_READING_GUIDE_DEFAULT_Z_INDEX).toBeGreaterThanOrEqual(9990);
  });
});

describe('reading-guide — setReadingGuide validation', () => {
  it('rejects invalid mode (not in closed enum)', () => {
    expect(() => setReadingGuide('invalid' as ReadingGuideMode)).toThrow(TypeError);
    expect(() => setReadingGuide('' as ReadingGuideMode)).toThrow(TypeError);
    expect(() => setReadingGuide(null as unknown as ReadingGuideMode)).toThrow(TypeError);
    expect(() => setReadingGuide(undefined as unknown as ReadingGuideMode)).toThrow(TypeError);
    expect(() => setReadingGuide(42 as unknown as ReadingGuideMode)).toThrow(TypeError);
  });

  it('rejects non-finite bandHeight', () => {
    expect(() => setReadingGuide('line', { bandHeight: Number.NaN })).toThrow(TypeError);
    expect(() => setReadingGuide('line', { bandHeight: Number.POSITIVE_INFINITY })).toThrow(
      TypeError,
    );
  });

  it('rejects negative or zero bandHeight', () => {
    expect(() => setReadingGuide('line', { bandHeight: 0 })).toThrow(TypeError);
    expect(() => setReadingGuide('line', { bandHeight: -10 })).toThrow(TypeError);
  });

  it('rejects non-finite rulerWidth', () => {
    expect(() => setReadingGuide('ruler', { rulerWidth: Number.NaN })).toThrow(TypeError);
    expect(() => setReadingGuide('ruler', { rulerWidth: Number.POSITIVE_INFINITY })).toThrow(
      TypeError,
    );
  });

  it('rejects negative or zero rulerWidth', () => {
    expect(() => setReadingGuide('ruler', { rulerWidth: 0 })).toThrow(TypeError);
    expect(() => setReadingGuide('ruler', { rulerWidth: -5 })).toThrow(TypeError);
  });

  it('rejects dimOpacity outside [0, 1]', () => {
    expect(() => setReadingGuide('mask', { dimOpacity: -0.1 })).toThrow(TypeError);
    expect(() => setReadingGuide('mask', { dimOpacity: 1.1 })).toThrow(TypeError);
    expect(() => setReadingGuide('mask', { dimOpacity: Number.NaN })).toThrow(TypeError);
  });

  it('accepts all valid modes', () => {
    for (const mode of MODES) {
      expect(() => setReadingGuide(mode)).not.toThrow();
      clearReadingGuide();
    }
  });
});

describe('reading-guide — line mode', () => {
  it('creates marked overlay elements when set to line', () => {
    setReadingGuide('line');
    const markers = queryMarkers();
    expect(markers.length).toBeGreaterThan(0);
  });

  it('creates the marker attribute with the mode value', () => {
    setReadingGuide('line');
    const root = document.querySelector(`[${MORPHIC_READING_GUIDE_MARKER}="line"]`);
    expect(root).not.toBeNull();
  });

  it('sets pointer-events: none on overlay elements', () => {
    setReadingGuide('line');
    const markers = queryMarkers();
    for (const el of markers) {
      const style = (el as HTMLElement).style;
      expect(style.pointerEvents).toBe('none');
    }
  });

  it('positions overlays via position: fixed', () => {
    setReadingGuide('line');
    const markers = queryMarkers();
    expect(markers.length).toBeGreaterThan(0);
    for (const el of markers) {
      expect((el as HTMLElement).style.position).toBe('fixed');
    }
  });

  it('applies a high z-index to sit above page content', () => {
    setReadingGuide('line');
    const markers = queryMarkers();
    for (const el of markers) {
      const zIndex = Number.parseInt((el as HTMLElement).style.zIndex || '0', 10);
      expect(zIndex).toBeGreaterThanOrEqual(MORPHIC_READING_GUIDE_DEFAULT_Z_INDEX);
    }
  });

  it('updates band position on mousemove (Y axis)', () => {
    setReadingGuide('line');
    dispatchMouseMove(100, 300);
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="line"]`,
    ) as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.dataset.morphicCursorY).toBe('300');
  });

  it('uses the custom bandHeight when provided', () => {
    setReadingGuide('line', { bandHeight: 100 });
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="line"]`,
    ) as HTMLElement | null;
    expect(root?.dataset.morphicBandHeight).toBe('100');
  });
});

describe('reading-guide — mask mode', () => {
  it('creates marked overlay elements when set to mask', () => {
    setReadingGuide('mask');
    const root = document.querySelector(`[${MORPHIC_READING_GUIDE_MARKER}="mask"]`);
    expect(root).not.toBeNull();
  });

  it('mask mode uses a stronger default dim opacity than line mode', () => {
    setReadingGuide('line');
    const lineRoot = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="line"]`,
    ) as HTMLElement | null;
    const lineDim = Number.parseFloat(lineRoot?.dataset.morphicDimOpacity ?? '0');
    clearReadingGuide();

    setReadingGuide('mask');
    const maskRoot = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="mask"]`,
    ) as HTMLElement | null;
    const maskDim = Number.parseFloat(maskRoot?.dataset.morphicDimOpacity ?? '0');

    expect(maskDim).toBeGreaterThan(lineDim);
  });

  it('respects custom dimOpacity', () => {
    setReadingGuide('mask', { dimOpacity: 0.5 });
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="mask"]`,
    ) as HTMLElement | null;
    expect(root?.dataset.morphicDimOpacity).toBe('0.5');
  });
});

describe('reading-guide — ruler mode', () => {
  it('creates a vertical ruler when set to ruler', () => {
    setReadingGuide('ruler');
    const root = document.querySelector(`[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`);
    expect(root).not.toBeNull();
  });

  it('updates ruler position on mousemove (X axis)', () => {
    setReadingGuide('ruler');
    dispatchMouseMove(450, 200);
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`,
    ) as HTMLElement | null;
    expect(root?.dataset.morphicCursorX).toBe('450');
  });

  it('uses the custom rulerWidth when provided', () => {
    setReadingGuide('ruler', { rulerWidth: 8 });
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`,
    ) as HTMLElement | null;
    expect(root?.dataset.morphicRulerWidth).toBe('8');
  });

  it('ruler has pointer-events: none', () => {
    setReadingGuide('ruler');
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`,
    ) as HTMLElement | null;
    expect(root?.style.pointerEvents).toBe('none');
  });
});

describe('reading-guide — idempotence', () => {
  it('does not accumulate overlays on repeated setReadingGuide("line")', () => {
    setReadingGuide('line');
    setReadingGuide('line');
    setReadingGuide('line');
    const roots = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="line"]`);
    expect(roots.length).toBe(1);
  });

  it('replaces line with mask cleanly', () => {
    setReadingGuide('line');
    setReadingGuide('mask');
    const lineRoots = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="line"]`);
    const maskRoots = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="mask"]`);
    expect(lineRoots.length).toBe(0);
    expect(maskRoots.length).toBe(1);
  });

  it('keeps the ruler when a band is set on top (cumulation)', () => {
    setReadingGuide('ruler');
    setReadingGuide('line');
    const rulerRoots = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`);
    const lineRoots = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="line"]`);
    expect(rulerRoots.length).toBe(1);
    expect(lineRoots.length).toBe(1);
  });

  it('keeps the band when the ruler is set on top (cumulation)', () => {
    setReadingGuide('mask');
    setReadingGuide('ruler');
    expect(
      document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="mask"]`).length,
    ).toBe(1);
    expect(
      document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`).length,
    ).toBe(1);
  });

  it('switching the band (line -> mask) keeps a single band root and the ruler', () => {
    setReadingGuide('ruler');
    setReadingGuide('line');
    setReadingGuide('mask');
    expect(document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="line"]`).length).toBe(0);
    expect(document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="mask"]`).length).toBe(1);
    expect(document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`).length).toBe(1);
  });
});

describe('reading-guide — clearReadingGuide', () => {
  it('removes all marker elements', () => {
    setReadingGuide('line');
    expect(queryMarkers().length).toBeGreaterThan(0);
    clearReadingGuide();
    expect(queryMarkers().length).toBe(0);
  });

  it('is safe to call when nothing is active (idempotent)', () => {
    expect(() => clearReadingGuide()).not.toThrow();
    expect(() => clearReadingGuide()).not.toThrow();
  });

  it("clearReadingGuide('ruler') removes only the ruler, keeps the band", () => {
    setReadingGuide('mask');
    setReadingGuide('ruler');
    clearReadingGuide('ruler');
    expect(document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`).length).toBe(0);
    expect(document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="mask"]`).length).toBe(1);
    expect(getReadingGuide()).toEqual({ band: 'mask', ruler: false });
  });

  it("clearReadingGuide('band') removes only the band, keeps the ruler", () => {
    setReadingGuide('line');
    setReadingGuide('ruler');
    clearReadingGuide('band');
    expect(document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="line"]`).length).toBe(0);
    expect(document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`).length).toBe(1);
    expect(getReadingGuide()).toEqual({ band: null, ruler: true });
  });

  it('clearReadingGuide() with no argument removes both families', () => {
    setReadingGuide('mask');
    setReadingGuide('ruler');
    clearReadingGuide();
    expect(queryMarkers().length).toBe(0);
    expect(getReadingGuide()).toEqual({ band: null, ruler: false });
  });

  it('detaches mousemove listener (cursor position no longer tracked)', () => {
    setReadingGuide('line');
    dispatchMouseMove(100, 100);
    clearReadingGuide();

    dispatchMouseMove(200, 200);
    expect(queryMarkers().length).toBe(0);
  });
});

describe('reading-guide — persistence', () => {
  it('persists the active mode under the readingGuide sub-key', () => {
    setReadingGuide('mask');
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as Record<string, unknown>;
    expect(parsed.readingGuide).toEqual({ band: 'mask', ruler: false });
  });

  it('getReadingGuide returns the persisted state', () => {
    setReadingGuide('ruler');
    expect(getReadingGuide()).toEqual({ band: null, ruler: true });
  });

  it('getReadingGuide returns the empty state when nothing persisted', () => {
    expect(getReadingGuide()).toEqual({ band: null, ruler: false });
  });

  it('getReadingGuide coerces a legacy string value into the composite state', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ readingGuide: 'line' }));
    expect(getReadingGuide()).toEqual({ band: 'line', ruler: false });
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ readingGuide: 'ruler' }));
    expect(getReadingGuide()).toEqual({ band: null, ruler: true });
  });

  it('clearReadingGuide removes the persisted sub-key', () => {
    setReadingGuide('line');
    expect(getReadingGuide()).toEqual({ band: 'line', ruler: false });
    clearReadingGuide();
    expect(getReadingGuide()).toEqual({ band: null, ruler: false });
  });

  it('preserves other sub-keys when writing readingGuide', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ colorVision: { type: 'protan', severity: 1 }, readingFocus: 'low' }),
    );
    setReadingGuide('mask');
    const parsed = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}') as Record<
      string,
      unknown
    >;
    expect(parsed.colorVision).toEqual({ type: 'protan', severity: 1 });
    expect(parsed.readingFocus).toBe('low');
    expect(parsed.readingGuide).toEqual({ band: 'mask', ruler: false });
  });

  it('preserves other sub-keys when clearing readingGuide', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ readingFocus: 'medium', readingGuide: 'line' }),
    );
    setReadingGuide('line');
    clearReadingGuide();
    const parsed = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) ?? '{}') as Record<
      string,
      unknown
    >;
    expect(parsed.readingFocus).toBe('medium');
    expect('readingGuide' in parsed).toBe(false);
  });

  it('ignores malformed JSON in storage on read', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not json');
    expect(getReadingGuide()).toEqual({ band: null, ruler: false });
  });

  it('ignores storage entries that are not objects', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify('a string'));
    expect(getReadingGuide()).toEqual({ band: null, ruler: false });
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(getReadingGuide()).toEqual({ band: null, ruler: false });
  });

  it('ignores invalid band values in storage (keeps a valid ruler flag)', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ readingGuide: { band: 'invalid-mode', ruler: true } }),
    );
    expect(getReadingGuide()).toEqual({ band: null, ruler: true });
  });

  it('survives a localStorage write quota exception', () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('QuotaExceededError');
    };
    try {
      expect(() => setReadingGuide('line')).not.toThrow();
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });
});

describe('reading-guide — prefers-reduced-motion', () => {
  it('strips transition easing when prefers-reduced-motion is set', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    try {
      setReadingGuide('line');
      const root = document.querySelector(
        `[${MORPHIC_READING_GUIDE_MARKER}="line"]`,
      ) as HTMLElement | null;
      const transition = root?.style.transition ?? '';
      expect(transition === '' || transition === 'none').toBe(true);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('applies transition easing when reduced motion is NOT preferred', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    try {
      setReadingGuide('line');
      const root = document.querySelector(
        `[${MORPHIC_READING_GUIDE_MARKER}="line"]`,
      ) as HTMLElement | null;
      expect(root?.style.transition).toContain('ms');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

describe('reading-guide — property-based', () => {
  it('property: setReadingGuide is idempotent — repeated calls keep exactly one root', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MODES), fc.integer({ min: 1, max: 20 }), (mode, callCount) => {
        document.body.innerHTML = '';
        localStorage.clear();
        for (let i = 0; i < callCount; i++) {
          setReadingGuide(mode);
        }
        const roots = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="${mode}"]`);
        expect(roots.length).toBe(1);
        clearReadingGuide();
      }),
      { numRuns: 50 },
    );
  });

  it('property: set then clear leaves DOM clean and storage clean', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MODES), (mode) => {
        document.body.innerHTML = '';
        localStorage.clear();
        setReadingGuide(mode);
        clearReadingGuide();
        expect(queryMarkers().length).toBe(0);
        expect(getReadingGuide()).toEqual({ band: null, ruler: false });
      }),
      { numRuns: 50 },
    );
  });

  it('property: any sequence leaves at most one band root and at most one ruler root', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...MODES), { minLength: 1, maxLength: 12 }), (seq) => {
        document.body.innerHTML = '';
        localStorage.clear();
        for (const mode of seq) {
          setReadingGuide(mode);
        }
        // line and mask are mutually exclusive — never both present.
        const lineRoots = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="line"]`);
        const maskRoots = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="mask"]`);
        const rulerRoots = document.querySelectorAll(`[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`);
        expect(lineRoots.length + maskRoots.length).toBeLessThanOrEqual(1);
        expect(rulerRoots.length).toBeLessThanOrEqual(1);

        // The active state matches the last band seen and whether a ruler was set.
        const lastBand = [...seq].reverse().find((m) => m === 'line' || m === 'mask') ?? null;
        const hasRuler = seq.includes('ruler');
        expect(getReadingGuide()).toEqual({ band: lastBand, ruler: hasRuler });
        clearReadingGuide();
      }),
      { numRuns: 50 },
    );
  });

  it('property: any valid mousemove updates cursor data attrs without throwing', () => {
    setReadingGuide('line');
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4000 }), fc.integer({ min: 0, max: 4000 }), (x, y) => {
        expect(() => dispatchMouseMove(x, y)).not.toThrow();
        const root = document.querySelector(
          `[${MORPHIC_READING_GUIDE_MARKER}="line"]`,
        ) as HTMLElement | null;
        expect(root?.dataset.morphicCursorY).toBe(String(y));
      }),
      { numRuns: 200 },
    );
    clearReadingGuide();
  });
});

describe('reading-guide — full lifecycle integration', () => {
  it('full cycle: set line -> set mask -> add ruler -> clear', () => {
    setReadingGuide('line');
    expect(getReadingGuide()).toEqual({ band: 'line', ruler: false });

    setReadingGuide('mask');
    expect(getReadingGuide()).toEqual({ band: 'mask', ruler: false });

    setReadingGuide('ruler');
    expect(getReadingGuide()).toEqual({ band: 'mask', ruler: true });

    clearReadingGuide();
    expect(getReadingGuide()).toEqual({ band: null, ruler: false });
    expect(queryMarkers().length).toBe(0);
  });

  it('rehydrate scenario: storage value alone does not auto-apply DOM', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ readingGuide: { band: 'mask', ruler: true } }),
    );
    expect(getReadingGuide()).toEqual({ band: 'mask', ruler: true });
    expect(queryMarkers().length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// B-021i — Chrome-safe topOffset / bottomOffset
// ---------------------------------------------------------------------------
//
// The overlay starts BELOW topOffset and stops ABOVE bottomOffset, leaving
// host chrome (fixed navbar, mobile tab bar) untouched. Defaults are 0/0 so
// behavior is fully backward-compatible with v2.0.0-beta.3 consumers.
// ---------------------------------------------------------------------------

describe('reading-guide — B-021i chrome-safe offsets', () => {
  it('defaults topOffset/bottomOffset to 0 on line mode (backward-compat)', () => {
    setReadingGuide('line');
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="line"]`,
    ) as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.style.top).toBe('0px');
    expect(root?.style.bottom).toBe('0px');
    expect(root?.dataset.morphicTopOffset).toBe('0');
    expect(root?.dataset.morphicBottomOffset).toBe('0');
  });

  it('applies topOffset to root style.top on line mode', () => {
    setReadingGuide('line', { topOffset: 64 });
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="line"]`,
    ) as HTMLElement | null;
    expect(root?.style.top).toBe('64px');
    expect(root?.dataset.morphicTopOffset).toBe('64');
  });

  it('applies bottomOffset to root style.bottom on line mode', () => {
    setReadingGuide('line', { bottomOffset: 56 });
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="line"]`,
    ) as HTMLElement | null;
    expect(root?.style.bottom).toBe('56px');
    expect(root?.dataset.morphicBottomOffset).toBe('56');
  });

  it('applies both offsets on mask mode', () => {
    setReadingGuide('mask', { topOffset: 64, bottomOffset: 56 });
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="mask"]`,
    ) as HTMLElement | null;
    expect(root?.style.top).toBe('64px');
    expect(root?.style.bottom).toBe('56px');
    expect(root?.dataset.morphicTopOffset).toBe('64');
    expect(root?.dataset.morphicBottomOffset).toBe('56');
  });

  it('applies both offsets on ruler mode', () => {
    setReadingGuide('ruler', { topOffset: 64, bottomOffset: 56 });
    const root = document.querySelector(
      `[${MORPHIC_READING_GUIDE_MARKER}="ruler"]`,
    ) as HTMLElement | null;
    expect(root?.style.top).toBe('64px');
    expect(root?.style.bottom).toBe('56px');
    expect(root?.dataset.morphicTopOffset).toBe('64');
    expect(root?.dataset.morphicBottomOffset).toBe('56');
  });

  it('accepts 0 explicitly for both offsets (non-negative, not strict positive)', () => {
    expect(() => setReadingGuide('line', { topOffset: 0, bottomOffset: 0 })).not.toThrow();
  });

  it('rejects negative topOffset', () => {
    expect(() => setReadingGuide('line', { topOffset: -1 })).toThrow(TypeError);
  });

  it('rejects negative bottomOffset', () => {
    expect(() => setReadingGuide('ruler', { bottomOffset: -10 })).toThrow(TypeError);
  });

  it('rejects non-finite topOffset (NaN)', () => {
    expect(() => setReadingGuide('mask', { topOffset: Number.NaN })).toThrow(TypeError);
  });

  it('rejects non-finite bottomOffset (Infinity)', () => {
    expect(() => setReadingGuide('mask', { bottomOffset: Number.POSITIVE_INFINITY })).toThrow(
      TypeError,
    );
  });
});
