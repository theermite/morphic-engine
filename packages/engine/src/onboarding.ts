/**
 * Onboarding sensoriel-first — state machine + identity guard.
 *
 * CDC ref : F-012 (Onboarding sensoriel AVANT identité, 3 écrans theme → motion → density).
 * Brick   : B-013.
 * Risk    : Critical 95% + MC/DC + PBT (Dignity §a L'ACCUEIL BLOCKING).
 *
 * Spec :
 *   - State machine: idle → started → (theme → motion → density) → completed.
 *   - `canCollectIdentity()` returns true ONLY when all 3 sensoriel steps done.
 *     This is the Dignity §a BLOCKING contract: ZÉRO identité avant sensoriel.
 *   - `completeStep(step, value)` writes the user value to the root prefs key
 *     under MORPHIC_STORAGE_KEY (consumed by morphicInit / setTheme / etc.).
 *   - `skipStep(step)` applies a documented default (theme='auto', motion='auto',
 *     density='comfortable') so a user can pass through without choosing.
 *   - Order is enforced: completeStep/skipStep on a step that is not the
 *     currentStep throws.
 *   - Events: `morphic:onboarding:step-complete` with `{step, value}` after each
 *     step ; `morphic:onboarding:complete` after the final step (density).
 *
 * Defensive contracts (≥2 per critical function per PET §5) :
 *   - Invalid step name → TypeError (poka-yoke, before any state read).
 *   - Non-string value for completeStep → TypeError.
 *   - completeStep/skipStep before startOnboarding → Error "not started".
 *   - Out-of-order or post-completion call → Error "invalid order".
 *   - State NOT mutated when validation fails (snapshot-stable).
 *   - localStorage failures (read or write) do NOT throw — in-memory state wins.
 *   - SSR-safe: document / CustomEvent / localStorage guards.
 *   - Storage corruption-tolerant: malformed JSON, non-object, or out-of-shape
 *     sub-key all fall back to idle.
 *
 * Persistence layout : the onboarding state lives under sub-key
 * `MORPHIC_ONBOARDING_MARKER` inside `MORPHIC_STORAGE_KEY`. The user values
 * (theme/motion/density) are written to the root keys so morphicInit picks
 * them up on next page load. `resetOnboarding()` only clears the sub-key —
 * the user-written prefs are preserved (RGPD-friendly: erase ceremony, not
 * choices).
 */

import { MORPHIC_STORAGE_KEY } from './init.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Ordered list of sensoriel onboarding steps. */
export const ONBOARDING_STEPS = ['theme', 'motion', 'density'] as const;

/** Step name (closed enum). */
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Storage sub-key under MORPHIC_STORAGE_KEY for onboarding state. */
export const MORPHIC_ONBOARDING_MARKER = 'morphic-onboarding' as const;

/** Event dispatched after each step completion (complete or skip). */
export const MORPHIC_ONBOARDING_EVENT_STEP_COMPLETE = 'morphic:onboarding:step-complete' as const;

/** Event dispatched once all 3 steps are done. */
export const MORPHIC_ONBOARDING_EVENT_COMPLETE = 'morphic:onboarding:complete' as const;

/** Default value applied by `skipStep` for each axis. */
const STEP_DEFAULTS: Record<OnboardingStep, string> = {
  theme: 'auto',
  motion: 'auto',
  density: 'comfortable',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Runtime state of the onboarding flow. */
export interface OnboardingState {
  /** True once the user has entered the flow at least once. */
  started: boolean;
  /** True once all 3 steps have been completed (complete or skip). */
  completed: boolean;
  /** Current step waiting for user input, or null when idle/done. */
  currentStep: OnboardingStep | null;
  /** Steps completed so far, in order. */
  completedSteps: OnboardingStep[];
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

let currentState: OnboardingState | null = null;

/**
 * Test-only reset hook. Module-level state survives across vitest test cases
 * within the same file (modules are shared per worker). Tests call this in
 * `beforeEach` to guarantee a clean slate.
 */
export function __resetOnboardingStateForTests(): void {
  currentState = null;
}

// ---------------------------------------------------------------------------
// Validation (closed enum — poka-yoke)
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidStep(value: unknown): value is OnboardingStep {
  return typeof value === 'string' && (ONBOARDING_STEPS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Storage I/O (SSR-safe, corruption-tolerant)
// ---------------------------------------------------------------------------

function readRoot(): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};
  let raw: string | null;
  try {
    raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
  } catch {
    return {};
  }
  if (raw === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  return isPlainObject(parsed) ? parsed : {};
}

function writeRoot(root: Record<string, unknown>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(root));
  } catch {
    // localStorage unavailable (private mode, quota) — in-memory wins.
  }
}

function deriveCurrentStep(
  completedSteps: readonly OnboardingStep[],
  completed: boolean,
): OnboardingStep | null {
  if (completed) return null;
  const next = ONBOARDING_STEPS[completedSteps.length];
  return next ?? null;
}

function readStoredState(): OnboardingState | null {
  const root = readRoot();
  const stored = root[MORPHIC_ONBOARDING_MARKER];
  if (!isPlainObject(stored)) return null;

  const started = stored.started;
  const completed = stored.completed;
  const rawSteps = stored.completedSteps;
  if (typeof started !== 'boolean') return null;
  if (typeof completed !== 'boolean') return null;
  if (!Array.isArray(rawSteps)) return null;

  const completedSteps = rawSteps.filter((s): s is OnboardingStep => isValidStep(s));
  return {
    started,
    completed,
    completedSteps,
    currentStep: deriveCurrentStep(completedSteps, completed),
  };
}

function getStateInternal(): OnboardingState {
  if (currentState !== null) return currentState;
  const fromStorage = readStoredState();
  if (fromStorage !== null) {
    currentState = fromStorage;
    return fromStorage;
  }
  return { started: false, completed: false, currentStep: null, completedSteps: [] };
}

function persistState(state: OnboardingState, prefWrites?: Record<string, string>): void {
  const root = readRoot();
  root[MORPHIC_ONBOARDING_MARKER] = {
    started: state.started,
    completed: state.completed,
    completedSteps: state.completedSteps,
  };
  if (prefWrites !== undefined) {
    for (const [k, v] of Object.entries(prefWrites)) {
      root[k] = v;
    }
  }
  writeRoot(root);
}

// ---------------------------------------------------------------------------
// Event dispatch (SSR-safe)
// ---------------------------------------------------------------------------

function emit(name: string, detail: Record<string, unknown>): void {
  if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
  document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------

/** Return the current onboarding state (in-memory first, then storage). */
export function getOnboardingState(): OnboardingState {
  return getStateInternal();
}

/**
 * Dignity §a BLOCKING contract — return `true` if AND ONLY IF the user has
 * completed all 3 sensoriel steps. Host apps MUST gate any identity-collection
 * UI behind this guard.
 *
 * MC/DC truth table (started AND completed):
 *  - F & F → false (initial idle)
 *  - T & F → false (in-progress)
 *  - T & T → true  (done)
 *  - F & T → impossible (state machine prevents)
 */
export function canCollectIdentity(): boolean {
  const state = getStateInternal();
  return state.started && state.completed;
}

// ---------------------------------------------------------------------------
// Mutation API
// ---------------------------------------------------------------------------

/**
 * Start (or re-enter) the onboarding flow.
 *
 * Idempotent : if already started, returns the existing state unchanged.
 * Does NOT reset completedSteps or completed flag.
 */
export function startOnboarding(): OnboardingState {
  const existing = getStateInternal();
  if (existing.started) return existing;

  const newState: OnboardingState = {
    started: true,
    completed: false,
    currentStep: 'theme',
    completedSteps: [],
  };
  currentState = newState;
  persistState(newState);
  return newState;
}

/**
 * Internal advance — shared logic between `completeStep` and `skipStep`.
 * Caller has already validated `step` is in the enum. State checks below
 * happen BEFORE any mutation (poka-yoke).
 */
function advanceStep(step: OnboardingStep, value: string): OnboardingState {
  const existing = getStateInternal();

  if (!existing.started) {
    throw new Error('onboarding: not started — call startOnboarding() first');
  }
  if (existing.completed) {
    throw new Error(
      `onboarding: invalid order — onboarding already completed, cannot advance "${step}"`,
    );
  }
  if (existing.currentStep !== step) {
    throw new Error(
      `onboarding: invalid order — expected "${String(existing.currentStep)}", got "${step}"`,
    );
  }

  const completedSteps: OnboardingStep[] = [...existing.completedSteps, step];
  const allDone = completedSteps.length === ONBOARDING_STEPS.length;
  const newState: OnboardingState = {
    started: true,
    completed: allDone,
    currentStep: deriveCurrentStep(completedSteps, allDone),
    completedSteps,
  };
  currentState = newState;
  persistState(newState, { [step]: value });

  emit(MORPHIC_ONBOARDING_EVENT_STEP_COMPLETE, { step, value });
  if (allDone) {
    emit(MORPHIC_ONBOARDING_EVENT_COMPLETE, { state: newState });
  }
  return newState;
}

/**
 * Complete the current step with a user-provided value.
 *
 * @throws {TypeError} when `step` is not in the closed enum.
 * @throws {TypeError} when `value` is not a string.
 * @throws {Error} when onboarding is not started, already done, or step is out of order.
 */
export function completeStep(step: OnboardingStep, value: string): OnboardingState {
  if (!isValidStep(step)) {
    throw new TypeError(
      `completeStep: invalid step. Expected one of ${ONBOARDING_STEPS.join(', ')}, got ${String(step)}.`,
    );
  }
  if (typeof (value as unknown) !== 'string') {
    throw new TypeError(`completeStep: value must be a string, got ${typeof (value as unknown)}.`);
  }
  return advanceStep(step, value);
}

/**
 * Skip the current step using its documented default
 * (theme='auto', motion='auto', density='comfortable').
 *
 * @throws {TypeError} when `step` is not in the closed enum.
 * @throws {Error} when onboarding is not started, already done, or step is out of order.
 */
export function skipStep(step: OnboardingStep): OnboardingState {
  if (!isValidStep(step)) {
    throw new TypeError(
      `skipStep: invalid step. Expected one of ${ONBOARDING_STEPS.join(', ')}, got ${String(step)}.`,
    );
  }
  return advanceStep(step, STEP_DEFAULTS[step]);
}

/**
 * Reset the onboarding flow to idle.
 *
 * Clears the `MORPHIC_ONBOARDING_MARKER` sub-key but does NOT touch the user's
 * written prefs (theme/motion/density) at the root level — those reflect
 * autonomous choices and survive a re-onboarding cycle.
 */
export function resetOnboarding(): OnboardingState {
  const newState: OnboardingState = {
    started: false,
    completed: false,
    currentStep: null,
    completedSteps: [],
  };
  currentState = newState;

  const root = readRoot();
  if (MORPHIC_ONBOARDING_MARKER in root) {
    delete root[MORPHIC_ONBOARDING_MARKER];
    writeRoot(root);
  }
  return newState;
}
