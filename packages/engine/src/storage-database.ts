/**
 * The door for whoever really opens a store.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 *
 * Split out of `storage-access.ts` on 2026-09-03. That module is imported by 23
 * modules of the engine; only 3 ever open a database, and the single door made
 * all 23 carry `idb` and `y-indexeddb`. The Shinkofa browser's build refused
 * the package for exactly that, and no test could see it -- a bundler had to.
 *
 * Everything about a host that says no is unchanged, and lives here now: the
 * property may be missing, the property may throw when read, and the open
 * itself may be refused while both look fine.
 *
 * Whoever imports THIS file pays for the database libraries. Whoever only
 * stores a preference imports `storage-access.ts` and pays nothing.
 */

import type { IDBPDatabase } from 'idb';

/**
 * Whether `indexedDB` can actually be used right now.
 *
 * Same rule, same two shapes of "no". Added on 2026-08-31 after an independent
 * review pointed out that the first pass closed the family on `localStorage`
 * only: `openMorphicDB()` and its four callers still rejected with
 * `NS_ERROR_NOT_AVAILABLE` on the very host this file was written for. A rule
 * stated in a docstring and enforced on one global out of two is not a rule.
 */
export function hasIndexedDB(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Runs `use` against IndexedDB, or answers `fallback` when it cannot.
 *
 * `hasIndexedDB()` only tells you the global is reachable. It does not tell you
 * a database will open: private browsing exposes the API and refuses the open,
 * and so does an exhausted quota. An earlier round shipped `clearPreferences`
 * reporting a successful erase on a database that never opened -- the review
 * called that out, and it is the reason this wrapper exists rather than one
 * more boolean.
 */
export async function withIndexedDB<T>(
  use: (db: IDBFactory) => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!hasIndexedDB()) return fallback;
  try {
    return await use(indexedDB);
  } catch {
    return fallback;
  }
}

/**
 * Opens the CRDT persistence layer, or answers `null` when the host refuses.
 *
 * This lives here rather than in `sync-engine.ts` for one reason: it is the
 * only way the rule can be checked. `IndexeddbPersistence` opens its database
 * inside its own constructor, so using it IS reaching for storage -- but a
 * module has to import the library to use it, and a guard cannot tell an import
 * from an unguarded open by reading text.
 *
 * Measured, on 2026-09-03: a first version of the guard asked whether the
 * module mentioned the wrapper. Removing the import left the mention behind in
 * the call itself, and the guard stayed green on code that was broken again.
 * A word is not a gesture.
 *
 * With the open living here, the name appears in exactly one module, and the
 * rule becomes what a guard can actually prove: nobody else may name it.
 */
export async function openSyncPersistence(
  dbName: string,
  doc: unknown,
): Promise<{ destroy(): void } | null> {
  return withIndexedDB(async () => {
    const { IndexeddbPersistence } = await import('y-indexeddb');
    // biome-ignore lint/suspicious/noExplicitAny: Y.Doc type unavailable without a static import
    const provider = new IndexeddbPersistence(dbName, doc as any);
    await provider.whenSynced;
    return provider as unknown as { destroy(): void };
  }, null);
}

/**
 * Opens the engine's IndexedDB database, or answers `null` when the host says no.
 *
 * This is the second door that had been left open, and the review of
 * 2026-09-03 found it. The CRDT open had been moved in here precisely because
 * a library that opens a database IS reaching for storage -- and then the very
 * same shape was left outside: `openDB()` from `idb`, which calls
 * `indexedDB.open()` internally under a name the guard did not recognise.
 *
 * The rule only becomes provable when every library that opens a store is named
 * in this one file. Applying it once and not twice is how a family survives a
 * change of approach.
 */
export async function openDatabase(
  name: string,
  version: number,
  upgrade: (db: IDBPDatabase) => void,
): Promise<IDBPDatabase | null> {
  return withIndexedDB(async () => {
    // Loaded on demand, like the CRDT layer next door, and for the same
    // reason: a consumer that never opens a database must not carry the
    // library. A static import here dragged `idb` into every bundle that
    // reached the door -- the Shinkofa browser's build refused it on
    // 2026-09-03, and the pomodoro has no database to open.
    const { openDB } = await import('idb');
    return await openDB(name, version, {
      upgrade(db) {
        upgrade(db as unknown as IDBPDatabase);
      },
    });
  }, null);
}

/**
 * Deletes a database, and answers whether it is really gone.
 *
 * The third entrance the door had left open, found by review on 2026-09-03 in
 * the very commit that claimed to have closed the family. `deleteDB` (from
 * `idb`) calls `indexedDB.deleteDatabase()` internally -- the same shape as
 * `openDB`, in the GDPR erasure path of all places.
 *
 * It was harmless only because its caller happened to wrap it in a local
 * `try`/`catch`. That is the author of one file being careful, not a property
 * of the engine. The door has to hold it.
 */
export async function deleteDatabase(name: string): Promise<boolean> {
  return withIndexedDB(async () => {
    const { deleteDB } = await import('idb');
    await deleteDB(name, {
      blocked() {
        // Another connection is still open: the caller retries next session.
      },
    });
    return true;
  }, false);
}
