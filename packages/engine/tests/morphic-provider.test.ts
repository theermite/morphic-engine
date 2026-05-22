/**
 * Tests TDG — B-003 `<morphic-provider>` Custom Element v1 zero-config.
 * Risk level : Sensitive (90% coverage cible).
 * CDC ref    : F-002.
 *
 * Spec : `<morphic-provider>` enveloppe `<body>` (ou tout host),
 *        s'enregistre dans customElements registry au load module,
 *        utilise Shadow DOM mode 'open' pour l'isolation visuelle,
 *        et expose un fallback inert quand l'engine n'a pas fini d'init.
 *
 * Anti-Circular Layer 1 : tests d'invariants (CE registry idempotence,
 *                          whenDefined resolution, fallback inert state).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defineMorphicProvider,
  MORPHIC_PROVIDER_TAG,
  MorphicProvider,
} from '../src/morphic-provider.js';

describe('<morphic-provider> — registration', () => {
  // jsdom provides a fresh customElements registry per test file, but
  // because we register in module side-effect, we test via the explicit
  // defineMorphicProvider() to keep invariants observable.
  it('should expose the tag name as `morphic-provider`', () => {
    expect(MORPHIC_PROVIDER_TAG).toBe('morphic-provider');
  });

  it('should register exactly once in customElements registry', () => {
    defineMorphicProvider();
    const def = customElements.get(MORPHIC_PROVIDER_TAG);
    expect(def).toBe(MorphicProvider);
  });

  it('should be idempotent — calling defineMorphicProvider() twice does not throw', () => {
    defineMorphicProvider();
    expect(() => defineMorphicProvider()).not.toThrow();
    expect(customElements.get(MORPHIC_PROVIDER_TAG)).toBe(MorphicProvider);
  });

  it('should resolve customElements.whenDefined after define', async () => {
    defineMorphicProvider();
    await expect(customElements.whenDefined(MORPHIC_PROVIDER_TAG)).resolves.toBeTruthy();
  });
});

describe('<morphic-provider> — instance lifecycle', () => {
  beforeEach(() => {
    defineMorphicProvider();
  });

  afterEach(() => {
    // Clean DOM between tests
    document.body.innerHTML = '';
  });

  it('should construct without arguments (zero-config)', () => {
    const el = document.createElement(MORPHIC_PROVIDER_TAG);
    expect(el).toBeInstanceOf(MorphicProvider);
  });

  it('should attach an open shadow root on connect', () => {
    const el = document.createElement(MORPHIC_PROVIDER_TAG) as MorphicProvider;
    document.body.appendChild(el);
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot?.mode).toBe('open');
  });

  it('should expose a <slot> in shadow DOM (host content slotted)', () => {
    const el = document.createElement(MORPHIC_PROVIDER_TAG) as MorphicProvider;
    document.body.appendChild(el);
    const slot = el.shadowRoot?.querySelector('slot');
    expect(slot).not.toBeNull();
  });

  it('should start in inert/fallback state until ready() is called', () => {
    const el = document.createElement(MORPHIC_PROVIDER_TAG) as MorphicProvider;
    document.body.appendChild(el);
    expect(el.hasAttribute('data-morphic-ready')).toBe(false);
    expect(el.hasAttribute('data-morphic-fallback')).toBe(true);
  });

  it('should flip to ready state when ready() is invoked', () => {
    const el = document.createElement(MORPHIC_PROVIDER_TAG) as MorphicProvider;
    document.body.appendChild(el);
    el.ready();
    expect(el.hasAttribute('data-morphic-ready')).toBe(true);
    expect(el.hasAttribute('data-morphic-fallback')).toBe(false);
  });

  it('should preserve fallback state across reconnect if ready() never called', () => {
    const el = document.createElement(MORPHIC_PROVIDER_TAG) as MorphicProvider;
    document.body.appendChild(el);
    document.body.removeChild(el);
    document.body.appendChild(el);
    expect(el.hasAttribute('data-morphic-fallback')).toBe(true);
    expect(el.hasAttribute('data-morphic-ready')).toBe(false);
  });

  it('should preserve ready state across reconnect once ready() was called', () => {
    const el = document.createElement(MORPHIC_PROVIDER_TAG) as MorphicProvider;
    document.body.appendChild(el);
    el.ready();
    document.body.removeChild(el);
    document.body.appendChild(el);
    expect(el.hasAttribute('data-morphic-ready')).toBe(true);
    expect(el.hasAttribute('data-morphic-fallback')).toBe(false);
  });
});

describe('<morphic-provider> — SSR / non-DOM environment', () => {
  it('should be a silent no-op when customElements is undefined (SSR)', () => {
    // Simulate a non-DOM environment by stubbing customElements as undefined.
    // The function must return silently — no throw, no side effect.
    vi.stubGlobal('customElements', undefined);
    expect(() => defineMorphicProvider()).not.toThrow();
    vi.unstubAllGlobals();
  });
});

describe('<morphic-provider> — zero-config guarantee (CDC F-002)', () => {
  beforeEach(() => {
    defineMorphicProvider();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should function without any attribute on the element', () => {
    document.body.innerHTML = `<${MORPHIC_PROVIDER_TAG}><p>child</p></${MORPHIC_PROVIDER_TAG}>`;
    const el = document.querySelector(MORPHIC_PROVIDER_TAG) as MorphicProvider | null;
    expect(el).not.toBeNull();
    expect(el?.shadowRoot).not.toBeNull();
    // Child preserved as light DOM (slotted)
    expect(el?.querySelector('p')?.textContent).toBe('child');
  });

  it('should be type-narrowed correctly when queried via tag', () => {
    document.body.innerHTML = `<${MORPHIC_PROVIDER_TAG}></${MORPHIC_PROVIDER_TAG}>`;
    const el = document.querySelector(MORPHIC_PROVIDER_TAG);
    // Runtime guarantee: querySelector returns Element | null;
    // we assert instance for the MorphicProvider contract.
    expect(el).toBeInstanceOf(MorphicProvider);
  });
});
