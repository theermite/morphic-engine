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
