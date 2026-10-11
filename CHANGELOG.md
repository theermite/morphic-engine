# Changelog

Notable changes to the published packages. Dates are publication dates on npm.
Versions before `2.0.0-beta.5` were development snapshots of the rewrite; the history
of the first engine (`@shinkofa/morphic-engine` 1.x) is summarised in
[`docs/Changelog-v1-v2.md`](docs/Changelog-v1-v2.md).

## engine 2.0.0-beta.14 · adapter 2.0.0-beta.4 — 2026-10-11

- **Redesigned `<MorphicButton>` panel**: four collapsible categories (View, Text,
  Reading, Energy), each with a summary of what differs from the defaults; segmented
  choices with a check mark (readable without perceiving colour); theme tiles with a
  colour swatch; fonts shown in their own typeface; sizes shown as growing letters; a
  round trigger with a dot when the page is adapted.
- The panel follows the chosen theme (light, dark, sepia, high contrast, or the system
  before any choice) and is isolated from the host page's generic button styles.
- The "More adaptations" fold is removed: every setting lives in its category. The WAI
  symbols row only appears on pages that mark elements for symbols.
- **Pomodoro is visible**: phase and time left in the panel, and a 4 px progress strip
  at the top of the screen (was 1 px), turned on automatically without replacing a
  strip the host already configured.
- **Recovery mode is a warm dark**: dark theme plus a warm veil (`morphic.css`), marked
  on `<html>` with `data-morphic-recovery` and restored after a reload.
- Reading focus no longer rewrites subtrees marked `data-morphic-skip` (the panel), so
  a UI framework keeps owning its text nodes.
- The adapter now requires the engine `^2.0.0-beta.14`.

## engine 2.0.0-beta.13 · adapter 2.0.0-beta.3 — 2026-10-11

- **Lighter in the browser**: both packages declare `sideEffects`, and the setting
  modules no longer import the profile-validation code. Measured on a test page: from
  83 KB to 60 KB gzipped for the adapter alone, validation code absent.

## engine 2.0.0-beta.10 → beta.12 — 2026-09-03 / 2026-09-04

- Storage goes through a single guarded access point, enforced by tests and by a
  compile-time rule; a storage that refuses access is distinguished from an absent one.
- Pomodoro strip: measured colour palettes for light and dark backgrounds, opaque rail.

## engine 2.0.0-beta.7 → beta.9 · adapter 2.0.0-beta.2 — 2026-08-30

- First versions published under the `@theermite` scope on npm.
- The engine is dual licensed AGPL-3.0-or-later OR MPL-2.0 (from beta.8).
- Prototype-pollution gaps closed in stored-preference reading (independent review).
- `<MorphicSuggestions>`: suggests adaptations from a holistic profile supplied by the
  host; nothing is applied without a click.

## engine 2.0.0-beta.5 / beta.6 · adapter 2.0.0-beta.1 — 2026-05-25 / 2026-06-13

- First public betas of the rewritten, framework-agnostic engine; React adapter with
  the `./ui` subpath and `<MorphicButton>`.
