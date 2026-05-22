/**
 * Tests for B-109 — Recovery Mode + Ki coupling axis (F-033).
 * Risk: Critical 95% + mutation 75%.
 *
 * Anti-Circular Layer 1:
 *   - PBT: round-trip invariants (enter→exit preserves prefs) via fast-check.
 *   - MC/DC: idempotence condition + restore condition exhaustively tested.
 *
 * Defensive assertions (≥2 per critical function):
 *   - enterRecoveryMode: validates options.profile (TypeError on bad input);
 *     idempotent guard.
 *   - exitRecoveryMode: guard on inactive state.
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetCognitiveStateForTests,
  __resetRecoveryStateForTests,
  enterRecoveryMode,
  exitRecoveryMode,
  getDecisionPointsCap,
  getDensity,
  getMotion,
  getRecoveryState,
  getTheme,
  isRecoveryActive,
  MORPHIC_DECISION_POINTS_CAP_DEFAULT,
  MORPHIC_RECOVERY_EVENT_ENTER,
  MORPHIC_RECOVERY_EVENT_EXIT,
  MORPHIC_RECOVERY_MARKER,
  MORPHIC_STORAGE_KEY,
  RECOVERY_PROFILE_DEFAULT,
  type RecoveryModeState,
  type RecoveryProfile,
  setDecisionPointsCap,
  setDensity,
  setMotion,
  setTheme,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Test isolation helpers
// ---------------------------------------------------------------------------

function resetAll(): void {
  localStorage.clear();
  document.documentElement.removeAttribute('data-morphic-theme');
  document.documentElement.style.removeProperty('--morphic-theme');
  document.documentElement.style.removeProperty('--morphic-motion');
  document.documentElement.style.removeProperty('--morphic-density');
  __resetCognitiveStateForTests();
  __resetRecoveryStateForTests();
}

beforeEach(() => {
  resetAll();
});

afterEach(() => {
  resetAll();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('Constants', () => {
  it('should expose MORPHIC_RECOVERY_MARKER', () => {
    expect(MORPHIC_RECOVERY_MARKER).toBe('morphic-recovery');
  });

  it('should expose MORPHIC_RECOVERY_EVENT_ENTER', () => {
    expect(MORPHIC_RECOVERY_EVENT_ENTER).toBe('morphic:energy:recovery-enter');
  });

  it('should expose MORPHIC_RECOVERY_EVENT_EXIT', () => {
    expect(MORPHIC_RECOVERY_EVENT_EXIT).toBe('morphic:energy:recovery-exit');
  });

  it('should expose RECOVERY_PROFILE_DEFAULT with low-stim values', () => {
    expect(RECOVERY_PROFILE_DEFAULT).toEqual({
      motion: 'reduced',
      density: 'spacious',
      decisionPointsCap: 3,
      theme: 'sepia',
    });
  });

  it('should pin decisionPointsCap default to Dignity cap', () => {
    expect(RECOVERY_PROFILE_DEFAULT.decisionPointsCap).toBe(MORPHIC_DECISION_POINTS_CAP_DEFAULT);
  });
});

// ---------------------------------------------------------------------------
// enterRecoveryMode — apply profile
// ---------------------------------------------------------------------------

describe('enterRecoveryMode — apply profile', () => {
  it('should apply default low-stim profile when called without options', () => {
    enterRecoveryMode();

    expect(getMotion()).toBe('reduced');
    expect(getDensity()).toBe('spacious');
    expect(getDecisionPointsCap()).toBe(3);
    expect(getTheme()).toBe('sepia');
  });

  it('should set --morphic-motion to reduced on documentElement', () => {
    enterRecoveryMode();
    expect(document.documentElement.style.getPropertyValue('--morphic-motion')).toBe('reduced');
  });

  it('should set --morphic-density to spacious on documentElement', () => {
    enterRecoveryMode();
    expect(document.documentElement.style.getPropertyValue('--morphic-density')).toBe('spacious');
  });

  it('should set data-morphic-theme to sepia on documentElement', () => {
    enterRecoveryMode();
    expect(document.documentElement.getAttribute('data-morphic-theme')).toBe('sepia');
  });

  it('should merge partial profile override with defaults', () => {
    enterRecoveryMode({ profile: { theme: 'dark' } });

    expect(getMotion()).toBe('reduced'); // default
    expect(getDensity()).toBe('spacious'); // default
    expect(getDecisionPointsCap()).toBe(3); // default
    expect(getTheme()).toBe('dark'); // overridden
  });

  it('should accept full profile override', () => {
    enterRecoveryMode({
      profile: {
        motion: 'none',
        density: 'comfortable',
        decisionPointsCap: 2,
        theme: 'high-contrast',
      },
    });

    expect(getMotion()).toBe('none');
    expect(getDensity()).toBe('comfortable');
    expect(getDecisionPointsCap()).toBe(2);
    expect(getTheme()).toBe('high-contrast');
  });

  it('should return RecoveryModeState with active=true', () => {
    const state = enterRecoveryMode();
    expect(state.active).toBe(true);
    expect(state.profile).toEqual(RECOVERY_PROFILE_DEFAULT);
    expect(state.snapshot).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// enterRecoveryMode — snapshot capture
// ---------------------------------------------------------------------------

describe('enterRecoveryMode — snapshot capture', () => {
  it('should snapshot current motion before applying recovery', () => {
    setMotion('full');
    const state = enterRecoveryMode();
    expect(state.snapshot?.motion).toBe('full');
  });

  it('should snapshot current density before applying recovery', () => {
    setDensity('compact');
    const state = enterRecoveryMode();
    expect(state.snapshot?.density).toBe('compact');
  });

  it('should snapshot current decisionPointsCap before applying recovery', () => {
    setDecisionPointsCap(5);
    const state = enterRecoveryMode();
    expect(state.snapshot?.decisionPointsCap).toBe(5);
  });

  it('should snapshot current theme before applying recovery', () => {
    setTheme('dark');
    const state = enterRecoveryMode();
    expect(state.snapshot?.theme).toBe('dark');
  });

  it('should snapshot default values when no prefs set', () => {
    const state = enterRecoveryMode();
    // When nothing is set, getX() returns null; snapshot uses 'auto' fallback
    // except decisionPointsCap which defaults to MORPHIC_DECISION_POINTS_CAP_DEFAULT.
    expect(state.snapshot?.motion).toBe('auto');
    expect(state.snapshot?.density).toBe('auto');
    expect(state.snapshot?.theme).toBe('auto');
    expect(state.snapshot?.decisionPointsCap).toBe(MORPHIC_DECISION_POINTS_CAP_DEFAULT);
  });
});

// ---------------------------------------------------------------------------
// enterRecoveryMode — idempotence (MC/DC: already-active condition)
// ---------------------------------------------------------------------------

describe('enterRecoveryMode — idempotence', () => {
  it('should be no-op when already active (snapshot preserved)', () => {
    setMotion('full');
    setDensity('compact');
    const firstState = enterRecoveryMode();
    const firstSnapshot = firstState.snapshot;

    // Now apply different prefs and re-enter — snapshot should NOT change.
    const secondState = enterRecoveryMode({ profile: { theme: 'dark' } });

    expect(secondState.snapshot).toEqual(firstSnapshot);
    // Profile remains the FIRST profile (idempotent — second call is no-op).
    expect(secondState.profile).toEqual(firstState.profile);
  });

  it('should NOT emit recovery-enter event on second call when already active', () => {
    const listener = vi.fn();
    window.addEventListener(MORPHIC_RECOVERY_EVENT_ENTER, listener);

    enterRecoveryMode();
    expect(listener).toHaveBeenCalledTimes(1);

    enterRecoveryMode();
    expect(listener).toHaveBeenCalledTimes(1); // no second emission

    window.removeEventListener(MORPHIC_RECOVERY_EVENT_ENTER, listener);
  });
});

// ---------------------------------------------------------------------------
// enterRecoveryMode — events
// ---------------------------------------------------------------------------

describe('enterRecoveryMode — events', () => {
  it('should emit morphic:energy:recovery-enter on window', () => {
    const listener = vi.fn();
    window.addEventListener(MORPHIC_RECOVERY_EVENT_ENTER, listener);

    enterRecoveryMode();

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]?.[0] as CustomEvent<RecoveryModeState>;
    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.detail.active).toBe(true);
    expect(event.detail.profile).toEqual(RECOVERY_PROFILE_DEFAULT);

    window.removeEventListener(MORPHIC_RECOVERY_EVENT_ENTER, listener);
  });

  it('event should bubble', () => {
    const listener = vi.fn();
    document.addEventListener(MORPHIC_RECOVERY_EVENT_ENTER, listener);

    enterRecoveryMode();
    expect(listener).toHaveBeenCalledTimes(1);

    document.removeEventListener(MORPHIC_RECOVERY_EVENT_ENTER, listener);
  });
});

// ---------------------------------------------------------------------------
// enterRecoveryMode — defensive assertions
// ---------------------------------------------------------------------------

describe('enterRecoveryMode — defensive assertions', () => {
  it('should throw TypeError on invalid motion in profile', () => {
    expect(() => enterRecoveryMode({ profile: { motion: 'banana' as never } })).toThrow(TypeError);
  });

  it('should throw TypeError on invalid density in profile', () => {
    expect(() => enterRecoveryMode({ profile: { density: 'huge' as never } })).toThrow(TypeError);
  });

  it('should throw TypeError on invalid theme in profile', () => {
    expect(() => enterRecoveryMode({ profile: { theme: 'rainbow' as never } })).toThrow(TypeError);
  });

  it('should throw TypeError on invalid decisionPointsCap in profile', () => {
    expect(() => enterRecoveryMode({ profile: { decisionPointsCap: -1 } })).toThrow(TypeError);
  });

  it('should throw TypeError on non-integer decisionPointsCap', () => {
    expect(() => enterRecoveryMode({ profile: { decisionPointsCap: 2.5 } })).toThrow(TypeError);
  });

  it('should throw TypeError when options is not a plain object', () => {
    expect(() => enterRecoveryMode('foo' as never)).toThrow(TypeError);
  });

  it('should throw TypeError when options.profile is not a plain object', () => {
    expect(() => enterRecoveryMode({ profile: 'bad' as never })).toThrow(TypeError);
  });

  it('should NOT mutate state when validation fails', () => {
    expect(() => enterRecoveryMode({ profile: { theme: 'rainbow' as never } })).toThrow(TypeError);
    expect(isRecoveryActive()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// exitRecoveryMode — restore from snapshot
// ---------------------------------------------------------------------------

describe('exitRecoveryMode — restore from snapshot', () => {
  it('should restore motion to pre-recovery value', () => {
    setMotion('full');
    enterRecoveryMode();
    expect(getMotion()).toBe('reduced');

    exitRecoveryMode();
    expect(getMotion()).toBe('full');
  });

  it('should restore density to pre-recovery value', () => {
    setDensity('compact');
    enterRecoveryMode();
    expect(getDensity()).toBe('spacious');

    exitRecoveryMode();
    expect(getDensity()).toBe('compact');
  });

  it('should restore theme to pre-recovery value', () => {
    setTheme('dark');
    enterRecoveryMode();
    expect(getTheme()).toBe('sepia');

    exitRecoveryMode();
    expect(getTheme()).toBe('dark');
  });

  it('should restore decisionPointsCap to pre-recovery value', () => {
    setDecisionPointsCap(7);
    enterRecoveryMode();
    expect(getDecisionPointsCap()).toBe(3);

    exitRecoveryMode();
    expect(getDecisionPointsCap()).toBe(7);
  });

  it('should mark state inactive after exit', () => {
    enterRecoveryMode();
    expect(isRecoveryActive()).toBe(true);

    exitRecoveryMode();
    expect(isRecoveryActive()).toBe(false);
  });

  it('should clear snapshot after exit', () => {
    enterRecoveryMode();
    const stateAfterExit = exitRecoveryMode();
    expect(stateAfterExit.snapshot).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// exitRecoveryMode — no-op when inactive (MC/DC: !active branch)
// ---------------------------------------------------------------------------

describe('exitRecoveryMode — no-op when inactive', () => {
  it('should be no-op when never entered', () => {
    setMotion('full');
    const state = exitRecoveryMode();

    expect(state.active).toBe(false);
    expect(state.snapshot).toBeNull();
    expect(getMotion()).toBe('full'); // unchanged
  });

  it('should NOT emit recovery-exit event when never active', () => {
    const listener = vi.fn();
    window.addEventListener(MORPHIC_RECOVERY_EVENT_EXIT, listener);

    exitRecoveryMode();
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener(MORPHIC_RECOVERY_EVENT_EXIT, listener);
  });

  it('should be no-op on second exit call', () => {
    enterRecoveryMode();
    exitRecoveryMode();

    const listener = vi.fn();
    window.addEventListener(MORPHIC_RECOVERY_EVENT_EXIT, listener);

    exitRecoveryMode();
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener(MORPHIC_RECOVERY_EVENT_EXIT, listener);
  });
});

// ---------------------------------------------------------------------------
// exitRecoveryMode — events
// ---------------------------------------------------------------------------

describe('exitRecoveryMode — events', () => {
  it('should emit morphic:energy:recovery-exit on window when active', () => {
    enterRecoveryMode();

    const listener = vi.fn();
    window.addEventListener(MORPHIC_RECOVERY_EVENT_EXIT, listener);

    exitRecoveryMode();

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]?.[0] as CustomEvent<RecoveryModeState>;
    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.detail.active).toBe(false);

    window.removeEventListener(MORPHIC_RECOVERY_EVENT_EXIT, listener);
  });
});

// ---------------------------------------------------------------------------
// isRecoveryActive / getRecoveryState
// ---------------------------------------------------------------------------

describe('isRecoveryActive / getRecoveryState', () => {
  it('isRecoveryActive returns false initially', () => {
    expect(isRecoveryActive()).toBe(false);
  });

  it('isRecoveryActive returns true after enter', () => {
    enterRecoveryMode();
    expect(isRecoveryActive()).toBe(true);
  });

  it('isRecoveryActive returns false after exit', () => {
    enterRecoveryMode();
    exitRecoveryMode();
    expect(isRecoveryActive()).toBe(false);
  });

  it('getRecoveryState returns inactive state initially', () => {
    const state = getRecoveryState();
    expect(state.active).toBe(false);
    expect(state.snapshot).toBeNull();
  });

  it('getRecoveryState returns active state after enter', () => {
    enterRecoveryMode();
    const state = getRecoveryState();
    expect(state.active).toBe(true);
    expect(state.snapshot).not.toBeNull();
  });

  it('getRecoveryState should reflect storage when in-memory is empty', () => {
    // Simulate session resumed: write to localStorage directly, then read.
    const persisted = {
      [MORPHIC_RECOVERY_MARKER]: {
        active: true,
        profile: RECOVERY_PROFILE_DEFAULT,
        snapshot: {
          motion: 'full',
          density: 'comfortable',
          decisionPointsCap: 3,
          theme: 'light',
        },
      },
    };
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(persisted));
    __resetRecoveryStateForTests();

    const state = getRecoveryState();
    expect(state.active).toBe(true);
    expect(state.snapshot?.motion).toBe('full');
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe('Persistence', () => {
  it('should persist active=true under MORPHIC_RECOVERY_MARKER sub-key', () => {
    enterRecoveryMode();
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as Record<string, unknown>;
    expect(parsed[MORPHIC_RECOVERY_MARKER]).toMatchObject({
      active: true,
    });
  });

  it('should clear MORPHIC_RECOVERY_MARKER on exit', () => {
    enterRecoveryMode();
    exitRecoveryMode();
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    if (raw === null) return; // nothing to verify
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed[MORPHIC_RECOVERY_MARKER]).toBeUndefined();
  });

  it('should preserve other axes in storage', () => {
    setMotion('full');
    setTheme('dark');
    enterRecoveryMode();

    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    const parsed = JSON.parse(raw as string) as Record<string, unknown>;
    // motion/theme keys still present (overwritten by recovery values, but key exists)
    expect(parsed.motion).toBeDefined();
    expect(parsed.theme).toBeDefined();
    expect(parsed[MORPHIC_RECOVERY_MARKER]).toBeDefined();
  });

  it('should survive localStorage failure on enter (in-memory wins)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => enterRecoveryMode()).not.toThrow();
    expect(isRecoveryActive()).toBe(true);

    setItemSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// MC/DC — exit restore condition (active && hasSnapshot)
// ---------------------------------------------------------------------------

describe('MC/DC — exit condition (active && hasSnapshot)', () => {
  it('T1: active=true, hasSnapshot=true → restore happens', () => {
    setMotion('full');
    enterRecoveryMode();
    exitRecoveryMode();
    expect(getMotion()).toBe('full');
  });

  it('T2: active=false, hasSnapshot=true (impossible in practice, no-op via guard)', () => {
    // Manually inject inconsistent state via storage
    const persisted = {
      [MORPHIC_RECOVERY_MARKER]: {
        active: false,
        profile: RECOVERY_PROFILE_DEFAULT,
        snapshot: {
          motion: 'full',
          density: 'comfortable',
          decisionPointsCap: 3,
          theme: 'light',
        },
      },
    };
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(persisted));
    __resetRecoveryStateForTests();

    setMotion('reduced');
    exitRecoveryMode(); // no-op because active=false
    expect(getMotion()).toBe('reduced'); // unchanged
  });

  it('T3: active=true, hasSnapshot=false (defensive — no-op restore)', () => {
    // Manually inject inconsistent state: active without snapshot
    const persisted = {
      [MORPHIC_RECOVERY_MARKER]: {
        active: true,
        profile: RECOVERY_PROFILE_DEFAULT,
        snapshot: null,
      },
    };
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(persisted));
    __resetRecoveryStateForTests();

    setMotion('reduced');
    const state = exitRecoveryMode();
    // No restoration possible but still flips active to false
    expect(state.active).toBe(false);
  });

  it('T4: active=false, hasSnapshot=false → no-op', () => {
    setMotion('reduced');
    exitRecoveryMode();
    expect(getMotion()).toBe('reduced');
  });
});

// ---------------------------------------------------------------------------
// PBT — round-trip invariants
// ---------------------------------------------------------------------------

describe('PBT — round-trip invariants', () => {
  it('PBT: enter→exit restores motion to original value', () => {
    fc.assert(
      fc.property(fc.constantFrom('full', 'reduced', 'none', 'auto'), (initialMotion) => {
        resetAll();
        setMotion(initialMotion as never);
        enterRecoveryMode();
        exitRecoveryMode();
        expect(getMotion()).toBe(initialMotion);
      }),
      { numRuns: 20 },
    );
  });

  it('PBT: enter→exit restores density to original value', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('compact', 'comfortable', 'spacious', 'auto'),
        (initialDensity) => {
          resetAll();
          setDensity(initialDensity as never);
          enterRecoveryMode();
          exitRecoveryMode();
          expect(getDensity()).toBe(initialDensity);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('PBT: enter→exit restores theme to original value', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'auto', 'high-contrast', 'sepia'),
        (initialTheme) => {
          resetAll();
          setTheme(initialTheme as never);
          enterRecoveryMode();
          exitRecoveryMode();
          expect(getTheme()).toBe(initialTheme);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('PBT: enter→exit restores decisionPointsCap (1..20)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (initialCap) => {
        resetAll();
        setDecisionPointsCap(initialCap);
        enterRecoveryMode();
        exitRecoveryMode();
        expect(getDecisionPointsCap()).toBe(initialCap);
      }),
      { numRuns: 20 },
    );
  });

  it('PBT: invariant — snapshot is non-null iff active', () => {
    fc.assert(
      fc.property(fc.boolean(), (enterFirst) => {
        resetAll();
        if (enterFirst) enterRecoveryMode();
        const state = getRecoveryState();
        if (state.active) {
          expect(state.snapshot).not.toBeNull();
        } else {
          expect(state.snapshot).toBeNull();
        }
      }),
      { numRuns: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// SSR safety
// ---------------------------------------------------------------------------

describe('SSR safety', () => {
  it('isRecoveryActive should not throw if storage is unavailable', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => isRecoveryActive()).not.toThrow();
    expect(isRecoveryActive()).toBe(false);

    getItemSpy.mockRestore();
  });

  it('getRecoveryState should not throw on malformed storage', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, 'not-json');
    __resetRecoveryStateForTests();
    expect(() => getRecoveryState()).not.toThrow();
    expect(getRecoveryState().active).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Type contract
// ---------------------------------------------------------------------------

describe('Type contract', () => {
  it('RecoveryProfile type matches default shape', () => {
    const profile: RecoveryProfile = {
      motion: 'reduced',
      density: 'spacious',
      decisionPointsCap: 3,
      theme: 'sepia',
    };
    expect(profile).toEqual(RECOVERY_PROFILE_DEFAULT);
  });

  it('RecoveryModeState shape is stable', () => {
    const state: RecoveryModeState = enterRecoveryMode();
    expect(state).toHaveProperty('active');
    expect(state).toHaveProperty('profile');
    expect(state).toHaveProperty('snapshot');
  });
});
