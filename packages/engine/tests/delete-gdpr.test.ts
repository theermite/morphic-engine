/**
 * Tests for B-024b — deleteAllPreferences() GDPR Article 17 (Right to Erasure).
 *
 * CDC ref : F-024 — Delete préférences GDPR Art. 17 (à confirmer si numéro différent).
 * Brick   : B-024b.
 * Risk    : Critical 95% + MC/DC + PBT.
 *
 * Defensive contract:
 *   - deleteAllPreferences() wipes localStorage MORPHIC_STORAGE_KEY AND
 *     the entire morphic IndexedDB database (not just one key).
 *   - A `morphic:gdpr:deleted` CustomEvent is dispatched on window after wipe.
 *   - A snapshot of pre-delete state is held in module memory for 60s
 *     (configurable via internal constant for tests).
 *   - undoLastDelete() within the window restores the snapshot. After the
 *     window OR after a successful undo, the snapshot is consumed and
 *     undoLastDelete() returns false.
 *   - Snapshot is NEVER persisted to any storage layer (GDPR purity: a
 *     refresh during the undo window MUST forfeit the rollback).
 *   - SSR-safe: noop when localStorage / indexedDB unavailable; never throws.
 *
 * MC/DC matrix on undoLastDelete decision:
 *   (snapshot exists) AND (within window) AND (not already consumed)
 */

import 'fake-indexeddb/auto';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetDeleteGdprStateForTests,
  __setDeleteGdprUndoWindowForTests,
  DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS,
  deleteAllPreferences,
  MORPHIC_GDPR_DELETED_EVENT,
  undoLastDelete,
} from '../src/delete-gdpr.js';
import {
  __resetIdbStateForTests,
  closeMorphicDB,
  loadPreferences,
  MORPHIC_DB_NAME,
  persistPreferences,
} from '../src/idb-storage.js';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function deleteIdb(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(MORPHIC_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

async function idbHasPrefs(): Promise<boolean> {
  const prefs = await loadPreferences();
  return prefs !== null;
}

beforeEach(async () => {
  __resetDeleteGdprStateForTests();
  closeMorphicDB();
  __resetIdbStateForTests();
  await deleteIdb();
  localStorage.clear();
  __setDeleteGdprUndoWindowForTests(DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS);
});

afterEach(async () => {
  vi.useRealTimers();
  __resetDeleteGdprStateForTests();
  closeMorphicDB();
  __resetIdbStateForTests();
  await deleteIdb();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('B-024b constants', () => {
  it('exports MORPHIC_GDPR_DELETED_EVENT as a non-empty string', () => {
    expect(typeof MORPHIC_GDPR_DELETED_EVENT).toBe('string');
    expect(MORPHIC_GDPR_DELETED_EVENT.length).toBeGreaterThan(0);
  });

  it('exports MORPHIC_GDPR_DELETED_EVENT namespaced under morphic:', () => {
    expect(MORPHIC_GDPR_DELETED_EVENT.startsWith('morphic:')).toBe(true);
  });

  it('exports DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS as 60000 (60s)', () => {
    expect(DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS).toBe(60_000);
  });
});

// ---------------------------------------------------------------------------
// deleteAllPreferences — happy path
// ---------------------------------------------------------------------------

describe('deleteAllPreferences() — happy path', () => {
  it('should_clear_localStorage_when_called', async () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));
    expect(localStorage.getItem(MORPHIC_STORAGE_KEY)).not.toBeNull();

    await deleteAllPreferences();

    expect(localStorage.getItem(MORPHIC_STORAGE_KEY)).toBeNull();
  });

  it('should_delete_indexeddb_database_when_called', async () => {
    await persistPreferences({ theme: 'dark', motion: 'reduced' });
    expect(await idbHasPrefs()).toBe(true);

    await deleteAllPreferences();

    expect(await idbHasPrefs()).toBe(false);
  });

  it('should_dispatch_morphic_gdpr_deleted_event_when_called', async () => {
    const listener = vi.fn();
    window.addEventListener(MORPHIC_GDPR_DELETED_EVENT, listener);

    await deleteAllPreferences();

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]?.[0] as CustomEvent;
    expect(event.type).toBe(MORPHIC_GDPR_DELETED_EVENT);
    window.removeEventListener(MORPHIC_GDPR_DELETED_EVENT, listener);
  });

  it('should_be_idempotent_when_called_twice', async () => {
    await deleteAllPreferences();
    await expect(deleteAllPreferences()).resolves.not.toThrow();
    expect(localStorage.getItem(MORPHIC_STORAGE_KEY)).toBeNull();
    expect(await idbHasPrefs()).toBe(false);
  });

  it('should_resolve_when_no_data_exists', async () => {
    expect(localStorage.getItem(MORPHIC_STORAGE_KEY)).toBeNull();
    expect(await idbHasPrefs()).toBe(false);

    await expect(deleteAllPreferences()).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// deleteAllPreferences — SSR safety
// ---------------------------------------------------------------------------

describe('deleteAllPreferences() — SSR / unavailable storage', () => {
  it('should_not_throw_when_localStorage_throws_on_remove', async () => {
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = vi.fn(() => {
      throw new Error('storage disabled');
    });
    try {
      await expect(deleteAllPreferences()).resolves.not.toThrow();
    } finally {
      Storage.prototype.removeItem = original;
    }
  });

  it('should_not_throw_when_indexedDB_delete_rejects', async () => {
    // Force a rejection by stubbing indexedDB.deleteDatabase.
    const original = indexedDB.deleteDatabase;
    indexedDB.deleteDatabase = vi.fn(() => {
      const req = {
        onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
        onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
        onblocked: null as ((this: IDBOpenDBRequest, ev: Event) => unknown) | null,
        result: undefined,
        error: new DOMException('forced error'),
      } as unknown as IDBOpenDBRequest;
      queueMicrotask(() => req.onerror?.call(req as unknown as IDBRequest, new Event('error')));
      return req;
    }) as typeof indexedDB.deleteDatabase;

    try {
      await expect(deleteAllPreferences()).resolves.not.toThrow();
    } finally {
      indexedDB.deleteDatabase = original;
    }
  });
});

// ---------------------------------------------------------------------------
// undoLastDelete — within window
// ---------------------------------------------------------------------------

describe('undoLastDelete() — within window', () => {
  it('should_restore_localStorage_when_called_within_window', async () => {
    const original = { theme: 'dark', motion: 'reduced' };
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(original));

    await deleteAllPreferences();
    expect(localStorage.getItem(MORPHIC_STORAGE_KEY)).toBeNull();

    const restored = await undoLastDelete();

    expect(restored).toBe(true);
    expect(localStorage.getItem(MORPHIC_STORAGE_KEY)).toBe(JSON.stringify(original));
  });

  it('should_restore_indexeddb_when_called_within_window', async () => {
    const original = { theme: 'dark', motion: 'reduced' };
    await persistPreferences(original);
    expect(await idbHasPrefs()).toBe(true);

    await deleteAllPreferences();
    expect(await idbHasPrefs()).toBe(false);

    const restored = await undoLastDelete();
    expect(restored).toBe(true);
    expect(await loadPreferences()).toEqual(original);
  });

  it('should_return_false_when_no_prior_delete', async () => {
    const restored = await undoLastDelete();
    expect(restored).toBe(false);
  });

  it('should_return_false_when_called_twice_in_a_row', async () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));

    await deleteAllPreferences();
    const first = await undoLastDelete();
    const second = await undoLastDelete();

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// undoLastDelete — window expiry
// ---------------------------------------------------------------------------

describe('undoLastDelete() — window expiry', () => {
  it('should_return_false_when_window_has_expired', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));

    await deleteAllPreferences();
    // Advance just past 60s.
    vi.advanceTimersByTime(DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS + 1);

    const restored = await undoLastDelete();
    expect(restored).toBe(false);
  });

  it('should_succeed_when_called_just_before_expiry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));

    await deleteAllPreferences();
    vi.advanceTimersByTime(DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS - 1);

    const restored = await undoLastDelete();
    expect(restored).toBe(true);
  });

  it('should_consume_snapshot_when_window_expires', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));

    await deleteAllPreferences();
    vi.advanceTimersByTime(DELETE_GDPR_DEFAULT_UNDO_WINDOW_MS + 1);
    await undoLastDelete(); // false

    // Even if the same call repeated, no rollback possible.
    expect(await undoLastDelete()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Snapshot purity (no persistence)
// ---------------------------------------------------------------------------

describe('snapshot purity', () => {
  it('should_not_leave_any_morphic_key_in_localStorage_after_delete', async () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));

    await deleteAllPreferences();

    // Scan all localStorage keys for the morphic-prefs key — none must remain.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      expect(key).not.toBe(MORPHIC_STORAGE_KEY);
    }
  });

  it('should_not_persist_snapshot_anywhere_visible_to_a_new_module_load', async () => {
    // Module-memory snapshot means: after __resetDeleteGdprStateForTests()
    // (simulating a fresh module load / page refresh), undo must fail.
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));

    await deleteAllPreferences();
    __resetDeleteGdprStateForTests();

    const restored = await undoLastDelete();
    expect(restored).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PBT — round-trip delete/undo preserves prefs
// ---------------------------------------------------------------------------

describe('PBT — delete/undo round-trip', () => {
  it('preserves arbitrary localStorage prefs across one delete/undo cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          theme: fc.constantFrom('light', 'dark', 'auto', 'high-contrast', 'sepia'),
          motion: fc.constantFrom('full', 'reduced', 'none'),
          contrast: fc.constantFrom('no-preference', 'more', 'less', 'custom'),
        }),
        async (prefs) => {
          localStorage.clear();
          __resetDeleteGdprStateForTests();
          const serialized = JSON.stringify(prefs);
          localStorage.setItem(MORPHIC_STORAGE_KEY, serialized);

          await deleteAllPreferences();
          const restored = await undoLastDelete();

          return restored === true && localStorage.getItem(MORPHIC_STORAGE_KEY) === serialized;
        },
      ),
      { numRuns: 50 },
    );
  });
});
