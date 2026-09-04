/**
 * Tests for B-035 — Pomodoro Strip, progress-fill redesign (F-035 ext.).
 * Risk: Standard 80%.
 *
 * Redesigned per Jay 2026-08-30: pale grey track, fill grows + shifts
 * colour (grey -> light blue -> orange near the end) as the phase elapses,
 * then a slow breathing green pulse for a few seconds when a phase
 * completes. Not published yet (B-034's flat per-phase colour never
 * shipped), so this replaces it outright rather than deprecating.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetPomodoroStateForTests,
  computePomodoroStripFillColor,
  disablePomodoroStrip,
  enablePomodoroStrip,
  getPomodoroStripState,
  MORPHIC_POMODORO_STRIP_BREATHE_MS,
  MORPHIC_POMODORO_STRIP_FILL_MARKER,
  MORPHIC_POMODORO_STRIP_MARKER,
  MORPHIC_POMODORO_STRIP_POLL_MS,
  POMODORO_STRIP_DARK_PALETTE,
  POMODORO_STRIP_DEFAULT_RAMP_DOWN_STOP,
  POMODORO_STRIP_DEFAULT_RAMP_UP_STOP,
  POMODORO_STRIP_END_COLOR,
  POMODORO_STRIP_LIGHT_PALETTE,
  POMODORO_STRIP_MID_COLOR,
  POMODORO_STRIP_MIN_CONTRAST,
  POMODORO_STRIP_START_COLOR,
  pomodoroStripPalette,
  skipPhase,
  startPomodoro,
  stopPomodoro,
} from '../src/index.js';

function track(): HTMLElement | null {
  return document.querySelector(`[${MORPHIC_POMODORO_STRIP_MARKER}]`);
}

function fill(): HTMLElement | null {
  return document.querySelector(`[${MORPHIC_POMODORO_STRIP_FILL_MARKER}]`);
}

beforeEach(() => {
  vi.useFakeTimers();
  __resetPomodoroStateForTests();
});

afterEach(() => {
  disablePomodoroStrip();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// computePomodoroStripFillColor — pure algorithm, hand-verified reference
// values (Anti-Circular Layer 1: never test a formula against itself).
// ---------------------------------------------------------------------------

describe('pomodoro-strip / computePomodoroStripFillColor', () => {
  const start = POMODORO_STRIP_START_COLOR; // #d1d5db -> [209,213,219]
  const mid = POMODORO_STRIP_MID_COLOR; // #3b82f6 -> [59,130,246]
  const end = POMODORO_STRIP_END_COLOR; // #fb923c -> [251,146,60]
  const rampUp = 0.35;
  const rampDown = 0.85;

  it('should return the exact start colour at elapsed=0', () => {
    expect(computePomodoroStripFillColor(0, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(209, 213, 219)',
    );
  });

  it('should return the exact mid colour at elapsed=rampUpStop', () => {
    expect(computePomodoroStripFillColor(rampUp, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(59, 130, 246)',
    );
  });

  it('should hold the exact mid colour throughout the plateau', () => {
    expect(computePomodoroStripFillColor(0.6, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(59, 130, 246)',
    );
  });

  it('should return the exact mid colour at elapsed=rampDownStop', () => {
    expect(computePomodoroStripFillColor(rampDown, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(59, 130, 246)',
    );
  });

  it('should return the exact end colour at elapsed=1', () => {
    expect(computePomodoroStripFillColor(1, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(251, 146, 60)',
    );
  });

  it('should interpolate halfway between start and mid before rampUpStop', () => {
    // t = 0.175, rampUp = 0.35 -> local fraction 0.5 between start and mid.
    // R: 209 + (59-209)*0.5 = 134
    // G: 213 + (130-213)*0.5 = 171.5 -> 172
    // B: 219 + (246-219)*0.5 = 232.5 -> 233
    expect(computePomodoroStripFillColor(0.175, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(134, 172, 233)',
    );
  });

  it('should interpolate halfway between mid and end after rampDownStop', () => {
    // t = 0.925, rampDown = 0.85 -> local fraction 0.5 between mid and end.
    // R: 59 + (251-59)*0.5 = 155
    // G: 130 + (146-130)*0.5 = 138
    // B: 246 + (60-246)*0.5 = 153
    expect(computePomodoroStripFillColor(0.925, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(155, 138, 153)',
    );
  });

  it('should clamp elapsed below 0 to the start colour', () => {
    expect(computePomodoroStripFillColor(-0.5, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(209, 213, 219)',
    );
  });

  it('should clamp elapsed above 1 to the end colour', () => {
    expect(computePomodoroStripFillColor(1.5, start, mid, end, rampUp, rampDown)).toBe(
      'rgb(251, 146, 60)',
    );
  });
});

// ---------------------------------------------------------------------------
// Mounting + progressive fill
// ---------------------------------------------------------------------------

describe('pomodoro-strip / enablePomodoroStrip', () => {
  it('should mount a contrasting track + a 0%-width fill when a phase just started', () => {
    // CONTRACT CHANGED, 2026-09-04, and this test is why it took a human eye.
    //
    // It used to demand a PALE GREY track -- the very colour the fill starts
    // from. So it asserted, precisely and greenly, that the progress bar is
    // invisible at the moment it starts. Jay saw it on the real browser: « la
    // jauge est quasiment invisible, comme s'il y avait une opacite ».
    //
    // A test can pin a defect as firmly as it pins a feature. This one now
    // demands what the rail is for: something the fill can be seen against.
    startPomodoro({ workMs: 100_000 });
    enablePomodoroStrip();
    const t = track();
    const f = fill();
    expect(t).not.toBeNull();
    expect(f).not.toBeNull();
    // Compared to the palette in force, never to a frozen string: pinning a
    // literal is what made this test assert the defect twice in a row.
    const inForce = pomodoroStripPalette();
    expect(t?.style.background).toBe(inForce.track);
    expect(
      t?.style.background,
      'the rail is the fill colour again; the progress is invisible until the ramp separates them',
    ).not.toBe(inForce.start);
    expect(f?.style.width).toBe('0%');
  });

  it('should hide the track (opacity 0) when idle', () => {
    enablePomodoroStrip();
    expect(track()?.style.opacity).toBe('0');
  });

  it('should replace a previous strip rather than mounting a second one', () => {
    enablePomodoroStrip();
    enablePomodoroStrip();
    expect(document.querySelectorAll(`[${MORPHIC_POMODORO_STRIP_MARKER}]`)).toHaveLength(1);
  });

  it('should throw TypeError on an invalid position', () => {
    // @ts-expect-error deliberate invalid input for the defensive test
    expect(() => enablePomodoroStrip({ position: 'left' })).toThrow(TypeError);
  });

  it('should throw TypeError on a non-positive-integer height', () => {
    expect(() => enablePomodoroStrip({ height: 0 })).toThrow(TypeError);
    expect(() => enablePomodoroStrip({ height: 1.5 })).toThrow(TypeError);
  });

  it('should throw TypeError on a non-positive-integer zIndex', () => {
    expect(() => enablePomodoroStrip({ zIndex: -1 })).toThrow(TypeError);
  });
});

describe('pomodoro-strip / progressive fill as the phase elapses', () => {
  it('should grow the fill width and shift its colour toward mid at the halfway point', () => {
    startPomodoro({ workMs: 100_000 });
    enablePomodoroStrip();

    vi.advanceTimersByTime(50_000); // 50% elapsed
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    expect(fill()?.style.width).toBe('50%');
    expect(fill()?.style.background).toBe(
      computePomodoroStripFillColor(
        0.5,
        pomodoroStripPalette().start,
        pomodoroStripPalette().mid,
        pomodoroStripPalette().end,
        POMODORO_STRIP_DEFAULT_RAMP_UP_STOP,
        POMODORO_STRIP_DEFAULT_RAMP_DOWN_STOP,
      ),
    );
    // Sanity: by the halfway point the fill is plainly the ramp's middle, not a
    // barely-tinted start (Jay 2026-08-30: "le bleu doit être plus visible").
    // Named through the palette so the check survives a change of background.
    const mid = pomodoroStripPalette().mid;
    expect(fill()?.style.background).toBe(
      `rgb(${Number.parseInt(mid.slice(1, 3), 16)}, ${Number.parseInt(mid.slice(3, 5), 16)}, ${Number.parseInt(mid.slice(5, 7), 16)})`,
    );
  });

  it('should shift toward orange near the end of the phase', () => {
    startPomodoro({ workMs: 100_000 });
    enablePomodoroStrip();

    vi.advanceTimersByTime(95_000); // 95% elapsed
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    const bg = fill()?.style.background ?? '';
    expect(bg).toBe(
      computePomodoroStripFillColor(
        0.95,
        pomodoroStripPalette().start,
        pomodoroStripPalette().mid,
        pomodoroStripPalette().end,
        POMODORO_STRIP_DEFAULT_RAMP_UP_STOP,
        POMODORO_STRIP_DEFAULT_RAMP_DOWN_STOP,
      ),
    );
    // Sanity: at 95% the fill has moved on from the ramp's middle.
    const midColour = pomodoroStripPalette().mid;
    expect(bg).not.toBe(
      `rgb(${Number.parseInt(midColour.slice(1, 3), 16)}, ${Number.parseInt(midColour.slice(3, 5), 16)}, ${Number.parseInt(midColour.slice(5, 7), 16)})`,
    );
  });
});

// ---------------------------------------------------------------------------
// Completion — slow breathing green pulse
// ---------------------------------------------------------------------------

describe('pomodoro-strip / completion breathes green', () => {
  it('should fill 100% green and animate when a phase completes', () => {
    startPomodoro({ workMs: 10_000, shortBreakMs: 50_000 });
    enablePomodoroStrip();

    vi.advanceTimersByTime(10_000); // work phase ends naturally
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    expect(fill()?.style.width).toBe('100%');
    expect(fill()?.style.background).toBe('rgb(34, 197, 94)'); // #22c55e
    expect(fill()?.style.animation).toContain('morphic-pomodoro-breathe');
  });

  it('should stop breathing and resume the normal fill after the breathe window', () => {
    startPomodoro({ workMs: 10_000, shortBreakMs: 50_000 });
    enablePomodoroStrip();

    vi.advanceTimersByTime(10_000);
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS); // enters breathing

    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_BREATHE_MS);
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS); // breathe window elapsed

    expect(fill()?.style.animation).toBe('none');
    expect(track()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('short-break');
  });

  it('should skip the animation under prefers-reduced-motion, staying solid green', () => {
    const matchMediaMock = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('matchMedia', matchMediaMock);

    startPomodoro({ workMs: 10_000, shortBreakMs: 50_000 });
    enablePomodoroStrip();
    vi.advanceTimersByTime(10_000);
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    expect(fill()?.style.background).toBe('rgb(34, 197, 94)');
    expect(fill()?.style.animation).toBe('none');

    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// Self-correction without relying on pomodoro.ts events
// ---------------------------------------------------------------------------

describe('pomodoro-strip / polling — self-corrects even without an event', () => {
  it('should pick up a skipPhase transition (which emits no event) on the next poll', () => {
    startPomodoro({ workMs: 100_000 });
    enablePomodoroStrip();
    expect(track()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('work');

    skipPhase(); // work -> short-break, no event fired by pomodoro.ts
    expect(track()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('work'); // not yet polled

    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);
    expect(track()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('short-break');
  });

  it('should fade out after stopPomodoro once polled', () => {
    startPomodoro();
    enablePomodoroStrip();

    stopPomodoro();
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    expect(track()?.getAttribute(MORPHIC_POMODORO_STRIP_MARKER)).toBe('idle');
    expect(track()?.style.opacity).toBe('0');
  });

  it('should stop polling once disabled (no stray timer/DOM leaks)', () => {
    startPomodoro();
    enablePomodoroStrip();
    disablePomodoroStrip();

    expect(track()).toBeNull();
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS * 3);
    expect(track()).toBeNull();
  });
});

describe('pomodoro-strip / disablePomodoroStrip', () => {
  it('should be idempotent when nothing is active', () => {
    expect(() => disablePomodoroStrip()).not.toThrow();
    expect(() => disablePomodoroStrip()).not.toThrow();
  });
});

describe('pomodoro-strip / getPomodoroStripState', () => {
  it('should return null when inactive', () => {
    expect(getPomodoroStripState()).toBeNull();
  });

  it('should return the active phase and completing=false once enabled', () => {
    startPomodoro();
    enablePomodoroStrip();
    expect(getPomodoroStripState()).toEqual({ active: true, phase: 'work', completing: false });
  });

  it('should report completing=true during the breathe window', () => {
    startPomodoro({ workMs: 10_000, shortBreakMs: 50_000 });
    enablePomodoroStrip();
    vi.advanceTimersByTime(10_000);
    vi.advanceTimersByTime(MORPHIC_POMODORO_STRIP_POLL_MS);

    expect(getPomodoroStripState()).toEqual({
      active: true,
      phase: 'short-break',
      completing: true,
    });
  });
});

describe('the progress must be visible from the first second', () => {
  // TWO ROUNDS, AND THIS IS WHAT BOTH WERE MISSING.
  //
  // Jay, on the real browser: « la jauge est quasiment invisible ». The rail was
  // painted with the fill's own starting colour.
  //
  // The first fix made the rail a fixed mid grey. An independent review MEASURED
  // it: on a light chrome that grey composites to rgb(210), and the pale start of
  // the ramp is rgb(209, 213, 219). Contrast 1.03 : 1 -- the same defect, moved to
  // a background nobody had tested.
  //
  // Both versions had tests. Both compared CONSTANTS: is the rail a different
  // string than the fill, does it start with 'rgba('. A string comparison cannot
  // see a contrast, so it agreed with each version in turn.
  //
  // These tests compute the ratio instead. A palette that stops being readable
  // fails here, whatever it is spelled.

  /** WCAG 2.2 relative luminance. */
  function luminance([r, g, b]: readonly [number, number, number]): number {
    const channel = (value: number): number => {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  /** WCAG 2.2 contrast ratio, 1:1 to 21:1. */
  function contrastRatio(
    a: readonly [number, number, number],
    b: readonly [number, number, number],
  ): number {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (high + 0.05) / (low + 0.05);
  }

  function parseHex(value: string): [number, number, number] {
    const hex = value.replace('#', '');
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }

  /** `rgba(r, g, b, a)` laid over an opaque background. */
  function composite(
    rgba: string,
    background: readonly [number, number, number],
  ): [number, number, number] {
    const parts = rgba
      .replace(/^rgba?\(/, '')
      .replace(/\)$/, '')
      .split(',')
      .map((piece) => Number.parseFloat(piece.trim()));
    const [r, g, b, alpha = 1] = parts as [number, number, number, number?];
    return [
      Math.round(r * alpha + background[0] * (1 - alpha)),
      Math.round(g * alpha + background[1] * (1 - alpha)),
      Math.round(b * alpha + background[2] * (1 - alpha)),
    ];
  }

  const WHITE: readonly [number, number, number] = [255, 255, 255];
  const BLACK: readonly [number, number, number] = [0, 0, 0];

  const palettes = [
    { name: 'dark chrome', palette: POMODORO_STRIP_DARK_PALETTE, background: BLACK },
    { name: 'light chrome', palette: POMODORO_STRIP_LIGHT_PALETTE, background: WHITE },
  ];

  for (const { name, palette, background } of palettes) {
    it(`should_keep_every_ramp_colour_readable_against_its_rail_on_a_${name.split(' ')[0]}_chrome`, () => {
      const rail = composite(palette.track, background);
      for (const [phase, colour] of [
        ['start', palette.start],
        ['mid', palette.mid],
        ['end', palette.end],
      ] as const) {
        const measured = contrastRatio(parseHex(colour), rail);
        expect(
          measured,
          `on a ${name}, the ${phase} of the ramp sits at ${measured.toFixed(2)} : 1 ` +
            `against its rail. Below ${POMODORO_STRIP_MIN_CONTRAST} : 1 the progress ` +
            'stops being visible -- that is the defect this palette exists to close.',
        ).toBeGreaterThanOrEqual(POMODORO_STRIP_MIN_CONTRAST);
      }
    });

    it(`should_keep_the_rail_itself_visible_on_a_${name.split(' ')[0]}_chrome`, () => {
      // A rail nobody can see is a fill with no reference: you cannot tell how
      // far it has left to go.
      const rail = composite(palette.track, background);
      expect(
        contrastRatio(rail, background),
        `on a ${name}, the rail itself vanishes into the background`,
      ).toBeGreaterThan(1.2);
    });
  }

  it('should_refuse_the_two_palettes_that_were_already_shipped_broken', () => {
    // The pair from the original defect, and the pair from the first fix. Both
    // passed their own tests. Neither passes this one.
    const originalRail = parseHex('#d1d5db'); // the rail WAS the fill start
    expect(
      contrastRatio(parseHex('#d1d5db'), originalRail),
      'the original defect would pass this test, so this test proves nothing',
    ).toBeLessThan(POMODORO_STRIP_MIN_CONTRAST);

    const firstFixRailOnWhite = composite('rgba(127, 127, 127, 0.35)', WHITE);
    expect(
      contrastRatio(parseHex('#d1d5db'), firstFixRailOnWhite),
      'the first fix would pass this test on a light chrome, so this test proves nothing',
    ).toBeLessThan(POMODORO_STRIP_MIN_CONTRAST);
  });

  it('should_answer_a_palette_for_whatever_background_the_window_is_on', () => {
    const chosen = pomodoroStripPalette();
    expect(
      [POMODORO_STRIP_DARK_PALETTE, POMODORO_STRIP_LIGHT_PALETTE],
      'the strip mounted a palette that is neither of the two measured ones',
    ).toContainEqual(chosen);
  });
});
