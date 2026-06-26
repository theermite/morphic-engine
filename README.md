# morphic-engine (適応)

> Shinkofa Morphic Adaptation Module — moteur universel framework-agnostic.

The visible digital that adapts to who you are — not the other way around.

## Packages

| Package | Rôle | Version | Statut |
|---------|------|---------|--------|
| `@theermite/morphic-engine` | Moteur TypeScript framework-agnostic | `2.0.0-beta.6` | ✅ Livré |
| `@theermite/morphic-adapter` | Adaptateur React (provider, hooks, UI) | `2.0.0-beta.1` | ✅ Livré |
| `@theermite/morphic-wasm-core` | Chemins critiques Rust → WASM (NaCl box) | `2.0.0-alpha.0` | ✅ Livré, non publié sur npm |

## Quick start (développeur)

```bash
pnpm install
pnpm -F @theermite/morphic-engine test
pnpm -F @theermite/morphic-engine build
pnpm -F @theermite/morphic-adapter test
pnpm --filter @theermite/morphic-wasm-core test
```

## Architecture

Le monorepo contient trois packages complémentaires.

**`packages/engine`** — le cœur. 27 modules TypeScript couvrant cinq domaines : Sensory (thème, motion, contraste, densité, typographie, daltonisation), Cognitive (lecture guidée, focus, symboles WAI, palette de commandes), Motor (click-delay, dwell-click, filtre de tremblement), Energy (détection d'inactivité, Pomodoro, mode récupération), et Infrastructure (stockage IDB, sync, chiffrement E2E, tokens, bridge WASM).

**`packages/adapter`** — l'adaptateur React. `<MorphicProvider>`, six hooks par axe (`useMorphicTheme`, `useMorphicMotion`, `useMorphicContrast`, `useMorphicDensity`, `useMorphicFontSize`, `useMorphicFontFamily`), hook agrégé `useMorphic()`, et un sous-package `./ui` avec `MorphicButton` + feuilles CSS.

**`packages/wasm-core`** — les chemins critiques en Rust compilé vers WebAssembly. Chiffrement NaCl box (Curve25519 + XSalsa20 + Poly1305), chargé de façon paresseuse par le bridge WASM du moteur.

## Funding

Dossier NLNet NGI0 Commons déposé en temps et en heure.

## License

AGPL-3.0-or-later. Voir `LICENSE`.
