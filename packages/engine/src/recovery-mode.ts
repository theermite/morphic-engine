/**
 * Axe Recovery Mode — runtime API for the morphic energetic axis.
 *
 * CDC ref : F-033 (Recovery mode low-stim profile couplé Ki Shinkofa).
 * Brick   : B-109.
 * Risk    : Critical 95% (energy axis — fatigue/sensory cap = BLOCKING Dignity §a + §b).
 *
 * Spec :
 *   - `enterRecoveryMode(options?)` snapshots current sensory/cognitive prefs,
 *     applies a low-stim profile (motion=reduced, density=spacious,
 *     decisionPointsCap=3, theme=sepia by default), persists state, and
 *     dispatches `morphic:energy:recovery-enter` on window.
 *   - `exitRecoveryMode()` restores the snapshot, clears state, dispatches
 *     `morphic:energy:recovery-exit` on window.
 *   - `isRecoveryActive()` / `getRecoveryState()` read the current state
 *     (in-memory cache first, then localStorage).
 *
 * Ki coupling : unidirectional. The engine exposes events and accepts an
 * optional profile override. Host apps (Shinkofa) listen to events and
 * trigger enter/exit based on their own Ki logic — zero engine→Shinkofa
 * dependency.
 *
 * Defensive contracts (≥2 per critical function per PET §5) :
 *   - All public mutators validate input shape + enum values (poka-yoke).
 *   - Idempotent : enter while active = no-op, snapshot preserved.
 *   - localStorage failures do NOT throw — in-memory state wins.
 *   - SSR-safe : window/CustomEvent guards.
 *   - State NOT mutated when validation fails.
 *   - MC/DC exit guard : restore happens iff (active && hasSnapshot).
 *
 * Persistence layout : the recovery state lives under a sub-key
 * `MORPHIC_RECOVERY_MARKER` inside `MORPHIC_STORAGE_KEY`, preserving the
 * other axes' keys.
 */

import {
  getDecisionPointsCap,
  MORPHIC_DECISION_POINTS_CAP_DEFAULT,
  MORPHIC_DECISION_POINTS_CAP_MAX,
  setDecisionPointsCap,
} from './cognitive.js';
import { type DensityChoice, getDensity, setDensity } from './density.js';
import { MORPHIC_STORAGE_KEY } from './init.js';
import { getMotion, type MotionChoice, setMotion } from './motion.js';
import { getTheme, setTheme, type ThemeChoice } from './theme.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Storage sub-key under MORPHIC_STORAGE_KEY for recovery mode state. */
export const MORPHIC_RECOVERY_MARKER = 'morphic-recovery' as const;

/** Window event dispatched when recovery mode is entered. */
export const MORPHIC_RECOVERY_EVENT_ENTER = 'morphic:energy:recovery-enter' as const;

/** Window event dispatched when recovery mode is exited. */
export const MORPHIC_RECOVERY_EVENT_EXIT = 'morphic:energy:recovery-exit' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Concrete profile applied to the DOM during recovery — no 'auto' values. */
export type RecoveryProfile = {
  motion: 'full' | 'reduced' | 'none';
  density: 'compact' | 'comfortable' | 'spacious';
  decisionPointsCap: number;
  theme: 'light' | 'dark' | 'high-contrast' | 'sepia';
};

/** Snapshot captured before entering — preserves user choice including 'auto'. */
export type RecoveryPrefsSnapshot = {
  motion: MotionChoice;
  density: DensityChoice;
  decisionPointsCap: number;
  theme: ThemeChoice;
};

/** Runtime state of the recovery axis. */
export type RecoveryModeState = {
  active: boolean;
  profile: RecoveryProfile;
  snapshot: RecoveryPrefsSnapshot | null;
};

/** Options accepted by `enterRecoveryMode`. */
export type RecoveryModeOptions = {
  /** Override one or more low-stim profile values. */
  profile?: Partial<RecoveryProfile>;
};

// ---------------------------------------------------------------------------
// Default profile — pinned to Dignity §a Cognitive Load ceiling
// ---------------------------------------------------------------------------

/** Default low-stim profile applied on `enterRecoveryMode()`. */
export const RECOVERY_PROFILE_DEFAULT: RecoveryProfile = {
  motion: 'reduced',
  density: 'spacious',
  decisionPointsCap: MORPHIC_DECISION_POINTS_CAP_DEFAULT,
  theme: 'sepia',
};

// ---------------------------------------------------------------------------
// In-memory cache (survives localStorage failures)
// ---------------------------------------------------------------------------

let currentState: RecoveryModeState | null = null;

/**
 * Test-only reset hook. Module-level `currentState` survives across vitest
 * test cases within the same file (modules are shared per worker). Tests
 * call this in `beforeEach` to guarantee a clean slate.
 */
export function __resetRecoveryStateForTests(): void {
  currentState = null;
}

// ---------------------------------------------------------------------------
// Validation helpers (closed enum poka-yoke)
// ---------------------------------------------------------------------------

const VALID_PROFILE_MOTIONS = ['full', 'reduced', 'none'] as const;
const VALID_PROFILE_DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
const VALID_PROFILE_THEMES = ['light', 'dark', 'high-contrast', 'sepia'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidProfileMotion(v: unknown): v is RecoveryProfile['motion'] {
  return typeof v === 'string' && (VALID_PROFILE_MOTIONS as readonly string[]).includes(v);
}

function isValidProfileDensity(v: unknown): v is RecoveryProfile['density'] {
  return typeof v === 'string' && (VALID_PROFILE_DENSITIES as readonly string[]).includes(v);
}

function isValidProfileTheme(v: unknown): v is RecoveryProfile['theme'] {
  return typeof v === 'string' && (VALID_PROFILE_THEMES as readonly string[]).includes(v);
}

function isValidCap(v: unknown): v is number {
  return (
    typeof v === 'number' &&
    Number.isFinite(v) &&
    Number.isInteger(v) &&
    v > 0 &&
    v <= MORPHIC_DECISION_POINTS_CAP_MAX
  );
}

function validatePartialProfile(partial: Record<string, unknown>): void {
  if ('motion' in partial && !isValidProfileMotion(partial.motion)) {
    throw new TypeError(
      `enterRecoveryMode: invalid profile.motion. Expected one of ${VALID_PROFILE_MOTIONS.join(', ')}, got ${String(partial.motion)}.`,
    );
  }
  if ('density' in partial && !isValidProfileDensity(partial.density)) {
    throw new TypeError(
      `enterRecoveryMode: invalid profile.density. Expected one of ${VALID_PROFILE_DENSITIES.join(', ')}, got ${String(partial.density)}.`,
    );
  }
  if ('theme' in partial && !isValidProfileTheme(partial.theme)) {
    throw new TypeError(
      `enterRecoveryMode: invalid profile.theme. Expected one of ${VALID_PROFILE_THEMES.join(', ')}, got ${String(partial.theme)}.`,
    );
  }
  if ('decisionPointsCap' in partial && !isValidCap(partial.decisionPointsCap)) {
    throw new TypeError(
      `enterRecoveryMode: invalid profile.decisionPointsCap. Expected integer 1..${MORPHIC_DECISION_POINTS_CAP_MAX}, got ${String(partial.decisionPointsCap)}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Storage I/O
// ---------------------------------------------------------------------------

function readStorageState(): RecoveryModeState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;

  const stored = parsed[MORPHIC_RECOVERY_MARKER];
  if (!isPlainObject(stored)) return null;

  const active = stored.active;
  if (typeof active !== 'boolean') return null;

  const profile = isPlainObject(stored.profile)
    ? (stored.profile as RecoveryProfile)
    : RECOVERY_PROFILE_DEFAULT;

  const snapshot = isPlainObject(stored.snapshot)
    ? (stored.snapshot as RecoveryPrefsSnapshot)
    : null;

  return { active, profile, snapshot };
}

function writeStorageState(state: RecoveryModeState | null): void {
  try {
    let existing: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (isPlainObject(parsed)) existing = parsed;
      }
    } catch {
      existing = {};
    }
    if (state === null) {
      delete existing[MORPHIC_RECOVERY_MARKER];
    } else {
      existing[MORPHIC_RECOVERY_MARKER] = state;
    }
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable (private mode, quota) — in-memory wins.
  }
}

function getStateInternal(): RecoveryModeState {
  if (currentState !== null) return currentState;
  const fromStorage = readStorageState();
  if (fromStorage !== null) {
    currentState = fromStorage;
    return fromStorage;
  }
  return { active: false, profile: RECOVERY_PROFILE_DEFAULT, snapshot: null };
}

// ---------------------------------------------------------------------------
// Event dispatch (SSR-safe)
// ---------------------------------------------------------------------------

function emitRecoveryEvent(name: string, detail: RecoveryModeState): void {
  if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
  // Dispatch on document so listeners on either document or window
  // (via bubble-up) receive the event.
  document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}

// ---------------------------------------------------------------------------
// enterRecoveryMode — main entry
// ---------------------------------------------------------------------------

/**
 * Enter recovery mode : snapshot current prefs and apply a low-stim profile.
 *
 * Idempotent : if already active, returns the existing state without
 * mutating the snapshot and without emitting a second event.
 *
 * @throws {TypeError} when options or profile values are invalid.
 */
export function enterRecoveryMode(options?: RecoveryModeOptions): RecoveryModeState {
  // Defensive : validate input shape BEFORE any state mutation.
  if (options !== undefined && !isPlainObject(options)) {
    throw new TypeError(
      `enterRecoveryMode: options must be a plain object, got ${String(options)}.`,
    );
  }

  const partialProfile = options?.profile;
  if (partialProfile !== undefined) {
    if (!isPlainObject(partialProfile)) {
      throw new TypeError(
        `enterRecoveryMode: options.profile must be a plain object, got ${String(partialProfile)}.`,
      );
    }
    validatePartialProfile(partialProfile);
  }

  const existing = getStateInternal();
  if (existing.active) {
    // Idempotent : preserve snapshot, no second event.
    return existing;
  }

  // Capture snapshot BEFORE applying recovery profile.
  // null choices (user never set the axis) fall back to 'auto' for clean restore.
  const snapshot: RecoveryPrefsSnapshot = {
    motion: getMotion() ?? 'auto',
    density: getDensity() ?? 'auto',
    theme: getTheme() ?? 'auto',
    decisionPointsCap: getDecisionPointsCap(),
  };

  // Compute effective profile (default + override).
  const profile: RecoveryProfile = {
    ...RECOVERY_PROFILE_DEFAULT,
    ...(partialProfile as Partial<RecoveryProfile> | undefined),
  };

  // Apply profile to DOM + storage via existing axis setters.
  setMotion(profile.motion);
  setDensity(profile.density);
  setTheme(profile.theme);
  setDecisionPointsCap(profile.decisionPointsCap);

  const newState: RecoveryModeState = { active: true, profile, snapshot };
  currentState = newState;
  writeStorageState(newState);

  emitRecoveryEvent(MORPHIC_RECOVERY_EVENT_ENTER, newState);
  return newState;
}

// ---------------------------------------------------------------------------
// exitRecoveryMode — restore from snapshot
// ---------------------------------------------------------------------------

/**
 * Exit recovery mode : restore snapshot if present and active, mark inactive.
 *
 * MC/DC exit guard : restore is performed iff (active && snapshot !== null).
 * No-op when inactive (no event, no state change).
 */
export function exitRecoveryMode(): RecoveryModeState {
  const existing = getStateInternal();

  if (!existing.active) {
    // No-op : not active. No event.
    return { active: false, profile: existing.profile, snapshot: null };
  }

  // Restore snapshot only if present (defensive — MC/DC T3).
  if (existing.snapshot !== null) {
    setMotion(existing.snapshot.motion);
    setDensity(existing.snapshot.density);
    setTheme(existing.snapshot.theme);
    setDecisionPointsCap(existing.snapshot.decisionPointsCap);
  }

  const newState: RecoveryModeState = {
    active: false,
    profile: existing.profile,
    snapshot: null,
  };
  currentState = newState;
  writeStorageState(null);

  emitRecoveryEvent(MORPHIC_RECOVERY_EVENT_EXIT, newState);
  return newState;
}

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------

/** Returns true iff recovery mode is currently active. */
export function isRecoveryActive(): boolean {
  return getStateInternal().active;
}

/** Returns the current recovery state (in-memory first, then storage). */
export function getRecoveryState(): RecoveryModeState {
  return getStateInternal();
}
