/**
 * @theermite/morphic-engine — wai-symbols axis (B-104, F-028, EXPERIMENTAL).
 *
 * Polyfill-style renderer for W3C WAI-Adapt Symbols (CR 2023-01-05).
 * No browser implements `adapt-symbol` natively as of 2026-05-22, so this
 * module walks the DOM, parses `adapt-symbol="<BCI-index>[+...]"` attributes,
 * resolves each BCI index via a user-supplied resolver, and injects the
 * corresponding pictogram(s) in one of three modes:
 *
 *  - 'before'  : pictogram(s) prepended inside the element (default)
 *  - 'after'   : pictogram(s) appended inside the element
 *  - 'replace' : original text replaced by pictogram(s); restored on disable
 *
 * @experimental — the WAI-Adapt Symbols spec is in CR and may change. The
 * API surface (mode names, options shape) is stable in intent but could
 * follow spec evolution. Consumers should pin morphic-engine version and
 * test before upgrading across minor versions.
 *
 * The module ships no pictogram images. The host provides a `resolver`
 * function that maps a BCI index to an image URL + alt text. This keeps the
 * bundle small and licensing flexible (Bliss CC BY-SA, Mulberry CC BY-SA,
 * ARASAAC CC BY-NC-SA — host chooses what fits the project).
 *
 * Persistence: only the active `mode` is persisted under sub-key `waiSymbols`
 * of MORPHIC_STORAGE_KEY. Resolvers are runtime objects and cannot be
 * persisted — the host must re-call `enableWaiSymbols` on each load.
 *
 * License: AGPL-3.0-or-later.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/** W3C WAI-Adapt Symbols spec literal attribute name (NOT prefixed with `data-`). */
export const WAI_SYMBOL_ATTRIBUTE = 'adapt-symbol' as const;

export const WAI_SYMBOLS_MODES = Object.freeze(['before', 'after', 'replace'] as const);
export type WaiSymbolsMode = (typeof WAI_SYMBOLS_MODES)[number];

/** Data attribute carried by every <span> we inject (for idempotent cleanup). */
export const MORPHIC_WAI_SYMBOLS_MARKER = 'data-morphic-wai-symbol' as const;
/** Data attribute carrying the original textContent in 'replace' mode (for restore). */
export const MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR = 'data-morphic-wai-original-text' as const;
export const MORPHIC_WAI_SYMBOLS_DEFAULT_Z_INDEX = 9997 as const;

const STORAGE_SUBKEY = 'waiSymbols';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SymbolResolution {
  /** Image URL (any scheme accepted; consumer responsible for trust). */
  src: string;
  /** Optional alt text (defaults to "BCI <index>" when omitted). */
  alt?: string;
  /** Optional width in px. */
  width?: number;
  /** Optional height in px. */
  height?: number;
}

/** Function the host supplies to map a BCI integer index to a resolution. */
export type SymbolResolver = (bciIndex: number) => SymbolResolution | null;

export interface WaiSymbolsOptions {
  /** Required — maps BCI index to image URL + metadata. */
  resolver: SymbolResolver;
  /** Where to inject the pictogram. Default 'before'. */
  mode?: WaiSymbolsMode;
  /** Root element to walk. Default `document.body`. */
  target?: HTMLElement;
  /** z-index applied inline on injected <span>. Default 9997. */
  zIndex?: number;
}

export interface WaiSymbolsState {
  mode: WaiSymbolsMode;
  /** Count of pictograms successfully rendered. */
  rendered: number;
  /** Count of BCI indices the resolver returned null (or threw) for. */
  unresolved: number;
}

// ---------------------------------------------------------------------------
// parseBciIndices — pure helper (exported for tests + advanced hosts)
// ---------------------------------------------------------------------------

/**
 * Parse a WAI-Adapt Symbols attribute value into a list of positive BCI
 * integer indices. Handles compound (`A+B`), whitespace, and skips invalid
 * tokens silently. Never throws.
 */
export function parseBciIndices(value: string): number[] {
  if (typeof value !== 'string' || value.length === 0) return [];
  const out: number[] = [];
  for (const raw of value.split('+')) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    // Strict positive integer only — reject decimals, negatives, zero, NaN.
    if (!/^\d+$/.test(trimmed)) continue;
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n <= 0) continue;
    out.push(n);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Validation helpers (defensive — TypeError on bad input)
// ---------------------------------------------------------------------------

function isWaiSymbolsMode(value: unknown): value is WaiSymbolsMode {
  return typeof value === 'string' && (WAI_SYMBOLS_MODES as readonly string[]).includes(value);
}

function assertOptions(options: WaiSymbolsOptions): void {
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('wai-symbols: options must be an object');
  }
  if (typeof options.resolver !== 'function') {
    throw new TypeError('wai-symbols: options.resolver must be a function');
  }
  if (options.mode !== undefined && !isWaiSymbolsMode(options.mode)) {
    throw new TypeError(
      `wai-symbols: mode must be one of ${WAI_SYMBOLS_MODES.join(', ')}; got ${String(options.mode)}`,
    );
  }
  if (options.zIndex !== undefined) {
    if (!Number.isFinite(options.zIndex) || options.zIndex <= 0) {
      throw new TypeError(
        `wai-symbols: zIndex must be a positive finite number; got ${options.zIndex}`,
      );
    }
  }
  if (options.target !== undefined) {
    // jsdom Element check — fall back to nodeType when instanceof not reliable.
    const t = options.target as unknown;
    const isElement =
      (typeof Element !== 'undefined' && t instanceof Element) ||
      (typeof t === 'object' && t !== null && (t as { nodeType?: number }).nodeType === 1);
    if (!isElement) {
      throw new TypeError('wai-symbols: target must be an Element');
    }
  }
}

// ---------------------------------------------------------------------------
// Storage helpers (sub-key pattern, never throws)
// ---------------------------------------------------------------------------

function readStorageObject(): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStorageObject(obj: Record<string, unknown>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Quota / private mode — DOM remains the source of truth for this session.
  }
}

function persistMode(mode: WaiSymbolsMode): void {
  const obj = readStorageObject();
  obj[STORAGE_SUBKEY] = mode;
  writeStorageObject(obj);
}

function unpersistMode(): void {
  const obj = readStorageObject();
  if (STORAGE_SUBKEY in obj) {
    delete obj[STORAGE_SUBKEY];
    writeStorageObject(obj);
  }
}

// ---------------------------------------------------------------------------
// Internal state — singleton
// ---------------------------------------------------------------------------

interface ActiveState {
  mode: WaiSymbolsMode;
  target: HTMLElement;
  rendered: number;
  unresolved: number;
  /** Elements whose original textContent was stashed for 'replace' mode. */
  replacedElements: HTMLElement[];
}

let active: ActiveState | null = null;

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function createPictogramSpan(
  resolution: SymbolResolution,
  bciIndex: number,
  zIndex: number,
): HTMLSpanElement {
  const span = document.createElement('span');
  span.setAttribute(MORPHIC_WAI_SYMBOLS_MARKER, String(bciIndex));
  span.style.display = 'inline-block';
  span.style.verticalAlign = 'middle';
  span.style.margin = '0 0.25em';
  span.style.zIndex = String(zIndex);

  const img = document.createElement('img');
  img.src = resolution.src;
  img.alt = resolution.alt ?? `BCI ${bciIndex}`;
  if (typeof resolution.width === 'number' && resolution.width > 0) {
    img.width = resolution.width;
  }
  if (typeof resolution.height === 'number' && resolution.height > 0) {
    img.height = resolution.height;
  }
  img.style.maxHeight = '1.5em';
  img.style.width = 'auto';
  span.appendChild(img);
  return span;
}

function safeResolve(resolver: SymbolResolver, idx: number): SymbolResolution | null {
  try {
    return resolver(idx);
  } catch {
    return null;
  }
}

function renderForElement(
  el: HTMLElement,
  indices: number[],
  resolver: SymbolResolver,
  mode: WaiSymbolsMode,
  zIndex: number,
  counters: { rendered: number; unresolved: number },
  replacedElements: HTMLElement[],
): void {
  const resolutions: { idx: number; res: SymbolResolution }[] = [];
  for (const idx of indices) {
    const res = safeResolve(resolver, idx);
    if (res === null) {
      counters.unresolved += 1;
    } else {
      resolutions.push({ idx, res });
    }
  }

  // 'replace' mode without any successful resolution = no-op (preserve text).
  if (mode === 'replace' && resolutions.length === 0) return;

  const pictograms = resolutions.map(({ idx, res }) => createPictogramSpan(res, idx, zIndex));
  counters.rendered += pictograms.length;

  switch (mode) {
    case 'before': {
      for (let i = pictograms.length - 1; i >= 0; i--) {
        el.insertBefore(pictograms[i] as Node, el.firstChild);
      }
      break;
    }
    case 'after': {
      for (const span of pictograms) {
        el.appendChild(span);
      }
      break;
    }
    case 'replace': {
      // Stash original text once; subsequent re-enables read from the stash.
      if (!el.hasAttribute(MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR)) {
        el.setAttribute(MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR, el.textContent ?? '');
      }
      // Clear children, then append pictograms.
      while (el.firstChild !== null) {
        el.removeChild(el.firstChild);
      }
      for (const span of pictograms) {
        el.appendChild(span);
      }
      replacedElements.push(el);
      break;
    }
  }
}

function cleanInjected(target: HTMLElement): void {
  // Remove every <span data-morphic-wai-symbol="..."> we injected.
  const stray = target.querySelectorAll(`[${MORPHIC_WAI_SYMBOLS_MARKER}]`);
  for (const el of Array.from(stray)) {
    el.remove();
  }
}

function restoreReplaced(target: HTMLElement): void {
  const stash = target.querySelectorAll(`[${MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR}]`);
  for (const el of Array.from(stash)) {
    const original = el.getAttribute(MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR) ?? '';
    el.textContent = original;
    el.removeAttribute(MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR);
  }
}

// Also defensively sweep the active target (if any) on top of the new target.
function cleanAll(newTarget: HTMLElement): void {
  cleanInjected(newTarget);
  restoreReplaced(newTarget);
  if (active !== null && active.target !== newTarget) {
    cleanInjected(active.target);
    restoreReplaced(active.target);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Activate the WAI-Adapt Symbols overlay. Walks the target subtree, parses
 * every `adapt-symbol` attribute, calls the resolver per BCI index, and
 * injects pictograms per the chosen mode. Returns a state snapshot with
 * counts. Idempotent — subsequent calls clean the previous render first.
 *
 * @experimental — see module header.
 */
export function enableWaiSymbols(options: WaiSymbolsOptions): WaiSymbolsState {
  assertOptions(options);
  const mode: WaiSymbolsMode = options.mode ?? 'before';
  const zIndex = options.zIndex ?? MORPHIC_WAI_SYMBOLS_DEFAULT_Z_INDEX;

  // SSR / non-DOM environment — persist intent and return an empty state.
  if (typeof document === 'undefined') {
    persistMode(mode);
    return { mode, rendered: 0, unresolved: 0 };
  }

  const target: HTMLElement = options.target ?? document.body;
  cleanAll(target);

  // Walk for elements carrying the spec attribute.
  // `[adapt-symbol]` (no `=`) — attribute presence is enough.
  const candidates = target.querySelectorAll(`[${WAI_SYMBOL_ATTRIBUTE}]`);
  const counters = { rendered: 0, unresolved: 0 };
  const replacedElements: HTMLElement[] = [];

  for (const el of Array.from(candidates)) {
    const attrValue = el.getAttribute(WAI_SYMBOL_ATTRIBUTE) ?? '';
    const indices = parseBciIndices(attrValue);
    if (indices.length === 0) continue;
    renderForElement(
      el as HTMLElement,
      indices,
      options.resolver,
      mode,
      zIndex,
      counters,
      replacedElements,
    );
  }

  active = {
    mode,
    target,
    rendered: counters.rendered,
    unresolved: counters.unresolved,
    replacedElements,
  };

  persistMode(mode);

  return { mode, rendered: counters.rendered, unresolved: counters.unresolved };
}

/**
 * Return the current active state, or null when nothing is active.
 * The state is a snapshot — does not auto-refresh if the DOM changes.
 */
export function getWaiSymbolsState(): WaiSymbolsState | null {
  if (active === null) return null;
  return { mode: active.mode, rendered: active.rendered, unresolved: active.unresolved };
}

/**
 * Remove every injected pictogram, restore original text for 'replace' mode,
 * and clear the persisted sub-key. Safe to call when nothing is active.
 */
export function disableWaiSymbols(): void {
  if (typeof document !== 'undefined') {
    // Use the active target if known, else fall back to document.body.
    const target: HTMLElement = active?.target ?? document.body;
    cleanInjected(target);
    restoreReplaced(target);
  }
  active = null;
  unpersistMode();
}
