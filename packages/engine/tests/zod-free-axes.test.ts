// @vitest-environment node
/**
 * Garde-fou de poids navigateur : les modules qui appliquent un réglage
 * (thème, mouvement, contraste, densité, taille, police) ne doivent pas
 * atteindre `zod` par leurs imports. Zod ne sert qu'à valider des profils ;
 * le tirer dans une page qui applique juste un thème coûte ~25 Ko compressés.
 *
 * Anti-Circular Layer 1 : on lit le graphe d'imports réel des sources, on ne
 * compare pas à une liste recopiée.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

/**
 * Every module specifier a source imports — static, re-export, bare, dynamic
 * `import()` and `require()`. Uses the TypeScript scanner rather than a regex:
 * a regex misses forms such as a comment holding an apostrophe inside an
 * import list (caught by the independent review, 2026-10-10).
 */
function importsIn(source: string): string[] {
  return ts.preProcessFile(source, true, true).importedFiles.map((f) => f.fileName);
}

function importsOf(file: string): string[] {
  return importsIn(readFileSync(file, 'utf-8'));
}

/** Walks relative imports from `entry`; returns the bare packages reached. */
function packagesReachedFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const queue = [resolve(SRC, entry)];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of importsOf(file)) {
      if (spec.startsWith('.')) {
        queue.push(resolve(dirname(file), spec.replace(/\.js$/, '.ts')));
      } else {
        packages.add(spec);
      }
    }
  }
  return packages;
}

const AXIS_MODULES = [
  'init.ts',
  'theme.ts',
  'motion.ts',
  'contrast.ts',
  'density.ts',
  'typography.ts',
  'font-family.ts',
];

describe('axis modules stay free of zod', () => {
  it.each(AXIS_MODULES)('%s does not reach zod', (entry) => {
    expect([...packagesReachedFrom(entry)]).not.toContain('zod');
  });

  it('the walker does see zod where it is really imported (guard against a blind test)', () => {
    expect([...packagesReachedFrom('tokens.ts')]).toContain('zod');
  });

  it.each([
    ['dynamic import', "const m = await import('zod');"],
    ['apostrophe in a comment', "import {\n  a, // don't remove\n} from 'zod';"],
    ['quoted export name', "export { 'x' as y } from 'zod';"],
    ['import after code on one line', "const a = 1; import { z } from 'zod';"],
    ['require call', "const z = require('zod');"],
  ])('the scanner sees a %s', (_label, source) => {
    expect(importsIn(source)).toContain('zod');
  });
});
