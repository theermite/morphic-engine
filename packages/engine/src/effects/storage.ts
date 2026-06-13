/**
 * Effect-TS wrappers around the IndexedDB persistence layer.
 *
 * CDC ref : F-018 (Effect-TS résilience — wrap idb-storage async)
 * Brick   : B-019
 * Risk    : Sensitive (90% coverage)
 *
 * Contract: every wrapper produces an `Effect.Effect<A, StorageError>`. The
 * core layer (`src/idb-storage.ts`) is left intact — callers who do not need
 * structured errors keep using it directly with zero ceremony. Callers who
 * want composable retry / timeout / catch import from this module instead.
 *
 * Defensive assertions (PET §5):
 *   1. Every wrapper uses `Effect.tryPromise({ try, catch })` so a thrown
 *      value cannot escape untyped — `catch` always returns a StorageError.
 *   2. The `operation` field preserves the original call so telemetry can
 *      distinguish "persist failed" from "load failed".
 *
 * Subpath export: consumers reach this via `@theermite/morphic-engine/effects` so the
 * core import (`@theermite/morphic-engine`) stays Effect-free and tree-shakes the
 * Effect-TS bundle (~50 KB) out of the consumer build.
 */

import { Effect } from 'effect';

import {
  clearPreferences as clearPreferencesCore,
  getStorageStatus as getStorageStatusCore,
  loadPreferences as loadPreferencesCore,
  migrateFromLocalStorage as migrateFromLocalStorageCore,
  persistPreferences as persistPreferencesCore,
  type StorageStatus,
} from '../idb-storage.js';
import { StorageError } from './errors.js';

/** Effect-wrapped {@link persistPreferencesCore}. */
export const persistPreferences = (
  prefs: Record<string, unknown>,
): Effect.Effect<void, StorageError> =>
  Effect.tryPromise({
    try: () => persistPreferencesCore(prefs),
    catch: (cause) => new StorageError({ operation: 'persist', cause }),
  });

/** Effect-wrapped {@link loadPreferencesCore}. */
export const loadPreferences = (): Effect.Effect<Record<string, unknown> | null, StorageError> =>
  Effect.tryPromise({
    try: () => loadPreferencesCore(),
    catch: (cause) => new StorageError({ operation: 'load', cause }),
  });

/** Effect-wrapped {@link clearPreferencesCore}. */
export const clearPreferences = (): Effect.Effect<void, StorageError> =>
  Effect.tryPromise({
    try: () => clearPreferencesCore(),
    catch: (cause) => new StorageError({ operation: 'clear', cause }),
  });

/** Effect-wrapped {@link migrateFromLocalStorageCore}. */
export const migrateFromLocalStorage = (): Effect.Effect<boolean, StorageError> =>
  Effect.tryPromise({
    try: () => migrateFromLocalStorageCore(),
    catch: (cause) => new StorageError({ operation: 'migrate', cause }),
  });

/** Effect-wrapped {@link getStorageStatusCore}. */
export const getStorageStatus = (): Effect.Effect<StorageStatus, StorageError> =>
  Effect.tryPromise({
    try: () => getStorageStatusCore(),
    catch: (cause) => new StorageError({ operation: 'status', cause }),
  });
