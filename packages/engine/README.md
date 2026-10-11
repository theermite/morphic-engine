# @theermite/morphic-engine

[![npm](https://img.shields.io/npm/v/@theermite/morphic-engine)](https://www.npmjs.com/package/@theermite/morphic-engine)

Framework-agnostic core of the **Morphic Adaptation Engine** — created and maintained by
[Jean-Pierre Gonçalves (The Ermite)](https://github.com/theermite).

The engine lets a page adapt itself to each visitor's sensory, cognitive, motor and
energy needs. Every setter writes its result on `<html>` as a `data-morphic-*` attribute
and a `--morphic-*` CSS custom property, so any stylesheet can respond to it. Choices are
persisted on the device under the `morphic-prefs` key of `localStorage`.

**Status**: `2.0.0-beta`. Used in production on [theermite.com](https://theermite.com)
and [shinkofa.com](https://shinkofa.com). See the [changelog](../../CHANGELOG.md).

## Install

```bash
pnpm add @theermite/morphic-engine
# or
npm install @theermite/morphic-engine
```

React projects can add the ready-made panel from
[`@theermite/morphic-adapter`](../adapter).

## Quick start

```ts
import { morphicInit, setTheme, setFontSize, setMotion } from '@theermite/morphic-engine';

morphicInit();            // applies the visitor's saved preferences to <html>
setTheme('sepia');        // data-morphic-theme="sepia"
setFontSize('lg');        // data-morphic-font-size="lg"
setMotion('reduced');     // data-morphic-motion="reduced"
```

Then style the page from those attributes, or import the ready-made rules shipped by the
adapter (`@theermite/morphic-adapter/morphic.css`).

## What it covers

| Domain | Settings | Entry points (examples) |
|---|---|---|
| Sensory | theme, contrast, motion, density, font size, font family, colour-vision correction | `setTheme`, `setContrast`, `setMotion`, `setDensity`, `setFontSize`, `setFontFamily`, `setColorVisionCorrection` |
| Cognitive | reading focus, reading guide, WAI pictogram symbols, command palette, decision-points cap | `setReadingFocus`, `setReadingGuide`, `enableWaiSymbols`, `enableCommandPalette` |
| Motor | click delay, dwell click, tremor filter | `setClickDelay`, `setDwellClick`, `setTremorFilter` |
| Energy | idle detection, Pomodoro and its progress strip, recovery mode | `setIdleDetection`, `startPomodoro`, `enablePomodoroStrip`, `enterRecoveryMode` |
| Data | GDPR export and deletion, local CRDT persistence ready for sync, end-to-end encryption primitives | `exportPreferences`, `deleteAllPreferences`, `createSyncEngine`, `encryptPayload` |

The full typed API is in `dist/index.d.ts`. A zero-configuration `<morphic-provider>`
custom element is registered when the package is imported.

## Privacy

Preferences stay on the device. The engine makes no network call and has no telemetry.
`createSyncEngine` keeps a local CRDT copy (Yjs over IndexedDB); a network relay is not
wired yet. For hosts that sync preferences themselves, `generateKeyPair`,
`encryptPayload` and `decryptPayload` encrypt end to end with NaCl `crypto_box`
(tweetnacl); the user's key pair never leaves the device.

## Bundle weight

The package declares `sideEffects`, so bundlers drop what a page does not use: a page
that only applies display settings does not download the profile-validation code
(measured 2026-10-10, see the [changelog](../../CHANGELOG.md)).

## License

Dual licensed: **AGPL-3.0-or-later OR MPL-2.0**, at your option. See [LICENSE](./LICENSE).

## Funding

An application to the [NLnet Foundation](https://nlnet.nl)'s NGI Zero Commons Fund has
been submitted for this project.
