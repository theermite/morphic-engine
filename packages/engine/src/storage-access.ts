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
 * WHY THIS FILE CARRIES NO LIBRARY, AND WHY THERE ARE TWO DOORS (2026-09-03).
 *
 * There used to be one door for everything, and it became a crossroads: 23 of
 * the engine's modules imported it, while only 3 ever open a database. So every
 * consumer dragged `idb` and `y-indexeddb` along with it.
 *
 * The Shinkofa browser's build refused it, twice: first on `idb`, then on
 * `y-indexeddb` once `idb` was made lazy. Making the import lazy was aiming at
 * the symptom -- the cause is that everyone imports the same module. No version
 * of the engine could enter the browser while that was true, and 1437 green
 * tests could not see it: a bundler had to say no.
 *
 * So the door is split by what it costs to walk through:
 *   - THIS file, for preferences. No library, no database, no weight. What the
 *     other 20 modules need;
 *   - `storage-database.ts`, for whoever really opens a store. It owns the
 *     libraries, and only the 3 modules that need one import it.
 *
 * The rule is unchanged: no module reaches a storage global by itself. There
 * are simply two gatekeepers now, and the guard knows both.
 */
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
