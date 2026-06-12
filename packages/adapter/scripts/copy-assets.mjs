/**
 * copy-assets.mjs — copy UI stylesheets into dist after tsc.
 *
 * Brick : B-030d. License : AGPL-3.0-or-later.
 *
 * tsc emits only .js/.d.ts. The publishable component ships two stylesheets
 * (`morphic-button.css`, `morphic-base.css`) that must land in dist/ui so the
 * `./ui.css` and `./morphic.css` subpath exports resolve. Run from the package
 * root (`pnpm --filter @morphic/adapter build` sets the cwd there).
 */

import { copyFileSync, mkdirSync } from 'node:fs';

const ASSETS = ['morphic-button.css', 'morphic-base.css'];

mkdirSync('dist/ui', { recursive: true });
for (const file of ASSETS) {
  copyFileSync(`src/ui/${file}`, `dist/ui/${file}`);
}
