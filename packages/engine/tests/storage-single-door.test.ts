/**
 * The rule that closes the family, rather than one more site-by-site guard.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 *
 * `storage-access.ts` is the ONLY module allowed to reach a storage global or a
 * library that opens a store. Everything else goes through it. This test is
 * what makes that real.
 *
 * FOURTH ROUND, AND THE MECHANISM CHANGED RATHER THAN THE PATTERN.
 *
 * Three independent reviews rejected this family in a row. The first two fixes
 * lengthened a hand-written list of names; the third derived the list instead,
 * and was still rejected -- because all three read the source LINE BY LINE, and
 * a line is not a statement:
 *
 *   - an import spread over several lines has no line that both begins with
 *     `import` and carries its `from`, so it matched nothing;
 *   - a dynamic `await import('...')` begins with neither.
 *
 * That second hole was live, not hypothetical. The gatekeeper reaches
 * `y-indexeddb` through a dynamic import, so the library that opens the CRDT
 * database was ABSENT from the list the guard derived from it. Measured on
 * 2026-09-03 against the previous version: of five ways back in, it caught one.
 *
 * So the guard now reads the STRUCTURE (`tests/storage-door/analyze.ts`, the
 * TypeScript parser) instead of the text. A parser has no blind spot shaped
 * like the syntax, because the shape is what it is built to read.
 *
 * AND IT PROVES ITSELF ON EVERY RUN. `tests/storage-door/bypass/` holds one
 * file per way back in, each a form some version of this guard let through; the
 * guard is required to flag every one of them. `tests/storage-door/clean/`
 * holds the look-alikes it must leave alone -- a guard that flags legitimate
 * work is a guard someone switches off, and it takes the real detection with
 * it. A green run now means the detector was exercised, not merely that nobody
 * offended.
 */

// @vitest-environment node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { globalReaches, runtimeLibraries, runtimeModuleSpecifiers } from './storage-door/analyze';

const SRC = join(import.meta.dirname, '..', 'src');
const DOOR_TESTS = join(import.meta.dirname, 'storage-door');

/** The one module allowed to touch storage. */
const GATEKEEPER = 'storage-access.ts';

/**
 * Globals no module may reach. This list is closed by nature: the web platform
 * has these, and a module never needs them -- everything it can do with them,
 * the gatekeeper does without ever throwing.
 */
const FORBIDDEN_GLOBALS = ['localStorage', 'indexedDB'];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry.endsWith('.test.ts')) continue; // a test may name what it forbids
    if (entry === GATEKEEPER) continue;
    out.push(full);
  }
  return out;
}

/**
 * The libraries that reach storage are NOT written down, and that is the point.
 *
 * Whatever the gatekeeper pulls in at runtime is by definition a way to reach
 * storage -- that is the only reason it would be in there. So a fourth
 * entrance, from a library nobody has thought of yet, fails the moment the
 * gatekeeper starts using it, without anyone remembering to update anything.
 */
function storageLibraries(): string[] {
  const gatekeeper = readFileSync(join(SRC, GATEKEEPER), 'utf8');
  return runtimeLibraries(gatekeeper, GATEKEEPER);
}

describe('storage access has a single door', () => {
  it('no module outside the gatekeeper reaches a storage global', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const hits = globalReaches(readFileSync(file, 'utf8'), FORBIDDEN_GLOBALS, file);
      const first = hits[0];
      if (first) {
        offenders.push(`${file.replace(SRC, '.')} (${hits.length}): ${first.line}: ${first.text}`);
      }
    }

    expect(
      offenders,
      'a module reaches storage directly; route it through storage-access.ts, ' +
        'which is the only place that knows how a host can refuse',
    ).toEqual([]);
  });

  it('no module outside the gatekeeper imports a storage library at runtime', () => {
    const libraries = storageLibraries();
    expect(
      libraries.length,
      'the gatekeeper reaches no library at runtime, so this guard would check ' +
        'nothing -- read it before trusting a green',
    ).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const specifiers = runtimeModuleSpecifiers(readFileSync(file, 'utf8'), file);
      for (const specifier of specifiers) {
        if (libraries.includes(specifier)) {
          offenders.push(`${file.replace(SRC, '.')}: ${specifier}`);
        }
      }
    }

    expect(
      offenders,
      `a module reaches a storage library (${libraries.join(', ')}) at runtime. ` +
        'Whatever that library exports opens the same store, under whatever ' +
        'name -- which is how three entrances were found in three reviews.',
    ).toEqual([]);
  });

  it('the sweep actually reads the modules it claims to check', () => {
    // A guard that scans nothing passes. An earlier sweep filtered its input
    // and silently dropped 52 functions out of 133; this one states its reach
    // so an empty scan fails loudly instead of reporting success.
    expect(sourceFiles(SRC).length).toBeGreaterThan(10);
  });
});

describe('the guard is proven on every way back in', () => {
  const baitDir = join(DOOR_TESTS, 'bypass');
  const baits = readdirSync(baitDir).filter((entry) => entry.endsWith('.ts'));

  it('every known way back in still has its bait file', () => {
    // Five forms, each one a version of this guard let through before.
    expect(
      baits.length,
      'a bait was deleted; the guard stops proving itself',
    ).toBeGreaterThanOrEqual(5);
  });

  it('the bracket bait still uses brackets', () => {
    // The linter offers to rewrite this into a dot access. The bait would stay
    // flagged -- as the form that was already covered -- and stop proving the
    // one it exists for. Same erosion as the formatter, different tool.
    const source = readFileSync(join(baitDir, 'bracket-access.ts'), 'utf8');
    expect(source, 'the bracket access was rewritten; that bait proves nothing now').toContain(
      "['localStorage']",
    );
  });

  it('the multi-line bait still spans several lines', () => {
    // The formatter joins that import back onto one line if it is allowed to,
    // and the bait would still be flagged -- as a single-line import, the one
    // form that was never the problem. It would pass while testing nothing, so
    // the shape itself is asserted rather than assumed.
    const source = readFileSync(join(baitDir, 'multiline-import.ts'), 'utf8');
    const opening = source.split(/\r?\n/).find((line) => line.trim().startsWith('import {'));
    expect(opening, 'multiline-import.ts no longer opens an import block').toBeDefined();
    expect(
      opening,
      'the import was joined onto one line; that bait now proves nothing',
    ).not.toContain('from');
  });

  for (const bait of baits) {
    it(`flags ${bait}`, () => {
      const source = readFileSync(join(baitDir, bait), 'utf8');
      const libraries = storageLibraries();
      const reachesGlobal = globalReaches(source, FORBIDDEN_GLOBALS, bait).length > 0;
      const reachesLibrary = runtimeModuleSpecifiers(source, bait).some((specifier) =>
        libraries.includes(specifier),
      );
      expect(
        reachesGlobal || reachesLibrary,
        `${bait} is a known way back into storage; the guard must flag it`,
      ).toBe(true);
    });
  }

  it('leaves the look-alikes alone', () => {
    // `localStorageRaw`, a type import, a string key, a comment. Each was
    // flagged, or nearly flagged, by some version of the text guard.
    const cleanDir = join(DOOR_TESTS, 'clean');
    const libraries = storageLibraries();
    const flagged: string[] = [];
    for (const entry of readdirSync(cleanDir).filter((name) => name.endsWith('.ts'))) {
      const source = readFileSync(join(cleanDir, entry), 'utf8');
      const hits = globalReaches(source, FORBIDDEN_GLOBALS, entry);
      const imports = runtimeModuleSpecifiers(source, entry).filter((specifier) =>
        libraries.includes(specifier),
      );
      const first = hits[0];
      if (first) flagged.push(`${entry}: global at line ${first.line}`);
      if (imports.length > 0) flagged.push(`${entry}: runtime import of ${imports.join(', ')}`);
    }

    expect(
      flagged,
      'the guard flags legitimate code; a guard in the way is a guard someone ' +
        'switches off, and it takes the real detection with it',
    ).toEqual([]);
  });
});
