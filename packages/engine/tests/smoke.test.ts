import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { VERSION } from '../src/index.js';

describe('@theermite/morphic-engine — bootstrap smoke', () => {
  // Compared to package.json, never to a copied literal: the copy let VERSION
  // stay at beta.5 across eight published releases (found 2026-10-10).
  it('exports VERSION equal to the published package version', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('should be a string constant', () => {
    expect(typeof VERSION).toBe('string');
  });
});
