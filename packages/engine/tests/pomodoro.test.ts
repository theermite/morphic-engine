/**
 * B-111 Pomodoro Engine — TDG RED tests (Critical 95% + mutation 75%).
 *
 * CDC F-035 — energetic axis pomodoro state machine (moteur pur).
 */
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetPomodoroStateForTests,
  getPomodoroState,
  MORPHIC_POMODORO_CYCLES_DEFAULT,
  MORPHIC_POMODORO_EVENT_BREAK_END,
  MORPHIC_POMODORO_EVENT_BREAK_START,
  MORPHIC_POMODORO_EVENT_SESSION_COMPLETE,
  MORPHIC_POMODORO_EVENT_TICK,
  MORPHIC_POMODORO_EVENT_WORK_END,
  MORPHIC_POMODORO_LONG_BREAK_DEFAULT,
  MORPHIC_POMODORO_MARKER,
  MORPHIC_POMODORO_SHORT_BREAK_DEFAULT,
  MORPHIC_POMODORO_TICK_MS,
  MORPHIC_POMODORO_WORK_DEFAULT,
  POMODORO_PHASES,
  type PomodoroOptions,
  type PomodoroPhase,
  type PomodoroState,
  pausePomodoro,
  resumePomodoro,
  skipPhase,
  startPomodoro,
  stopPomodoro,
} from '../src/pomodoro.js';

describe('B-111 Pomodoro Engine — constants', () => {
  it('exports default work duration 25 minutes', () => {
    expect(MORPHIC_POMODORO_WORK_DEFAULT).toBe(25 * 60_000);
  });
  it('exports default short break 5 minutes', () => {
    expect(MORPHIC_POMODORO_SHORT_BREAK_DEFAULT).toBe(5 * 60_000);
  });
  it('exports default long break 15 minutes', () => {
    expect(MORPHIC_POMODORO_LONG_BREAK_DEFAULT).toBe(15 * 60_000);
  });
  it('exports default cycles before long break = 4', () => {
    expect(MORPHIC_POMODORO_CYCLES_DEFAULT).toBe(4);
  });
  it('exports tick interval 1000ms', () => {
    expect(MORPHIC_POMODORO_TICK_MS).toBe(1_000);
  });
  it('exports storage marker "morphic-pomodoro"', () => {
    expect(MORPHIC_POMODORO_MARKER).toBe('morphic-pomodoro');
  });
  it('exports namespaced events on morphic:energy:pomodoro-*', () => {
    expect(MORPHIC_POMODORO_EVENT_TICK).toBe('morphic:energy:pomodoro-tick');
    expect(MORPHIC_POMODORO_EVENT_WORK_END).toBe('morphic:energy:pomodoro-work-end');
    expect(MORPHIC_POMODORO_EVENT_BREAK_START).toBe('morphic:energy:pomodoro-break-start');
    expect(MORPHIC_POMODORO_EVENT_BREAK_END).toBe('morphic:energy:pomodoro-break-end');
    expect(MORPHIC_POMODORO_EVENT_SESSION_COMPLETE).toBe(
      'morphic:energy:pomodoro-session-complete',
    );
  });
  it('exports 4 phases enum', () => {
    expect(POMODORO_PHASES).toEqual(['idle', 'work', 'short-break', 'long-break']);
  });
});

describe('B-111 Pomodoro — happy path', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('startPomodoro returns state with phase=work and full remaining', () => {
    const s = startPomodoro();
    expect(s.phase).toBe('work');
    expect(s.remainingMs).toBe(MORPHIC_POMODORO_WORK_DEFAULT);
    expect(s.cycle).toBe(0);
    expect(s.paused).toBe(false);
  });

  it('getPomodoroState returns idle initially', () => {
    expect(getPomodoroState().phase).toBe('idle');
  });

  it('stopPomodoro returns to idle', () => {
    startPomodoro();
    const s = stopPomodoro();
    expect(s.phase).toBe('idle');
    expect(s.remainingMs).toBe(0);
  });
});

describe('B-111 Pomodoro — defensive validation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('throws TypeError on non-object options', () => {
    expect(() => startPomodoro(42 as unknown as PomodoroOptions)).toThrow(TypeError);
    expect(() => startPomodoro('x' as unknown as PomodoroOptions)).toThrow(TypeError);
    expect(() => startPomodoro([] as unknown as PomodoroOptions)).toThrow(TypeError);
    expect(() => startPomodoro(null as unknown as PomodoroOptions)).toThrow(TypeError);
  });
  it('throws TypeError when workMs is not an integer', () => {
    expect(() => startPomodoro({ workMs: 1.5 })).toThrow(TypeError);
    expect(() => startPomodoro({ workMs: Number.NaN })).toThrow(TypeError);
    expect(() => startPomodoro({ workMs: Number.POSITIVE_INFINITY })).toThrow(TypeError);
    expect(() => startPomodoro({ workMs: 'x' as unknown as number })).toThrow(TypeError);
  });
  it('throws RangeError when workMs <= 0', () => {
    expect(() => startPomodoro({ workMs: 0 })).toThrow(RangeError);
    expect(() => startPomodoro({ workMs: -1 })).toThrow(RangeError);
  });
  it('throws RangeError when shortBreakMs <= 0', () => {
    expect(() => startPomodoro({ shortBreakMs: 0 })).toThrow(RangeError);
    expect(() => startPomodoro({ shortBreakMs: -1 })).toThrow(RangeError);
  });
  it('throws RangeError when longBreakMs <= 0', () => {
    expect(() => startPomodoro({ longBreakMs: 0 })).toThrow(RangeError);
    expect(() => startPomodoro({ longBreakMs: -1 })).toThrow(RangeError);
  });
  it('throws TypeError when cyclesBeforeLong is not an integer', () => {
    expect(() => startPomodoro({ cyclesBeforeLong: 1.5 })).toThrow(TypeError);
    expect(() => startPomodoro({ cyclesBeforeLong: Number.NaN })).toThrow(TypeError);
  });
  it('throws RangeError when cyclesBeforeLong < 1', () => {
    expect(() => startPomodoro({ cyclesBeforeLong: 0 })).toThrow(RangeError);
    expect(() => startPomodoro({ cyclesBeforeLong: -1 })).toThrow(RangeError);
  });
  it('does NOT mutate state on validation failure', () => {
    expect(() => startPomodoro({ workMs: -1 })).toThrow();
    expect(getPomodoroState().phase).toBe('idle');
  });
});

describe('B-111 Pomodoro — tick events (drift-corrected)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('emits tick every 1000ms with decremented remainingMs', () => {
    const ticks: number[] = [];
    document.addEventListener(MORPHIC_POMODORO_EVENT_TICK, (e) => {
      const detail = (e as CustomEvent<PomodoroState>).detail;
      ticks.push(detail.remainingMs);
    });
    startPomodoro({ workMs: 5_000 });
    vi.advanceTimersByTime(3_000);
    expect(ticks.length).toBe(3);
    expect(ticks[0]).toBe(4_000);
    expect(ticks[1]).toBe(3_000);
    expect(ticks[2]).toBe(2_000);
  });

  it('emits work-end then break-start on phase completion', () => {
    const events: string[] = [];
    document.addEventListener(MORPHIC_POMODORO_EVENT_WORK_END, () => events.push('work-end'));
    document.addEventListener(MORPHIC_POMODORO_EVENT_BREAK_START, () => events.push('break-start'));
    startPomodoro({ workMs: 2_000, shortBreakMs: 3_000 });
    vi.advanceTimersByTime(2_000);
    expect(events).toEqual(['work-end', 'break-start']);
    expect(getPomodoroState().phase).toBe('short-break');
  });

  it('emits break-end when break completes, returns to work', () => {
    const events: string[] = [];
    document.addEventListener(MORPHIC_POMODORO_EVENT_BREAK_END, () => events.push('break-end'));
    startPomodoro({ workMs: 1_000, shortBreakMs: 1_000 });
    vi.advanceTimersByTime(2_000);
    expect(events).toEqual(['break-end']);
    expect(getPomodoroState().phase).toBe('work');
    expect(getPomodoroState().cycle).toBe(1);
  });

  it('cycle counter increments after each work phase completes', () => {
    startPomodoro({ workMs: 1_000, shortBreakMs: 1_000 });
    expect(getPomodoroState().cycle).toBe(0);
    vi.advanceTimersByTime(1_000);
    expect(getPomodoroState().cycle).toBe(1);
    vi.advanceTimersByTime(1_000);
    expect(getPomodoroState().cycle).toBe(1);
    vi.advanceTimersByTime(1_000);
    expect(getPomodoroState().cycle).toBe(2);
  });
});

describe('B-111 Pomodoro — long break after N cycles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('transitions to long-break after cyclesBeforeLong work phases', () => {
    startPomodoro({ workMs: 100, shortBreakMs: 100, longBreakMs: 500, cyclesBeforeLong: 2 });
    vi.advanceTimersByTime(100);
    expect(getPomodoroState().phase).toBe('short-break');
    vi.advanceTimersByTime(100);
    expect(getPomodoroState().phase).toBe('work');
    vi.advanceTimersByTime(100);
    expect(getPomodoroState().phase).toBe('long-break');
    expect(getPomodoroState().remainingMs).toBe(500);
  });

  it('emits session-complete after long-break ends', () => {
    const events: string[] = [];
    document.addEventListener(MORPHIC_POMODORO_EVENT_SESSION_COMPLETE, () =>
      events.push('session-complete'),
    );
    startPomodoro({ workMs: 100, shortBreakMs: 100, longBreakMs: 200, cyclesBeforeLong: 1 });
    vi.advanceTimersByTime(100);
    expect(getPomodoroState().phase).toBe('long-break');
    vi.advanceTimersByTime(200);
    expect(events).toEqual(['session-complete']);
    expect(getPomodoroState().phase).toBe('idle');
  });
});

describe('B-111 Pomodoro — pause/resume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('pausePomodoro stops the timer and sets paused=true', () => {
    startPomodoro({ workMs: 5_000 });
    vi.advanceTimersByTime(2_000);
    const s = pausePomodoro();
    expect(s.paused).toBe(true);
    expect(s.remainingMs).toBe(3_000);
    const ticks: number[] = [];
    document.addEventListener(MORPHIC_POMODORO_EVENT_TICK, (e) => {
      ticks.push((e as CustomEvent<PomodoroState>).detail.remainingMs);
    });
    vi.advanceTimersByTime(5_000);
    expect(ticks.length).toBe(0);
    expect(getPomodoroState().remainingMs).toBe(3_000);
  });

  it('resumePomodoro continues from saved remainingMs', () => {
    startPomodoro({ workMs: 5_000 });
    vi.advanceTimersByTime(2_000);
    pausePomodoro();
    vi.advanceTimersByTime(10_000);
    resumePomodoro();
    vi.advanceTimersByTime(1_000);
    expect(getPomodoroState().remainingMs).toBe(2_000);
    expect(getPomodoroState().paused).toBe(false);
  });

  it('pausePomodoro is idempotent (calling on idle is no-op)', () => {
    const s = pausePomodoro();
    expect(s.phase).toBe('idle');
    expect(s.paused).toBe(false);
  });

  it('resumePomodoro is idempotent (calling on idle or non-paused is no-op)', () => {
    expect(resumePomodoro().phase).toBe('idle');
    startPomodoro({ workMs: 5_000 });
    const s = resumePomodoro();
    expect(s.paused).toBe(false);
  });
});

describe('B-111 Pomodoro — skipPhase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('skipPhase transitions immediately to next phase', () => {
    startPomodoro({ workMs: 5_000, shortBreakMs: 3_000 });
    const s = skipPhase();
    expect(s.phase).toBe('short-break');
    expect(s.remainingMs).toBe(3_000);
  });

  it('skipPhase advances cycle when leaving work', () => {
    startPomodoro({ workMs: 5_000 });
    expect(getPomodoroState().cycle).toBe(0);
    skipPhase();
    expect(getPomodoroState().cycle).toBe(1);
  });

  it('skipPhase on idle is no-op', () => {
    expect(skipPhase().phase).toBe('idle');
  });

  it('skipPhase work → long-break after cyclesBeforeLong cycles', () => {
    startPomodoro({ workMs: 1_000, shortBreakMs: 500, longBreakMs: 2_000, cyclesBeforeLong: 2 });
    skipPhase(); // work→short-break (cycle 1)
    skipPhase(); // short-break→work
    const s = skipPhase(); // work→long-break (cycle 2)
    expect(s.phase).toBe('long-break');
    expect(s.remainingMs).toBe(2_000);
  });

  it('skipPhase short-break → work', () => {
    startPomodoro({ workMs: 1_000, shortBreakMs: 500 });
    skipPhase(); // work→short-break
    const s = skipPhase(); // short-break→work
    expect(s.phase).toBe('work');
    expect(s.remainingMs).toBe(1_000);
  });

  it('skipPhase long-break → idle', () => {
    startPomodoro({ workMs: 1_000, shortBreakMs: 500, longBreakMs: 2_000, cyclesBeforeLong: 1 });
    skipPhase(); // work→long-break (cycle 1, 1 % 1 === 0)
    const s = skipPhase(); // long-break→idle
    expect(s.phase).toBe('idle');
  });

  it('startPomodoro uses default shortBreakMs when omitted', () => {
    startPomodoro({ workMs: 1_000 });
    skipPhase();
    expect(getPomodoroState().remainingMs).toBe(MORPHIC_POMODORO_SHORT_BREAK_DEFAULT);
  });
});

describe('B-111 Pomodoro — stop / replacement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('stopPomodoro is idempotent (safe when idle)', () => {
    const s = stopPomodoro();
    expect(s.phase).toBe('idle');
  });

  it('startPomodoro called twice replaces previous session', () => {
    const ticks: number[] = [];
    document.addEventListener(MORPHIC_POMODORO_EVENT_TICK, (e) => {
      ticks.push((e as CustomEvent<PomodoroState>).detail.remainingMs);
    });
    startPomodoro({ workMs: 5_000 });
    vi.advanceTimersByTime(1_000);
    startPomodoro({ workMs: 3_000 });
    vi.advanceTimersByTime(1_000);
    expect(ticks.length).toBe(2);
    expect(ticks[0]).toBe(4_000);
    expect(ticks[1]).toBe(2_000);
    expect(getPomodoroState().remainingMs).toBe(2_000);
  });

  it('stopPomodoro clears the timer (no ticks after stop)', () => {
    const ticks: number[] = [];
    document.addEventListener(MORPHIC_POMODORO_EVENT_TICK, (e) => {
      ticks.push((e as CustomEvent<PomodoroState>).detail.remainingMs);
    });
    startPomodoro({ workMs: 5_000 });
    stopPomodoro();
    vi.advanceTimersByTime(5_000);
    expect(ticks.length).toBe(0);
  });
});

describe('B-111 Pomodoro — persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('persists phase + cycle to localStorage', () => {
    startPomodoro({ workMs: 5_000 });
    vi.advanceTimersByTime(2_000);
    const raw = localStorage.getItem('morphic-prefs');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed[MORPHIC_POMODORO_MARKER]).toMatchObject({ phase: 'work', cycle: 0 });
  });

  it('stopPomodoro clears the storage entry', () => {
    startPomodoro({ workMs: 5_000 });
    stopPomodoro();
    const raw = localStorage.getItem('morphic-prefs');
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      expect(parsed[MORPHIC_POMODORO_MARKER]).toBeUndefined();
    }
  });

  it('tolerates corrupted JSON in storage', () => {
    localStorage.setItem('morphic-prefs', '{not json');
    expect(() => getPomodoroState()).not.toThrow();
    expect(getPomodoroState().phase).toBe('idle');
  });

  it('tolerates non-object storage value', () => {
    localStorage.setItem('morphic-prefs', '"a string"');
    expect(() => getPomodoroState()).not.toThrow();
    expect(getPomodoroState().phase).toBe('idle');
  });

  it('preserves other axes in storage', () => {
    localStorage.setItem(
      'morphic-prefs',
      JSON.stringify({ 'morphic-recovery': { active: false }, theme: 'dark' }),
    );
    startPomodoro({ workMs: 5_000 });
    const parsed = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    expect(parsed['morphic-recovery']).toEqual({ active: false });
    expect(parsed.theme).toBe('dark');
    expect(parsed[MORPHIC_POMODORO_MARKER]).toBeDefined();
  });
});

describe('B-111 Pomodoro — events bubble', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('events dispatched on document with bubbles=true', () => {
    let bubbled = false;
    window.addEventListener(MORPHIC_POMODORO_EVENT_TICK, () => {
      bubbled = true;
    });
    startPomodoro({ workMs: 5_000 });
    vi.advanceTimersByTime(1_000);
    expect(bubbled).toBe(true);
  });
});

describe('B-111 Pomodoro — type contract', () => {
  it('state shape matches PomodoroState contract', () => {
    const s: PomodoroState = getPomodoroState();
    const phase: PomodoroPhase = s.phase;
    expect(['idle', 'work', 'short-break', 'long-break']).toContain(phase);
    expect(typeof s.remainingMs).toBe('number');
    expect(typeof s.cycle).toBe('number');
    expect(typeof s.paused).toBe('boolean');
  });
});

describe('B-111 Pomodoro — PBT (Anti-Circular Layer 1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('PBT: valid options yield started state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000, max: 60_000 }),
        fc.integer({ min: 1_000, max: 60_000 }),
        fc.integer({ min: 1_000, max: 60_000 }),
        fc.integer({ min: 1, max: 8 }),
        (workMs, shortBreakMs, longBreakMs, cyclesBeforeLong) => {
          __resetPomodoroStateForTests();
          localStorage.clear();
          const s = startPomodoro({ workMs, shortBreakMs, longBreakMs, cyclesBeforeLong });
          return (
            s.phase === 'work' && s.remainingMs === workMs && s.cycle === 0 && s.paused === false
          );
        },
      ),
      { numRuns: 25 },
    );
  });

  it('PBT: pause then immediate resume preserves remainingMs exactly', () => {
    // Invariant : the act of pausing then immediately resuming
    // (no time advance between) leaves the remaining time unchanged.
    fc.assert(
      fc.property(
        fc.integer({ min: 2_000, max: 30_000 }),
        fc.integer({ min: 100, max: 1_500 }),
        (workMs, advanceMs) => {
          __resetPomodoroStateForTests();
          localStorage.clear();
          startPomodoro({ workMs });
          vi.advanceTimersByTime(advanceMs);
          pausePomodoro();
          const afterPause = getPomodoroState().remainingMs;
          resumePomodoro();
          const afterResume = getPomodoroState().remainingMs;
          return afterPause === afterResume && afterPause >= 0 && afterPause <= workMs;
        },
      ),
      { numRuns: 25 },
    );
  });

  it('PBT: stop returns to idle from any state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000, max: 10_000 }),
        fc.integer({ min: 100, max: 5_000 }),
        (workMs, advanceMs) => {
          __resetPomodoroStateForTests();
          localStorage.clear();
          startPomodoro({ workMs });
          vi.advanceTimersByTime(advanceMs);
          stopPomodoro();
          return getPomodoroState().phase === 'idle';
        },
      ),
      { numRuns: 25 },
    );
  });

  it('PBT: skipPhase changes phase from non-idle', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2_000, max: 30_000 }), (workMs) => {
        __resetPomodoroStateForTests();
        localStorage.clear();
        startPomodoro({ workMs });
        const before = getPomodoroState().phase;
        skipPhase();
        const after = getPomodoroState().phase;
        return before !== after;
      }),
      { numRuns: 25 },
    );
  });
});

describe('B-111 Pomodoro — MC/DC on long-break guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  // Guard: leaving work AND (newCycle % cyclesBeforeLong === 0) → long-break
  // T1: work-end + cycle reached → long-break
  // T2: work-end + cycle NOT reached → short-break
  // T3: short-break end (NOT work) → work
  // T4: long-break end → idle

  it('T1: work-end with cycle reached → long-break', () => {
    startPomodoro({ workMs: 100, longBreakMs: 500, cyclesBeforeLong: 1 });
    vi.advanceTimersByTime(100);
    expect(getPomodoroState().phase).toBe('long-break');
  });

  it('T2: work-end with cycle NOT reached → short-break', () => {
    startPomodoro({ workMs: 100, shortBreakMs: 300, cyclesBeforeLong: 4 });
    vi.advanceTimersByTime(100);
    expect(getPomodoroState().phase).toBe('short-break');
  });

  it('T3: short-break end → work', () => {
    startPomodoro({ workMs: 100, shortBreakMs: 100, cyclesBeforeLong: 4 });
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(100);
    expect(getPomodoroState().phase).toBe('work');
  });

  it('T4: long-break end → idle', () => {
    startPomodoro({ workMs: 100, longBreakMs: 200, cyclesBeforeLong: 1 });
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(200);
    expect(getPomodoroState().phase).toBe('idle');
  });
});

describe('B-111 Pomodoro — edge paths', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetPomodoroStateForTests();
    localStorage.clear();
  });

  it('__resetPomodoroStateForTests clears active timer', () => {
    const ticks: number[] = [];
    document.addEventListener(MORPHIC_POMODORO_EVENT_TICK, (e) => {
      ticks.push((e as CustomEvent<PomodoroState>).detail.remainingMs);
    });
    startPomodoro({ workMs: 5_000 });
    __resetPomodoroStateForTests();
    localStorage.clear();
    vi.advanceTimersByTime(5_000);
    expect(ticks.length).toBe(0);
  });

  it('localStorage write failure does not throw', () => {
    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota exceeded');
    };
    try {
      expect(() => startPomodoro({ workMs: 5_000 })).not.toThrow();
      expect(getPomodoroState().phase).toBe('work');
    } finally {
      Storage.prototype.setItem = origSetItem;
    }
  });

  it('localStorage read failure does not throw', () => {
    const origGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('storage disabled');
    };
    try {
      expect(() => getPomodoroState()).not.toThrow();
    } finally {
      Storage.prototype.getItem = origGetItem;
    }
  });

  it('multiple pauses are idempotent', () => {
    startPomodoro({ workMs: 5_000 });
    vi.advanceTimersByTime(1_000);
    pausePomodoro();
    const s1 = pausePomodoro();
    expect(s1.paused).toBe(true);
    expect(s1.remainingMs).toBe(4_000);
  });

  it('skipPhase after pause clears paused flag', () => {
    startPomodoro({ workMs: 5_000 });
    pausePomodoro();
    const s = skipPhase();
    expect(s.paused).toBe(false);
    expect(s.phase).toBe('short-break');
  });

  it('startPomodoro tolerates non-object JSON in storage via readRoot', () => {
    localStorage.setItem('morphic-prefs', '"a string"');
    expect(() => startPomodoro({ workMs: 5_000 })).not.toThrow();
    expect(getPomodoroState().phase).toBe('work');
  });

  it('startPomodoro tolerates malformed JSON in storage via readRoot', () => {
    localStorage.setItem('morphic-prefs', '{not json');
    expect(() => startPomodoro({ workMs: 5_000 })).not.toThrow();
    expect(getPomodoroState().phase).toBe('work');
  });

  it('startPomodoro tolerates getItem throwing via readRoot catch', () => {
    const origGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('storage disabled');
    };
    try {
      expect(() => startPomodoro({ workMs: 5_000 })).not.toThrow();
      expect(getPomodoroState().phase).toBe('work');
    } finally {
      Storage.prototype.getItem = origGetItem;
    }
  });

  it('resumePomodoro with zero remaining triggers immediate completion', () => {
    const events: string[] = [];
    document.addEventListener(MORPHIC_POMODORO_EVENT_WORK_END, () => events.push('work-end'));
    startPomodoro({ workMs: 1_000, shortBreakMs: 500 });
    vi.advanceTimersByTime(1_000); // elapsed = workMs → remaining clamped to 0 on pause
    pausePomodoro();
    resumePomodoro();
    vi.advanceTimersByTime(0); // flush scheduled setTimeout(0)
    expect(events).toContain('work-end');
  });
});
