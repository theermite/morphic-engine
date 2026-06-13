/**
 * @theermite/morphic-engine — command-palette axis (B-105, F-029).
 *
 * Keyboard-first navigation:
 *  - Global shortcut registry: hosts declare commands; each command may carry
 *    a keyboard combo (`Mod+D`, `Ctrl+Shift+P`, etc.). A single global
 *    `keydown` listener dispatches to the matching command.
 *  - Command palette overlay (`<morphic-command-palette>`): opened by a
 *    trigger combo (default `Mod+K`), renders a search input + filtered
 *    results list with Shadow DOM isolation. Fuse.js fuzzy search is
 *    lazy-loaded on first open to keep the engine bundle slim.
 *
 * OS awareness:
 *  - The `Mod` token in a combo maps to `Cmd` (Meta) on macOS, `Ctrl` on
 *    Windows / Linux. Detection is platform-sniffing first, `userAgent`
 *    fallback (covers iPad on iPadOS 13+).
 *
 * Persistence:
 *  - Trigger combo persisted under sub-key `commandPalette` of
 *    `MORPHIC_STORAGE_KEY`. Storage holds intent, not live UI.
 *  - Corrupt or absent storage falls back silently to defaults.
 *
 * SSR safety:
 *  - All DOM access is guarded; SSR call paths return a minimal state object
 *    without registering listeners or custom elements.
 *
 * License: AGPL-3.0-or-later.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

export const COMMAND_PALETTE_DEFAULT_TRIGGER = 'Mod+K' as const;
export const MORPHIC_COMMAND_PALETTE_MARKER = 'data-morphic-command-palette' as const;
export const MORPHIC_COMMAND_PALETTE_TAG = 'morphic-command-palette' as const;
export const MORPHIC_COMMAND_PALETTE_DEFAULT_Z_INDEX = 10000 as const;

const STORAGE_SUBKEY = 'commandPalette';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OS = 'mac' | 'other';

export interface ParsedCombo {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  /** True when the combo uses the `Mod` token (OS-resolved at match time). */
  mod: boolean;
  /** Lowercase key name (e.g. 'k', 'escape', 'enter', '/'). */
  key: string;
}

export interface Command {
  /** Stable unique identifier. */
  id: string;
  /** User-visible label rendered in the palette. */
  label: string;
  /** Function to execute when the command is invoked. */
  action: () => void;
  /** Optional keyboard combo (e.g. 'Mod+D'). */
  shortcut?: string;
  /** Optional description shown alongside the label. */
  description?: string;
  /** Extra search terms not present in the label. */
  keywords?: string[];
}

export interface CommandPaletteOptions {
  commands: Command[];
  /** Combo that opens the palette. Default: `Mod+K`. */
  trigger?: string;
  /** Z-index applied to the palette host element. */
  zIndex?: number;
}

export interface CommandPaletteState {
  open: boolean;
  trigger: string;
  commandCount: number;
}

// ---------------------------------------------------------------------------
// OS detection
// ---------------------------------------------------------------------------

export function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'other';
  const platform = (navigator.platform ?? '').toLowerCase();
  if (platform.includes('mac')) return 'mac';
  const ua = (navigator.userAgent ?? '').toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'mac';
  if (ua.includes('mac os')) return 'mac';
  return 'other';
}

// ---------------------------------------------------------------------------
// Combo parser
// ---------------------------------------------------------------------------

const MODIFIER_TOKENS: Record<
  string,
  keyof Pick<ParsedCombo, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'> | 'mod'
> = {
  ctrl: 'ctrlKey',
  control: 'ctrlKey',
  meta: 'metaKey',
  cmd: 'metaKey',
  command: 'metaKey',
  shift: 'shiftKey',
  alt: 'altKey',
  option: 'altKey',
  mod: 'mod',
};

export function parseCombo(combo: string): ParsedCombo {
  // Defensive assertion #1 — input must be a non-empty trimmed string.
  if (typeof combo !== 'string' || combo.trim() === '') {
    throw new Error('parseCombo: combo must be a non-empty string');
  }

  const tokens = combo
    .split('+')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) {
    throw new Error(`parseCombo: empty combo "${combo}"`);
  }

  const parsed: ParsedCombo = {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    mod: false,
    key: '',
  };

  // Last token is the key; all preceding tokens are modifiers.
  const keyToken = tokens[tokens.length - 1];
  const modifierTokens = tokens.slice(0, -1);

  for (const tok of modifierTokens) {
    const flag = MODIFIER_TOKENS[tok.toLowerCase()];
    if (flag === undefined) {
      throw new Error(`parseCombo: unknown modifier "${tok}" in "${combo}"`);
    }
    if (flag === 'mod') {
      parsed.mod = true;
    } else {
      parsed[flag] = true;
    }
  }

  // Defensive assertion #2 — the final token must NOT be a modifier on its own
  // (e.g. "Ctrl+Shift" has no key).
  if (keyToken !== undefined && MODIFIER_TOKENS[keyToken.toLowerCase()] !== undefined) {
    throw new Error(`parseCombo: combo "${combo}" has no key part`);
  }

  if (keyToken === undefined || keyToken === '') {
    throw new Error(`parseCombo: missing key in "${combo}"`);
  }

  parsed.key = keyToken.toLowerCase();
  return parsed;
}

// ---------------------------------------------------------------------------
// Combo matcher
// ---------------------------------------------------------------------------

export function matchesCombo(event: KeyboardEvent, combo: ParsedCombo, os: OS): boolean {
  if (event.key.toLowerCase() !== combo.key) return false;

  // Resolve `Mod` to the OS-appropriate modifier.
  let expectedCtrl = combo.ctrlKey;
  let expectedMeta = combo.metaKey;
  if (combo.mod) {
    if (os === 'mac') expectedMeta = true;
    else expectedCtrl = true;
  }

  return (
    event.ctrlKey === expectedCtrl &&
    event.metaKey === expectedMeta &&
    event.shiftKey === combo.shiftKey &&
    event.altKey === combo.altKey
  );
}

// ---------------------------------------------------------------------------
// Storage helpers (sub-key pattern shared across axes)
// ---------------------------------------------------------------------------

interface StoredCommandPalette {
  trigger?: string;
}

function readStorageObject(): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeStorageObject(obj: Record<string, unknown>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore (quota exceeded, private mode, etc.)
  }
}

function persistTrigger(trigger: string): void {
  const obj = readStorageObject();
  const existing =
    typeof obj[STORAGE_SUBKEY] === 'object' &&
    obj[STORAGE_SUBKEY] !== null &&
    !Array.isArray(obj[STORAGE_SUBKEY])
      ? (obj[STORAGE_SUBKEY] as StoredCommandPalette)
      : {};
  obj[STORAGE_SUBKEY] = { ...existing, trigger };
  writeStorageObject(obj);
}

// ---------------------------------------------------------------------------
// Web Component
// ---------------------------------------------------------------------------

const COMPONENT_STYLES = `
  :host {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    background: rgba(15, 18, 24, 0.55);
    backdrop-filter: blur(4px);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #e4efee;
  }
  .panel {
    width: min(640px, 92vw);
    background: #1a1f29;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
  .search {
    width: 100%;
    box-sizing: border-box;
    padding: 16px 20px;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 16px;
    outline: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .search::placeholder { color: rgba(228, 239, 238, 0.5); }
  .results {
    list-style: none;
    margin: 0;
    padding: 6px 0;
    max-height: 50vh;
    overflow-y: auto;
  }
  .result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    cursor: pointer;
    font-size: 14px;
  }
  .result[aria-selected="true"] {
    background: rgba(120, 80, 200, 0.18);
  }
  .result .label { flex: 1; }
  .result .shortcut {
    font-size: 12px;
    color: rgba(228, 239, 238, 0.5);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .empty {
    padding: 24px 20px;
    text-align: center;
    color: rgba(228, 239, 238, 0.55);
    font-size: 14px;
  }
`;

type FuseLike = {
  search: (q: string) => Array<{ item: Command }>;
};

let FuseCtor: (new (list: Command[], opts: unknown) => FuseLike) | null = null;

async function loadFuse(): Promise<typeof FuseCtor> {
  if (FuseCtor !== null) return FuseCtor;
  // Dynamic import keeps Fuse.js out of the engine's main chunk.
  const mod = (await import('fuse.js')) as unknown as {
    default: new (list: Command[], opts: unknown) => FuseLike;
  };
  FuseCtor = mod.default;
  return FuseCtor;
}

// B-021d SSR safety — see morphic-provider.ts for the rationale: server-side
// renders never instantiate the element (registration is gated on
// `customElements`), but the class declaration itself needs `HTMLElement`
// to exist at module load. Empty-class shim keeps imports safe in Node.
const SafeHTMLElement: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

class MorphicCommandPaletteElement extends SafeHTMLElement {
  private commands: Command[] = [];
  private filtered: Command[] = [];
  private selectedIndex = 0;
  private fuse: FuseLike | null = null;
  private root: ShadowRoot;
  private list: HTMLUListElement | null = null;
  private emptyEl: HTMLDivElement | null = null;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  setCommands(commands: Command[]): void {
    this.commands = commands;
    this.filtered = commands;
    this.selectedIndex = 0;
  }

  setFuse(fuse: FuseLike): void {
    this.fuse = fuse;
  }

  connectedCallback(): void {
    if (this.root.childElementCount === 0) {
      this.render();
    }
  }

  private render(): void {
    const style = document.createElement('style');
    style.textContent = COMPONENT_STYLES;
    this.root.appendChild(style);

    const panel = document.createElement('div');
    panel.className = 'panel';

    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'search';
    input.placeholder = 'Search commands…';
    input.setAttribute('aria-label', 'Command palette search');
    input.addEventListener('input', () => this.onSearch(input.value));

    const list = document.createElement('ul');
    list.className = 'results';
    list.setAttribute('role', 'listbox');
    this.list = list;

    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.setAttribute('data-empty-state', '');
    empty.textContent = 'No commands match your search.';
    empty.hidden = true;
    this.emptyEl = empty;

    panel.appendChild(input);
    panel.appendChild(list);
    panel.appendChild(empty);
    this.root.appendChild(panel);

    this.renderResults();
    // Focus the input on next tick so the user can type immediately.
    queueMicrotask(() => input.focus());
  }

  private onSearch(query: string): void {
    const trimmed = query.trim();
    if (trimmed === '') {
      this.filtered = this.commands;
    } else if (this.fuse !== null) {
      this.filtered = this.fuse.search(trimmed).map((r) => r.item);
    } else {
      // Fallback substring filter when Fuse hasn't loaded yet.
      const q = trimmed.toLowerCase();
      this.filtered = this.commands.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          (c.keywords ?? []).some((k) => k.toLowerCase().includes(q)),
      );
    }
    this.selectedIndex = 0;
    this.renderResults();
  }

  private renderResults(): void {
    if (this.list === null || this.emptyEl === null) return;
    this.list.innerHTML = '';
    if (this.filtered.length === 0) {
      this.emptyEl.hidden = false;
      return;
    }
    this.emptyEl.hidden = true;
    this.filtered.forEach((cmd, idx) => {
      const li = document.createElement('li');
      li.className = 'result';
      li.setAttribute('role', 'option');
      li.setAttribute('data-command-id', cmd.id);
      li.setAttribute('aria-selected', idx === this.selectedIndex ? 'true' : 'false');

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = cmd.label;
      li.appendChild(label);

      if (cmd.shortcut !== undefined && cmd.shortcut !== '') {
        const sc = document.createElement('span');
        sc.className = 'shortcut';
        sc.textContent = cmd.shortcut;
        li.appendChild(sc);
      }

      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.selectedIndex = idx;
        this.dispatchEvent(
          new CustomEvent('morphic-execute', { detail: cmd, bubbles: true, composed: true }),
        );
      });
      this.list?.appendChild(li);
    });
  }

  move(delta: number): void {
    if (this.filtered.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.filtered.length) % this.filtered.length;
    this.renderResults();
  }

  getSelected(): Command | null {
    return this.filtered[this.selectedIndex] ?? null;
  }
}

let elementRegistered = false;
function ensureCustomElement(): void {
  if (typeof customElements === 'undefined') return;
  if (elementRegistered) return;
  if (customElements.get(MORPHIC_COMMAND_PALETTE_TAG) === undefined) {
    customElements.define(MORPHIC_COMMAND_PALETTE_TAG, MorphicCommandPaletteElement);
  }
  elementRegistered = true;
}

// ---------------------------------------------------------------------------
// Active state singleton
// ---------------------------------------------------------------------------

interface ActiveState {
  commands: Command[];
  triggerCombo: ParsedCombo;
  triggerLiteral: string;
  zIndex: number;
  os: OS;
  open: boolean;
  hostElement: MorphicCommandPaletteElement | null;
  abort: AbortController;
}

let active: ActiveState | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function enableCommandPalette(options: CommandPaletteOptions): CommandPaletteState {
  if (!Array.isArray(options.commands) || options.commands.length === 0) {
    throw new Error('enableCommandPalette: commands array must not be empty');
  }
  const ids = new Set<string>();
  for (const cmd of options.commands) {
    if (ids.has(cmd.id)) {
      throw new Error(`enableCommandPalette: duplicate command id "${cmd.id}"`);
    }
    ids.add(cmd.id);
  }

  // Tear down any prior session before mounting a new one.
  if (active !== null) {
    disableCommandPalette();
  }

  const triggerLiteral = options.trigger ?? COMMAND_PALETTE_DEFAULT_TRIGGER;
  const triggerCombo = parseCombo(triggerLiteral);
  const zIndex = options.zIndex ?? MORPHIC_COMMAND_PALETTE_DEFAULT_Z_INDEX;
  const os = detectOS();

  persistTrigger(triggerLiteral);

  if (typeof document === 'undefined') {
    return { open: false, trigger: triggerLiteral, commandCount: options.commands.length };
  }

  ensureCustomElement();

  const abort = new AbortController();
  active = {
    commands: options.commands,
    triggerCombo,
    triggerLiteral,
    zIndex,
    os,
    open: false,
    hostElement: null,
    abort,
  };

  document.addEventListener('keydown', onGlobalKeydown, { signal: abort.signal });

  return { open: false, trigger: triggerLiteral, commandCount: options.commands.length };
}

export function disableCommandPalette(): void {
  if (active === null) return;
  active.abort.abort();
  if (active.hostElement !== null && active.hostElement.parentNode !== null) {
    active.hostElement.parentNode.removeChild(active.hostElement);
  }
  active = null;
}

export function openCommandPalette(): void {
  if (active === null) return;
  if (active.open) return;
  if (typeof document === 'undefined') return;

  const host = document.createElement(MORPHIC_COMMAND_PALETTE_TAG) as MorphicCommandPaletteElement;
  host.setAttribute(MORPHIC_COMMAND_PALETTE_MARKER, '');
  host.style.zIndex = String(active.zIndex);
  host.setCommands(active.commands);

  host.addEventListener('morphic-execute', (e) => {
    const cmd = (e as CustomEvent<Command>).detail;
    executeCommand(cmd);
    closeCommandPalette();
  });

  document.body.appendChild(host);
  active.hostElement = host;
  active.open = true;

  // Kick off Fuse lazy-load. Failure (e.g. offline) falls back to substring.
  loadFuse()
    .then((Ctor) => {
      if (Ctor === null || active === null || active.hostElement !== host) return;
      const fuse = new Ctor(active.commands, {
        keys: ['label', 'keywords', 'description'],
        threshold: 0.4,
        ignoreLocation: true,
      });
      host.setFuse(fuse);
    })
    .catch(() => {
      // Substring fallback already in place — silent ignore.
    });
}

export function closeCommandPalette(): void {
  if (active === null) return;
  if (!active.open) return;
  if (active.hostElement !== null && active.hostElement.parentNode !== null) {
    active.hostElement.parentNode.removeChild(active.hostElement);
  }
  active.hostElement = null;
  active.open = false;
}

export function getCommandPaletteState(): CommandPaletteState | null {
  if (active === null) return null;
  return {
    open: active.open,
    trigger: active.triggerLiteral,
    commandCount: active.commands.length,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function executeCommand(cmd: Command): void {
  try {
    cmd.action();
  } catch {
    // A command must never break the palette — swallow throws.
  }
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if (active === null) return;

  // Trigger combo — open or toggle the palette.
  if (matchesCombo(event, active.triggerCombo, active.os)) {
    event.preventDefault();
    if (active.open) closeCommandPalette();
    else openCommandPalette();
    return;
  }

  // Palette navigation when open.
  if (active.open) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCommandPalette();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active.hostElement?.move(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      active.hostElement?.move(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = active.hostElement?.getSelected();
      if (selected !== null && selected !== undefined) {
        executeCommand(selected);
      }
      closeCommandPalette();
      return;
    }
    // Other keys pass through to the focused search input.
    return;
  }

  // Command shortcuts.
  for (const cmd of active.commands) {
    if (cmd.shortcut === undefined || cmd.shortcut === '') continue;
    let parsed: ParsedCombo;
    try {
      parsed = parseCombo(cmd.shortcut);
    } catch {
      continue;
    }
    if (matchesCombo(event, parsed, active.os)) {
      event.preventDefault();
      executeCommand(cmd);
      return;
    }
  }
}
