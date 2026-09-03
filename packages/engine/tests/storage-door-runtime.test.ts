/**
 * The runtime trap, proven rather than believed.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 *
 * The static guard reads the source; this one watches the lock. Neither is
 * complete alone -- reading text cannot see a name assembled at runtime, and a
 * trap only sees code the suite actually runs. Kept together on purpose.
 *
 * What follows exercises the trap end to end: a bait file reaches storage the
 * way the review of 2026-09-03 demonstrated, and the trap must record it. The
 * decision rule is also tested directly on stacks of every shape, so a form
 * the suite never happens to execute is still covered.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { firstOffendingFrame, takeViolations, trapIsInstalled } from './storage-door/runtime-trap';

describe('the trap is actually on the lock', () => {
  beforeEach(() => {
    takeViolations(); // start from a clean slate, whatever ran before
  });

  it('is installed on both storage globals', () => {
    // A trap nobody installed catches nothing and reports success. This is the
    // wiring, not the function: it asks the real global object what it holds.
    expect(trapIsInstalled('localStorage'), 'the localStorage trap is gone').toBe(true);
    expect(trapIsInstalled('indexedDB'), 'the indexedDB trap is gone').toBe(true);
  });

  it('survives a module swapping the implementation', () => {
    // `globalThis.indexedDB = new FDBFactory()` is what four test files do. A
    // plain getter would have thrown, or dropped the trap without a word.
    const previous = globalThis.indexedDB;
    const replacement = {} as IDBFactory;
    globalThis.indexedDB = replacement;
    expect(globalThis.indexedDB, 'the swap did not take').toBe(replacement);
    expect(trapIsInstalled('indexedDB'), 'the swap removed the trap').toBe(true);
    globalThis.indexedDB = previous;
    takeViolations(); // this test's own reads are not the subject
  });

  it('records a bait reaching storage by a computed key', async () => {
    // The exact bypass the review executed: the name written as a string.
    // Reading the source missed it for a whole round; the lock cannot.
    const { remember } = await import('./storage-door/bypass/bracket-access');
    remember('dark');

    const seen = takeViolations();
    expect(seen.length, 'the trap did not see the bait reach storage').toBeGreaterThan(0);
    expect(seen.join('\n')).toContain('localStorage');
  });

  it('stays silent when the door itself reaches storage', async () => {
    // A trap that fires on legitimate work is a trap someone switches off.
    const { safeStorage } = await import('../src/storage-access');
    safeStorage.set('morphic-trap-probe', 'value');
    safeStorage.get('morphic-trap-probe');
    safeStorage.remove('morphic-trap-probe');

    expect(takeViolations(), 'the door was flagged for doing its job').toEqual([]);
  });
});

describe('the rule that decides who was asking', () => {
  // Tested on stacks directly, so a shape the suite never executes is still
  // covered. Windows and POSIX separators both, because the frames differ.
  const cases = [
    {
      what: 'a module of src reaching around the door',
      stack:
        'Error\n    at get (/p/tests/storage-door/runtime-trap.ts:1:1)\n    at remember (/p/src/theme.ts:12:3)',
      offends: true,
    },
    {
      what: 'the same, with Windows separators',
      stack:
        'Error\n    at get (D:\\p\\tests\\storage-door\\runtime-trap.ts:1:1)\n    at remember (D:\\p\\src\\theme.ts:12:3)',
      offends: true,
    },
    {
      what: 'the door itself',
      stack:
        'Error\n    at get (/p/tests/storage-door/runtime-trap.ts:1:1)\n    at hasLocalStorage (/p/src/storage-access.ts:40:5)\n    at writeTheme (/p/src/theme.ts:12:3)',
      offends: false,
    },
    {
      what: 'a library called by the door',
      stack:
        'Error\n    at get (/p/tests/storage-door/runtime-trap.ts:1:1)\n    at open (/p/node_modules/idb/build/index.js:9:1)\n    at openDatabase (/p/src/storage-access.ts:180:5)',
      offends: false,
    },
    {
      what: 'a library reading storage while a module of src loads it',
      // The false alarm the first full run produced: `yjs` pulls in a
      // dependency that reads `localStorage` as it initialises, guarded, and
      // the importer was blamed for it.
      stack:
        'Error\n    at get (/p/tests/storage-door/runtime-trap.ts:1:1)\n    at /p/node_modules/lib0/storage.js:43:7\n    at createSyncEngine (/p/src/sync-engine.ts:113:13)',
      offends: false,
    },
    {
      what: 'a test naming what it forbids',
      stack:
        'Error\n    at get (/p/tests/storage-door/runtime-trap.ts:1:1)\n    at /p/tests/theme.test.ts:30:3',
      offends: false,
    },
    {
      what: 'a package that merely has a src folder',
      stack:
        'Error\n    at get (/p/tests/storage-door/runtime-trap.ts:1:1)\n    at f (/p/node_modules/some-lib/src/index.js:3:1)',
      offends: false,
    },
  ];

  for (const { what, stack, offends } of cases) {
    it(`${offends ? 'flags' : 'allows'} ${what}`, () => {
      expect(firstOffendingFrame(stack) !== null).toBe(offends);
    });
  }
});
