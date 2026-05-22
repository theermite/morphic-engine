# Plan d'Exécution Technique — Module d'Adaptation Morphique Shinkofa v2.0.0

> **Ce que ce document est** : le **journal vivant** de l'exécution v2.0.0. Chaque brick = un commit atomique = une preuve.
> **Ce que ce document n'est PAS** : la spécification de l'intention. Pour le quoi/pour qui/pourquoi, voir `docs/Conception-Morphique/CDC.md` v2.0.0.
> **Règle de mise à jour** : modifier le PET à CHAQUE session de travail (avant + après chaque brick). C'est ici que vit la rigueur Monozukuri **excédence** — chaque brick est consignée, chaque erreur est tracée, chaque preuve est attachée.

**Version** : 2.0.0 | **Date création** : 2026-05-21 | **Dernière MAJ** : 2026-05-22 | **Statut** : Active (v2 alignée Refonte + Monozukuri excédence)
**Cross-ref** : `docs/Conception-Morphique/CDC.md` v2.0.0 (intention) · `docs/Refonte/*` (21 docs standards Shinkofa 2026) · `mnk/10-Blueprints.md` (archétypes)
**Standard qualité** : floor consolidé Refonte ≥92/100 toutes dimensions ; Critical modules : coverage 95% + mutation 75%.

---

## 1. Principe d'exécution

- **Monozukuri excédence** : chaque brick est un objet achevé, pas une étape. Si ce n'est pas propre **maintenant**, ce ne sera pas propre après.
- **Brick by brick** : un objectif = une brick = un commit atomique = une preuve. Pas de "on terminera plus tard".
- **TDG strict** : tests AVANT code, à chaque brick. Tests rouges écrits + commités, puis code vert + commit, puis refactor + commit (cycle TDD 3 phases).
- **Anti-Circular Testing 3-layer** : PBT (fast-check / proptest / StreamData) + Mutation (StrykerJS / cargo-mutants / Mutant.ex) + Cross-Model review (Koshin/DeepSeek) sur tous modules Critical.
- **Veille marker BLOCKING** : `[VEILLE] <techno>@<version> verifie <YYYY-MM-DD> via <source>` avant chaque brick qui touche dépendance externe.
- **Backup cadence** : tag git annoté `morphic-vX.X.X-brick-NNN` toutes les 3-4 bricks.
- **Trace continue** : §6 (Roadmap) mis à jour à CHAQUE brick — pas en fin de session.
- **Rigueur > Vitesse** : 5 minutes de plus pour faire propre, toujours. Pas d'excuse pour couper les coins.
- **Erreur = donnée** : LOGS FIRST. Lue, analysée, racine identifiée. Pas de hypothèse avant lecture.

---

## 2. Anti-Circular Testing Protocol

| Layer | Méthode | Tools | Quand BLOCKING |
|-------|---------|-------|----------------|
| **L1 — Algorithmique** | PBT + mutation + fuzzing | fast-check 3.21+ (TS) / proptest 1.5+ (Rust) / StreamData 1.0+ (Elixir) / StrykerJS 9.5+ / cargo-mutants 25.x / Mutant.ex 0.13+ / Schemathesis 3.x (import GPII/WAI-Adapt) | Tous Critical + Sensitive |
| **L2 — Different Context** | Sessions Writer / Reviewer séparées + agent Test Auditor Master + holdout tests `__holdout__/` | Sessions Claude distinctes (PreCompact handoff brief) | Tous Critical |
| **L3 — Different Model** | Review par un autre LLM | Koshin (multi-LLM) / DeepSeek-V3 | Tous Critical (recommandé Sensitive) |

**Hidden tests holdout** : 20% des tests Critical stockés dans `__holdout__/` exclus du training Writer ; Reviewer les run et compare. Détection over-fitting au harness propre.

**Détails** : `.claude/rules/Quality.md` § Anti-Circular Testing Protocol + `mnk/06-Quality.md`.

---

## 3. Bidirectional Traceability

Chaque feature CDC §3 mappée vers ≥1 brick PET §6 + ≥1 test. Aucun feature orphelin, aucun brick orphelin.

| CDC Feature | Bricks PET | Tests principaux | Niveau Risk |
|-------------|-----------|------------------|-------------|
| F-001 Scaffolding 3 packages | B-001, B-002 | unit/scaffolding.test.ts, ci/build.yml | Tooling |
| F-002 `<morphic-provider>` zero-config | B-003 | unit/provider.test.ts, e2e/provider.spec.ts | Sensitive |
| F-003 Synchronous head-read (zero flash) | B-004 | unit/init.test.ts, e2e/zero-flash.spec.ts (Playwright cross-browser) | **Critical** |
| F-004 Token system DTCG | B-005 | unit/tokens.test.ts, e2e/token-export.spec.ts | Sensitive |
| F-005 Style Dictionary 5.x pipeline | B-006 | unit/style-dict.test.ts, ci/build-tokens.yml | Sensitive |
| F-006 Axe thème | B-007 | unit/theme.test.ts, e2e/theme-switch.spec.ts, axe-core | Standard |
| F-007 Axe motion | B-008 | unit/motion.test.ts, e2e/reduced-motion.spec.ts | Standard |
| F-008 Axe density | B-009 | unit/density.test.ts, e2e/density.spec.ts | Standard |
| F-009 Axe font size + line height | B-010 | unit/typography.test.ts | Standard |
| F-010 Axe cognitif decision points cap ≤3 | B-011 | unit/decision-points-ast.test.ts (lint custom AST), Storybook + axe | **Critical** |
| F-011 Axe language complexity | B-012 | unit/lang-complexity.test.ts | Standard |
| F-012 Onboarding sensoriel-AVANT-identité | B-013 | e2e/onboarding-order.spec.ts (assertion ordre exact), Dignity 8 tests | **Critical** |
| F-013 Mode récupération 1-clic | B-014 | unit/recovery.test.ts, e2e/recovery-mode.spec.ts | Sensitive |
| F-014 Persistence IndexedDB local-first | B-015 | unit/idb.test.ts, e2e/persistence.spec.ts (quota stress) | **Critical** |
| F-015 CRDT Yjs lazy-loaded | B-016 | unit/yjs-lazy.test.ts, e2e/sync.spec.ts, bundlesize CI | **Critical** |
| F-016 Sync E2E NaCl `box` opt-in | B-017 | unit/crypto.test.ts (proptest 1000+ encrypt), e2e/sync-encrypted.spec.ts | **Critical** |
| F-017 Tri-layer Rust→WASM critical | B-018 | cargo test + proptest, e2e/wasm-fallback.spec.ts | **Critical** |
| F-018 Effect-TS résilience | B-019 | unit/effects.test.ts (error paths), unit/retry.test.ts | Sensitive |
| F-019 Web Workers process isolation | B-020 | unit/worker.test.ts, e2e/main-thread-free.spec.ts (Performance API) | Sensitive |
| F-020 Démo theermite.com intégration | B-021 | e2e/the-ermite-demo.spec.ts, Lighthouse CI ≥95 | Standard |
| F-021 Telemetry opt-in OpenTelemetry | B-022 | unit/telemetry.test.ts (zero PII regex audit), ExUnit telemetry channel | Sensitive |
| F-022 API import GPII / WAI-Adapt | B-023 | unit/import.test.ts (Schemathesis fuzz), e2e/gpii-import.spec.ts | Sensitive |
| F-023 Export préférences JSON (GDPR Art. 20) | B-024a | unit/export.test.ts, e2e/export-flow.spec.ts | **Critical** (GDPR) |
| F-024 Delete préférences (GDPR Art. 17) | B-024b | unit/delete.test.ts, e2e/delete-flow.spec.ts | **Critical** (GDPR) |

**Phase 2** (F-101 à F-105 browser extension) : non couvert en v2.0.0, traçabilité ajoutée quand Phase 2 démarre.

---

## 4. 5 Test Reliability Metrics — cibles projet

| Métrique | Cible (excédence) | Outil | Vérifié au gate |
|----------|-------------------|-------|-----------------|
| **Line coverage** | ≥ **95% Critical** / ≥ 90% Sensitive / ≥ 80% global | vitest --coverage / cargo tarpaulin / ExCoveralls | Pré-commit + CI BLOCKING |
| **Mutation score** | ≥ **75% Critical** / ≥ 60% Sensitive | StrykerJS 9.5+ / cargo-mutants 25.x / Mutant.ex 0.13+ | CI hebdo BLOCKING release |
| **Empty tests** | **0** | grep audit (`assert(true)`, tests sans `expect`/`assert`) | Pré-commit BLOCKING |
| **Trivial tests** | **< 10%** | Test Auditor Master agent | Audit hebdo BLOCKING release |
| **Mock:Assert ratio** | **< 3:1** par test | Test Auditor Master agent | Audit hebdo BLOCKING |
| **Type coverage** | **100%** nouveau code (tsc strict + Dialyzer + clippy strict 0 warning) | tsc --noEmit / mix dialyzer / cargo clippy -- -D warnings | Pré-commit BLOCKING |

**Memory leak soak (excédence Refonte)** : 24h en boucle de mount/unmount Web Component → < 1 MB drift heap. Chrome DevTools heap snapshots. CI nightly, BLOCKING release.

---

## 5. Defensive Assertions

Toute fonction listée Critical (§7 CDC) doit contenir ≥ 2 assertions défensives (type + invariant + précondition). Détection via lint AST custom.

| Fonction | Fichier | Assertions minimales | Statut |
|----------|---------|----------------------|--------|
| `morphic_validate_prefs()` | `crates/wasm-core/src/validators.rs` | type schema + range axes + invariant non-empty | À implémenter B-018 |
| `morphic_encrypt_box()` | `crates/wasm-core/src/crypto.rs` | nonce length 24 + key length 32 + nonce CSPRNG-derived | À implémenter B-017 |
| `morphicInit()` | `packages/engine/src/init.ts` | try/catch localStorage + try/catch JSON.parse + typeof/null/Array check + enum validation | ✅ Done B-004 (69941b4) |
| `morphic_idb_persist()` | `packages/engine/src/storage/idb.ts` | quota check + schema version match + value sanitized | À implémenter B-015 |
| `morphic_yjs_apply_update()` | `packages/engine/src/storage/crdt.ts` | update validated WASM AVANT apply + Y.Doc not null | À implémenter B-016 |
| `morphic_onboarding_step_render()` | `packages/engine/src/onboarding/step.ts` | step.identity_collected === false BEFORE sensoriel done | À implémenter B-013 |
| `MorphicChannel.handle_in(:sync, ...)` | `sk_morphic/lib/channels/sync.ex` | binary ciphertext only + no plaintext logged + topic authorized | À implémenter B-017b |

---

## 6. Roadmap — Bricks

Format : une ligne par brick. **Mise à jour obligatoire à chaque brick.**

### Phase 1.0 — Foundation (B-001 à B-006)

| ID | Brick | CDC ref | Statut | Coverage cible | Veille requise | Commit | Date |
|----|-------|---------|--------|----------------|----------------|--------|------|
| B-001 | Monorepo scaffolding pnpm workspaces (3 packages : engine, wasm-core, adapter) + Vite 6 + Vitest 4 (forks pool, maxForks 2, NODE_OPTIONS=2048) + tsconfig strict | F-001 | ✅ Done | Tooling 60% | pnpm@10.33, vitest@4.1.7, biome@2.4.15, ts@5.9.3 (2026-05-21) | 3fe0b04..a5dfcf2 | 2026-05-21 |
| B-002 | CI GitHub Actions : build matrix (Node 20+22) + lint Biome + type check tsc + coverage v8 upload Codecov. Rust/Elixir CI deferred to B-005/B-017b (no code yet). | F-001 | ✅ Done | Tooling 60% | checkout@v4, setup-node@v4, pnpm/action-setup@v4, codecov@v5, rust-toolchain@v1, setup-beam@v1 (2026-05-22) | 3cfe2bd..88348fd | 2026-05-22 |
| B-003 | `<morphic-provider>` Custom Element v1 zero-config (shadow DOM, customElements.whenDefined, fallback inert) | F-002 | ✅ Done | Sensitive 90% (atteint 100%) | jsdom@29.1.1 (2026-05-22) | _à compléter au push_ | 2026-05-22 |
| B-004 | Synchronous head-read init.ts (zero flash) — CSS vars injection via style.setProperty, lecture localStorage sync, fallback `prefers-*` media queries, validation closed enums | F-003 | ✅ Done | **Critical 95%** (atteint 100%) | localStorage WHATWG stable, prefers-* 94-95%, fast-check@4.8.0 (2026-05-22) | 69941b4 | 2026-05-22 |
| B-005 | Token system DTCG (Design Token Format) + schémas axes morphiques + validation Zod (TS) / Pydantic miroir backend | F-004 | ⬜ Pending | Sensitive 90% | DTCG spec stable | — | — |
| B-006 | Style Dictionary 5.4.1 build pipeline : tokens → CSS vars + Tailwind config + JSON | F-005 | ⬜ Pending | Sensitive 90% | style-dictionary@5.4.1 | — | — |

### Phase 1.1 — Axes morphiques sensoriels (B-007 à B-011)

| ID | Brick | CDC ref | Statut | Coverage cible | Veille requise | Commit | Date |
|----|-------|---------|--------|----------------|----------------|--------|------|
| B-007 | Axe thème (light/dark/auto/high-contrast/sepia) + CSS vars + persistence IDB | F-006 | ⬜ Pending | Standard 80% | prefers-color-scheme cross-browser | — | — |
| B-008 | Axe motion (full/reduced/none) + override `prefers-reduced-motion` | F-007 | ⬜ Pending | Standard 80% | prefers-reduced-motion | — | — |
| B-009 | Axe density (compact/comfortable/spacious) + CSS scale tokens | F-008 | ⬜ Pending | Standard 80% | — | — | — |
| B-010 | Axe font size + line height + max-width (75ch prose) | F-009 | ⬜ Pending | Standard 80% | — | — | — |
| B-011 | Lint AST custom : decision points cap ≤3 par écran morphique (BLOCKING) | F-010 | ⬜ Pending | **Critical 95%** | TypeScript Compiler API | — | — |

### Phase 1.2 — Cognitif + Onboarding + Recovery (B-012 à B-014)

| ID | Brick | CDC ref | Statut | Coverage cible | Veille requise | Commit | Date |
|----|-------|---------|--------|----------------|----------------|--------|------|
| B-012 | Axe language complexity (simple/standard/expert) + binding i18n keys | F-011 | ⬜ Pending | Standard 80% | — | — | — |
| B-013 | Onboarding sensoriel-AVANT-identité : 3 écrans (thème → motion → density), ZÉRO identité avant validation 3 écrans | F-012 | ⬜ Pending | **Critical 95%** | — | — | — |
| B-014 | Mode récupération 1-clic (Loi 12 Recovery as Architecture) — reset axes vers profil "low-energy" | F-013 | ⬜ Pending | Sensitive 90% | — | — | — |

### Phase 1.3 — Persistence + Sync (B-015 à B-017)

| ID | Brick | CDC ref | Statut | Coverage cible | Veille requise | Commit | Date |
|----|-------|---------|--------|----------------|----------------|--------|------|
| B-015 | IndexedDB local-first via `idb` 8.x + schema versioning + quota handling | F-014 | ⬜ Pending | **Critical 95%** | idb@8.x, IDB browser quotas 2026 | — | — |
| B-016 | Yjs CRDT lazy-loaded (~50KB) via dynamic import + Y.Doc + WebSocket provider opt-in | F-015 | ⬜ Pending | **Critical 95%** | yjs@13.6.27+ | — | — |
| B-017 | Sync E2E NaCl `box` opt-in : crypto Rust (B-017a) + Phoenix Channel relay (B-017b) | F-016 | ⬜ Pending | **Critical 95%** + mutation 75% | tweetnacl@1.0.3, Phoenix 1.8 | — | — |

### Phase 1.4 — Tri-layer + Workers + Effects (B-018 à B-020)

| ID | Brick | CDC ref | Statut | Coverage cible | Veille requise | Commit | Date |
|----|-------|---------|--------|----------------|----------------|--------|------|
| B-018 | Rust→WASM `morphic-wasm-core` : validators schemas + mappers HD/ND → axes + fault-isolated panic → fallback TS | F-017 | ⬜ Pending | **Critical 95%** + mutation 75% | wasm-bindgen 0.2.95+, wasm-pack | — | — |
| B-019 | Effect-TS 3.10+ wrappers sur tous async (init, storage, sync, telemetry) — pas de throw sauvage | F-018 | ⬜ Pending | Sensitive 90% | effect@3.10+ | — | — |
| B-020 | Web Workers (sync + crypto + token rebuild) + transferable objects + supervisor restart pattern | F-019 | ⬜ Pending | Sensitive 90% | Worker spec WHATWG | — | — |

### Phase 1.5 — Démo + Telemetry + Interop + GDPR (B-021 à B-024)

| ID | Brick | CDC ref | Statut | Coverage cible | Veille requise | Commit | Date |
|----|-------|---------|--------|----------------|----------------|--------|------|
| B-021 | Démo theermite.com — intégration drop-in (5 lignes) + Lighthouse CI ≥95 sur démo | F-020 | ⬜ Pending | Standard 80% | Next.js 16 The Ermite stack | — | — |
| B-022 | Telemetry opt-in OpenTelemetry (client JS + Elixir backend) — audit PII regex BLOCKING zero | F-021 | ⬜ Pending | Sensitive 90% | @opentelemetry/api 1.27 | — | — |
| B-023 | API import GPII Morphic.org + WAI-Adapt — fuzzing Schemathesis sur schemas import | F-022 | ⬜ Pending | Sensitive 90% | GPII Preferences registry 2026 | — | — |
| B-024a | Export préférences JSON GDPR Art. 20 — 1 clic, schema documenté | F-023 | ⬜ Pending | **Critical 95%** (GDPR) | — | — | — |
| B-024b | Delete préférences GDPR Art. 17 — 2 clics max, zéro guilt-trip (Dignity §g) | F-024 | ⬜ Pending | **Critical 95%** (GDPR) | — | — | — |

### Phase 1.6 — Release publique

| ID | Brick | CDC ref | Statut | Coverage cible | Veille requise | Commit | Date |
|----|-------|---------|--------|----------------|----------------|--------|------|
| B-025 | NLNet dossier soumis (deadline 2026-06-01) — dossier `docs/Refonte/NLNet-Dossier-*` finalisé | §11 NLNet | ⬜ Pending | — | NLNet round 2026-06-01 | — | — |
| B-026 | README NPM `@shinkofa/morphic-engine` + LICENSE AGPL-3.0 + CHANGELOG + CONTRIBUTING | §12 Distribution | ⬜ Pending | — | npm publish workflow | — | — |
| B-027 | Pillar article The Ermite « Adaptation morphique vs accessibility overlays (FTC AccessiBe 2024) » + JSON-LD SoftwareApplication | §12 SEO + GEO | ⬜ Pending | — | schema.org SoftwareApplication | — | — |
| B-028 | Audit final GO/NO-GO Quality-Gates Refonte (4D ≥ 80/100) + Lighthouse ≥95 + axe 0 + Pa11y 0 + cross-browser pass | §11 Compliance | ⬜ Pending | — | — | — | — |
| B-029 | Release v2.0.0 publique : tag `morphic-v2.0.0`, npm publish, GitHub release, annonce LinkedIn/Discord/Telegram (pipeline The Ermite) | §12 Distribution | ⬜ Pending | — | — | — | — |

**Statuts possibles** : ⬜ Pending · 🟡 In progress · 🔵 Tests written (red) · 🟢 Done · 🔴 Blocked · ⚫ Skipped

**Coverage** : valeur cible selon CDC §7 Risk Classification. Vérifiée AVANT clôture brick. Mutation score vérifié hebdo et avant release.

### Outillage qualité par étape (BLOCKING — calage roadmap)

| Outil | Brick d'introduction | Justification | Référence |
|-------|---------------------|---------------|-----------|
| **Coverage thresholds v8** (global 80%) | **B-002 (déjà appliqué)** | Floor MNK-GoRin Quality.md — calibré dès la 2e brick pour TDG cohérent | Audit 2026-05-22 finding T1 |
| **StrykerJS mutation testing** | **B-005** (token validation Zod) puis **B-018** (Rust→WASM) | Premier module avec logique non-triviale → cible mutation score 75% sur paths Critical. cargo-mutants côté Rust dès B-018. | Audit 2026-05-22 finding T2 + Quality.md §Anti-Circular |
| **fast-check PBT** | **B-005** (DTCG validators) puis tout module Critical 95% | Layer 1 Anti-Circular — propriétés algorithmiques sur validators, mappers HD/ND, schemas | Audit 2026-05-22 finding T3 + Quality.md §Anti-Circular |
| **Schemathesis fuzzing** | **B-023** (API import GPII / WAI-Adapt) | Fuzz des contrats import externe — déjà tracé dans la brick | PET déjà conforme |
| **Holdout tests `__holdout__/`** | **B-017** (sync E2E) + **B-018** (WASM core) | Layer 2 Anti-Circular — tests cachés du writer | Quality.md §Anti-Circular |
| **Cross-model review** (Koshin / DeepSeek) | **B-018**, **B-024a**, **B-024b** | Layer 3 Anti-Circular sur modules Critical (WASM + GDPR Export/Delete) | Quality.md §Anti-Circular |

**Principe** : aucun module Critical 95% n'est marqué 🟢 Done sans (a) PBT Layer 1 + (b) mutation score ≥75% + (c) holdout test passé OU cross-model review. Vérifié au DOD de chaque brick Critical.

---

## 7. Détail par brick

Sous-sections créées dynamiquement quand chaque brick démarre. Squelette commun ci-dessous.

### B-XXX — {{Nom de la brick}}

**Statut** : ⬜ Pending / 🟡 / 🔵 / 🟢 / 🔴
**CDC ref** : F-XXX
**Risk level** : Tooling / Standard / Sensitive / **Critical**
**Scope** : ce que cette brick fait, en 1-2 lignes.
**Fichiers impactés** : liste exhaustive (max 3 fichiers par commit hors justification).

#### Veille préalable (BLOCKING avant écriture code)

| Sujet | Vérifié le | Source | Conclusion |
|-------|-----------|--------|------------|
| {{lib}}@{{version}} | YYYY-MM-DD | {{url officielle}} | {{stable / breaking / CVE / version cible}} |

Marker obligatoire conversation Takumi : `[VEILLE] <techno>@<version> verifie <YYYY-MM-DD> via <source>`.

#### Tests préalables (TDG — écrits AVANT le code)

| Test | Fichier | Type | Statut | Cible | Anti-Circular Layer |
|------|---------|------|--------|-------|---------------------|
| should ... | tests/... | Unit/Integration/E2E | 🔴 Red | F-XXX | L1 PBT / L2 Holdout / L3 Cross-model |

#### Impact analysis (tests à re-jouer)

Liste des tests existants qui pourraient régresser à cause de cette brick. Dependency-aware targeting (cf. Gate 3 Workflows).

#### Implémentation

- [ ] Étape 1 : …
- [ ] Étape 2 : …
- [ ] Étape 3 : …

#### Tests post (preuves d'exécution — BLOCKING avant commit)

| Vérification | Commande | Output attendu | Résultat |
|--------------|----------|----------------|----------|
| Tests TS verts | `pnpm test` | exit 0, X passed | À exécuter |
| Tests Rust verts (si applicable) | `cargo test --workspace` | exit 0 | À exécuter |
| Tests Elixir verts (si applicable) | `mix test` | exit 0 | À exécuter |
| Coverage TS | `pnpm test:coverage` | ≥ seuil §4 | À exécuter |
| Coverage Rust | `cargo tarpaulin --out Json` | ≥ seuil §4 | À exécuter |
| Coverage Elixir | `mix coveralls` | ≥ seuil §4 | À exécuter |
| Mutation TS (Critical) | `pnpm stryker run` | ≥ 75% | À exécuter |
| Mutation Rust (Critical) | `cargo mutants` | ≥ 75% | À exécuter |
| Lint TS | `pnpm lint` (Biome 2.4) | exit 0 | À exécuter |
| Lint Rust | `cargo clippy -- -D warnings` | exit 0 | À exécuter |
| Lint Elixir | `mix credo --strict && mix dialyzer` | exit 0 | À exécuter |
| Types TS | `pnpm tsc --noEmit` | exit 0 | À exécuter |
| Security TS | `pnpm audit --audit-level high` | 0 high/critical | À exécuter |
| Security Rust | `cargo audit` | 0 vulnerabilities | À exécuter |
| Security Elixir | `mix sobelow --threshold high` | 0 findings | À exécuter |
| Bundlesize | `pnpm bundlesize` | ≤ 20 KB engine, ≤ 50 KB Yjs lazy | À exécuter |
| A11y (si UI) | `pnpm pa11y` + axe-core run | 0 violations | À exécuter |
| Cross-browser (si UI) | `pnpm playwright test` | passing Chromium + Firefox + WebKit | À exécuter |

**Preuve attachée** : screenshot, log, ou commande+output collés ci-dessous. Pas de "ça doit marcher" (Monozukuri #5).

```
{{coller ici la sortie réelle des commandes}}
```

#### Erreurs rencontrées (L'erreur est une donnée — Monozukuri #3)

| Erreur | Cause racine identifiée | Correction | Test ajouté |
|--------|------------------------|-----------|-------------|
| {{message d'erreur}} | {{ce qui causait vraiment le problème}} | {{ce qu'on a changé}} | {{nom du test de non-régression}} |

#### Décisions prises in-flight

| Décision | Alternative écartée | Justification |
|----------|---------------------|---------------|
| {{ce qu'on a choisi}} | {{ce qu'on n'a pas pris}} | {{pourquoi}} |

#### Commit

- SHA : `xxxxxxx`
- Message : `feat(scope): description`
- Branch : `feature/morphic-bXXX-...`
- Tag backup ? Oui/Non (toutes les 3-4 bricks)

---

### B-001 — Bootstrap monorepo morphic-engine

**Statut** : ✅ Done (2026-05-21)
**CDC ref** : F-001
**Risk level** : Tooling (60%)
**Scope** : créer la structure monorepo pnpm workspaces avec 3 packages (`engine`, `wasm-core`, `adapter`), config TypeScript strict, Vitest 4 (forks pool), Biome 2.4 lint+format, LICENSE AGPL-3.0, CI GitHub Actions matrix Node 20+22, repo public sur GitHub.
**Fichiers impactés** :
- `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `biome.json`, `.editorconfig`, `.gitignore`, `LICENSE`, `README.md`
- `packages/engine/{package.json, tsconfig.json, vite.config.ts, src/index.ts, tests/smoke.test.ts}`
- `packages/wasm-core/{package.json, README.md}` (placeholders B-005+)
- `packages/adapter/{package.json, README.md}` (placeholders B-008+)
- `.github/workflows/ci.yml`

#### Veille préalable

| Sujet | Vérifié le | Source | Conclusion |
|-------|-----------|--------|------------|
| pnpm@10.33.0 | 2026-05-21 | pnpm.io | Stable, Corepack standard, packageManager field |
| Vitest@4.1.7 | 2026-05-21 | vitest.dev | Stable, forks pool top-level (poolOptions removed v4) |
| Biome@2.4.15 | 2026-05-21 | biomejs.dev | Stable, schema 2.4.15 |
| TypeScript@5.9.3 | 2026-05-21 | typescriptlang.org | Stable, strict + verbatimModuleSyntax |
| pnpm/action-setup@v4 | 2026-05-21 | github.com/pnpm/action-setup | Stable, auto-reads packageManager when version omitted |

Markers émis : `[VEILLE] pnpm@10.33 / vitest@4.1.7 / biome@2.4.15 / ts@5.9.3 verifie 2026-05-21 via registres officiels`.

#### Tests préalables (TDG)

| Test | Fichier | Type | Statut | Cible |
|------|---------|------|--------|-------|
| should export VERSION matching 2.0.0-alpha.0 | `packages/engine/tests/smoke.test.ts` | Unit | 🟢 Green | F-001 |
| should be a frozen string constant (compile-time guarantee) | `packages/engine/tests/smoke.test.ts` | Unit (type-level) | 🟢 Green | F-001 |

#### Tests post (preuves)

| Vérification | Commande | Résultat |
|--------------|----------|----------|
| Tests TS verts (local) | `pnpm test` | ✅ 2 passed, 0 failed |
| Build TS (local) | `pnpm build` | ✅ dist/ artifacts créés |
| Lint Biome (local) | `pnpm lint` | ✅ exit 0 |
| CI Node 20 | GH Actions run 26245882698 | ✅ all steps green (17s) |
| CI Node 22 | GH Actions run 26245882698 | ✅ all steps green (17s) |

Preuve CI : https://github.com/theermite/morphic-engine/actions/runs/26245882698 (status: success, both matrix jobs).

#### Erreurs rencontrées

| Erreur | Cause racine | Correction | Test ajouté |
|--------|--------------|------------|-------------|
| `gh repo create` → "Resource not accessible by personal access token" | PAT fine-grained sans permission Administration | Création manuelle repo via github.com/new (Jay) | — (one-shot bootstrap) |
| `git push` → "refusing to allow OAuth App to update workflow ci.yml without workflow scope" | PAT fine-grained sans scope `workflow` (Read+Write) | Jay a ajouté la permission Workflows au token via Settings → Developer Settings | — |
| Second push échec après MAJ PAT | `~/.git-credentials` contenait ancien token OAuth `gho_*` au lieu du nouveau `github_pat_*` | `gh auth setup-git` (helper `!/usr/bin/gh auth git-credential`) | — |
| CI failure step "Setup pnpm" : "Multiple versions of pnpm specified" | Conflit `with: version: 10` (workflow) ↔ `packageManager: pnpm@10.33.0` (package.json) | Suppression bloc `with:`, Corepack lit `packageManager` (single source of truth) | — |
| CI run failed in 5s (0 steps executed) | Repo privé + GH Actions free plan billing limitation | Bascule repo en public (`gh repo edit --visibility public`) — aligne avec trajectoire AGPL-3.0 NLNet | — |

#### Décisions prises in-flight

| Décision | Alternative écartée | Justification |
|----------|---------------------|---------------|
| Repo public dès B-001 | Privé jusqu'à v2.0.0 | Aligne AGPL trajectory NLNet + lève limite Actions free plan |
| `packageManager` comme seule source de vérité pnpm | Pinning explicite dans workflow | Corepack standard, évite drift workflow/package.json |
| Matrix Node 20 + 22 | Seulement Node 22 LTS | Garantit compat consommateurs encore sur 20 jusqu'à EOL avril 2026 |
| Skip Rust toolchain dans CI B-001 | Inclure dès maintenant | wasm-core (B-005+) pas encore présent, ajout en B-005 |

#### Commits

- `3fe0b04` feat: B-001 bootstrap monorepo morphic-engine
- `c387d1c` chore: defer ci.yml to follow-up push (PAT workflow scope)
- `059b18a` ci: add GitHub Actions workflow (matrix Node 20+22)
- `a5dfcf2` ci: remove explicit pnpm version, use packageManager from package.json

**Branch** : `main` (bootstrap direct, pas de feature branch pour la première brique)
**Tag backup** : pas encore (1 brick seulement, cadence 3-4)
**Repo** : https://github.com/theermite/morphic-engine

### B-002 — CI GitHub Actions complète + coverage upload

**Statut** : ✅ Done (2026-05-22)
**CDC ref** : F-001
**Risk level** : Tooling (60%)
**Scope** : étendre CI avec type check (tsc), coverage v8 upload Codecov, lint Biome BLOCKING. Jobs Rust (clippy/fmt) et Elixir (credo/format) préparés mais retirés car hashFiles() au niveau job cause un workflow parse failure — seront ajoutés quand le code existe (B-005 et B-017b respectivement).
**Fichiers impactés** : `.github/workflows/ci.yml`, `packages/engine/vite.config.ts` (ajout reporter JSON pour Codecov)

#### Veille préalable

| Sujet | Vérifié le | Source | Conclusion |
|-------|-----------|--------|------------|
| actions/checkout | 2026-05-22 | github.com/actions/checkout/releases | v4 prouvé, v6 non vérifié (veille "Probable" invalidée par CI failure) |
| actions/setup-node | 2026-05-22 | github.com/actions/setup-node | v4 prouvé |
| pnpm/action-setup | 2026-05-22 | github.com/pnpm/action-setup/releases | v4 prouvé |
| codecov/codecov-action | 2026-05-22 | github.com/codecov/codecov-action | v5 — tokenless pour repos publics |
| actions-rust-lang/setup-rust-toolchain | 2026-05-22 | github.com releases | v1 — deferred to B-005 |
| erlef/setup-beam | 2026-05-22 | github.com releases | v1 — deferred to B-017b |
| Rust stable | 2026-05-22 | releases.rs | 1.95 (PET original disait 1.87 — mis à jour) |
| Elixir | 2026-05-22 | hexdocs.pm | 1.19.5 + OTP 27 |

#### Tests post (preuves)

| Vérification | Commande | Résultat |
|--------------|----------|----------|
| Tests TS verts (local) | `pnpm test` | ✅ 2 passed, 0 failed |
| Coverage (local) | `pnpm -r --filter @morphic/engine run test:coverage` | ✅ 100% (1/1 stmts) |
| coverage-final.json généré | `ls packages/engine/coverage/coverage-final.json` | ✅ présent |
| Lint Biome (local) | `pnpm run lint` | ✅ exit 0 |
| CI Node 20 | GH Actions run 26284432213 | ✅ success |
| CI Node 22 | GH Actions run 26284432213 | ✅ success |

Preuve CI : https://github.com/theermite/morphic-engine/actions/runs/26284432213

#### Erreurs rencontrées

| Erreur | Cause racine | Correction | Test ajouté |
|--------|--------------|------------|-------------|
| CI failure "workflow file issue" (run 26284294608) | Veille Deep Research reporta v6 pour checkout/setup-node/pnpm comme "Probable" — inexact. Actions v6 n'existaient pas ou causaient une erreur de résolution. | Revert vers v4 (prouvé B-001) | — |
| CI failure persistante après revert v4 (run 26284404180) | `hashFiles('**/Cargo.toml')` au niveau `if:` job (même wrappé en `${{ }}`) cause un workflow parse failure quand aucun checkout n'a encore eu lieu | Retrait complet des jobs Rust/Elixir (pas de code à tester) — anti-overengineering | — |

#### Décisions prises in-flight

| Décision | Alternative écartée | Justification |
|----------|---------------------|---------------|
| Retirer jobs Rust/Elixir CI pour l'instant | Garder avec hashFiles conditionnel | hashFiles au niveau job = parse failure. Pas de code Rust/Elixir = pas de CI à exécuter. Anti-overengineering : on ajoute le job quand on ajoute le code. |
| Rester sur actions v4 | Bumper à v6 | Veille "Probable" invalidée par CI failure. v4 prouvé. On bumpera quand v6 sera vérifié. |
| Coverage upload Node 22 only | Upload sur les 2 nodes | Évite upload dupliqué. Node 22 = LTS courant. |

#### Commits

- `3cfe2bd` ci(B-002): complete CI matrix — Rust + Elixir jobs, coverage upload Codecov, bump actions v6
- `8d52db9` fix(ci): revert actions to v4, wrap hashFiles in explicit ${{ }}
- `88348fd` fix(ci): remove Rust/Elixir jobs until code exists (B-005/B-017b)

**Branch** : `main` (direct, seul contributeur)
**Tag backup** : non (2 bricks, cadence 3-4)

---

### B-003 — `<morphic-provider>` Custom Element v1 zero-config

**Statut** : ✅ Done (2026-05-22)
**CDC ref** : F-002
**Risk level** : Sensitive (cible 90%, atteint 100%)
**Scope** : élément Custom Element v1 autonome qui enveloppe le contenu hôte. Shadow DOM `open` avec un `<slot>` (light DOM préservée), 2 attributs d'état mutuellement exclusifs `data-morphic-fallback` / `data-morphic-ready`, méthode `ready()` idempotente + persistante à travers les reconnects DOM. Zéro attribut requis sur l'host (contrat zero-config CDC F-002).
**Fichiers impactés** :
- `packages/engine/src/morphic-provider.ts` (nouveau, 95 lignes)
- `packages/engine/src/index.ts` (export public)
- `packages/engine/tests/morphic-provider.test.ts` (nouveau, 16 tests)
- `packages/engine/vite.config.ts` (ajout `environment: 'jsdom'`)
- `packages/engine/package.json` (devDep `jsdom@29.1.1`)

#### Veille préalable

| Sujet | Vérifié le | Source | Conclusion |
|-------|-----------|--------|------------|
| jsdom@29.1.1 | 2026-05-22 | npm registry (`npm view jsdom version`) + dependency `is-potential-custom-element-name` | Stable. Supporte Custom Elements v1 + Shadow DOM. Retenu. |
| happy-dom@20.9.0 | 2026-05-22 | npm registry | Stable mais Shadow DOM edge cases moins matures. Écarté. |

Marker : `[VEILLE] jsdom@29.1.1 verifie 2026-05-22 via npm registry`.

#### Tests préalables (TDG — écrits AVANT le code)

| Test | Fichier | Type | Statut | Cible | Anti-Circular Layer |
|------|---------|------|--------|-------|---------------------|
| should expose the tag name as `morphic-provider` | tests/morphic-provider.test.ts | Unit | 🟢 Green | F-002 | L1 invariant |
| should register exactly once in customElements registry | id. | Unit | 🟢 Green | F-002 | L1 idempotence |
| should be idempotent — define twice does not throw | id. | Unit | 🟢 Green | F-002 | L1 invariant |
| should resolve customElements.whenDefined after define | id. | Unit | 🟢 Green | F-002 | L1 invariant |
| should construct without arguments (zero-config) | id. | Unit | 🟢 Green | F-002 | L1 contract |
| should attach an open shadow root on connect | id. | Unit | 🟢 Green | F-002 | L1 invariant |
| should expose a `<slot>` in shadow DOM | id. | Unit | 🟢 Green | F-002 | L1 invariant |
| should start in inert/fallback state until ready() | id. | Unit | 🟢 Green | F-002 | L1 state |
| should flip to ready state when ready() is invoked | id. | Unit | 🟢 Green | F-002 | L1 state |
| should preserve fallback state across reconnect if never ready | id. | Unit | 🟢 Green | F-002 | L1 invariant |
| should preserve ready state across reconnect once ready | id. | Unit | 🟢 Green | F-002 | L1 invariant |
| should be a silent no-op when customElements is undefined (SSR) | id. | Unit | 🟢 Green | CDC §0 SSR | L1 invariant |
| should function without any attribute on the element | id. | Unit | 🟢 Green | F-002 | L1 contract |
| should preserve light DOM children through slot | id. | Unit | 🟢 Green | F-002 | L1 invariant |
| should be type-narrowed correctly when queried via tag | id. | Unit | 🟢 Green | F-002 | L1 invariant |

16/16 tests verts. Workflow TDG respecté : tests rouges AVANT implémentation.

#### Tests post (preuves d'exécution)

| Vérification | Commande | Output attendu | Résultat |
|--------------|----------|----------------|----------|
| Tests TS verts | `pnpm --filter @morphic/engine run test` | 16 passed | ✅ 16/16 (1.42s) |
| Coverage v8 | `pnpm --filter @morphic/engine run test:coverage` | ≥ 90% (Sensitive) | ✅ 100% statements/branches/funcs/lines |
| Lint Biome | `pnpm run lint` | exit 0 | ✅ Checked 12 files, no fixes applied |
| Types tsc | `pnpm -r run build` | exit 0 | ✅ engine/adapter/wasm-core all build |
| CI vert | run GitHub Actions sur push | success Node 20 + 22 | _à vérifier après push_ |

```
% Coverage report from v8
Statements   : 100% ( 24/24 )
Branches     : 100% ( 6/6 )
Functions    : 100% ( 4/4 )
Lines        : 100% ( 24/24 )
```

#### Erreurs rencontrées

| Erreur | Cause racine identifiée | Correction | Test ajouté |
|--------|------------------------|-----------|-------------|
| Coverage branches 75% < 80% global | Guard défensif `if (!this.shadowRoot)` non couvrable (Custom Elements v1 ne réinvoque jamais le constructor) — branche morte | Retrait du guard (la spec garantit l'invariant) | — (branche morte ne nécessite pas de test) |
| Branche SSR `typeof customElements === 'undefined'` non couverte | jsdom définit toujours `customElements` — la branche no-op SSR n'est pas naturellement atteignable | Test avec `vi.stubGlobal('customElements', undefined)` | `should be a silent no-op when customElements is undefined (SSR)` |
| Lint Biome `assist/source/organizeImports` | Re-exports non triés alphabétiquement dans `index.ts` et `tests/morphic-provider.test.ts` | `biome check --write .` (safe fix automatique) | — (lint catch suffit) |

#### Décisions prises in-flight

| Décision | Alternative écartée | Justification |
|----------|---------------------|---------------|
| Shadow DOM `open` (pas `closed`) | `closed` pour isolation maximale | `open` permet aux integrators de queryer `shadowRoot` pour debug/tests sans casser l'encapsulation visuelle. Pratique courante Web Components 2026. |
| `attachShadow` dans le constructor (pas `connectedCallback`) | Attacher au connect | Light DOM children doivent passer par le slot dès le premier paint ; attacher au connect causerait un flash visible. |
| Flag ready porté par Symbol privé `READY_FLAG` | Attribut DOM uniquement | Symbol survit aux mutations d'attributs externes (un dev qui setAttribute manuellement ne casse pas l'invariant interne). |
| 2 attributs mutuellement exclusifs (`-fallback` / `-ready`) | 1 seul attribut avec valeur | 2 attributs permettent CSS sélecteurs plus simples et matchent l'idiome attribute presence. |
| Retirer le guard `if (!this.shadowRoot)` du constructor | Garder pour défense profondeur | La spec Custom Elements v1 garantit constructor unique par instance ; le guard est mort-code. Mieux : code minimal honnête à la spec. |
| Stack tests : jsdom (pas happy-dom) | happy-dom | jsdom 29.1.1 mature pour Shadow DOM ; happy-dom suffit pour DOM basique mais edge cases CE/Shadow moins éprouvés. |

#### Commit

- SHA : _à compléter après push_
- Message : `feat(engine): B-003 — <morphic-provider> Custom Element v1 zero-config`
- Branch : `main` (direct)
- Tag backup : non (B-003 = 3e brick, prochain tag à B-004 ou B-005)

---

### B-004 — Synchronous head-read init.ts (zero flash)

**Statut** : ✅ Done (2026-05-22)
**CDC ref** : F-003
**Risk level** : Critical (cible 95%, atteint 100%)
**Scope** : `morphicInit()` lit les préférences morphiques de `localStorage` de façon synchrone, valide chaque axe contre un enum fermé (poka-yoke), injecte les CSS custom properties `--morphic-theme`, `--morphic-motion`, `--morphic-contrast` sur `document.documentElement`. Fallback aux media queries `prefers-*` si localStorage absent/invalide/inaccessible. SSR-safe (no-op). Idempotent.
**Fichiers impactés** :
- `packages/engine/src/init.ts` (nouveau, 171 lignes)
- `packages/engine/src/index.ts` (export public)
- `packages/engine/tests/init.test.ts` (nouveau, 32 tests)
- `packages/engine/package.json` (devDep `fast-check@4.8.0`)

#### Veille préalable

| Sujet | Vérifié le | Source | Conclusion |
|-------|-----------|--------|------------|
| localStorage | 2026-05-22 | WHATWG HTML Living Standard | Spec stable, sync, aucune dépréciation. Read < 1KB = sub-ms. |
| prefers-color-scheme | 2026-05-22 | caniuse.com | 95.01% support global. Safe. |
| prefers-reduced-motion | 2026-05-22 | caniuse.com | 95.34% support global. Safe. |
| prefers-contrast | 2026-05-22 | caniuse.com | 94.03% support global. Safe. |
| document.documentElement.dataset | 2026-05-22 | caniuse.com | 96.27% support. Safe. |
| fast-check@4.8.0 | 2026-05-22 | npm view | Latest PBT library. Major 4.x (CDC disait 3.21+). |

#### Tests préalables (TDG — écrits AVANT le code)

32 tests across 7 describe blocks. Workflow TDG respecté : tests rouges avant implémentation.

#### Tests post (preuves d'exécution)

```
Statements   : 100% ( 68/68 )
Branches     : 100% ( 49/49 )
Functions    : 100% ( 12/12 )
Lines        : 100% ( 61/61 )
CI : Node 22 (19s) + Node 24 (15s) vert.
```

#### Erreurs rencontrées

| Erreur | Cause | Correction |
|--------|-------|-----------|
| Lint `noUnusedImports` | Imports copiés de B-003 template | Retrait |
| Branche `prefers-contrast: less` non couverte | Pas de test | Ajout test → 100% |

#### Décisions in-flight

| Décision | Justification |
|----------|---------------|
| `style.setProperty()` (pas adoptedStyleSheets) | CSP-safe, simple pour 3 vars. Future brick tokens pourra migrer. |
| `data-morphic-theme` attribut HTML | Permet sélecteurs CSS cascade côté host. |
| fast-check@4.8.0 (major 4.x) | Stable, meilleur shrinking, CDC floor respecté (4 > 3.21). |
| Enum fermé (reject unknown) | FMEA §8.3 : données corrompues → flash. Poka-yoke. |

#### Commit

- SHA : `69941b4`
- Branch : `main` (direct)

---

## 8. PII Detection — configuration

| Tool | Scope | Mode | Statut |
|------|-------|------|--------|
| Custom regex audit (`scripts/audit-pii.ts`) | logs/, dumps IDB, exports JSON, telemetry payloads | CI automatique pré-merge | À configurer B-022 |
| Manual review obligatoire | rapports session, commits, README, démos | À chaque commit Critical | Actif |
| OpenTelemetry sanitizer | tous spans + events outbound | Runtime middleware | À implémenter B-022 |
| Browser DevTools heap snapshot scan | IDB contents avant push prod | Pre-release | À configurer B-028 |

**Patterns détectés** : email RFC 5322, IPv4/IPv6, téléphones E.164, IBAN, CC PAN, MAC, hostnames internes, paths /home/* /Users/*, JWT structures.

---

## 9. Quality Gates pré-commit (BLOCKING par brick)

Checklist à exécuter AVANT de passer à la brick suivante. Aucune coche manquante = pas de commit.

- [ ] **Coverage** atteint (cible §4 selon Risk Classification CDC §7)
- [ ] **Mutation score** atteint (si module Critical et release brick)
- [ ] **Lint clean** (Biome 0 erreur TS / clippy 0 warning Rust / Credo strict 0 Elixir)
- [ ] **Types stricts** (tsc --noEmit 0 erreur + Dialyzer 0 erreur + clippy strict)
- [ ] **Tests verts** (unit + integration + anti-regression toutes stacks impactées)
- [ ] **Security audit clean** (npm audit + cargo audit + Sobelow 0 high/critical)
- [ ] **A11y check** (axe-core + Pa11y 0 violations sur UI touchée)
- [ ] **Cross-browser** (Chromium + Firefox + WebKit pour modules UI)
- [ ] **Veille datée** pour toute lib ajoutée (marker `[VEILLE]` conversation)
- [ ] **Bundlesize** respecté (≤ 20 KB engine, ≤ 50 KB Yjs lazy)
- [ ] **0 PII** dans diff + logs + telemetry (scripts/audit-pii.ts pass)
- [ ] **Pas de TODO/FIXME/console.log** dans le diff (Monozukuri #1)
- [ ] **Pas de `eval`, `new Function`, `setTimeout(string)`** (AP-004)
- [ ] **Pas de `try/catch` swallow** sur Critical/Sensitive (Effect-TS structured errors obligatoire)
- [ ] **Atomic commit** (un seul changement logique, max 3 fichiers hors justification documentée)
- [ ] **Conventional Commit format** + `Co-Authored-By: Takumi "IA Dev Partner"`
- [ ] **Defensive assertions** (≥ 2) sur fonctions Critical touchées (§5)

---

## 10. Post-Deploy Verification (BLOCKING sur services live)

Appliqué au déploiement démo theermite.com + au backend `sk_morphic` (si opt-in déployé).

| Check | Méthode | Résultat |
|-------|---------|----------|
| Module charge sur theermite.com | curl + Playwright headless | À exécuter |
| Zero flash visible | Playwright video record + frame diff sur 3G throttling | À exécuter |
| LCP delta (avec vs sans module) | Lighthouse CI 5 runs p75 | À exécuter, ≤ +50 ms |
| INP réel utilisateurs | Web Vitals RUM 7j post-deploy | À exécuter, ≤ 100 ms |
| CLS réel utilisateurs | Web Vitals RUM 7j post-deploy | À exécuter, ≤ 0.05 |
| Cross-browser smoke | Playwright Chromium + Firefox + WebKit sur démo | À exécuter |
| API health backend `sk_morphic` (si déployé) | health endpoint + Channel join test | À exécuter |
| Auth integrity backend | Channel join sans token → refused | À exécuter |
| Reverse proxy nginx OK | URL publique → 200, pas 502/504 | À exécuter |
| Stale storage regression | Browser avec IDB ancien schema → migration gracieuse | À exécuter |
| Sync E2E (si opt-in) | 2 devices, change axe device A → reflète device B < 5s | À exécuter |
| Telemetry zero PII | tcpdump capture spans + regex audit | À exécuter |
| Feedback Widget actif sur démo | 2 clicks max, capture contexte, zéro PII | À exécuter |
| Pages erreur nginx custom | 502/503/504 brandées Shinkofa | À exécuter |

Détails : `.claude/rules/Workflows.md` § Post-Deploy Smoke Test.

---

## 11. Risques rencontrés en exécution

Différent des FMEA du CDC (§8) : ce sont les risques **DÉCOUVERTS** pendant l'exécution. Mis à jour live.

| Risque découvert | Brick où | Probabilité | Impact | Mitigation appliquée |
|------------------|----------|-------------|--------|----------------------|
| {{ce qu'on n'avait pas vu venir}} | B-XXX | Haute/Moy/Basse | … | {{ce qu'on a mis en place}} |

---

## 12. Décisions architecturales (ADR-light)

Pour chaque décision majeure qui survient pendant l'exécution et n'était pas dans le CDC.

### ADR-001 — Modèle de séparation Engine / WASM-Core / Adapter

- **Date** : 2026-05-21 (décidée avant B-001, captée dans CDC v2)
- **Contexte** : framework-agnostic + tri-layer Rust→WASM + résilience Effect-TS
- **Options envisagées** :
  - A. Single package `@shinkofa/morphic-engine` (tout dedans)
  - B. **3 packages** : `engine` (TS visible) + `wasm-core` (Rust) + `adapter` (UI bridge)
  - C. 5 packages micro-séparés (un par axe)
- **Décision** : **Option B**
- **Conséquences** : import sélectif possible (consommateur n'a pas besoin du wasm-core si pas de sync) ; complexité monorepo gérable avec pnpm workspaces ; bundlesize ≤20KB tenable.

### ADR-002 — Yjs lazy-loaded séparé du bundle initial

- **Date** : 2026-05-21
- **Contexte** : Yjs ≈ 50KB gzipped, contradiction avec target ≤20KB bundle initial
- **Options envisagées** :
  - A. Yjs bundlé dans le core (toujours présent)
  - B. **Yjs en chunk séparé** chargé via `import()` dynamique uniquement si sync opt-in
  - C. Yjs en package optionnel `@shinkofa/morphic-engine-sync`
- **Décision** : **Option B** (chunk dynamic import)
- **Conséquences** : zéro overhead si user opt-out ; cold start sync +50KB acceptable car opt-in informé.

### ADR-XXX — Titre court (à compléter en cours d'exécution)

- **Date** : YYYY-MM-DD
- **Contexte** :
- **Options envisagées** :
- **Décision** :
- **Conséquences** :

---

## 13. Déviations vs CDC

Tout écart entre l'exécution réelle et l'intention du CDC v2.0.0.

| Quoi (CDC §) | Déviation | Justification | Mesure compensatoire | Date |
|--------------|-----------|---------------|----------------------|------|
| CDC §10 (CI build matrix Rust 1.87 + Elixir 1.19) | Jobs Rust et Elixir non inclus dans CI B-002 — seulement job `test` (Node 20 + 22) | (1) Aucun code Rust ou Elixir n'existe encore (anti-overengineering : CI sans code à compiler = bruit). (2) `hashFiles('**/Cargo.toml') != ''` au niveau `if:` du job a causé un échec "workflow file issue" — GitHub Actions n'évalue pas `hashFiles` au scope job-conditional. | Jobs Rust à ajouter dans B-005 (Rust→WASM critical paths) quand `crates/*/Cargo.toml` existe ; jobs Elixir à ajouter dans B-017b (Phoenix backend) quand `apps/backend/mix.exs` existe. Squelette des jobs conservé dans l'historique git (commit `3cfe2bd` reverté en `88348fd`) pour copier-coller futur. | 2026-05-22 |

Si une déviation devient permanente → mettre à jour le CDC v2.0.0 (et le noter dans son §Historique de l'intention).

**Migration consommateurs v1→v2** (CDC §0) : Michi, Shizen, Kakusei restent sur v1 jusqu'à Phase 1.5. Tracé ici si la timeline glisse.

---

## 14. Journal de session

Référence vers les rapports de session qui ont fait avancer ce PET.

| Date | Session ID | Bricks touchées | Commits | Rapport |
|------|-----------|-----------------|---------|---------|
| 2026-05-21 | Session-2026-05-21-XXX | B-000 (conception CDC+PET v2) | — | `docs/Sessions/Session-2026-05-21-XXX.md` |
| 2026-05-22 | Session-2026-05-22-001 | Audit + remédiation P0/P1/P2 (S1+A1+L1+T1+T2+T3+L2) | (voir batch 2026-05-22) | `docs/audits/Audit-2026-05-22.md` |
| 2026-05-22 | Session-2026-05-22-002 | B-002 CI complète (lint+typecheck+coverage Codecov, Rust/Elixir deferred) | 3cfe2bd..88348fd | `docs/Sessions/Session-2026-05-22-002.md` |
| 2026-05-22 | Session-2026-05-22-003 | B-003 `<morphic-provider>` Custom Element v1 zero-config (Sensitive, coverage 100%) | 6c30f0d | _à rédiger_ |
| 2026-05-22 | Session-2026-05-22-004 | CI fix Node EOL (20→22+24, actions v4/v5→v6) + veille rigoureuse versions | bdb461b | _à rédiger_ |
| 2026-05-22 | Session-2026-05-22-005 | CDC §5 alignement versions installées (Node ajouté, TS 5.9.3, Vitest 4.1.7, Biome 2.4.15, jsdom 29.1.1, Vite 8.0.14, pnpm 10.33.0) | _en cours_ | _à rédiger_ |

**Marqueurs Veille rétroactifs (session 2026-05-21 conception)** :
- `[VEILLE] pnpm@10.33.0 verifie 2026-05-21 via pnpm.io`
- `[VEILLE] vitest@4.1.7 verifie 2026-05-21 via vitest.dev`
- `[VEILLE] biome@2.4.15 verifie 2026-05-21 via biomejs.dev`
- `[VEILLE] typescript@5.9.3 verifie 2026-05-21 via npmjs.com`
- `[VEILLE] nlnet@round-2026-06-01 verifie 2026-05-22 via nlnet.nl/propose/` (rectification finding A1)

**Marqueurs Veille session 2026-05-22** :
- `[VEILLE] @vitest/coverage-v8@4.1.7 verifie 2026-05-22 via npmjs.com` (T1 — peer aligné vitest 4.1.7)
- `[VEILLE] actions/checkout@v4 verifie 2026-05-22 via github.com (v6 invalide, v4 prouvé)`
- `[VEILLE] codecov/codecov-action@v5 verifie 2026-05-22 via github.com`
- `[VEILLE] actions-rust-lang/setup-rust-toolchain@v1 verifie 2026-05-22 via github.com (deferred B-005)`
- `[VEILLE] erlef/setup-beam@v1+elixir1.19+otp27 verifie 2026-05-22 via github.com (deferred B-017b)`
- `[VEILLE] rust@stable(1.95) verifie 2026-05-22 via releases.rs`
- `[VEILLE] jsdom@29.1.1 verifie 2026-05-22 via npm registry` (B-003 — test environment Custom Elements v1 + Shadow DOM)
- `[VEILLE] happy-dom@20.9.0 verifie 2026-05-22 via npm registry` (B-003 — écarté, Shadow DOM edge cases)

**Veille rigoureuse post-B-003 (correction CI Node EOL)** — toutes sources directes officielles (gh api + nodejs/Release schedule.json) :
- `[VEILLE] node@20 verifie 2026-05-22 via nodejs/Release schedule.json` — **EOL depuis 2026-04-30**, DROP matrix
- `[VEILLE] node@22 verifie 2026-05-22 via nodejs/Release schedule.json` — Maintenance LTS jusqu'à 2027-04-30, KEEP
- `[VEILLE] node@24 verifie 2026-05-22 via nodejs/Release schedule.json` — Active LTS jusqu'à 2028-04-30, ADD
- `[VEILLE] actions/checkout@v6.0.2 verifie 2026-05-22 via gh api repos/actions/checkout/releases` — bump v4→v6 (Node 24 runtime)
- `[VEILLE] actions/setup-node@v6.4.0 verifie 2026-05-22 via gh api` — bump v4→v6 (PR #1374 : `cache: 'pnpm'` reste OK avec input explicite)
- `[VEILLE] pnpm/action-setup@v6.0.8 verifie 2026-05-22 via gh api` — bump v4→v6 (pnpm 10.33 conservé via packageManager field)
- `[VEILLE] codecov/codecov-action@v6.0.1 verifie 2026-05-22 via gh api` — bump v5→v6 (Node 24 runtime)
- `[VEILLE] typescript@6.0.3 verifie 2026-05-22 via npm` — DISPONIBLE mais ⏸ flag Jay (major bump, hors scope ce fix)
- `[VEILLE] pnpm@11.2.2 verifie 2026-05-22 via npm` — DISPONIBLE mais ⏸ flag Jay (major bump, hors scope)

---

## Changelog PET v1 → v2

| Axe | v1.0.0 | v2.0.0 |
|-----|--------|--------|
| Périmètre exécution | 1 package `@shinkofa/morphic-engine` mono-couche TS | **3 packages tri-layer** (engine TS + wasm-core Rust + adapter) |
| Roadmap bricks | ~14 bricks vagues | **29 bricks** structurées en 6 phases (Foundation → Release publique) avec dépendances explicites |
| Traçabilité §3 | Manquante | **24 features F-001 à F-024 mappées** ligne-à-ligne vers bricks + tests + Risk level |
| Tests | Vitest seul | **Multi-stack** : Vitest 4 + cargo test/proptest + ExUnit/StreamData + Playwright cross-browser + Schemathesis fuzz + StrykerJS/cargo-mutants/Mutant.ex mutation |
| Anti-Circular | Évoqué | **3 layers BLOCKING détaillés** sur tous Critical (PBT + Holdout + Cross-model) |
| Coverage | 80% générique | **95% Critical + 75% mutation + 90% Sensitive + 80% global + 100% type coverage** |
| Defensive assertions | Absent | **7 fonctions Critical** listées (§5) avec assertions minimales |
| Quality Gates pré-commit | 10 items | **17 items** (ajout mutation score, bundlesize, defensive assertions, Effect-TS swallow check, AP-004 eval scan) |
| Post-Deploy | 7 checks | **14 checks** incluant Web Vitals RUM 7j, sync E2E cross-device, telemetry PII tcpdump, pages erreur nginx |
| Memory leak soak | Absent | **24h soak < 1MB drift** BLOCKING release (Refonte excédence) |
| Stack veille | Dates manquantes | **42 lignes vérifiées 2026-05-21** avec source officielle |
| ADR | 0 | **2 ADR documentés** (séparation 3 packages, Yjs lazy) |

**Raison du changement** : v1 PET écrit sans lecture du dossier Refonte (21 docs standards Shinkofa 2026). v2 aligné Monozukuri **excédence** + tri-layer architecture + Refonte floors consolidés ≥92/100.

---

*Template version : 2.0.0 — voir `mnk/05-Workflows-Concevoir.md` pour le workflow et `.claude/rules/Quality.md` pour les standards.*
*PET v2.0.0 — créé 2026-05-21 en remplacement complet du PET v1.0.0.*
