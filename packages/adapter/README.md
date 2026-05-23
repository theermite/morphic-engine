# @morphic/adapter

React adapter for the [Morphic Adaptation Engine](../engine).

**Status**: B-021a — React adapter shipped. Vanilla, Astro, Web Components adapters deferred.

## Install

```bash
pnpm add @morphic/adapter @morphic/engine react react-dom
```

Peer deps: `react ^19`, `react-dom ^19`, `@morphic/engine` (workspace).

## Quick start (Next.js 16 App Router)

Wrap your root layout (or a subtree) with `<MorphicProvider>`:

```tsx
// app/layout.tsx
import { MorphicProvider } from '@morphic/adapter';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <MorphicProvider>{children}</MorphicProvider>
      </body>
    </html>
  );
}
```

For zero-flash hydration, also inline the engine's head-read snippet in `<head>` (see
`@morphic/engine` README). The provider is the fallback for client-only mounts and
keeps hooks reactive.

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
} from '@morphic/adapter';

export function ThemeToggle() {
  const [theme, setTheme] = useMorphicTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Theme: {theme ?? 'auto'}
    </button>
  );
}
```

`choice` is the user's persisted preference (may include `'auto'`) or `null` when
none is stored. The setter proxies to the engine **and** triggers a re-render of
all hook consumers via the provider's internal tick counter.

### Aggregate — `useMorphic()`

```tsx
import { useMorphic } from '@morphic/adapter';

export function MorphicDebug() {
  const snap = useMorphic();
  return <pre>{JSON.stringify(snap, null, 2)}</pre>;
}
```

Returns the read-only snapshot of all 6 axes (`theme`, `motion`, `contrast`,
`density`, `fontSize`, `fontFamily`).

## Contract

- All hooks throw a clear error when used outside `<MorphicProvider>`.
- `<MorphicProvider>` is a transparent wrapper — it does not inject any DOM.
- Provider runs `morphicInit()` once on first client mount (idempotent — safe on
  remounts and on Strict Mode double-effects).
- SSR-safe: the provider does not touch the DOM during render; engine getters
  already guard `typeof document`.

## Coverage

Standard risk — 80% floor. Current: 100% (14 tests, lines/branches/functions/statements all green).

## License

AGPL-3.0-or-later. See repo root.
