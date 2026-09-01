# CLAUDE.md — morphic-engine

> Moteur d'adaptation morphique Shinkofa (thème, mouvement, contraste, densité, police,
> cognitif, moteur, énergie) — framework-agnostic, publié en paquets npm publics (tag
> `beta`). Monorepo pnpm à 3 paquets + sous-arbre Android natif séparé.

## MANDATORY FIRST READ (BLOCKING — load order critical)

1. `.claude/rules/Interpretation-Protocol.md` — how to read every other rule
2. `.claude/rules/Confidentiality.md` — absolute blocking rule on user personal data
3. `.claude/rules/Monozukuri.md` — philosophie chapeau

No exception. No shortcut.

## Identity

| Paquet | Type | Statut réel (code lu 2026-09-02) | Repo |
|---|---|---|---|
| `@theermite/morphic-engine` | Cœur TypeScript framework-agnostic | `2.0.0-beta.9` (package.json) — 39 fichiers source, 1403 tests verts | `packages/engine` |
| `@theermite/morphic-adapter` | Adaptateur React (provider, hooks, `./ui`) | `2.0.0-beta.2` (package.json) — 74 tests | `packages/adapter` |
| `@theermite/morphic-wasm-core` | Rust → WASM (NaCl box, chemins critiques) | `2.0.0-alpha.0`, publié pas sur npm | `packages/wasm-core` |
| `android/` | Port natif Android (Kotlin/Compose) | Phase A (A-0→A-6) terminée, publication Maven Central différée | `android/` |

## Ce que fait morphic-engine

D'après le code réellement lu (`packages/engine/src/*.ts`, 39 modules) :
- **Sensoriel** : thème (`theme.ts`), mouvement (`motion.ts`), contraste (`contrast.ts`),
  densité (`density.ts`), typographie (`typography.ts`), daltonisation
  (`daltonization.ts`).
- **Cognitif** : guide de lecture (`reading-guide.ts`), focus de lecture
  (`reading-focus.ts`), symboles WAI (`wai-symbols.ts`), palette de commandes
  (`command-palette.ts`).
- **Moteur** : délai de clic (`click-delay.ts`), clic par maintien (`dwell-click.ts`),
  filtre tremblement (`tremor-filter.ts`).
- **Énergie** : détection d'inactivité (`idle-detection.ts`), Pomodoro
  (`pomodoro.ts`, `pomodoro-strip.ts`), mode récupération (`recovery-mode.ts`).
- **Infrastructure** : stockage IndexedDB (`idb-storage.ts`), synchro (`sync-engine.ts`),
  chiffrement E2E (`e2e-crypto.ts`), export/suppression RGPD (`export-gdpr.ts`,
  `delete-gdpr.ts`), pont WASM (`wasm-bridge.ts`), interprétation de profil
  (`profile-interpreter.ts`, `profile-hints.ts`, `human-design-profile.ts`).

Le paquet `adapter` expose `<MorphicProvider>`, 6 hooks par axe
(`useMorphicTheme`, `useMorphicMotion`, `useMorphicContrast`, `useMorphicDensity`,
`useMorphicFontSize`, `useMorphicFontFamily`), l'agrégat `useMorphic()`, et un
sous-paquet `./ui` (`MorphicButton` + CSS).

## Stack (dépendances réellement déclarées)

| Paquet | Dépendances clés |
|---|---|
| `engine` | `zod`, `idb`, `tweetnacl`, `yjs`/`y-indexeddb`, `fuse.js` ; peer optionnel `effect` |
| `adapter` | peer `react@^19`, `react-dom@^19`, `@theermite/morphic-engine@^2.0.0-beta.0` |
| `wasm-core` | Rust : `wasm-bindgen`, `crypto_box`, `rand_core` ; dev : `proptest` |
| Outillage racine | `@biomejs/biome@^2.4.0` (lint), `vitest@^4.0.0`, `typescript@^5.6.0`, `vite@8.0.14` |

Node ≥22, pnpm ≥9 (workspace `packages/*`).

## Documents

- `docs/CDC.md` et `docs/PET.md` existent.
- Autres docs présents : `docs/audits/` (2 audits datés), `docs/Sessions/` (30 sessions,
  2026-05-21 → 2026-08-30), `docs/veille/`, `docs/Changelog-v1-v2.md`,
  `docs/Plan-NLNet-Submission.md`.

## Commands (testées ce jour)

| Commande | Résultat vérifié |
|---|---|
| `pnpm -F @theermite/morphic-engine test -- --run` | **1403 tests passés** (39 fichiers) |
| `pnpm run lint` (biome check) | **97 erreurs de formatage** (CRLF/indentation sur fichiers de config, aucune violation de règle de lint réelle listée) — non corrigé, hors périmètre de cette tâche |
| `pnpm -F @theermite/morphic-adapter test` | non exécuté par cette session, script présent (`vitest run`) |
| `pnpm run build` | script présent (`pnpm -r run build`), non exécuté par cette session |

## Méthodologie

Hérite de la méthodologie MNK-GoRin / Kata. Synchronisée via `/sync-repo`.

## Note confidentialité

Aucune donnée personnelle utilisateur à protéger dans ce repo au sens de
`Confidentiality.md` — c'est un moteur/librairie, pas une plateforme qui collecte des
comptes. Le module `export-gdpr.ts` / `delete-gdpr.ts` traite des données qui
appartiendraient à l'utilisateur FINAL des sites consommateurs, jamais à Jay ; la règle
s'applique normalement si un jour ce repo manipule une identité réelle en test/doc.
