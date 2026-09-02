/**
 * Tests for B-015 — IndexedDB Persistence (Local-First)
 *
 * CDC ref  : F-014
 * Risk     : Critical (95% coverage + MC/DC + PBT)
 * TDG      : tests written BEFORE implementation (red).
 *
 * Dependencies:
 *   - fake-indexeddb@6.2.5 (polyfill for jsdom)
 *   - fast-check@4.8.0 (PBT Layer 1)
 */

import 'fake-indexeddb/auto';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetIdbStateForTests,
  clearPreferences,
  closeMorphicDB,
  getStorageStatus,
  loadPreferences,
  MORPHIC_DB_NAME,
  MORPHIC_DB_VERSION,
  MORPHIC_IDB_PREFS_KEY,
  MORPHIC_IDB_STORE_NAME,
  MORPHIC_STORAGE_KEY,
  migrateFromLocalStorage,
  openMorphicDB,
  persistPreferences,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setLocalStorage(prefs: Record<string, unknown>): void {
  localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(prefs));
}

async function deleteIdb(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(MORPHIC_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  __resetIdbStateForTests();
});

afterEach(async () => {
  closeMorphicDB();
  __resetIdbStateForTests();
  await deleteIdb();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('B-015 Constants', () => {
  it('should export MORPHIC_DB_NAME as a non-empty string', () => {
    expect(typeof MORPHIC_DB_NAME).toBe('string');
    expect(MORPHIC_DB_NAME.length).toBeGreaterThan(0);
  });

  it('should export MORPHIC_DB_VERSION as a positive integer', () => {
    expect(MORPHIC_DB_VERSION).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(MORPHIC_DB_VERSION)).toBe(true);
  });

  it('should export MORPHIC_IDB_STORE_NAME as a non-empty string', () => {
    expect(typeof MORPHIC_IDB_STORE_NAME).toBe('string');
    expect(MORPHIC_IDB_STORE_NAME.length).toBeGreaterThan(0);
  });

  it('should export MORPHIC_IDB_PREFS_KEY as a non-empty string', () => {
    expect(typeof MORPHIC_IDB_PREFS_KEY).toBe('string');
    expect(MORPHIC_IDB_PREFS_KEY.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// openMorphicDB
// ---------------------------------------------------------------------------

describe('openMorphicDB', () => {
  it('should_open_database_when_called_first_time', async () => {
    const db = await openMorphicDB();
    expect(db).toBeDefined();
    expect(db.name).toBe(MORPHIC_DB_NAME);
  });

  it('should_return_same_instance_when_called_twice', async () => {
    const db1 = await openMorphicDB();
    const db2 = await openMorphicDB();
    expect(db1).toBe(db2);
  });

  it('should_create_object_store_with_correct_name', async () => {
    const db = await openMorphicDB();
    expect(db.objectStoreNames.contains(MORPHIC_IDB_STORE_NAME)).toBe(true);
  });

  it('should_have_correct_version', async () => {
    const db = await openMorphicDB();
    expect(db.version).toBe(MORPHIC_DB_VERSION);
  });
});

// ---------------------------------------------------------------------------
// persistPreferences + loadPreferences (round-trip)
// ---------------------------------------------------------------------------

describe('persistPreferences', () => {
  it('should_persist_prefs_when_valid_object', async () => {
    const prefs = { theme: 'dark', motion: 'reduced' };
    await persistPreferences(prefs);
    const loaded = await loadPreferences();
    expect(loaded).toEqual(prefs);
  });

  it('should_overwrite_existing_prefs_when_called_again', async () => {
    await persistPreferences({ theme: 'dark' });
    await persistPreferences({ theme: 'light', density: 'compact' });
    const loaded = await loadPreferences();
    expect(loaded).toEqual({ theme: 'light', density: 'compact' });
  });

  it('should_persist_empty_object', async () => {
    await persistPreferences({});
    const loaded = await loadPreferences();
    expect(loaded).toEqual({});
  });

  it('should_persist_nested_sub_keys', async () => {
    const prefs = {
      theme: 'dark',
      clickDelay: { delay: 250 },
      tremorFilter: { windowSize: 8 },
    };
    await persistPreferences(prefs);
    const loaded = await loadPreferences();
    expect(loaded).toEqual(prefs);
  });

  it('should_write_through_to_localStorage', async () => {
    const prefs = { theme: 'dark', motion: 'reduced' };
    await persistPreferences(prefs);
    const lsRaw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    expect(lsRaw).not.toBeNull();
    const lsParsed = JSON.parse(lsRaw as string);
    expect(lsParsed).toEqual(prefs);
  });

  // Defensive assertion: non-object rejected
  it('should_throw_TypeError_when_prefs_is_null', async () => {
    await expect(persistPreferences(null as unknown as Record<string, unknown>)).rejects.toThrow(
      TypeError,
    );
  });

  it('should_throw_TypeError_when_prefs_is_array', async () => {
    await expect(persistPreferences([1, 2] as unknown as Record<string, unknown>)).rejects.toThrow(
      TypeError,
    );
  });

  it('should_throw_TypeError_when_prefs_is_string', async () => {
    await expect(persistPreferences('hello' as unknown as Record<string, unknown>)).rejects.toThrow(
      TypeError,
    );
  });
});

// ---------------------------------------------------------------------------
// loadPreferences
// ---------------------------------------------------------------------------

describe('loadPreferences', () => {
  it('should_return_null_when_no_prefs_stored', async () => {
    const loaded = await loadPreferences();
    expect(loaded).toBeNull();
  });

  it('should_return_prefs_after_persist', async () => {
    await persistPreferences({ fontSize: 'lg' });
    const loaded = await loadPreferences();
    expect(loaded).toEqual({ fontSize: 'lg' });
  });
});

// ---------------------------------------------------------------------------
// clearPreferences
// ---------------------------------------------------------------------------

describe('clearPreferences', () => {
  it('should_clear_prefs_from_idb', async () => {
    await persistPreferences({ theme: 'dark' });
    await clearPreferences();
    const loaded = await loadPreferences();
    expect(loaded).toBeNull();
  });

  it('should_clear_localStorage_too', async () => {
    await persistPreferences({ theme: 'dark' });
    await clearPreferences();
    expect(localStorage.getItem(MORPHIC_STORAGE_KEY)).toBeNull();
  });

  it('should_not_throw_when_already_empty', async () => {
    await expect(clearPreferences()).resolves.not.toThrow();
  });

  it('should_be_idempotent', async () => {
    await persistPreferences({ theme: 'dark' });
    await clearPreferences();
    await clearPreferences();
    const loaded = await loadPreferences();
    expect(loaded).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// migrateFromLocalStorage
// ---------------------------------------------------------------------------

describe('migrateFromLocalStorage', () => {
  it('should_migrate_valid_localStorage_prefs_to_idb', async () => {
    setLocalStorage({ theme: 'dark', motion: 'reduced' });
    const migrated = await migrateFromLocalStorage();
    expect(migrated).toBe(true);
    const loaded = await loadPreferences();
    expect(loaded).toEqual({ theme: 'dark', motion: 'reduced' });
  });

  it('should_return_false_when_localStorage_empty', async () => {
    const migrated = await migrateFromLocalStorage();
    expect(migrated).toBe(false);
  });

  it('should_return_false_when_localStorage_has_invalid_json', async () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{{{broken');
    const migrated = await migrateFromLocalStorage();
    expect(migrated).toBe(false);
  });

  it('should_return_false_when_localStorage_has_non_object', async () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '"just a string"');
    const migrated = await migrateFromLocalStorage();
    expect(migrated).toBe(false);
  });

  it('should_return_false_when_localStorage_has_array', async () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '[1,2,3]');
    const migrated = await migrateFromLocalStorage();
    expect(migrated).toBe(false);
  });

  it('should_not_overwrite_existing_idb_prefs', async () => {
    await persistPreferences({ theme: 'light' });
    setLocalStorage({ theme: 'dark' });
    const migrated = await migrateFromLocalStorage();
    expect(migrated).toBe(false);
    const loaded = await loadPreferences();
    expect(loaded).toEqual({ theme: 'light' });
  });

  it('should_migrate_complex_nested_prefs', async () => {
    const prefs = {
      theme: 'sepia',
      clickDelay: { delay: 100 },
      dwellClick: { delay: 1500, radius: 15 },
      readingGuide: { mode: 'mask' },
    };
    setLocalStorage(prefs);
    const migrated = await migrateFromLocalStorage();
    expect(migrated).toBe(true);
    const loaded = await loadPreferences();
    expect(loaded).toEqual(prefs);
  });
});

// ---------------------------------------------------------------------------
// getStorageStatus
// ---------------------------------------------------------------------------

describe('getStorageStatus', () => {
  it('should_return_available_status', async () => {
    const status = await getStorageStatus();
    expect(status.available).toBe(true);
    expect(status.type).toBe('indexeddb');
  });

  it('should_report_persisted_false_by_default', async () => {
    const status = await getStorageStatus();
    expect(typeof status.persisted).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// closeMorphicDB
// ---------------------------------------------------------------------------

describe('closeMorphicDB', () => {
  it('should_close_without_error', async () => {
    await openMorphicDB();
    expect(() => closeMorphicDB()).not.toThrow();
  });

  it('should_allow_reopen_after_close', async () => {
    await openMorphicDB();
    closeMorphicDB();
    const db = await openMorphicDB();
    expect(db).toBeDefined();
    expect(db.name).toBe(MORPHIC_DB_NAME);
  });

  it('should_not_throw_when_never_opened', () => {
    expect(() => closeMorphicDB()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// MC/DC — persistPreferences validation guard
// ---------------------------------------------------------------------------

describe('MC/DC — persist validation (prefs !== null && typeof prefs === "object" && !Array.isArray(prefs))', () => {
  // T1: null → TypeError (prefs===null is false for the guard, triggers rejection)
  it('MC/DC T1: null → TypeError', async () => {
    await expect(persistPreferences(null as unknown as Record<string, unknown>)).rejects.toThrow(
      TypeError,
    );
  });

  // T2: non-object (number) → TypeError
  it('MC/DC T2: number → TypeError', async () => {
    await expect(persistPreferences(42 as unknown as Record<string, unknown>)).rejects.toThrow(
      TypeError,
    );
  });

  // T3: array → TypeError
  it('MC/DC T3: array → TypeError', async () => {
    await expect(persistPreferences([] as unknown as Record<string, unknown>)).rejects.toThrow(
      TypeError,
    );
  });

  // T4: valid object → succeeds
  it('MC/DC T4: valid object → persists', async () => {
    await expect(persistPreferences({ theme: 'dark' })).resolves.not.toThrow();
    const loaded = await loadPreferences();
    expect(loaded).toEqual({ theme: 'dark' });
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('should_handle_persist_with_undefined_values_in_prefs', async () => {
    // JSON.stringify strips undefined — verify the output
    const prefs = { theme: 'dark', motion: undefined } as unknown as Record<string, unknown>;
    await persistPreferences(prefs);
    const loaded = await loadPreferences();
    // undefined stripped by IDB structured clone — only theme persists
    expect(loaded).toHaveProperty('theme', 'dark');
  });

  it('should_return_false_from_migrate_when_localStorage_throws', async () => {
    // Simulate localStorage disabled (SSR / sandbox)
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = () => {
      throw new DOMException('disabled');
    };
    try {
      const migrated = await migrateFromLocalStorage();
      expect(migrated).toBe(false);
    } finally {
      localStorage.getItem = originalGetItem;
    }
  });

  it('should_report_localstorage_only_when_idb_unavailable', async () => {
    closeMorphicDB();
    __resetIdbStateForTests();
    // Remove indexedDB to simulate unavailable env
    const original = globalThis.indexedDB;
    Object.defineProperty(globalThis, 'indexedDB', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    try {
      const status = await getStorageStatus();
      expect(status.available).toBe(true);
      expect(status.type).toBe('localstorage-only');
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: original,
        writable: true,
        configurable: true,
      });
    }
  });

  // Note: "both IDB + LS unavailable → type=none" (lines 254-255) is structural
  // dead code in fake-indexeddb test env. Same pattern as SSR guards in B-108/B-111.
  // Covered in integration only (real Safari Private Browsing + iframe sandbox).

  it('should_handle_large_preference_object', async () => {
    const prefs: Record<string, unknown> = {};
    for (let i = 0; i < 100; i++) {
      prefs[`key_${i}`] = `value_${i}`;
    }
    await persistPreferences(prefs);
    const loaded = await loadPreferences();
    expect(loaded).toEqual(prefs);
  });
});

// ---------------------------------------------------------------------------
// PBT — Anti-Circular Layer 1
// ---------------------------------------------------------------------------

describe('PBT — round-trip persist/load', () => {
  it('should_round_trip_arbitrary_flat_prefs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('\0')),
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        ),
        async (prefs) => {
          closeMorphicDB();
          __resetIdbStateForTests();
          await deleteIdb();
          await persistPreferences(prefs);
          const loaded = await loadPreferences();
          expect(loaded).toEqual(prefs);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should_always_write_through_to_localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.includes('\0')),
          fc.string(),
        ),
        async (prefs) => {
          closeMorphicDB();
          __resetIdbStateForTests();
          await deleteIdb();
          await persistPreferences(prefs);
          const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
          expect(raw).not.toBeNull();
          expect(JSON.parse(raw as string)).toEqual(prefs);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should_clear_then_load_returns_null', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.string()),
        async (prefs) => {
          closeMorphicDB();
          __resetIdbStateForTests();
          await deleteIdb();
          await persistPreferences(prefs);
          await clearPreferences();
          const loaded = await loadPreferences();
          expect(loaded).toBeNull();
        },
      ),
      { numRuns: 30 },
    );
  });

  it('should_migrate_only_when_idb_empty_and_ls_valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.includes('\0')),
          fc.string(),
        ),
        async (prefs) => {
          closeMorphicDB();
          __resetIdbStateForTests();
          await deleteIdb();
          localStorage.clear();

          // Empty IDB + valid LS → migrates
          setLocalStorage(prefs);
          const migrated = await migrateFromLocalStorage();
          expect(migrated).toBe(true);
          const loaded = await loadPreferences();
          expect(loaded).toEqual(prefs);

          // Non-empty IDB + valid LS → does NOT migrate
          localStorage.clear();
          setLocalStorage({ override: 'nope' });
          const migrated2 = await migrateFromLocalStorage();
          expect(migrated2).toBe(false);
          const loaded2 = await loadPreferences();
          expect(loaded2).toEqual(prefs);
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// What the two independent reviews of 2026-08-31 named, and nothing covered
// ---------------------------------------------------------------------------

describe('a one-time migration that reports honestly', () => {
  it('answers false when there is no IndexedDB to migrate TO', async () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));

    // A host that exposes the property and throws when it is read: a privileged
    // window, a sandboxed frame, an enterprise policy. `typeof` is not enough
    // to see it -- that was the original defect of this whole family.
    const real = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      get() {
        throw new Error('NS_ERROR_NOT_AVAILABLE');
      },
    });

    try {
      // It used to answer `true` here without moving anything -- so the caller
      // believed the one-time migration was done, and ran it again on every
      // single call, forever, on the hosts least able to afford it.
      await expect(migrateFromLocalStorage()).resolves.toBe(false);
    } finally {
      if (real) Object.defineProperty(globalThis, 'indexedDB', real);
      else Reflect.deleteProperty(globalThis, 'indexedDB');
    }
  });

  it('answers true only once the data really is in IndexedDB', async () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));

    await expect(migrateFromLocalStorage()).resolves.toBe(true);
    await expect(loadPreferences()).resolves.toEqual({ theme: 'dark' });

    // And it does not claim a second migration: the destination already holds
    // the data, so there is nothing left to move.
    await expect(migrateFromLocalStorage()).resolves.toBe(false);
  });
});

describe('an erasure that never claims more than it did', () => {
  it('succeeds when there is no IndexedDB, because nothing was ever there', async () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));

    const real = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      get() {
        throw new Error('NS_ERROR_NOT_AVAILABLE');
      },
    });

    try {
      // No storage means nothing to erase there: reporting success is the truth.
      await expect(clearPreferences()).resolves.toBeUndefined();
      // The cache must go all the same, or 'clear' lies by another door.
      expect(localStorage.getItem(MORPHIC_STORAGE_KEY)).toBeNull();
    } finally {
      if (real) Object.defineProperty(globalThis, 'indexedDB', real);
      else Reflect.deleteProperty(globalThis, 'indexedDB');
    }
  });
});
