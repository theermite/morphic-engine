# @morphic/engine

Framework-agnostic core of the **Shinkofa Morphic Adaptation Engine**.

Drop-in TypeScript module that listens to the user's morphic preferences (sensory, cognitive, motor, energy axes) and exposes them via deterministic getters/setters. Persistence to `localStorage` is automatic; subscribers receive change events.

**Status**: `2.0.0-beta` — Phase 1 (core axes + persistence + CRDT sync + NaCl E2E + GDPR export) shipped. Phase 1.5 (telemetry / GPII import / GDPR delete) in progress.

**License**: AGPL-3.0-or-later. See [LICENSE](./LICENSE).

## Install

```bash
pnpm add @morphic/engine
# or
npm install @morphic/engine
```

For React projects, add the adapter:

```bash
pnpm add @morphic/adapter
```

## Quick start (framework-agnostic)

```ts
import { morphicInit, setClickDelay, getClickDelay } from '@morphic/engine';

await morphicInit(); // load persisted prefs from localStorage
setClickDelay({ delay: 250 });
console.log(getClickDelay()); // 250
```

## Axes covered

| Domain | Axis | Setter |
|--------|------|--------|
| Sensory | theme, motion, contrast, density, fontSize, fontFamily, colorVisionCorrection | `setTheme`, `setMotion`, ... |
| Cognitive | readingGuide, waiSymbols, decisionPointsCap | `setReadingGuide`, `enableWaiSymbols`, ... |
| Motor | clickDelay, dwellClick, tremorFilter | `setClickDelay`, `setDwellClick`, ... |
| Energy | idleDetection, pomodoro, recoveryMode | `setIdleDetection`, `startPomodoro`, ... |
| Tools | commandPalette | `openCommandPalette`, ... |

Full API reference: see `dist/index.d.ts`.

## Persistence

All preferences are persisted under the `morphic-prefs` localStorage key. Schema is versioned; migrations are automatic.

## Sync (optional)

CRDT sync via Yjs + IndexedDB is lazy-loaded; enabling it does not add weight to apps that don't use it.

```ts
import { initSyncEngine, syncPreferences } from '@morphic/engine';

await initSyncEngine({ userId: 'anonymous-uuid', e2e: true });
await syncPreferences();
```

## E2E encryption (opt-in)

Preferences can be encrypted with NaCl `crypto_box` before sync. Key never leaves the device.

## Bundle size

| Build | Gzipped |
|-------|---------|
| Core (no sync) | ~12 KB |
| Core + sync + E2E | ~38 KB (lazy-loaded) |

## Adapters

| Framework | Package |
|-----------|---------|
| React 19+ | [`@morphic/adapter`](https://github.com/theermite/morphic-engine/tree/main/packages/adapter) |
| Vanilla / Web Components | deferred |
| Astro | deferred |

## Demo

Live demo (Shinkofa ecosystem): https://theermite.com/lab/morphic

## License

[AGPL-3.0-or-later](./LICENSE) — Shinkofa & contributors. Network use IS distribution: any modified version exposed over a network MUST publish its source under the same license.

## Funding

This work is in scope of an [NLNet NGI0 Commons](https://nlnet.nl/commons/) application (2026 round).
