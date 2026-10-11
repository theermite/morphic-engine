# morphic-engine (適応)

[![CI](https://github.com/theermite/morphic-engine/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/theermite/morphic-engine/actions/workflows/ci.yml)
[![npm engine](https://img.shields.io/npm/v/@theermite/morphic-engine?label=%40theermite%2Fmorphic-engine)](https://www.npmjs.com/package/@theermite/morphic-engine)
[![npm adapter](https://img.shields.io/npm/v/@theermite/morphic-adapter?label=%40theermite%2Fmorphic-adapter)](https://www.npmjs.com/package/@theermite/morphic-adapter)
[![License](https://img.shields.io/badge/license-AGPL--3.0%20%7C%20MPL--2.0%20(engine)-blue)](#license)

**The interface adapts to the person — not the person to the interface.**

morphic-engine is an open-source engine that lets a website or an app adapt itself to
each visitor's sensory, cognitive, motor and energy needs: theme (including sepia and
high contrast), reduced motion, information density, font size, readable and
dyslexia-friendly fonts, colour-vision correction, reading aids, click aids for tremor,
and tools against fatigue (a visible Pomodoro, a low-stimulation recovery mode).

It is built for neurodivergent and disabled people first, and for everyone after them:
the same settings help anyone who is tired, on a bad screen, or simply prefers calm.

## Why it exists

Accessibility on the web usually comes in two shapes: operating-system settings that
many sites ignore, or third-party "overlays" that paint over a site they do not
understand. morphic-engine takes a third path. The site wires the engine into its own
design system, so every adaptation is applied by the site itself, in its own style —
and visitors find the same familiar panel on every site that uses it.

- **Framework-agnostic core.** Plain TypeScript, no UI framework. Each adaptation is
  written to `<html>` as a `data-morphic-*` attribute and a CSS custom property, so any
  stylesheet can respond to it.
- **Private by default.** Preferences stay on the device (`localStorage`, IndexedDB).
  The engine makes no network call and has no telemetry. End-to-end encryption
  primitives are provided for hosts that want to sync preferences themselves, and GDPR
  export and deletion helpers are built in.
- **Respectful by design.** No tracking, no profiling, no dark patterns. Sensory comfort
  is offered before anything else is asked of the user.

## See it live

The accessibility button (the person icon at the top of every page) on
[theermite.com](https://theermite.com) and [shinkofa.com](https://shinkofa.com) is this
module in production. Open it, pick a theme or a font, start a Pomodoro: the whole page
follows.

## Packages

| Package | What it is | Status |
|---|---|---|
| [`@theermite/morphic-engine`](packages/engine) | The framework-agnostic engine (TypeScript) | Beta, published on npm |
| [`@theermite/morphic-adapter`](packages/adapter) | React adapter: provider, hooks, and the ready-made `<MorphicButton>` panel | Beta, published on npm |
| [`@theermite/morphic-wasm-core`](packages/wasm-core) | Rust → WebAssembly for the critical crypto path (NaCl box) | Alpha, published on npm |
| [`android/`](android) | Native Android port (Kotlin + Jetpack Compose), separate Gradle build | Phase A complete, not yet on Maven Central |

## Quick start (React)

```bash
pnpm add @theermite/morphic-engine @theermite/morphic-adapter
```

```tsx
import { MorphicProvider } from '@theermite/morphic-adapter';
import { MorphicButton } from '@theermite/morphic-adapter/ui';
import '@theermite/morphic-adapter/morphic.css'; // page-level adaptation rules
import '@theermite/morphic-adapter/ui.css';      // styles of the button panel

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MorphicProvider>
      <header>
        <MorphicButton />
      </header>
      {children}
    </MorphicProvider>
  );
}
```

`<MorphicButton>` opens a panel grouped in four collapsible categories — View, Text,
Reading, Energy. It follows the chosen theme, is isolated from the host page's styles,
and every label can be translated through its `labels` prop.

## Without a framework

```ts
import { morphicInit, setTheme, setFontFamily, setMotion } from '@theermite/morphic-engine';

morphicInit();               // applies the visitor's saved preferences
setTheme('high-contrast');   // writes data-morphic-theme="high-contrast" on <html>
setFontFamily('dyslexic');   // writes data-morphic-font-family="dyslexic"
setMotion('reduced');        // writes data-morphic-motion="reduced"
```

A zero-configuration `<morphic-provider>` custom element is also registered when the
engine is imported.

## What the engine covers

| Domain | Adaptations |
|---|---|
| Sensory | Theme (light, dark, auto, sepia, high contrast), contrast, motion, density, font size, font family (incl. Atkinson Hyperlegible and OpenDyslexic), colour-vision correction (protan, deutan, tritan) |
| Cognitive | Reading focus, reading guide (line, mask, ruler), WAI pictogram symbols, command palette, decision-points cap |
| Motor | Click delay, dwell click, tremor filter |
| Energy | Idle detection, Pomodoro with an on-screen progress strip, recovery mode (warm dark, reduced motion, spacious layout) |
| Infrastructure | IndexedDB storage, local CRDT persistence (Yjs) ready for sync, end-to-end encryption primitives, GDPR export and deletion, design tokens (W3C DTCG), WebAssembly bridge |

## Quality

Every push runs the linter and the full test suites of the engine and the adapter on
Node 22 and Node 24 (see the CI badge above). The engine is tree-shakable: a page that
only applies a theme does not download the profile-validation code.

## Repository layout

```
packages/engine      the core engine (TypeScript)
packages/adapter     the React adapter and <MorphicButton>
packages/wasm-core   Rust → WebAssembly crypto path
android/             native Android port (Apache-2.0)
docs/                specification, roadmap, audits, session journal — see docs/README.md
```

## Development

Requires Node 22 or later and pnpm.

```bash
pnpm install
pnpm run lint
pnpm -F @theermite/morphic-engine test
pnpm -F @theermite/morphic-adapter test
pnpm -r run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute and [SECURITY.md](SECURITY.md) to
report a vulnerability.

## Funding

An application to the [NLnet Foundation](https://nlnet.nl)'s NGI Zero Commons Fund has
been submitted for this project.

## License

AGPL-3.0-or-later. See [`LICENSE`](LICENSE).

**Exception — `packages/engine`** is dual licensed since 2026-08-30: you may use it
under **AGPL-3.0-or-later OR MPL-2.0**, at your option. See
[`packages/engine/LICENSE`](packages/engine/LICENSE). The MPL was added so the engine
can be embedded in a Firefox-derived browser, which is MPL-2.0 throughout.
`packages/adapter` and `packages/wasm-core` remain AGPL-3.0-or-later only.

**Exception — `android/`** is licensed under Apache-2.0 (see
[`android/README.md`](android/README.md)), so the native module can be reused broadly as
a drop-in dependency.
