/**
 * Storage access that survives a host which REFUSES rather than omits.
 *
 * Found on 2026-08-31, in the Shinkofa browser: clicking "start" on the
 * pomodoro did nothing at all. The console named the file and the line --
 * `NS_ERROR_NOT_AVAILABLE` inside `writeStorageState`.
 *
 * The cause is one assumption repeated 21 times across 11 modules of this
 * package: `if (typeof localStorage === 'undefined') return;`. That guard
 * covers a host where storage is ABSENT (server rendering). It does not cover a
 * host where storage is REFUSED -- a privileged browser window, a page with
 * storage disabled by policy, a sandboxed frame. There, `localStorage` is a
 * getter that throws, and `typeof` throws with it. The guard meant to protect
 * the call became the line that crashed.
 *
 * These tests pin the distinction, because it is the whole point: absent and
 * refused must both read as "no storage", never as an exception thrown at
 * whoever called a public function of this engine.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { hasLocalStorage } from '../src/storage-access.js';

const REAL = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

const REAL_IDB = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');

function restore(): void {
  if (REAL) {
    Object.defineProperty(globalThis, 'localStorage', REAL);
  } else {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
  if (REAL_IDB) {
    Object.defineProperty(globalThis, 'indexedDB', REAL_IDB);
  } else {
    delete (globalThis as { indexedDB?: unknown }).indexedDB;
  }
}

afterEach(restore);

describe('hasLocalStorage', () => {
  it('says yes when the host provides storage', () => {
    expect(hasLocalStorage()).toBe(true);
  });

  it('says no when storage is absent, as on a server', () => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    expect(hasLocalStorage()).toBe(false);
  });

  // The case that cost a evening: the property exists and throws when read.
  it('says no when reading storage throws, instead of throwing', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('NS_ERROR_NOT_AVAILABLE');
      },
    });

    expect(() => hasLocalStorage()).not.toThrow();
    expect(hasLocalStorage()).toBe(false);
  });

  it('says no when storage reads as null', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: null,
    });
    expect(hasLocalStorage()).toBe(false);
  });
});

// The sweep an independent review asked for on 2026-08-31. The pomodoro case
// below exercises 2 of the 21 corrected sites; reintroduce the old guard in any
// of the other 19 and it stays green. This one calls every public function the
// barrel exposes that takes no argument, on a host that refuses both storage
// APIs, and demands that none of them throws or rejects. It is what would have
// caught the IndexedDB half of the family on its own.
describe('no public function throws on a host that refuses storage', () => {
  it('survives a sweep of the whole barrel', async () => {
    for (const name of ['localStorage', 'indexedDB']) {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        get() {
          throw new Error('NS_ERROR_NOT_AVAILABLE');
        },
      });
    }

    const barrel = (await import('../src/index.js')) as Record<string, unknown>;
    const offenders: string[] = [];

    // Two exclusions, both stated rather than quietly filtered:
    //   - `getSyncedPreferences` refuses when the sync engine was never
    //     started. That is its contract, not a storage failure.
    //   - `openMorphicDB` is the low-level door itself. A function whose job is
    //     to open a database has to signal that it cannot; returning null
    //     instead would change its public type for every consumer. What matters
    //     is that no HIGH-LEVEL function lets that rejection reach a caller --
    //     `persistPreferences`, `loadPreferences`, `clearPreferences` and
    //     `migrateFromLocalStorage` are guarded, and this sweep proves it.
    const byContract = ['getSyncedPreferences', 'openMorphicDB'];

    for (const [name, value] of Object.entries(barrel)) {
      if (typeof value !== 'function' || value.length > 0) continue;
      if (byContract.includes(name)) continue;
      // A class is not callable without `new`; sweeping it would report the
      // sweep's own mistake as an engine defect.
      if (/^class[\s{]/.test(Function.prototype.toString.call(value))) continue;

      try {
        const result = (value as () => unknown)();
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        offenders.push(`${name}: ${String(error)}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('the engine keeps working on a host that refuses storage', () => {
  it('runs a full pomodoro start/pause/stop without throwing', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('NS_ERROR_NOT_AVAILABLE');
      },
    });

    const pomodoro = await import('../src/pomodoro.js');
    pomodoro.__resetPomodoroStateForTests();

    // Each of these persists, and each therefore touched the broken guard.
    expect(() => pomodoro.startPomodoro()).not.toThrow();
    expect(pomodoro.getPomodoroState().phase).toBe('work');

    expect(() => pomodoro.pausePomodoro()).not.toThrow();
    expect(pomodoro.getPomodoroState().paused).toBe(true);

    expect(() => pomodoro.resumePomodoro()).not.toThrow();
    expect(() => pomodoro.skipPhase()).not.toThrow();
    expect(() => pomodoro.stopPomodoro()).not.toThrow();
    expect(pomodoro.getPomodoroState().phase).toBe('idle');

    pomodoro.__resetPomodoroStateForTests();
  });
});
