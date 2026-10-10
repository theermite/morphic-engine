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
import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

/** Every module specifier imported by a source file (static, re-export, bare side-effect). */
function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf-8');
  const found: string[] = [];
  for (const m of source.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/gm)) {
    found.push(m[1] as string);
  }
  for (const m of source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) {
    found.push(m[1] as string);
  }
  return found;
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
});
