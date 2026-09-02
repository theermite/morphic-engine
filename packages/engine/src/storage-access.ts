/**
 * Reaching `localStorage` on a host that may not let you.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 *
 * **Absent is not the same as refused, and this engine used to conflate them.**
 * Every persisting module guarded its writes with
 * `if (typeof localStorage === 'undefined') return;` -- 21 times across 11
 * modules. That covers a host with no storage at all, which is server
 * rendering. It does not cover a host that HAS the property and throws when it
 * is read: a privileged browser window, storage disabled by enterprise policy,
 * a sandboxed frame. In those, `typeof` evaluates the getter, the getter
 * throws, and the guard written to protect the call is the line that crashes.
 *
 * Found on 2026-08-31 in the Shinkofa browser, where the pomodoro's "start"
 * button did nothing: `NS_ERROR_NOT_AVAILABLE` raised inside
 * `writeStorageState`, one line into a function whose whole job was to be safe.
 *
 * The rule this file encodes: a host that will not give you storage is a host
 * without storage. Never an exception thrown at whoever called a public
 * function of this engine.
 */

/**
 * Whether `localStorage` can actually be used right now.
 *
 * Answers `false` for both shapes of "no": the property missing, and the
 * property refusing. Callers keep their own `try`/`catch` around the read and
 * write themselves -- storage can also fail mid-call, when a quota runs out.
 */
export function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    // A getter that throws is a host saying no. It is not an error to report.
    return false;
  }
}

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
 * The only door to `localStorage` in this engine.
 *
 * Every module used to reach the global itself and wrap it in its own guard --
 * 21 guards across 11 modules, and two independent reviews found the family
 * still open somewhere nobody had visited. A guard written site by site closes
 * only the sites its author thought of.
 *
 * So no module names the global any more. They call this, and this is the one
 * place that knows the three ways a host says no: the property is missing, the
 * property throws when read, or the call itself throws mid-flight on a quota.
 *
 * Nothing here throws. A host that will not give you storage is a host without
 * storage, never an exception raised at whoever called a public function.
 */
export const safeStorage = {
  /** The stored value, or `null` when storage is unavailable or empty. */
  get(key: string): string | null {
    if (!hasLocalStorage()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      // Reading can still fail after the probe said yes: a policy applied
      // between the two calls, a corrupted store. Absent, as far as callers go.
      return null;
    }
  },

  /** `true` when the value was really written. Callers can tell, and none must. */
  set(key: string, value: string): boolean {
    if (!hasLocalStorage()) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      // The usual one here is a full quota, which throws on write only.
      return false;
    }
  },

  /** `true` when the key is really gone -- including when it was never there. */
  remove(key: string): boolean {
    if (!hasLocalStorage()) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
} as const;

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
