/**
 * The rule that closes the family, rather than one more site-by-site guard.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 *
 * Two independent reviews rejected this same family in a row (2026-08-31). Each
 * fix closed the site that was reported and left the family open somewhere the
 * author had not been. The second review named the reason: a guard written site
 * by site can only close the sites its author thought of.
 *
 * So the approach changed. `storage-access.ts` is the ONLY module allowed to
 * name a storage global. Everything else goes through it. This test is what
 * makes that real -- the previous safety net was a sweep that skipped 52
 * functions out of 133 and let a reintroduced guard survive unnoticed.
 *
 * It reads the source rather than the behaviour on purpose: the defect is a
 * REFERENCE to a global, and a reference is visible in the text long before it
 * is reachable at runtime. The runtime behaviour is covered separately.
 */

// @vitest-environment node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', 'src');

/** The one module allowed to touch storage. */
const GATEKEEPER = 'storage-access.ts';

/**
 * Globals no module may reach. This list is closed by nature: the web platform
 * has these, and a module never needs them -- everything it can do with them,
 * the gatekeeper does without ever throwing.
 */
const FORBIDDEN_GLOBALS = ['localStorage', 'indexedDB'];

/**
 * The libraries that reach storage are NOT listed here, and that is the point.
 *
 * Three rounds of review found three entrances, and each fix added one more
 * name to a hand-written list: `IndexeddbPersistence`, then `openDB`, then
 * `deleteDB` -- the last two from the SAME library, missed twice in a single
 * commit. The guard even carried, in its own comment, the rule it was breaking:
 * a list is always a list to extend, so it is not a guard.
 *
 * So the list is derived instead. Whatever the gatekeeper imports at RUNTIME is
 * by definition a way to reach storage -- that is the only reason it would be
 * in there. No other module may import those packages at runtime.
 *
 * A `import type` is fine anywhere: a type reaches nothing. It disappears at
 * compile time, which is exactly the difference that matters.
 *
 * What this buys: a fourth entrance, from a library nobody has thought of yet,
 * fails the moment the gatekeeper starts using it -- without anyone having to
 * remember to update a list.
 */
function storageLibraries(gatekeeperSource: string): string[] {
  const packages = new Set<string>();
  for (const line of gatekeeperSource.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('import')) continue;
    if (trimmed.startsWith('import type')) continue; // a type reaches nothing
    const from = trimmed.match(/from\s+'([^']+)'/);
    if (!from) continue;
    const specifier = from[1];
    if (specifier.startsWith('.')) continue; // our own modules, not a library
    packages.add(specifier);
  }
  return [...packages];
}

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

/** Lines naming a forbidden global, comments excluded. */
function offendingLines(source: string, names: string[] = FORBIDDEN_GLOBALS): string[] {
  const found: string[] = [];
  let inBlockComment = false;
  source.split(/\r?\n/).forEach((line, i) => {
    const trimmed = line.trim();
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      return;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlockComment = true;
      return;
    }
    if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;
    for (const name of names) {
      // What is forbidden is REACHING storage, not naming it. A first version
      // matched the bare word and flagged `localStorageRaw`, a variable holding
      // a value already read -- a guard that gets in the way of legitimate work
      // is a guard someone eventually switches off, and it takes the real
      // detection with it (Kata, 2026-08-30).
      //
      // So the pattern is the ACCESS: a member, an index, or a CALL. The call
      // matters because `new IndexeddbPersistence(` is followed by a
      // parenthesis -- a first version of this line stopped at `.` and `[`, and
      // reopening a database outside the door passed it without a word.
      const reaches = new RegExp(`\\b${name}\\s*[.\\[(]|typeof\\s+${name}\\b`);
      if (reaches.test(line)) found.push(`${i + 1}: ${trimmed.slice(0, 90)}`);
    }
  });
  return found;
}

describe('storage access has a single door', () => {
  const gatekeeper = readFileSync(join(SRC, GATEKEEPER), 'utf8');

  it('no module outside the gatekeeper reaches a storage global', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const hits = offendingLines(readFileSync(file, 'utf8'));
      if (hits.length > 0) {
        offenders.push(`${file.replace(SRC, '.')} (${hits.length}): ${hits[0]}`);
      }
    }

    expect(
      offenders,
      'a module reaches storage directly; route it through storage-access.ts, ' +
        'which is the only place that knows how a host can refuse',
    ).toEqual([]);
  });

  it('no module outside the gatekeeper imports a storage library at runtime', () => {
    const libraries = storageLibraries(gatekeeper);
    expect(
      libraries.length,
      'the gatekeeper imports no library at runtime, so this guard would check ' +
        'nothing -- read it before trusting a green',
    ).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, 'utf8');
      for (const line of source.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('import')) continue;
        if (trimmed.startsWith('import type')) continue; // a type reaches nothing
        const from = trimmed.match(/from\s+'([^']+)'/);
        if (!from || !libraries.includes(from[1])) continue;
        offenders.push(`${file.replace(SRC, '.')}: ${trimmed.slice(0, 80)}`);
      }
    }

    expect(
      offenders,
      `a module imports a storage library (${libraries.join(', ')}) at runtime. ` +
        'Whatever that library exports reaches the same store, under whatever ' +
        'name -- which is how three entrances were found in three reviews.',
    ).toEqual([]);
  });

  it('the sweep actually reads the modules it claims to check', () => {
    // A guard that scans nothing passes. The previous sweep filtered its input
    // and silently dropped 52 functions out of 133; this one states its reach
    // so an empty scan fails loudly instead of reporting success.
    expect(sourceFiles(SRC).length).toBeGreaterThan(10);
  });
});
