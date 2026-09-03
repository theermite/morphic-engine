/**
 * Tests — effects/storage.ts
 *
 * CDC ref : F-018 (Effect-TS résilience — wrapper async storage)
 * Brick   : B-019
 * Risk    : Sensitive (90% coverage)
 *
 * Scope:
 *   - Success path: each wrapper resolves with the same value as the core API
 *   - Failure path: each wrapper converts thrown errors into a typed
 *     StorageError (operation tag preserved, cause preserved)
 *
 * Setup/teardown mirrors the pattern proven in `idb-storage.test.ts`:
 * close the singleton, reset the in-memory state, then `deleteDatabase`.
 * Skipping the close step makes `deleteDatabase` block on the open handle
 * and the test times out (observed during B-019 implementation).
 */

import 'fake-indexeddb/auto';
import { Cause, Effect, Exit } from 'effect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageError } from '../../src/effects/errors.js';
import * as Storage from '../../src/effects/storage.js';
import { __resetIdbStateForTests, closeMorphicDB, MORPHIC_DB_NAME } from '../../src/idb-storage.js';

async function deleteIdb(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(MORPHIC_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

beforeEach(() => {
  localStorage.clear();
  __resetIdbStateForTests();
});

afterEach(async () => {
  closeMorphicDB();
  __resetIdbStateForTests();
  await deleteIdb();
  localStorage.clear();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Success path (real fake-IDB)
// ---------------------------------------------------------------------------

describe('Storage.persistPreferences — success', () => {
  it('persists then loads the same payload', async () => {
    const payload = { theme: 'dark', motion: 'reduced' };

    await Effect.runPromise(Storage.persistPreferences(payload));
    const loaded = await Effect.runPromise(Storage.loadPreferences());
    expect(loaded).toEqual(payload);
  });
});

describe('Storage.loadPreferences — success', () => {
  it('returns null when no prefs are stored', async () => {
    const result = await Effect.runPromise(Storage.loadPreferences());
    expect(result).toBeNull();
  });
});

describe('Storage.clearPreferences — success', () => {
  it('removes a previously-persisted payload', async () => {
    await Effect.runPromise(Storage.persistPreferences({ contrast: 'high' }));
    await Effect.runPromise(Storage.clearPreferences());
    const result = await Effect.runPromise(Storage.loadPreferences());
    expect(result).toBeNull();
  });
});

describe('Storage.migrateFromLocalStorage — success', () => {
  it('returns false when IDB already has data', async () => {
    await Effect.runPromise(Storage.persistPreferences({ theme: 'light' }));
    const migrated = await Effect.runPromise(Storage.migrateFromLocalStorage());
    expect(migrated).toBe(false);
  });

  it('migrates valid localStorage JSON when IDB is empty', async () => {
    localStorage.setItem('morphic-prefs', JSON.stringify({ density: 'compact' }));
    const migrated = await Effect.runPromise(Storage.migrateFromLocalStorage());
    expect(migrated).toBe(true);
    const loaded = await Effect.runPromise(Storage.loadPreferences());
    expect(loaded).toEqual({ density: 'compact' });
  });
});

describe('Storage.getStorageStatus — success', () => {
  it('reports indexeddb available under fake-indexeddb', async () => {
    const status = await Effect.runPromise(Storage.getStorageStatus());
    expect(status.available).toBe(true);
    expect(status.type).toBe('indexeddb');
  });
});

// ---------------------------------------------------------------------------
// Failure path (typed-error conversion)
// ---------------------------------------------------------------------------

describe('Storage.persistPreferences — typed failure', () => {
  it('converts a thrown core error into StorageError(persist)', async () => {
    // Force core to throw by passing an array (core throws TypeError).
    const program = Storage.persistPreferences(['not', 'an', 'object'] as unknown as Record<
      string,
      unknown
    >);
    const exit = await Effect.runPromiseExit(program);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = Cause.failureOption(exit.cause);
      expect(failure._tag).toBe('Some');
      if (failure._tag === 'Some') {
        const err = failure.value;
        expect(err).toBeInstanceOf(StorageError);
        expect(err.operation).toBe('persist');
        expect(err.cause).toBeInstanceOf(TypeError);
      }
    }
  });
});

/**
 * Contract changed on 2026-09-03, deliberately.
 *
 * These two used to require that a store refusing to OPEN surfaced as a typed
 * StorageError. That is the opposite of what this engine is for: a host that
 * refuses storage -- privileged window, sandboxed frame, private browsing,
 * enterprise policy -- is exactly the host where the person must still receive
 * their adaptation. Reading is best-effort, and "nothing readable" is an
 * answer, not an error.
 *
 * `clearPreferences` deliberately keeps the old contract, and its test below
 * still passes: an erasure that cannot prove itself must say so. Someone asked
 * for their data to be gone.
 */
describe('Storage.loadPreferences — a store that will not open', () => {
  it('answers "nothing stored" instead of failing', async () => {
    const openSpy = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('idb refused');
    });

    const exit = await Effect.runPromiseExit(Storage.loadPreferences());
    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toBeNull();
    }
    openSpy.mockRestore();
  });
});

describe('Storage.clearPreferences — typed failure', () => {
  it('converts a thrown core error into StorageError(clear)', async () => {
    const openSpy = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('idb refused');
    });

    const exit = await Effect.runPromiseExit(Storage.clearPreferences());
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = Cause.failureOption(exit.cause);
      expect(failure._tag).toBe('Some');
      if (failure._tag === 'Some') {
        expect(failure.value).toBeInstanceOf(StorageError);
        expect((failure.value as StorageError).operation).toBe('clear');
      }
    }
    openSpy.mockRestore();
  });
});

describe('Storage.migrateFromLocalStorage — typed failure', () => {
  it('answers "nothing migrated" instead of failing', async () => {
    const openSpy = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('idb refused');
    });

    const exit = await Effect.runPromiseExit(Storage.migrateFromLocalStorage());
    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      // `false` is the honest answer: there was no store to migrate TO, so
      // nothing moved. Claiming `true` is what made the one-time migration run
      // on every call, forever.
      expect(exit.value).toBe(false);
    }
    openSpy.mockRestore();
  });
});

// Note: `getStorageStatus` is total in the core (catches all errors, returns
// graceful status). The Effect wrapper's catch arrow is defensive — it covers
// hypothetical future changes to the core contract. No failure test possible
// without modifying core behavior, which is out of scope for B-019.
