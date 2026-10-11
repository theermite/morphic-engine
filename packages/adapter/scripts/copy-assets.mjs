/**
 * copy-assets.mjs — copy UI stylesheets into dist after tsc.
 *
 * Brick : B-030d. License : AGPL-3.0-or-later.
 *
 * tsc emits only .js/.d.ts. The publishable component ships two stylesheets
 * (`morphic-button.css`, `morphic-base.css`) that must land in dist/ui so the
 * `./ui.css` and `./morphic.css` subpath exports resolve. Run from the package
 * root (`pnpm --filter @theermite/morphic-adapter build` sets the cwd there).
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

mkdirSync('dist/ui', { recursive: true });
copyFileSync('src/ui/morphic-base.css', 'dist/ui/morphic-base.css');

// The button's stylesheet is kept as three source files (palettes, panel, choices)
// and published as ONE, so hosts keep importing a single `./ui.css`.
const BUTTON_PARTS = [
  'morphic-button-palettes.css',
  'morphic-button.css',
  'morphic-button-choices.css',
];
writeFileSync(
  'dist/ui/morphic-button.css',
  BUTTON_PARTS.map((file) => readFileSync(`src/ui/${file}`, 'utf-8')).join('\n'),
);
