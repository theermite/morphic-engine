/**
 * Tests for command-palette axis (B-105, F-029).
 * Risk: Standard — coverage floor 80%.
 *
 * Scope:
 *  - Shortcut combo parsing & matching (algorithmic, pure)
 *  - OS detection (mac / other)
 *  - Global keydown listener: trigger opens palette, command shortcuts execute
 *  - Web Component <morphic-command-palette> with Shadow DOM
 *  - Fuse.js fuzzy search (lazy-loaded on first open)
 *  - Persistence: trigger combo under MORPHIC_STORAGE_KEY sub-key
 *  - SSR safety + idempotence
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMMAND_PALETTE_DEFAULT_TRIGGER,
  type Command,
  closeCommandPalette,
  detectOS,
  disableCommandPalette,
  enableCommandPalette,
  getCommandPaletteState,
  MORPHIC_COMMAND_PALETTE_DEFAULT_Z_INDEX,
  MORPHIC_COMMAND_PALETTE_MARKER,
  MORPHIC_COMMAND_PALETTE_TAG,
  matchesCombo,
  openCommandPalette,
  type ParsedCombo,
  parseCombo,
} from '../src/command-palette.js';
import { MORPHIC_STORAGE_KEY } from '../src/init.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dispatchKey(
  key: string,
  modifiers: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  } = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: modifiers.ctrlKey ?? false,
    metaKey: modifiers.metaKey ?? false,
    shiftKey: modifiers.shiftKey ?? false,
    altKey: modifiers.altKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

function queryPalette(): Element | null {
  return document.querySelector(`[${MORPHIC_COMMAND_PALETTE_MARKER}]`);
}

function makeCommands(actionSpies?: Record<string, () => void>): Command[] {
  return [
    {
      id: 'theme.dark',
      label: 'Switch to dark theme',
      action: actionSpies?.['theme.dark'] ?? (() => {}),
      shortcut: 'Mod+D',
      keywords: ['dark', 'night', 'theme'],
    },
    {
      id: 'theme.light',
      label: 'Switch to light theme',
      action: actionSpies?.['theme.light'] ?? (() => {}),
      keywords: ['light', 'day', 'theme'],
    },
    {
      id: 'reading.focus',
      label: 'Toggle reading focus',
      action: actionSpies?.['reading.focus'] ?? (() => {}),
      shortcut: 'Mod+Shift+F',
    },
  ];
}

async function flushMicrotasks(): Promise<void> {
  // Fuse.js is loaded via dynamic import — yield once for the import promise.
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  // Force OS detection to deterministic 'other' for tests unless overridden.
  Object.defineProperty(navigator, 'platform', {
    value: 'Linux x86_64',
    configurable: true,
  });
});

afterEach(() => {
  try {
    disableCommandPalette();
  } catch {
    // ignore
  }
  document.body.innerHTML = '';
  localStorage.clear();
});

// ===========================================================================
// 1. Constants
// ===========================================================================

describe('command-palette — constants', () => {
  it('exposes a default trigger combo Mod+K', () => {
    expect(COMMAND_PALETTE_DEFAULT_TRIGGER).toBe('Mod+K');
  });

  it('exposes a stable marker attribute', () => {
    expect(MORPHIC_COMMAND_PALETTE_MARKER).toBe('data-morphic-command-palette');
  });

  it('exposes a stable custom element tag', () => {
    expect(MORPHIC_COMMAND_PALETTE_TAG).toBe('morphic-command-palette');
  });

  it('exposes a high default z-index above other overlays', () => {
    expect(MORPHIC_COMMAND_PALETTE_DEFAULT_Z_INDEX).toBeGreaterThanOrEqual(9990);
  });
});

// ===========================================================================
// 2. detectOS — platform sniffing
// ===========================================================================

describe('command-palette — detectOS', () => {
  it('returns "mac" when navigator.platform contains Mac', () => {
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
    expect(detectOS()).toBe('mac');
  });

  it('returns "mac" on iPhone/iPad userAgent fallback', () => {
    Object.defineProperty(navigator, 'platform', { value: '', configurable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      configurable: true,
    });
    expect(detectOS()).toBe('mac');
  });

  it('returns "other" on Linux', () => {
    Object.defineProperty(navigator, 'platform', { value: 'Linux x86_64', configurable: true });
    Object.defineProperty(navigator, 'userAgent', { value: 'Linux', configurable: true });
    expect(detectOS()).toBe('other');
  });

  it('returns "other" on Windows', () => {
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true });
    Object.defineProperty(navigator, 'userAgent', { value: 'Windows', configurable: true });
    expect(detectOS()).toBe('other');
  });
});

// ===========================================================================
// 3. parseCombo — pure
// ===========================================================================

describe('command-palette — parseCombo', () => {
  it('parses a single letter key', () => {
    expect(parseCombo('K')).toEqual<ParsedCombo>({
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      mod: false,
      key: 'k',
    });
  });

  it('parses Ctrl+K', () => {
    expect(parseCombo('Ctrl+K')).toEqual<ParsedCombo>({
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      mod: false,
      key: 'k',
    });
  });

  it('parses Mod+K with the mod flag set', () => {
    const parsed = parseCombo('Mod+K');
    expect(parsed.mod).toBe(true);
    expect(parsed.key).toBe('k');
  });

  it('parses Shift+Alt+P', () => {
    const parsed = parseCombo('Shift+Alt+P');
    expect(parsed).toMatchObject({
      shiftKey: true,
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      key: 'p',
    });
  });

  it('is case-insensitive on modifiers', () => {
    expect(parseCombo('cmd+k')).toMatchObject({ metaKey: true, key: 'k' });
    expect(parseCombo('CTRL+K')).toMatchObject({ ctrlKey: true, key: 'k' });
  });

  it('treats Cmd as alias for Meta', () => {
    expect(parseCombo('Cmd+P')).toMatchObject({ metaKey: true, key: 'p' });
  });

  it('parses non-letter keys (Escape, Enter, /)', () => {
    expect(parseCombo('Escape').key).toBe('escape');
    expect(parseCombo('Enter').key).toBe('enter');
    expect(parseCombo('/').key).toBe('/');
  });

  it('throws on empty combo', () => {
    expect(() => parseCombo('')).toThrow();
  });

  it('throws when no key part is present (only modifiers)', () => {
    expect(() => parseCombo('Ctrl+Shift')).toThrow();
  });

  it('throws on unknown modifier token', () => {
    expect(() => parseCombo('Hyper+K')).toThrow();
  });
});

// ===========================================================================
// 4. matchesCombo — pure
// ===========================================================================

describe('command-palette — matchesCombo', () => {
  it('matches an exact Ctrl+K event on non-mac', () => {
    const combo = parseCombo('Ctrl+K');
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    expect(matchesCombo(event, combo, 'other')).toBe(true);
  });

  it('matches Mod+K as Meta on mac', () => {
    const combo = parseCombo('Mod+K');
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
    expect(matchesCombo(event, combo, 'mac')).toBe(true);
  });

  it('matches Mod+K as Ctrl on non-mac', () => {
    const combo = parseCombo('Mod+K');
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    expect(matchesCombo(event, combo, 'other')).toBe(true);
  });

  it('rejects Mod+K when Meta is used on non-mac', () => {
    const combo = parseCombo('Mod+K');
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
    expect(matchesCombo(event, combo, 'other')).toBe(false);
  });

  it('rejects key match when modifiers differ', () => {
    const combo = parseCombo('Ctrl+K');
    const event = new KeyboardEvent('keydown', { key: 'k' });
    expect(matchesCombo(event, combo, 'other')).toBe(false);
  });

  it('rejects when extra modifiers are pressed', () => {
    const combo = parseCombo('Ctrl+K');
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true });
    expect(matchesCombo(event, combo, 'other')).toBe(false);
  });

  it('is case-insensitive on the event key', () => {
    const combo = parseCombo('Ctrl+K');
    const event = new KeyboardEvent('keydown', { key: 'K', ctrlKey: true });
    expect(matchesCombo(event, combo, 'other')).toBe(true);
  });
});

// ===========================================================================
// 5. enableCommandPalette — lifecycle
// ===========================================================================

describe('command-palette — enableCommandPalette', () => {
  it('returns state with default trigger and command count', () => {
    const state = enableCommandPalette({ commands: makeCommands() });
    expect(state.trigger).toBe('Mod+K');
    expect(state.commandCount).toBe(3);
    expect(state.open).toBe(false);
  });

  it('does not mount palette UI before being opened', () => {
    enableCommandPalette({ commands: makeCommands() });
    expect(queryPalette()).toBeNull();
  });

  it('mounts the palette host element on open', () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    expect(queryPalette()).not.toBeNull();
  });

  it('respects a custom trigger combo', () => {
    const state = enableCommandPalette({
      commands: makeCommands(),
      trigger: 'Ctrl+Shift+P',
    });
    expect(state.trigger).toBe('Ctrl+Shift+P');
  });

  it('throws on empty commands array', () => {
    expect(() => enableCommandPalette({ commands: [] })).toThrow();
  });

  it('throws on duplicate command ids', () => {
    const commands: Command[] = [
      { id: 'x', label: 'X', action: () => {} },
      { id: 'x', label: 'Y', action: () => {} },
    ];
    expect(() => enableCommandPalette({ commands })).toThrow();
  });

  it('disables a previously active palette before mounting a new one', () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    expect(queryPalette()).not.toBeNull();
    enableCommandPalette({ commands: makeCommands() });
    expect(queryPalette()).toBeNull();
  });
});

// ===========================================================================
// 6. Global trigger keydown
// ===========================================================================

describe('command-palette — trigger keydown', () => {
  it('opens the palette when the trigger combo is pressed', () => {
    enableCommandPalette({ commands: makeCommands() });
    dispatchKey('k', { ctrlKey: true });
    expect(queryPalette()).not.toBeNull();
    expect(getCommandPaletteState()?.open).toBe(true);
  });

  it('closes the palette on Escape', () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    dispatchKey('Escape');
    expect(queryPalette()).toBeNull();
    expect(getCommandPaletteState()?.open).toBe(false);
  });

  it('toggles closed when the trigger is pressed while open', () => {
    enableCommandPalette({ commands: makeCommands() });
    dispatchKey('k', { ctrlKey: true });
    dispatchKey('k', { ctrlKey: true });
    expect(queryPalette()).toBeNull();
  });

  it('preventDefault on trigger key to avoid browser shortcut conflict', () => {
    enableCommandPalette({ commands: makeCommands() });
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores keypresses when the palette is not enabled', () => {
    dispatchKey('k', { ctrlKey: true });
    expect(queryPalette()).toBeNull();
  });
});

// ===========================================================================
// 7. Command shortcuts — keydown execution
// ===========================================================================

describe('command-palette — command shortcuts', () => {
  it('executes a command when its shortcut combo is pressed', () => {
    const action = vi.fn();
    enableCommandPalette({
      commands: [{ id: 'd', label: 'Dark', shortcut: 'Mod+D', action }],
    });
    dispatchKey('d', { ctrlKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('does not execute a command when modifiers do not match', () => {
    const action = vi.fn();
    enableCommandPalette({
      commands: [{ id: 'd', label: 'Dark', shortcut: 'Mod+D', action }],
    });
    dispatchKey('d');
    expect(action).not.toHaveBeenCalled();
  });

  it('does not execute commands without a shortcut on bare key press', () => {
    const action = vi.fn();
    enableCommandPalette({
      commands: [{ id: 'd', label: 'Dark', action }],
    });
    dispatchKey('d');
    expect(action).not.toHaveBeenCalled();
  });

  it('contains action throws — does not break listener', () => {
    const action = vi.fn(() => {
      throw new Error('boom');
    });
    enableCommandPalette({
      commands: [{ id: 'd', label: 'Dark', shortcut: 'Mod+D', action }],
    });
    expect(() => dispatchKey('d', { ctrlKey: true })).not.toThrow();
    expect(action).toHaveBeenCalled();
  });
});

// ===========================================================================
// 8. Web Component — Shadow DOM rendering
// ===========================================================================

describe('command-palette — Web Component', () => {
  it('registers a custom element with the documented tag', () => {
    enableCommandPalette({ commands: makeCommands() });
    expect(customElements.get(MORPHIC_COMMAND_PALETTE_TAG)).toBeDefined();
  });

  it('uses Shadow DOM for style isolation', () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    const host = queryPalette() as HTMLElement;
    expect(host.shadowRoot).not.toBeNull();
  });

  it('renders a search input inside Shadow DOM', () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    const host = queryPalette() as HTMLElement;
    const input = host.shadowRoot?.querySelector('input[type="search"]');
    expect(input).not.toBeNull();
  });

  it('renders one result per command initially', async () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    await flushMicrotasks();
    const host = queryPalette() as HTMLElement;
    const results = host.shadowRoot?.querySelectorAll('[data-command-id]');
    expect(results?.length).toBe(3);
  });

  it('applies the configured z-index on the host element', () => {
    enableCommandPalette({ commands: makeCommands(), zIndex: 12345 });
    openCommandPalette();
    const host = queryPalette() as HTMLElement;
    expect(host.style.zIndex).toBe('12345');
  });
});

// ===========================================================================
// 9. Fuzzy search via Fuse.js (lazy-loaded)
// ===========================================================================

describe('command-palette — fuzzy search', () => {
  it('does not mount palette host before open is called (lazy)', async () => {
    enableCommandPalette({ commands: makeCommands() });
    expect(queryPalette()).toBeNull();
    openCommandPalette();
    await flushMicrotasks();
    expect(queryPalette()).not.toBeNull();
  });

  it('filters results when typing into the search input', async () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    await flushMicrotasks();
    const host = queryPalette() as HTMLElement;
    const input = host.shadowRoot?.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'dark';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushMicrotasks();
    const results = host.shadowRoot?.querySelectorAll('[data-command-id]');
    expect(results?.length).toBeGreaterThanOrEqual(1);
    const ids = Array.from(results ?? []).map((el) => el.getAttribute('data-command-id'));
    expect(ids).toContain('theme.dark');
  });

  it('renders an empty-results message when no command matches', async () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    await flushMicrotasks();
    const host = queryPalette() as HTMLElement;
    const input = host.shadowRoot?.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'zzzzzzzzz-no-match';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushMicrotasks();
    const empty = host.shadowRoot?.querySelector('[data-empty-state]');
    expect(empty).not.toBeNull();
  });
});

// ===========================================================================
// 10. Keyboard navigation inside palette
// ===========================================================================

describe('command-palette — keyboard navigation', () => {
  it('selects the first result by default', async () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    await flushMicrotasks();
    const host = queryPalette() as HTMLElement;
    const active = host.shadowRoot?.querySelector('[data-command-id][aria-selected="true"]');
    expect(active?.getAttribute('data-command-id')).toBe('theme.dark');
  });

  it('moves selection down with ArrowDown', async () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    await flushMicrotasks();
    dispatchKey('ArrowDown');
    const host = queryPalette() as HTMLElement;
    const active = host.shadowRoot?.querySelector('[data-command-id][aria-selected="true"]');
    expect(active?.getAttribute('data-command-id')).toBe('theme.light');
  });

  it('executes the selected command on Enter and closes the palette', async () => {
    const action = vi.fn();
    enableCommandPalette({
      commands: [
        { id: 'a', label: 'Alpha', action },
        { id: 'b', label: 'Beta', action: () => {} },
      ],
    });
    openCommandPalette();
    await flushMicrotasks();
    dispatchKey('Enter');
    expect(action).toHaveBeenCalledTimes(1);
    expect(queryPalette()).toBeNull();
  });
});

// ===========================================================================
// 11. disableCommandPalette — teardown
// ===========================================================================

describe('command-palette — disableCommandPalette', () => {
  it('removes the palette host from DOM', () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    disableCommandPalette();
    expect(queryPalette()).toBeNull();
  });

  it('clears state to null', () => {
    enableCommandPalette({ commands: makeCommands() });
    disableCommandPalette();
    expect(getCommandPaletteState()).toBeNull();
  });

  it('stops responding to the trigger combo', () => {
    enableCommandPalette({ commands: makeCommands() });
    disableCommandPalette();
    dispatchKey('k', { ctrlKey: true });
    expect(queryPalette()).toBeNull();
  });

  it('stops executing registered command shortcuts', () => {
    const action = vi.fn();
    enableCommandPalette({
      commands: [{ id: 'd', label: 'Dark', shortcut: 'Mod+D', action }],
    });
    disableCommandPalette();
    dispatchKey('d', { ctrlKey: true });
    expect(action).not.toHaveBeenCalled();
  });

  it('is a no-op when no palette is active', () => {
    expect(() => disableCommandPalette()).not.toThrow();
  });
});

// ===========================================================================
// 12. Open / close imperative API
// ===========================================================================

describe('command-palette — imperative open/close', () => {
  it('openCommandPalette is a no-op when not enabled', () => {
    expect(() => openCommandPalette()).not.toThrow();
    expect(queryPalette()).toBeNull();
  });

  it('closeCommandPalette is a no-op when not enabled', () => {
    expect(() => closeCommandPalette()).not.toThrow();
  });

  it('opening twice is idempotent (no duplicate host)', () => {
    enableCommandPalette({ commands: makeCommands() });
    openCommandPalette();
    openCommandPalette();
    const all = document.querySelectorAll(`[${MORPHIC_COMMAND_PALETTE_MARKER}]`);
    expect(all.length).toBe(1);
  });

  it('close is idempotent when already closed', () => {
    enableCommandPalette({ commands: makeCommands() });
    closeCommandPalette();
    expect(queryPalette()).toBeNull();
  });
});

// ===========================================================================
// 13. Persistence
// ===========================================================================

describe('command-palette — persistence', () => {
  it('persists the trigger combo under MORPHIC_STORAGE_KEY sub-key', () => {
    enableCommandPalette({ commands: makeCommands(), trigger: 'Ctrl+Shift+P' });
    const raw = localStorage.getItem(MORPHIC_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const obj = JSON.parse(raw as string);
    expect(obj.commandPalette?.trigger).toBe('Ctrl+Shift+P');
  });

  it('does not clobber other axes already persisted', () => {
    localStorage.setItem(
      MORPHIC_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', readingGuide: { mode: 'line' } }),
    );
    enableCommandPalette({ commands: makeCommands() });
    const obj = JSON.parse(localStorage.getItem(MORPHIC_STORAGE_KEY) as string);
    expect(obj.theme).toBe('dark');
    expect(obj.readingGuide?.mode).toBe('line');
    expect(obj.commandPalette?.trigger).toBe('Mod+K');
  });

  it('survives a corrupt localStorage entry (returns sane defaults)', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, '{not valid json');
    expect(() => enableCommandPalette({ commands: makeCommands() })).not.toThrow();
  });
});

// ===========================================================================
// 14. getCommandPaletteState
// ===========================================================================

describe('command-palette — getCommandPaletteState', () => {
  it('returns null when not enabled', () => {
    expect(getCommandPaletteState()).toBeNull();
  });

  it('reflects the open flag accurately', () => {
    enableCommandPalette({ commands: makeCommands() });
    expect(getCommandPaletteState()?.open).toBe(false);
    openCommandPalette();
    expect(getCommandPaletteState()?.open).toBe(true);
    closeCommandPalette();
    expect(getCommandPaletteState()?.open).toBe(false);
  });
});

// ===========================================================================
// 15. Property-based tests (Anti-Circular Layer 1)
// ===========================================================================

describe('command-palette — property-based', () => {
  it('parseCombo / matchesCombo round-trip: a parsed combo matches a synthetic event with same modifiers', () => {
    fc.assert(
      fc.property(
        fc.record({
          ctrl: fc.boolean(),
          meta: fc.boolean(),
          shift: fc.boolean(),
          alt: fc.boolean(),
          key: fc.constantFrom('a', 'b', 'c', 'k', 'p', '/', 'Enter', 'Escape'),
        }),
        (mods) => {
          const tokens: string[] = [];
          if (mods.ctrl) tokens.push('Ctrl');
          if (mods.meta) tokens.push('Cmd');
          if (mods.shift) tokens.push('Shift');
          if (mods.alt) tokens.push('Alt');
          tokens.push(mods.key);
          const combo = parseCombo(tokens.join('+'));
          const event = new KeyboardEvent('keydown', {
            key: mods.key,
            ctrlKey: mods.ctrl,
            metaKey: mods.meta,
            shiftKey: mods.shift,
            altKey: mods.alt,
          });
          return matchesCombo(event, combo, 'other');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('matchesCombo rejects when ctrl modifier is flipped', () => {
    fc.assert(
      fc.property(
        fc.record({
          ctrl: fc.boolean(),
          shift: fc.boolean(),
          alt: fc.boolean(),
          key: fc.constantFrom('a', 'b', 'k'),
        }),
        (mods) => {
          const tokens: string[] = [];
          if (mods.ctrl) tokens.push('Ctrl');
          if (mods.shift) tokens.push('Shift');
          if (mods.alt) tokens.push('Alt');
          tokens.push(mods.key);
          const combo = parseCombo(tokens.join('+'));
          const event = new KeyboardEvent('keydown', {
            key: mods.key,
            ctrlKey: !mods.ctrl,
            shiftKey: mods.shift,
            altKey: mods.alt,
          });
          return matchesCombo(event, combo, 'other') === false;
        },
      ),
      { numRuns: 50 },
    );
  });
});
