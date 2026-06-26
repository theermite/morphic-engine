# morphic-engine (適応)

> Shinkofa Morphic Adaptation Module — framework-agnostic universal engine.

The visible digital that adapts to who you are — not the other way around.

## Packages

| Package | Role | Version | Status |
|---------|------|---------|--------|
| `@theermite/morphic-engine` | Framework-agnostic TypeScript engine | `2.0.0-beta.6` | Shipped |
| `@theermite/morphic-adapter` | React adapter (provider, hooks, UI) | `2.0.0-beta.1` | Shipped |
| `@theermite/morphic-wasm-core` | Rust → WASM critical paths (NaCl box) | `2.0.0-alpha.0` | Shipped, not published to npm |

## Quick start

```bash
pnpm install
pnpm -F @theermite/morphic-engine test
pnpm -F @theermite/morphic-engine build
pnpm -F @theermite/morphic-adapter test
pnpm --filter @theermite/morphic-wasm-core test
```

## Architecture

The monorepo contains three complementary packages.

**`packages/engine`** — the core. 27 TypeScript modules covering five domains: Sensory (theme, motion, contrast, density, typography, daltonization), Cognitive (reading guide, reading focus, WAI symbols, command palette), Motor (click-delay, dwell-click, tremor filter), Energy (idle detection, Pomodoro, recovery mode), and Infrastructure (IDB storage, sync, E2E encryption, tokens, WASM bridge).

**`packages/adapter`** — the React adapter. `<MorphicProvider>`, six per-axis hooks (`useMorphicTheme`, `useMorphicMotion`, `useMorphicContrast`, `useMorphicDensity`, `useMorphicFontSize`, `useMorphicFontFamily`), the aggregate `useMorphic()` hook, and a `./ui` subpackage with `MorphicButton` plus CSS stylesheets.

**`packages/wasm-core`** — critical paths in Rust compiled to WebAssembly. NaCl box encryption (Curve25519 + XSalsa20 + Poly1305), loaded lazily by the engine WASM bridge.

## Funding

NLNet NGI0 Commons application submitted on time.

## License

AGPL-3.0-or-later. See `LICENSE`.
