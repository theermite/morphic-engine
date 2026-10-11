// @vitest-environment node
/**
 * Structural guard on morphic-button.css (Jay 2026-10-11).
 *
 * jsdom does not cascade `:hover` nor compute specificity reliably, so the
 * isolation from host styles is guarded on the stylesheet itself:
 *   - every rule is scoped to the button, nothing leaks onto the host page;
 *   - every rule that paints an interactive control carries two classes, so a
 *     host's generic `button:hover` (one class-weight + one type) cannot win;
 *   - the panel has a palette for each theme the engine writes;
 *   - the `--morphic-ui-*` knobs are never assigned here, so a host override,
 *     on the button or on any ancestor, always wins;
 *   - the panel's positioning stays single-class: Kakusei centres the panel
 *     with a plain `.morphic-mb-modal` rule and must keep winning.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The three source parts, in the order the build joins them into ui.css.
const UI = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/ui');
const CSS = ['morphic-button-palettes.css', 'morphic-button.css', 'morphic-button-choices.css']
  .map((file) => readFileSync(resolve(UI, file), 'utf-8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

interface Rule {
  selectors: string[];
  body: string;
}

/** Flat list of style rules; at-rule wrappers (@media) are walked through. */
function rules(css: string): Rule[] {
  const out: Rule[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of css.matchAll(re)) {
    const head = (m[1] as string)
      .trim()
      .replace(/^@media[^{]*\{/, '')
      .trim();
    if (head.startsWith('@')) continue;
    out.push({
      selectors: head
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      body: m[2] as string,
    });
  }
  return out;
}

const ALL = rules(CSS.replace(/@media[^{]*\{/g, ''));
const INTERACTIVE = /\.morphic-mb-(chip|cat-toggle|close|reset|trigger|advanced-toggle)\b/;
const PAINT = /(^|;|\s)(background|color|border|box-shadow|font|text-transform|letter-spacing)/;
const POSITION = /(^|;|\s)(position|top|left|right|bottom|transform|max-height)\s*:/;

describe('morphic-button.css — isolation from the host page', () => {
  it('parses a non-trivial number of rules (guard against a blind test)', () => {
    expect(ALL.length).toBeGreaterThan(30);
  });

  it('scopes every selector to the button', () => {
    for (const { selectors } of ALL) {
      for (const sel of selectors) {
        expect(sel, sel).toMatch(/^(:root(\[[^\]]+\]|:not\([^)]*\))?\s+)?\.morphic-mb/);
      }
    }
  });

  it('paints interactive controls only through a two-class selector', () => {
    for (const { selectors, body } of ALL) {
      if (!PAINT.test(body)) continue;
      for (const sel of selectors) {
        if (!INTERACTIVE.test(sel)) continue;
        const classes = sel.match(/\.[\w-]+/g) ?? [];
        expect(classes.length, sel).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('never assigns a --morphic-ui-* knob: host overrides always win', () => {
    expect(CSS).not.toMatch(/--morphic-ui-[\w-]+\s*:/);
    expect(CSS).toMatch(/var\(--morphic-ui-surface,/);
  });

  it('keeps the panel positioning single-class (Kakusei centres it with .morphic-mb-modal)', () => {
    for (const { selectors, body } of ALL) {
      if (!POSITION.test(body)) continue;
      for (const sel of selectors) {
        if (!/\.morphic-mb-modal\b/.test(sel)) continue;
        expect((sel.match(/\.[\w-]+/g) ?? []).length, sel).toBe(1);
      }
    }
  });
});

describe('morphic-button.css — the panel follows the chosen theme', () => {
  it.each(['light', 'sepia', 'dark', 'high-contrast'])('has a palette for %s', (theme) => {
    // Either quote style: the formatter decides, the selector is what counts.
    expect(CSS).toMatch(
      new RegExp(`:root\\[data-morphic-theme=["']${theme}["']\\] \\.morphic-mb\\b`),
    );
  });

  it('follows the system before any theme is written', () => {
    expect(CSS).toMatch(
      /@media \(prefers-color-scheme: light\)\s*\{\s*:root:not\(\[data-morphic-theme\]\) \.morphic-mb/,
    );
  });
});

describe('morphic-base.css — recovery mode is a warm dark (Jay 2026-10-11)', () => {
  const BASE = readFileSync(resolve(UI, 'morphic-base.css'), 'utf-8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

  it('warms the page with a warm veil while recovery is active', () => {
    expect(BASE).toMatch(
      /html\[data-morphic-recovery\] body::after\s*\{[^}]*position:\s*fixed[^}]*mix-blend-mode:\s*multiply/,
    );
  });

  it('never filters <body> for recovery: a filter there unpins every fixed element (the pomodoro strip scrolled away, measured at -480px)', () => {
    expect(BASE).not.toMatch(/html\[data-morphic-recovery\] body\s*\{[^}]*filter:/);
  });

  it('lets clicks pass through the veil', () => {
    expect(BASE).toMatch(
      /html\[data-morphic-recovery\] body::after\s*\{[^}]*pointer-events:\s*none/,
    );
  });
});
