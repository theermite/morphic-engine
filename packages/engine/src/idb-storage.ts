/**
 * IndexedDB Persistence — Local-First Storage Layer
 *
 * CDC ref : F-014 (Persistence IndexedDB local-first)
 * Brick   : B-015
 * Risk    : Critical (95% coverage + MC/DC + PBT)
 *
 * Architecture:
 *   - IndexedDB = durable async source of truth
 *   - localStorage = synchronous cache for zero-flash (B-004 morphicInit)
 *   - Write-through: every IDB write also updates localStorage
 *   - Fallback: if IDB unavailable (SSR, Safari Private), localStorage alone
 *
 * Defensive assertions (PET §5, ≥2 per critical function):
 *   1. persistPreferences: prefs must be a non-null non-array plain object
 *   2. persistPreferences: IDB write wraps in transaction (auto-abort on error)
 *   3. loadPreferences: missing key returns null (not undefined, not throw)
 *   4. migrateFromLocalStorage: does NOT overwrite existing IDB data
 *   5. openMorphicDB: schema versioned via onupgradeneeded
 */

import { type IDBPDatabase, openDB } from 'idb';
import { MORPHIC_STORAGE_KEY } from './init.js';
import { hasIndexedDB } from './storage-access.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** IndexedDB database name. */
export const MORPHIC_DB_NAME = 'morphic-engine' as const;

/** IndexedDB database version (increment on schema change). */
export const MORPHIC_DB_VERSION = 1 as const;

/** IndexedDB object store name for preferences. */
export const MORPHIC_IDB_STORE_NAME = 'preferences' as const;

/** Key under which the preference object is stored in IDB. */
export const MORPHIC_IDB_PREFS_KEY = 'user-prefs' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Storage status report. */
export interface StorageStatus {
  /** Whether IndexedDB is available and functional. */
  available: boolean;
  /** Storage type in use. */
  type: 'indexeddb' | 'localstorage-only' | 'none';
  /** Whether storage is marked as persistent (navigator.storage.persist). */
  persisted: boolean;
}

// ---------------------------------------------------------------------------
// Module state (singleton DB connection)
// ---------------------------------------------------------------------------

let dbInstance: IDBPDatabase | null = null;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// openMorphicDB
// ---------------------------------------------------------------------------

/**
 * Open (or reuse) the morphic IndexedDB database.
 *
 * Creates the object store on first open (onupgradeneeded).
 * Returns the same instance on subsequent calls (singleton).
 */
export async function openMorphicDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(MORPHIC_DB_NAME, MORPHIC_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(MORPHIC_IDB_STORE_NAME)) {
        db.createObjectStore(MORPHIC_IDB_STORE_NAME);
      }
    },
  });

  return dbInstance;
}

// ---------------------------------------------------------------------------
// closeMorphicDB
// ---------------------------------------------------------------------------

/**
 * Close the database connection and clear the singleton.
 * Safe to call even if never opened.
 */
export function closeMorphicDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// ---------------------------------------------------------------------------
// persistPreferences
// ---------------------------------------------------------------------------

/**
 * Persist user preferences to IndexedDB + write-through to localStorage.
 *
 * Defensive assertions:
 *   1. prefs must be a non-null non-array plain object (TypeError if not)
 *   2. IDB transaction auto-aborts on error (no partial writes)
 *
 * @throws TypeError if prefs is not a plain object
 */
export async function persistPreferences(prefs: Record<string, unknown>): Promise<void> {
  // Defensive assertion #1 — validate input shape
  if (!isPlainObject(prefs)) {
    throw new TypeError(
      `persistPreferences: expected plain object, got ${prefs === null ? 'null' : typeof prefs}${Array.isArray(prefs) ? ' (array)' : ''}`,
    );
  }

  // A host that refuses IndexedDB is a host without it: the write is a
  // no-op, and the localStorage cache below still carries the value.
  if (!hasIndexedDB()) {
    writeToLocalStorage(prefs);
    return;
  }

  // Write to IndexedDB
  const db = await openMorphicDB();
  await db.put(MORPHIC_IDB_STORE_NAME, prefs, MORPHIC_IDB_PREFS_KEY);

  // Write-through to localStorage (sync cache for zero-flash B-004)
  writeToLocalStorage(prefs);
}

// ---------------------------------------------------------------------------
// loadPreferences
// ---------------------------------------------------------------------------

/**
 * Load user preferences from IndexedDB.
 *
 * Returns null if no preferences are stored (not undefined, not throw).
 */
export async function loadPreferences(): Promise<Record<string, unknown> | null> {
  // Nothing stored, rather than a rejected promise thrown at the caller.
  if (!hasIndexedDB()) return null;

  const db = await openMorphicDB();
  const result = await db.get(MORPHIC_IDB_STORE_NAME, MORPHIC_IDB_PREFS_KEY);

  if (result === undefined || !isPlainObject(result)) {
    return null;
  }

  return result;
}

// ---------------------------------------------------------------------------
// clearPreferences
// ---------------------------------------------------------------------------

/**
 * Clear all preferences from IndexedDB and localStorage.
 */
export async function clearPreferences(): Promise<void> {
  // Without IndexedDB there is nothing to delete there -- but the
  // localStorage cache below must still be cleared, or 'clear' would lie.
  if (hasIndexedDB()) {
    const db = await openMorphicDB();
    await db.delete(MORPHIC_IDB_STORE_NAME, MORPHIC_IDB_PREFS_KEY);
  }

  // Clear localStorage cache
  try {
    localStorage.removeItem(MORPHIC_STORAGE_KEY);
  } catch {
    // SSR or disabled — ignore
  }
}

// ---------------------------------------------------------------------------
// migrateFromLocalStorage
// ---------------------------------------------------------------------------

/**
 * Migrate preferences from localStorage to IndexedDB (one-time).
 *
 * Rules:
 *   - Only migrates if IDB is empty (no existing prefs)
 *   - Only migrates if localStorage has a valid JSON plain object
 *   - Does NOT overwrite existing IDB data (defensive assertion #4)
 *
 * @returns true if migration occurred, false otherwise
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  // Check if IDB already has data — do NOT overwrite
  const existing = await loadPreferences();
  if (existing !== null) {
    return false;
  }

  // Read from localStorage
  let raw: string | null;
  try {
    raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
  } catch {
    return false;
  }

  if (raw === null) {
    return false;
  }

  // Parse and validate
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }

  if (!isPlainObject(parsed)) {
    return false;
  }

  // Migrate to IDB (write-through will also update localStorage)
  await persistPreferences(parsed);
  return true;
}

// ---------------------------------------------------------------------------
// getStorageStatus
// ---------------------------------------------------------------------------

/**
 * Report the current storage status.
 */
export async function getStorageStatus(): Promise<StorageStatus> {
  let persisted = false;

  // Check navigator.storage.persist (if available)
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
      persisted = await navigator.storage.persisted();
    }
  } catch {
    // Not available — leave as false
  }

  // Try to open IDB
  try {
    await openMorphicDB();
    return { available: true, type: 'indexeddb', persisted };
  } catch {
    // IDB unavailable — check localStorage
    try {
      localStorage.getItem(MORPHIC_STORAGE_KEY);
      return { available: true, type: 'localstorage-only', persisted: false };
    } catch {
      return { available: false, type: 'none', persisted: false };
    }
  }
}

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

/**
 * Reset module state for test isolation.
 * @internal — test-only, prefixed `__` per convention.
 */
export function __resetIdbStateForTests(): void {
  dbInstance = null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function writeToLocalStorage(prefs: Record<string, unknown>): void {
  try {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Quota exceeded or disabled — silent fallback.
    // The IDB write already succeeded; localStorage is just cache.
  }
}
