/**
 * A trap on the lock itself, rather than on how the key is spelled.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 *
 * WHY THIS EXISTS, AND WHY READING THE SOURCE WAS NEVER GOING TO BE ENOUGH.
 *
 * Four independent reviews in a row found a way to reach storage that the
 * guard of the day could not see: a name it had not been taught, an import
 * spread over lines, a dynamic import, then a name written as a string. Each
 * fix closed the spelling that had just been demonstrated.
 *
 * The pattern under all four is one thing: a guard that reads source can only
 * recognise the SHAPES its author imagined. Deriving the list instead of
 * holding it moved the problem up a level; it did not remove it. And a name
 * assembled at runtime (`obj[a + b]`) defeats any reader of text, by
 * construction -- there is nothing in the file to read.
 *
 * So this watches the other end. Every route to `localStorage` and
 * `indexedDB`, whatever its spelling, ends at the same property of the same
 * global object. A trap there sees them all, because it does not look at the
 * gesture -- it IS the thing being reached.
 *
 * HOW IT DECIDES.
 *
 * On each read, the call stack says who is asking, and ONLY the frame closest
 * to the access decides:
 *   - `src/storage-access.ts` -> the door itself, allowed;
 *   - any other file in `src/` -> a module reaching around the door;
 *   - a bait under `tests/storage-door/bypass/` -> the same, on purpose, so
 *     the trap proves itself on every run instead of being believed;
 *   - anything else (a test, a third-party library) -> allowed.
 *
 * "Closest frame only" is not a detail, and the first full run proved it. An
 * earlier version blamed the nearest frame IN `src/`, skipping libraries on the
 * way. It flagged `sync-engine.ts` for loading `yjs`, whose own dependency
 * reads `localStorage` while it initialises -- guarded, in its own try/catch,
 * and none of our business. Blaming the importer for what its library does is
 * a false alarm, and a guard that cries wolf is a guard someone switches off.
 *
 * The cost of that choice, stated: a module reaching storage THROUGH a
 * third-party helper is invisible here. The static reading covers that side.
 *
 * WHAT IT DOES NOT COVER, stated so a green is not read as more than it is:
 *   - only code the suite actually runs. A module never exercised is invisible
 *     here -- which is precisely what the static reading covers, and why both
 *     are kept rather than one.
 *   - a test that replaces the whole property descriptor removes the trap for
 *     its own file. Two do (they are testing the door itself). Assigning a new
 *     value does NOT remove it: the setter below keeps the trap in place.
 */

import { afterEach } from 'vitest';

/** The globals whose lock is watched. */
const WATCHED = ['localStorage', 'indexedDB'] as const;

/** The modules allowed to reach them. Two since the split of 2026-09-03. */
const DOORS = ['/src/storage-access.ts', '/src/storage-database.ts'];

/** Where code that must never reach them lives. */
const OWNED = ['/src/', '/tests/storage-door/bypass/'];

let violations: string[] = [];

/** The getters this file installed, so a replaced one is recognisable. */
const TRAPS = new Set<() => unknown>();

function normalise(frame: string): string {
  return frame.replace(/\\/g, '/');
}

/**
 * The frame that reached storage from outside the door, or `null`.
 *
 * Exported so the decision rule is tested directly, on stacks of every shape,
 * rather than only through whatever the suite happens to execute.
 */
export function firstOffendingFrame(stack: string): string | null {
  for (const raw of stack.split('\n').slice(1)) {
    const frame = normalise(raw);
    if (!frame.includes('/')) continue; // an internal frame, no location
    if (frame.includes('/tests/storage-door/runtime-trap.ts')) continue; // ourselves
    // The first frame that names a file is the one that reached, full stop.
    if (frame.includes('/node_modules/')) return null; // a library's own doing
    if (DOORS.some((door) => frame.includes(door))) return null; // a door, doing its job
    if (OWNED.some((area) => frame.includes(area))) return raw.trim();
    return null; // a test, naming what it forbids
  }
  return null;
}

/** Violations seen so far, cleared by the reading. */
export function takeViolations(): string[] {
  const seen = violations;
  violations = [];
  return seen;
}

/** Whether the trap is still on this global — a test may have replaced it. */
export function trapIsInstalled(name: string): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  return descriptor?.get !== undefined && TRAPS.has(descriptor.get);
}

function install(name: string): void {
  // A value slot, so a test swapping the implementation (`globalThis.indexedDB
  // = new FDBFactory()`) keeps working AND keeps the trap. A plain getter would
  // have thrown on assignment, or silently dropped the trap.
  let value: unknown = Reflect.get(globalThis, name);
  const get = (): unknown => {
    const offender = firstOffendingFrame(new Error().stack ?? '');
    if (offender) violations.push(`${name} reached from ${offender}`);
    return value;
  };
  TRAPS.add(get);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get,
    set(next: unknown) {
      value = next;
    },
  });
}

for (const name of WATCHED) {
  install(name);
}

afterEach(() => {
  const seen = takeViolations();
  if (seen.length > 0) {
    throw new Error(
      `a module reached storage without going through storage-access.ts:\n  ${seen.join('\n  ')}\n` +
        'Route it through the door, which is the only place that knows how a host can refuse.',
    );
  }
});
