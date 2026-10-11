# @theermite/morphic-adapter

React adapter for the [Morphic Adaptation Engine](../engine).

[![npm](https://img.shields.io/npm/v/@theermite/morphic-adapter)](https://www.npmjs.com/package/@theermite/morphic-adapter)

**Status**: `2.0.0-beta`, used in production on [theermite.com](https://theermite.com)
and [shinkofa.com](https://shinkofa.com). React only; other frameworks can use the
engine directly (it is framework-agnostic). See the [changelog](../../CHANGELOG.md).

## Install

```bash
pnpm add @theermite/morphic-adapter @theermite/morphic-engine react react-dom
```

Peer deps: `react ^19`, `react-dom ^19`, `@theermite/morphic-engine ^2.0.0-beta.14`.

## Quick start (Next.js 16 App Router)

Wrap your root layout (or a subtree) with `<MorphicProvider>`:

```tsx
// app/layout.tsx
import { MorphicProvider } from '@theermite/morphic-adapter';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MorphicProvider>{children}</MorphicProvider>
      </body>
    </html>
  );
}
```

The provider applies the saved preferences on its first client mount. To avoid a flash of default styles before hydration, a host can also run the engine's `morphicInit()` logic in an inline `<head>` script.

## CSS

Two optional stylesheets are exported:

```ts
import '@theermite/morphic-adapter/morphic.css'; // page-level adaptation rules (fonts, motion, sepia, recovery veil…)
import '@theermite/morphic-adapter/ui.css';       // styles of the MorphicButton panel
```

## Hooks

### Per-axis — `[choice, setter]` tuple

```tsx
'use client';
import {
  useMorphicTheme,
  useMorphicMotion,
  useMorphicContrast,
  useMorphicDensity,
  useMorphicFontSize,
  useMorphicFontFamily,
} from '@theermite/morphic-adapter';

export function ThemeToggle() {
  const [theme, setTheme] = useMorphicTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Theme: {theme ?? 'auto'}
    </button>
  );
}
```

`choice` is the user's persisted preference (may include `'auto'`) or `null` when none is stored. The setter proxies to the engine **and** triggers a re-render of all hook consumers via the provider's internal tick counter.

### Aggregate — `useMorphic()`

```tsx
import { useMorphic } from '@theermite/morphic-adapter';

export function MorphicDebug() {
  const snap = useMorphic();
  return <pre>{JSON.stringify(snap, null, 2)}</pre>;
}
```

Returns the read-only snapshot of all 6 axes (`theme`, `motion`, `contrast`, `density`, `fontSize`, `fontFamily`).

## UI component — `<MorphicButton>`

The `./ui` subpath exports `MorphicButton`: a round trigger (with a dot when the page is
adapted) that opens a panel of four collapsible categories.

| Category | Settings |
|---|---|
| View | theme (tiles with a colour swatch), contrast, motion, colour-vision correction |
| Text | font family (each shown in its own typeface), font size, density |
| Reading | reading focus, reading guide and ruler, WAI symbols (only on pages that mark elements for them) |
| Energy | recovery mode, Pomodoro (phase and time left, plus a progress strip at the top of the screen) |

```tsx
import { MorphicButton } from '@theermite/morphic-adapter/ui';
import '@theermite/morphic-adapter/ui.css';

<MorphicButton />
```

Props, all optional:

| Prop | Purpose |
|---|---|
| `labels` | Override any subset of the French default texts (i18n). Nested groups merge key by key. |
| `axes` | Restrict which settings are shown. |
| `className`, `style` | Extra class or inline style on the root, e.g. to set the theming variables. |

The panel follows the theme the user picks, is isolated from the host page's generic
button styles, and reads its colours from `--morphic-ui-*` custom properties a host can
override (`--morphic-ui-accent`, `-surface`, `-surface-2`, `-text`, `-text-muted`,
`-border`, `-radius`, `-shadow`). Choices are marked with a check as well as colour, and
every control is reachable by keyboard and named for screen readers.

## Contract

- All hooks throw a clear error when used outside `<MorphicProvider>`.
- `<MorphicProvider>` is a transparent wrapper — it does not inject any DOM.
- The provider runs `morphicInit()` once on first client mount (idempotent — safe on remounts and on Strict Mode double-effects), and restores the recovery-mode marker after a reload.
- SSR-safe: the provider does not touch the DOM during render; engine getters already guard `typeof document`.

## License

AGPL-3.0-or-later. See repo root.
