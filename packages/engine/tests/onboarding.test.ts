/**
 * B-013 Onboarding sensoriel-first — TDG RED tests (Critical 95% + MC/DC + PBT).
 *
 * CDC F-012 — sensoriel (theme → motion → density) AVANT identité.
 * Dignity.md §a L'ACCUEIL : confort avant catégorisation.
 */
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetOnboardingStateForTests,
  canCollectIdentity,
  completeStep,
  getOnboardingState,
  MORPHIC_ONBOARDING_EVENT_COMPLETE,
  MORPHIC_ONBOARDING_EVENT_STEP_COMPLETE,
  MORPHIC_ONBOARDING_MARKER,
  ONBOARDING_STEPS,
  type OnboardingState,
  type OnboardingStep,
  resetOnboarding,
  skipStep,
  startOnboarding,
} from '../src/onboarding.js';

describe('B-013 Onboarding — constants', () => {
  it('exports ordered steps theme → motion → density', () => {
    expect(ONBOARDING_STEPS).toEqual(['theme', 'motion', 'density']);
  });
  it('exports storage marker "morphic-onboarding"', () => {
    expect(MORPHIC_ONBOARDING_MARKER).toBe('morphic-onboarding');
  });
  it('exports event step-complete', () => {
    expect(MORPHIC_ONBOARDING_EVENT_STEP_COMPLETE).toBe('morphic:onboarding:step-complete');
  });
  it('exports event complete', () => {
    expect(MORPHIC_ONBOARDING_EVENT_COMPLETE).toBe('morphic:onboarding:complete');
  });
});

describe('B-013 Onboarding — happy path', () => {
  beforeEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });

  it('getOnboardingState returns initial idle state', () => {
    const s = getOnboardingState();
    expect(s.started).toBe(false);
    expect(s.completed).toBe(false);
    expect(s.currentStep).toBeNull();
    expect(s.completedSteps).toEqual([]);
  });

  it('startOnboarding sets currentStep to first step (theme)', () => {
    const s = startOnboarding();
    expect(s.started).toBe(true);
    expect(s.currentStep).toBe('theme');
    expect(s.completedSteps).toEqual([]);
  });

  it('completeStep advances to next step in order', () => {
    startOnboarding();
    const s1 = completeStep('theme', 'dark');
    expect(s1.currentStep).toBe('motion');
    expect(s1.completedSteps).toEqual(['theme']);
    const s2 = completeStep('motion', 'reduced');
    expect(s2.currentStep).toBe('density');
    expect(s2.completedSteps).toEqual(['theme', 'motion']);
  });

  it('completing last step (density) marks onboarding complete', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    completeStep('motion', 'reduced');
    const s = completeStep('density', 'comfortable');
    expect(s.completed).toBe(true);
    expect(s.currentStep).toBeNull();
    expect(s.completedSteps).toEqual(['theme', 'motion', 'density']);
  });
});

describe('B-013 Onboarding — identity guard (Dignity §a BLOCKING)', () => {
  beforeEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });

  it('canCollectIdentity is false before onboarding starts', () => {
    expect(canCollectIdentity()).toBe(false);
  });

  it('canCollectIdentity is false during onboarding (step 1/3)', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    expect(canCollectIdentity()).toBe(false);
  });

  it('canCollectIdentity is false at step 2/3', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    completeStep('motion', 'reduced');
    expect(canCollectIdentity()).toBe(false);
  });

  it('canCollectIdentity is true ONLY when all 3 steps complete', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    completeStep('motion', 'reduced');
    completeStep('density', 'comfortable');
    expect(canCollectIdentity()).toBe(true);
  });
});

describe('B-013 Onboarding — defensive validation', () => {
  beforeEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });

  it('completeStep before startOnboarding throws Error', () => {
    expect(() => completeStep('theme', 'dark')).toThrow(/not started/i);
  });

  it('completeStep with invalid step throws TypeError', () => {
    startOnboarding();
    expect(() => completeStep('identity' as OnboardingStep, 'x')).toThrow(TypeError);
  });

  it('completeStep with non-string value throws TypeError', () => {
    startOnboarding();
    expect(() => completeStep('theme', 42 as unknown as string)).toThrow(TypeError);
  });

  it('completeStep out-of-order throws Error', () => {
    startOnboarding();
    expect(() => completeStep('motion', 'reduced')).toThrow(/order/i);
  });

  it('completeStep on already-completed step throws Error', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    expect(() => completeStep('theme', 'dark')).toThrow(/order/i);
  });

  it('skipStep before startOnboarding throws Error', () => {
    expect(() => skipStep('theme')).toThrow(/not started/i);
  });

  it('skipStep with invalid step throws TypeError', () => {
    startOnboarding();
    expect(() => skipStep('xxx' as OnboardingStep)).toThrow(TypeError);
  });

  it('does NOT mutate state on validation failure', () => {
    startOnboarding();
    const before = getOnboardingState();
    try {
      completeStep('motion', 'reduced');
    } catch {
      // expected
    }
    const after = getOnboardingState();
    expect(after).toEqual(before);
  });
});

describe('B-013 Onboarding — skip with defaults', () => {
  beforeEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });

  it('skipStep applies default for theme (auto)', () => {
    startOnboarding();
    const s = skipStep('theme');
    expect(s.completedSteps).toEqual(['theme']);
    const root = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    expect(root.theme).toBe('auto');
  });

  it('skipStep applies default for motion (auto)', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    const s = skipStep('motion');
    expect(s.completedSteps).toEqual(['theme', 'motion']);
    const root = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    expect(root.motion).toBe('auto');
  });

  it('skipStep applies default for density (comfortable)', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    completeStep('motion', 'reduced');
    const s = skipStep('density');
    expect(s.completed).toBe(true);
    const root = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    expect(root.density).toBe('comfortable');
  });

  it('skipStep all three completes onboarding with all defaults', () => {
    startOnboarding();
    skipStep('theme');
    skipStep('motion');
    skipStep('density');
    expect(canCollectIdentity()).toBe(true);
  });
});

describe('B-013 Onboarding — events', () => {
  beforeEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });

  it('completeStep emits step-complete event with bubbles', () => {
    let captured: { step: string; value: string } | null = null;
    let bubbled = false;
    document.addEventListener(MORPHIC_ONBOARDING_EVENT_STEP_COMPLETE, (e) => {
      const detail = (e as CustomEvent).detail as { step: string; value: string };
      captured = detail;
      bubbled = (e as CustomEvent).bubbles;
    });
    startOnboarding();
    completeStep('theme', 'dark');
    expect(captured).toEqual({ step: 'theme', value: 'dark' });
    expect(bubbled).toBe(true);
  });

  it('final step emits complete event', () => {
    let completeFired = false;
    document.addEventListener(MORPHIC_ONBOARDING_EVENT_COMPLETE, () => {
      completeFired = true;
    });
    startOnboarding();
    completeStep('theme', 'dark');
    completeStep('motion', 'reduced');
    completeStep('density', 'comfortable');
    expect(completeFired).toBe(true);
  });

  it('skipStep also emits step-complete with default value', () => {
    let captured: { step: string; value: string } | null = null;
    document.addEventListener(MORPHIC_ONBOARDING_EVENT_STEP_COMPLETE, (e) => {
      captured = (e as CustomEvent).detail as { step: string; value: string };
    });
    startOnboarding();
    skipStep('theme');
    expect(captured).toEqual({ step: 'theme', value: 'auto' });
  });
});

describe('B-013 Onboarding — persistence', () => {
  beforeEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });

  it('persists onboarding state under morphic-onboarding sub-key', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    const root = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    expect(root[MORPHIC_ONBOARDING_MARKER]).toMatchObject({
      started: true,
      completed: false,
      completedSteps: ['theme'],
    });
  });

  it('writes prefs to root keys (theme, motion, density)', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    completeStep('motion', 'reduced');
    completeStep('density', 'spacious');
    const root = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    expect(root.theme).toBe('dark');
    expect(root.motion).toBe('reduced');
    expect(root.density).toBe('spacious');
  });

  it('preserves other axes in storage', () => {
    localStorage.setItem(
      'morphic-prefs',
      JSON.stringify({ 'morphic-recovery': { active: false }, fontSize: 'lg' }),
    );
    startOnboarding();
    completeStep('theme', 'dark');
    const root = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    expect(root['morphic-recovery']).toEqual({ active: false });
    expect(root.fontSize).toBe('lg');
    expect(root.theme).toBe('dark');
  });

  it('tolerates corrupted JSON in storage', () => {
    localStorage.setItem('morphic-prefs', '{not json');
    expect(() => startOnboarding()).not.toThrow();
    expect(getOnboardingState().started).toBe(true);
  });

  it('tolerates non-object storage value', () => {
    localStorage.setItem('morphic-prefs', '"a string"');
    expect(() => startOnboarding()).not.toThrow();
  });

  it('rehydrates state from storage on next getOnboardingState', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    completeStep('motion', 'reduced');
    // Simulate reload: reset in-memory state, then read
    __resetOnboardingStateForTests();
    const s = getOnboardingState();
    expect(s.started).toBe(true);
    expect(s.completedSteps).toEqual(['theme', 'motion']);
    expect(s.currentStep).toBe('density');
  });
});

describe('B-013 Onboarding — resetOnboarding', () => {
  beforeEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });

  it('resetOnboarding returns to idle state', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    const s = resetOnboarding();
    expect(s.started).toBe(false);
    expect(s.completed).toBe(false);
    expect(s.completedSteps).toEqual([]);
    expect(s.currentStep).toBeNull();
  });

  it('resetOnboarding clears storage sub-key', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    resetOnboarding();
    const raw = localStorage.getItem('morphic-prefs');
    if (raw !== null) {
      const root = JSON.parse(raw);
      expect(root[MORPHIC_ONBOARDING_MARKER]).toBeUndefined();
    }
  });

  it('resetOnboarding preserves written prefs (theme, motion)', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    completeStep('motion', 'reduced');
    resetOnboarding();
    const root = JSON.parse(localStorage.getItem('morphic-prefs') as string);
    // Prefs sont écrites par l'utilisateur — reset NE les supprime PAS
    expect(root.theme).toBe('dark');
    expect(root.motion).toBe('reduced');
  });
});

describe('B-013 Onboarding — MC/DC on canCollectIdentity guard', () => {
  beforeEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });

  // Condition: started === true AND completed === true
  // T1: started=F, completed=F → false (default)
  // T2: started=T, completed=F → false (in-progress)
  // T3: started=T, completed=T → true (done)
  // T4: state machine prevents started=F + completed=T (verified by transitions)

  it('MC/DC T1: !started, !completed → false', () => {
    expect(canCollectIdentity()).toBe(false);
  });

  it('MC/DC T2: started, !completed → false', () => {
    startOnboarding();
    expect(canCollectIdentity()).toBe(false);
  });

  it('MC/DC T3: started, completed → true', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    completeStep('motion', 'reduced');
    completeStep('density', 'comfortable');
    expect(canCollectIdentity()).toBe(true);
  });

  it('MC/DC T4: completed flag isolated — only true after density', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    expect(canCollectIdentity()).toBe(false);
    completeStep('motion', 'reduced');
    expect(canCollectIdentity()).toBe(false);
    completeStep('density', 'comfortable');
    expect(canCollectIdentity()).toBe(true);
  });
});

describe('B-013 Onboarding — PBT (Anti-Circular Layer 1)', () => {
  beforeEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });

  it('PBT: any complete-3-steps sequence ends with canCollectIdentity true', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'auto', 'high-contrast', 'sepia'),
        fc.constantFrom('full', 'reduced', 'none', 'auto'),
        fc.constantFrom('compact', 'comfortable', 'spacious'),
        (theme, motion, density) => {
          __resetOnboardingStateForTests();
          localStorage.clear();
          startOnboarding();
          completeStep('theme', theme);
          completeStep('motion', motion);
          completeStep('density', density);
          return canCollectIdentity() === true;
        },
      ),
      { numRuns: 25 },
    );
  });

  it('PBT: identity guard ALWAYS false before completion', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), (n) => {
        __resetOnboardingStateForTests();
        localStorage.clear();
        if (n === 0) return canCollectIdentity() === false;
        startOnboarding();
        if (n >= 1) completeStep('theme', 'dark');
        if (n >= 2) completeStep('motion', 'reduced');
        return canCollectIdentity() === false;
      }),
      { numRuns: 25 },
    );
  });

  it('PBT: skip and complete are interchangeable for terminal state', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }), (skips) => {
        __resetOnboardingStateForTests();
        localStorage.clear();
        startOnboarding();
        const steps: OnboardingStep[] = ['theme', 'motion', 'density'];
        steps.forEach((step, i) => {
          if (skips[i]) skipStep(step);
          else completeStep(step, step === 'density' ? 'comfortable' : 'dark');
        });
        return getOnboardingState().completed === true && canCollectIdentity() === true;
      }),
      { numRuns: 25 },
    );
  });
});

describe('B-013 Onboarding — type contract', () => {
  it('OnboardingState shape', () => {
    const s: OnboardingState = getOnboardingState();
    expect(typeof s.started).toBe('boolean');
    expect(typeof s.completed).toBe('boolean');
    expect(Array.isArray(s.completedSteps)).toBe(true);
  });
});

describe('B-013 Onboarding — edge paths', () => {
  beforeEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });
  afterEach(() => {
    __resetOnboardingStateForTests();
    localStorage.clear();
  });

  it('startOnboarding twice is idempotent (does not reset progress)', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    const s = startOnboarding();
    expect(s.completedSteps).toEqual(['theme']);
    expect(s.currentStep).toBe('motion');
  });

  it('localStorage write failure does not throw', () => {
    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota exceeded');
    };
    try {
      expect(() => startOnboarding()).not.toThrow();
      expect(() => completeStep('theme', 'dark')).not.toThrow();
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
      expect(() => getOnboardingState()).not.toThrow();
    } finally {
      Storage.prototype.getItem = origGetItem;
    }
  });

  it('storage with out-of-shape onboarding sub-key falls back to idle', () => {
    localStorage.setItem(
      'morphic-prefs',
      JSON.stringify({ [MORPHIC_ONBOARDING_MARKER]: 'not-an-object' }),
    );
    expect(getOnboardingState().started).toBe(false);
  });

  it('completeStep on done onboarding throws Error', () => {
    startOnboarding();
    completeStep('theme', 'dark');
    completeStep('motion', 'reduced');
    completeStep('density', 'comfortable');
    expect(() => completeStep('theme', 'dark')).toThrow();
  });

  it('skipStep on done onboarding throws Error', () => {
    startOnboarding();
    skipStep('theme');
    skipStep('motion');
    skipStep('density');
    expect(() => skipStep('theme')).toThrow();
  });
});
