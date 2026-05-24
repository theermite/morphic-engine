/**
 * `<morphic-provider>` Custom Element v1 — zero-config host wrapper.
 *
 * CDC ref : F-002 (Web Component zero-config).
 * Brick   : B-003.
 * Risk    : Sensitive (90% coverage).
 *
 * Spec :
 *   - Custom Element v1, autonomous (extends HTMLElement).
 *   - Open shadow root with a single `<slot>` — host content stays in light DOM
 *     and is rendered through the slot, so integrators keep full control over
 *     their own markup, styling and accessibility.
 *   - Two state attributes, mutually exclusive on the host element:
 *       * `data-morphic-fallback` — set on connect, before the engine signals
 *         readiness. CSS may key off this to render a safe, inert baseline.
 *       * `data-morphic-ready`    — set when the integrator (or the engine
 *         bootstrap) calls `provider.ready()`. CSS may key off this to enable
 *         morphic axes once it's safe to render the adapted UI.
 *   - `ready()` is idempotent and persists across DOM reconnects.
 *   - Zero attributes required on the host element (zero-config contract).
 *
 * The element is purposefully minimal in B-003 : it is the anchor for every
 * subsequent brick (head-read init B-004, token system B-005, sensory axes
 * B-007+). It owns no axis state itself — composition over inheritance.
 */

/** Tag name used to register the element. */
export const MORPHIC_PROVIDER_TAG = 'morphic-provider' as const;

const ATTR_FALLBACK = 'data-morphic-fallback';
const ATTR_READY = 'data-morphic-ready';
const READY_FLAG = Symbol('morphic-provider:ready');

interface ReadyCarrier {
  [READY_FLAG]?: boolean;
}

// B-021d SSR safety — in a pure Node env (Next RSC, Astro server-island,
// SvelteKit `+page.server`), `HTMLElement` is undefined and the class
// declaration would throw `ReferenceError` at module load. Falling back to
// an empty class shim keeps the module importable. The shim is never
// instantiated server-side because `defineMorphicProvider()` short-circuits
// when `customElements` is undefined.
const SafeHTMLElement: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

export class MorphicProvider extends SafeHTMLElement {
  constructor() {
    super();
    // Custom Elements v1 spec guarantees the constructor is invoked exactly
    // once per instance, so attachShadow is always safe here. Attaching at
    // construction (not in connectedCallback) lets light-DOM children render
    // through the slot from the very first paint.
    const root = this.attachShadow({ mode: 'open' });
    const slot = document.createElement('slot');
    root.appendChild(slot);
  }

  connectedCallback(): void {
    // Defensive assertion #2 — connectedCallback can be invoked multiple times
    // (e.g. after a move/reconnect). The state attributes must reflect the
    // ready flag carried on the instance, not the connection count.
    const carrier = this as unknown as ReadyCarrier;
    if (carrier[READY_FLAG] === true) {
      this.setAttribute(ATTR_READY, '');
      this.removeAttribute(ATTR_FALLBACK);
    } else {
      this.setAttribute(ATTR_FALLBACK, '');
      this.removeAttribute(ATTR_READY);
    }
  }

  /**
   * Signal that the morphic engine is ready to render adapted UI.
   * Idempotent — safe to call multiple times.
   * Persistent — the ready flag survives DOM disconnect/reconnect.
   */
  ready(): void {
    const carrier = this as unknown as ReadyCarrier;
    carrier[READY_FLAG] = true;
    this.setAttribute(ATTR_READY, '');
    this.removeAttribute(ATTR_FALLBACK);
  }
}

/**
 * Register `<morphic-provider>` in the global Custom Element registry.
 * Idempotent — calling it after registration is a no-op.
 *
 * Integrators normally do not need to call this directly: importing the
 * module from `@morphic/engine` runs the side-effect registration. The
 * explicit function exists for tests and for hosts that want to register
 * lazily.
 */
export function defineMorphicProvider(): void {
  if (typeof customElements === 'undefined') {
    // SSR / non-DOM environment — silent no-op (CDC §0 "framework-agnostic").
    return;
  }
  if (customElements.get(MORPHIC_PROVIDER_TAG) === undefined) {
    customElements.define(MORPHIC_PROVIDER_TAG, MorphicProvider);
  }
}

// Side-effect : register on import in DOM environments.
defineMorphicProvider();
