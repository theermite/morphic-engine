/**
 * Holdout — SSR import safety (B-021d).
 *
 * Node environment, no DOM globals. Importing the public barrel
 * `@theermite/morphic-engine` from a server-rendered route (Next RSC, Astro
 * server-island, SvelteKit `+page.server`) MUST NOT throw, even though
 * the module exports Custom Element classes that extend HTMLElement.
 *
 * If this test fails, the engine package is unusable in any SSR/SSG
 * pipeline — a regression on the framework-agnostic CDC §0 contract.
 */

// @vitest-environment node

import { describe, expect, it } from 'vitest';

describe('B-021d — SSR import safety', () => {
  it('should_import_the_public_barrel_without_throwing_in_node', async () => {
    // The barrel re-exports MorphicProvider and MorphicCommandPaletteElement,
    // which extend HTMLElement. In a pure Node env, HTMLElement is undefined.
    // The module body MUST resolve to a safe shim instead of throwing
    // ReferenceError at module load.
    await expect(import('../../src/index.js')).resolves.toBeDefined();
  });

  it('should_expose_VERSION_when_imported_from_node', async () => {
    const mod = await import('../../src/index.js');
    expect(typeof mod.VERSION).toBe('string');
    expect(mod.VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should_expose_MorphicProvider_class_when_imported_from_node', async () => {
    const mod = await import('../../src/index.js');
    expect(typeof mod.MorphicProvider).toBe('function');
  });

  it('should_noop_defineMorphicProvider_when_customElements_unavailable', async () => {
    const mod = await import('../../src/index.js');
    // No throw in a node env (no customElements global).
    expect(() => mod.defineMorphicProvider()).not.toThrow();
  });

  it('should_have_no_window_no_document_no_HTMLElement_in_this_env', () => {
    // Sanity — confirm the holdout actually runs in node, not jsdom.
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof HTMLElement).toBe('undefined');
  });
});
