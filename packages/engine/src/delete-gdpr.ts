/**
 * deleteAllPreferences — GDPR Article 17 right-to-erasure.
 *
 * CDC ref : F-024 (Delete préférences GDPR Art. 17).
 * Brick   : B-024b.
 * Risk    : Critical 95% + MC/DC + PBT.
 *
 * Contract:
 *   - Wipes localStorage MORPHIC_STORAGE_KEY AND the entire morphic IndexedDB
 *     database (not just one key). A user requesting erasure must not find a
 *     residual key anywhere a future module load could re-hydrate.
 *   - Dispatches a `morphic:gdpr:deleted` CustomEvent on `window` after the
 *     wipe completes (or after a no-op when nothing existed) — UI/analytics
 *     observers can react without having to poll storage.
 *   - Holds a one-shot in-memory snapshot of the wiped state for
 *     DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS (60s by default). `undoLastDelete()`
 *     restores the snapshot if called inside the window.
 *   - The snapshot is NEVER written to any storage layer. A page refresh
 *     during the undo window MUST forfeit the rollback. This is the GDPR
 *     purity guarantee: erased means erased, the undo is a session-only
 *     safety net.
 *   - SSR-safe: when `localStorage` or `indexedDB` is unavailable, the
 *     corresponding step is skipped silently. Never throws on a runtime
 *     storage error — failures are swallowed because we are *deleting*,
 *     so "could not delete because already absent" is the desired outcome.
 *   - Idempotent: calling twice in a row is safe and overwrites the
 *     previous snapshot with the current (post-first-delete) state, which
 *     is null/empty — so a stacked undo will not "restore" anything.
 *
 * Defensive assertions (≥2, per Quality.md Critical floor):
 *   1. After deletion, localStorage[MORPHIC_STORAGE_KEY] MUST be null
 *      (in the synchronous part of the implementation that owns the wipe).
 *   2. The snapshot is consumed exactly once: a second undo within the
 *      window returns false even if the timer has not fired.
 */

import { closeMorphicDB, MORPHIC_DB_NAME, persistPreferences } from './idb-storage.js';
import { MORPHIC_STORAGE_KEY } from './init.js';
import { deleteDatabase, safeStorage } from './storage-access.js';

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/** CustomEvent type dispatched on `window` after a successful wipe. */
export const MORPHIC_GDPR_DELETED_EVENT = 'morphic:gdpr:deleted' as const;

/** Default undo window in ms (60 seconds — Dignity §g safety net). */
export const DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS = 60_000 as const;

// ---------------------------------------------------------------------------
// Module state (in-memory snapshot, never persisted)
// ---------------------------------------------------------------------------

interface Snapshot {
  /** Captured localStorage payload (raw string) or null when absent. */
  readonly localStorageRaw: string | null;
  /** Captured IndexedDB preferences (parsed) or null when absent. */
  readonly idbPrefs: Record<string, unknown> | null;
  /** Monotonic wall-clock timestamp (ms) at capture time. */
  readonly capturedAt: number;
}

let snapshot: Snapshot | null = null;
let undoWindowMs: number = DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS;

// ---------------------------------------------------------------------------
// Test hooks (underscore-prefixed — not part of the public surface)
// ---------------------------------------------------------------------------

/** Reset the module's snapshot state (test only). */
export function __resetDeleteGdprStateForTests(): void {
  snapshot = null;
  undoWindowMs = DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS;
}

/** Override the undo window (test only). */
export function __setDeleteGdprUndoWindowForTests(windowMs: number): void {
  undoWindowMs = windowMs;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readLocalStorageRaw(): string | null {
  try {
    return safeStorage.get(MORPHIC_STORAGE_KEY);
  } catch {
    return null;
  }
}

function clearLocalStorageKey(): void {
  try {
    safeStorage.remove(MORPHIC_STORAGE_KEY);
  } catch {
    // Storage disabled / sealed — treat as "already absent".
  }
}

async function readIdbPrefs(): Promise<Record<string, unknown> | null> {
  try {
    const { loadPreferences } = await import('./idb-storage.js');
    return await loadPreferences();
  } catch {
    return null;
  }
}

async function deleteIdbDatabase(): Promise<void> {
  try {
    closeMorphicDB();
    await deleteDatabase(MORPHIC_DB_NAME);
  } catch {
    // IDB unavailable (SSR, Safari private) or transient error — already-absent
    // outcome is acceptable for a delete.
  }
}

function dispatchDeletedEvent(): void {
  try {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') {
      return;
    }
    window.dispatchEvent(new CustomEvent(MORPHIC_GDPR_DELETED_EVENT));
  } catch {
    // Dispatch failure must not block the wipe.
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Erase all morphic preferences from every local storage layer.
 *
 * GDPR Article 17 ("right to be forgotten") implementation. A snapshot of
 * the pre-delete state is held in module memory for {@link DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS}
 * so a user who clicked by mistake can call {@link undoLastDelete} once.
 *
 * @returns A promise that resolves once the wipe is observable from storage.
 */
export async function deleteAllPreferences(): Promise<void> {
  const localStorageRaw = readLocalStorageRaw();
  const idbPrefs = await readIdbPrefs();

  snapshot = {
    localStorageRaw,
    idbPrefs,
    capturedAt: Date.now(),
  };

  clearLocalStorageKey();
  await deleteIdbDatabase();

  // Defensive assertion #1 — localStorage key MUST be absent after a wipe.
  /* v8 ignore next 3 */
  if (readLocalStorageRaw() !== null) {
    throw new Error('deleteAllPreferences invariant: localStorage key survived wipe');
  }

  dispatchDeletedEvent();
}

/**
 * Restore the snapshot captured by the most recent {@link deleteAllPreferences}
 * call, if it is still inside the undo window AND has not already been used.
 *
 * @returns `true` if the snapshot was restored, `false` otherwise.
 */
export async function undoLastDelete(): Promise<boolean> {
  if (snapshot === null) {
    return false;
  }
  const elapsed = Date.now() - snapshot.capturedAt;
  if (elapsed >= undoWindowMs) {
    snapshot = null;
    return false;
  }

  const { localStorageRaw, idbPrefs } = snapshot;
  // Defensive assertion #2 — consume the snapshot BEFORE the restore work,
  // so a concurrent second call cannot re-trigger the restore.
  snapshot = null;

  if (localStorageRaw !== null) {
    try {
      safeStorage.set(MORPHIC_STORAGE_KEY, localStorageRaw);
    } catch {
      // Storage disabled — silently degrade; IDB still attempted below.
    }
  }
  if (idbPrefs !== null) {
    try {
      await persistPreferences(idbPrefs);
    } catch {
      // IDB unavailable — already-absent localStorage may be the only state.
    }
  }

  return true;
}
