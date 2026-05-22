# Cahier des Charges — Module d'Adaptation Morphique Shinkofa v2.0.0

> **Ce que ce document est** : l'**intention** — le module morphique drop-in universel, framework-agnostic, qui remplace `@shinkofa/morphic-engine` v1.0.0. Replacement complet, pas itération.
> **Ce que ce document n'est PAS** : un journal d'exécution. Pour la progression, les erreurs, les preuves, voir `docs/PET.md`.
> **Règle de mise à jour** : on modifie le CDC uniquement quand l'**intention change**. La progression vit dans le PET.

**Version** : 2.0.0 | **Date création** : 2026-05-21 | **Dernière MAJ** : 2026-05-21 | **Statut** : Active (v2 — alignée Refonte + Monozukuri excédence)
**Cross-ref** : `docs/PET.md` (exécution) · `docs/Conception-Morphique/Veille-Competiteurs-2026-05-21.md` · `docs/Refonte/*` (21 docs standards Shinkofa 2026)
**Standard qualité** : Monozukuri **excédence** (pas "moyenne haute"). Floor consolidé Refonte : ≥92/100 toutes dimensions.

---

## 0. Pourquoi v2.0.0 (rupture vs v1)

| Axe | v1.0.0 (`@shinkofa/morphic-engine` packages/morphic-engine) | v2.0.0 |
|-----|---------|--------|
| Périmètre | Couplé React/Next.js, MorphicProfile + MorphicPreferences + MorphicAdaptation typés, dépend `@shinkofa/types` | **Framework-agnostic** (Web Components + vanilla core), runtime injectable dans n'importe quel hôte |
| Architecture | Mono-couche TypeScript | **Tri-layer client** : TS visible + Rust→WASM critique + Effect-TS résilience + Web Workers isolation + Phoenix backend |
| Persistence | Aucune (objets en mémoire) | **CRDT Yjs lazy-loaded** + IndexedDB local-first + sync opt-in chiffré E2E |
| Adaptation | Statique (générée par profil) | **13 axes morphiques** + 3-tier surfacing (4 onboarding sensoriel-first + 4 optionnels + 5 auto-derivés) |
| Standards | Quality.md baseline | **Refonte 2026 floors** + Dignity §a sensoriel-first + Anti-overlay (FTC AccessiBe 2025) |
| Open source | Privé monorepo | **AGPL-3.0** + NLNet NGI0 (deadline 2026-06-01) |
| Démo | Aucune | **The Ermite** (theermite.com) vitrine + case study citable IA |

Le module v1 est **archivé** au moment du switch v2 (pas migré in-place — risque de drift). Les consommateurs internes (Michi, Shizen, Kakusei) migrent dans une phase ultérieure tracée au PET §13.

---

## 1. POUR QUOI — Les 3 Layers

### L3 — Vision (la destination Shinkofa)

Le module morphique est l'**incarnation technique** de la promesse Shinkofa : *« Le monde te demande de t'adapter à lui. Shinkofa inverse la logique. »* Il déplace l'adaptation **du site host vers le profil utilisateur** — le user porte ses préférences, le site les respecte. C'est l'anti-overlay (cf. FTC vs AccessiBe 2024, 1M$ amende, 1023 sites poursuivis 2024) : pas de réparation cosmétique externe, mais expression d'un profil porté par la personne.

**Dignité protégée** : 100% des dimensions sensorielles + cognitives + énergétiques contrôlées par l'utilisateur, jamais inférées en silence. Onboarding sensoriel **avant** identité (Dignity.md §a L'ACCUEIL). Toute donnée morphique reste locale par défaut ; sync = opt-in informé.

**Individualité respectée** : 13 axes morphiques modulables individuellement (pas un preset « ND mode » qui catégorise). Universel d'abord, ND optimisé naturellement parce que les défauts respectent déjà les budgets sensoriels/cognitifs les plus stricts.

### L2 — Focus (le path visibilité/revenu)

Le module est le **levier magnétique** de l'écosystème Shinkofa en 2026 :

1. **AGPL-3.0 + NLNet** (deadline soumission 2026-06-01) → financement Commons + crédibilité auprès de la NGI Initiative + reconnaissance W3C WAI-Adapt alignment.
2. **Démo theermite.com** → vitrine vivante (le blog Jay l'utilise sur lui-même = preuve par dogfooding, pas marketing).
3. **NPM `@shinkofa/morphic-engine`** → distribution naturelle (Dev.to/Hashnode/GitHub topics : `morphic`, `neurodiversity`, `ux-adaptation`).
4. **Citabilité IA** (Perplexity, AI Overviews, Claude-with-web) sur la requête « how to adapt UI for neurodiversity morphically » → JSON-LD `SoftwareApplication` + pillar article The Ermite.
5. **GPII Preferences Framework interop** (Morphic.org GPII registry) → reconnaissance accessibility standards body.

Aucun outreach push. Aucun dark pattern. Le projet attire ceux qu'il doit attirer (Projector logic).

### L1 — Action (la prochaine étape concrète)

Brick B-001 : scaffolding monorepo `@shinkofa/morphic-*` (3 packages : `engine`, `wasm-core`, `adapter`) + Vite + Vitest config conforme `rules/Quality.md` Test Runtime Hygiene (forks pool, maxForks 2, NODE_OPTIONS=2048). Pas une ligne de code applicatif avant que le scaffolding compile et que les tests vides passent en CI.

---

## 2. Utilisateurs cibles

| Persona | Description | Besoin principal | Neurotype | Énergie typique |
|---------|-------------|------------------|-----------|-----------------|
| **Jay (dogfood — primaire)** | Highly Sensitive, HPI, Splenic Projector, ergonome de son propre quotidien | Module qu'il utilise sur theermite.com et qu'il adapte morphiquement à son énergie variable | HSP + HPI | Variable, souvent basse en fin de journée |
| **Dev intégrateur** | Développeur (FR/EN) qui découvre le module via NPM ou The Ermite | Drop-in en 5 lignes, zero-config, framework-agnostic, no surprise | Variable | N/A |
| **Utilisateur ND public** (sites consommant le module) | TDAH, HPI, autiste, dys, HSP visitant un site Shinkofa | Que le site ne lui impose pas sa propre charge sensorielle | TDAH / Autisme / HSP / Dys | Variable |
| **Évaluateur NLNet** | Fondation publique qui finance les Commons numériques européens | Module aligné GDPR Art. 9, WCAG 2.2 AA, GPII interop, open source réel | Pro | Évaluation rationnelle |
| **Auditeur accessibility (legal context)** | Cabinet à la recherche d'évidence post-AccessiBe FTC settlement | Pas un overlay. Profil porté par l'user, jamais auto-fix du host. | Pro | Pro |

Inclusion : tout site web public, toute persona. Aucune catégorisation au premier contact (cf. Strategic-Context.md, message universel L3).
Exclusion : pas de support IE11, pas de support iOS < 15.4 (browserslist Refonte). Pas d'API serveur pour les sites qui ne veulent pas de backend (le module est complet en local-first).

---

## 3. Features

Liste atomique. Phase 1 = module + démo The Ermite. Phase 2 = browser extension (vision §13 Strategic-Context-Module).

### Phase 1 — Module drop-in + démo theermite.com

| ID | Feature | User story | Priorité | Dépend de |
|----|---------|-----------|----------|-----------|
| F-001 | Scaffolding 3 packages framework-agnostic | En tant qu'intégrateur, j'installe `@shinkofa/morphic-engine` et je l'utilise en 5 lignes | P0 | — |
| F-002 | Web Component `<morphic-provider>` zero-config | En tant qu'hôte, j'enveloppe `<body>` et le module fonctionne sans framework | P0 | F-001 |
| F-003 | Synchronous localStorage read en `<head>` (zero flash) | En tant qu'user, je ne vois jamais un flash entre thème par défaut et mon thème préféré | P0 | F-002 |
| F-004 | Token system W3C DTCG (Design Token Format) | En tant qu'intégrateur, je peux mapper mes tokens existants vers les axes morphiques | P0 | F-001 |
| F-005 | Style Dictionary 5.x build pipeline | En tant qu'intégrateur, je peux générer CSS vars + Tailwind config + JSON depuis une seule source | P0 | F-004 |
| F-006 | Axe sensoriel : thème (light/dark/high-contrast/sepia) | En tant qu'user, je choisis mon thème ; il persiste local + sync opt-in | P0 | F-002 |
| F-007 | Axe sensoriel : motion (full/reduced/none) | En tant qu'user sensible mouvement, je désactive les animations partout | P0 | F-002 |
| F-008 | Axe sensoriel : density (compact/comfortable/spacious) | En tant qu'user, j'ajuste la densité d'info à ma capacité cognitive du moment | P0 | F-002 |
| F-009 | Axe sensoriel : font size + line height | En tant qu'user, j'ajuste la taille au confort de lecture | P0 | F-002 |
| F-010 | Axe cognitif : decision points cap (≤3/écran morphique) | En tant qu'user, je ne fais jamais plus de 3 choix consécutifs dans le module | P0 | F-002 |
| F-011 | Axe cognitif : language complexity (simple/standard/expert) | En tant qu'user, j'ajuste la complexité du copy quand c'est disponible | P1 | F-002 |
| F-012 | Onboarding sensoriel **AVANT** identité | En tant qu'user, mon confort sensoriel passe avant que vous me demandiez qui je suis | P0 | F-006 à F-009 |
| F-013 | Mode récupération 1-clic (Loi 12 Recovery as Architecture) | En tant qu'user en burnout sign, je clique « récupération » et toute la UI se simplifie | P0 | F-007, F-008, F-010 |
| F-014 | Persistence IndexedDB local-first | En tant qu'user, mes préférences persistent offline et entre sessions | P0 | F-006 à F-011 |
| F-015 | CRDT Yjs lazy-loaded (~50KB séparé) | En tant qu'user opt-in sync, j'active la sync cross-device — sinon zéro overhead | P1 | F-014 |
| F-016 | Sync E2E chiffré (NaCl `box`) opt-in | En tant qu'user qui sync, mes préférences sont chiffrées de bout en bout, le serveur ne lit jamais | P1 | F-015 |
| F-017 | Tri-layer Rust→WASM critical (mappers, validators, crypto) | En tant qu'intégrateur, les opérations sensibles sont en Rust sandboxed, pas JS verifié au runtime | P0 | F-001 |
| F-018 | Effect-TS résilience (algebraic effects, structured errors) | En tant que mainteneur, les erreurs sont typées et composables, pas des throws sauvages | P0 | F-001 |
| F-019 | Web Workers process isolation (sync + computation lourdes) | En tant qu'user, le main thread reste libre, l'UI ne freeze jamais sous charge | P0 | F-017 |
| F-020 | Démo theermite.com intégration drop-in | En tant que visiteur theermite.com, je vois le module en action sur le site Jay | P0 | F-001 à F-014 |
| F-021 | Telemetry opt-in OpenTelemetry (zero PII) | En tant qu'intégrateur, j'instrumente l'usage de mon module sans capter d'identité | P1 | F-002 |
| F-022 | API import préférences (depuis WAI-Adapt, GPII Morphic.org) | En tant qu'user GPII existant, j'importe mon profil dans Shinkofa | P2 | F-014 |
| F-023 | Export préférences JSON (GDPR Art. 20 portabilité) | En tant qu'user, j'exporte mes données morphiques en 1 clic | P0 | F-014 |
| F-024 | Delete préférences (GDPR Art. 17 erasure) | En tant qu'user, je supprime tout en 2 clics, sans guilt-trip | P0 | F-014 |

### Phase 2 — Browser extension (vision §13)

| ID | Feature | User story | Priorité | Dépend de |
|----|---------|-----------|----------|-----------|
| F-101 | Manifest V3 cross-browser (Chrome/Firefox/Safari) | En tant qu'user, j'installe une extension qui applique mon profil partout | P1 (Phase 2) | F-001 à F-024 |
| F-102 | CSS injection profil-driven cross-site | En tant qu'user, mes préférences s'appliquent même sur des sites qui n'utilisent pas le module | P1 (Phase 2) | F-101 |
| F-103 | Whitelist/blacklist par domaine | En tant qu'user, je décide où mon profil s'applique | P1 (Phase 2) | F-101 |
| F-104 | Sync profil entre extension + sites Shinkofa | En tant qu'user, mes préférences sont cohérentes extension ↔ The Ermite ↔ Michi | P1 (Phase 2) | F-016 |
| F-105 | Détection conflict CSP host + fallback gracieux | En tant qu'user, si un site a CSP strict, l'extension ne casse rien | P1 (Phase 2) | F-101 |

**Hors scope explicite** (ce qu'on ne fera PAS) → voir §10.

---

## 4. Architecture

### 4.1 Tri-layer client + backend Phoenix opt-in

```
┌────────────────────────────────────────────────────────────────────┐
│  HÔTE (theermite.com, Michi, Shizen, n'importe quel site)          │
│  <head>                                                              │
│    <script src="@shinkofa/morphic-engine/init.js"></script>         │
│  </head>                                                             │
│  <body>                                                              │
│    <morphic-provider>                                                │
│      <!-- l'app de l'hôte -->                                       │
│    </morphic-provider>                                               │
│  </body>                                                             │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — VISIBLE (TypeScript strict + Web Components)            │
│  @shinkofa/morphic-engine                                            │
│  • <morphic-provider> custom element zero-config                    │
│  • Synchronous head-read (zero flash, Dignity §a)                   │
│  • CSS custom properties --morphic-* injection                      │
│  • Token system DTCG W3C + Style Dictionary 5.x                     │
│  • Bundle target ≤20KB gzipped initial                              │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  LAYER 2 — CRITIQUE (Rust 1.87+ → WebAssembly)                     │
│  @shinkofa/morphic-wasm-core                                         │
│  • Validators schemas (préfs entrantes import GPII/WAI-Adapt)       │
│  • Mappers HD/ND → axes morphiques (logique typée fort)             │
│  • Crypto NaCl box (sync E2E)                                       │
│  • Fault-isolated : panic Rust → fallback TS gracieux               │
│  • Memory safe by construction                                      │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  LAYER 3 — RÉSILIENCE (Effect-TS 3.x)                              │
│  @shinkofa/morphic-engine/effects                                    │
│  • Algebraic effects (closest TS à Erlang/BEAM let-it-crash)        │
│  • Structured errors typées, composables                            │
│  • Pas de throw sauvage, pas de Promise.catch oublié                │
│  • Retry/timeout/backoff first-class                                │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  LAYER 4 — ISOLATION (Web Workers)                                  │
│  • CRDT Yjs sync dans Worker (main thread libre)                    │
│  • Crypto opérations dans Worker                                    │
│  • Token rebuild dans Worker                                        │
│  • postMessage avec transferable objects                            │
└────────────────────────────────────────────────────────────────────┘
                              │
                       (opt-in seulement)
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  BACKEND — Phoenix 1.8+ / Elixir 1.19+ (sk_morphic OTP app)        │
│  • Channels WebSocket relai sync (CRDT relay, jamais décrypte)      │
│  • Telemetry opt-in (OpenTelemetry, zero PII)                       │
│  • API import (GPII Morphic.org, WAI-Adapt)                         │
│  • Bandit 1.11+ HTTP server                                         │
│  • Supervisor tree : sync crash ≠ telemetry crash ≠ API crash      │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Persistence flow (local-first → opt-in sync)

```
User action → CSS vars repaint (<50ms)
            ↓
         IndexedDB (Worker, async)
            ↓
   (opt-in) Yjs Y.Doc → encrypted → Phoenix Channel → autres devices user
```

Le serveur **ne décrypte jamais** les préférences. Il relaie des blobs chiffrés NaCl `box`. Architecture zero-knowledge.

### 4.3 Liens entrants (consommateurs)

- **theermite.com** — démo vitrine Phase 1
- **Michi** (futur) — intégration en Phase 1 finale
- **Shizen, Kakusei** (futur) — intégrations Phase 2 (post-NLNet)
- **Browser extension** — Phase 2

---

## 5. Stack technique

| Couche | Technologie | Version | Vérifiée le | Source veille |
|--------|-------------|---------|-------------|---------------|
| Runtime client (dev + CI) | Node.js | **engines ≥22.0.0** (LTS Active 24 + LTS Maintenance 22 en CI matrix). Node 20 exclu (EOL 2026-04-30). | 2026-05-22 | nodejs.org/en/about/previous-releases |
| Language client visible | TypeScript | 5.6+ floor strict (`--noUncheckedIndexedAccess`, `--exactOptionalPropertyTypes`) — **installé 5.9.3** | 2026-05-22 | typescriptlang.org |
| Web Components | natif (Custom Elements v1) | spec stable WHATWG | 2026-05-21 | webcomponents.org |
| Language critique | Rust | 1.87+ | 2026-05-21 | blog.rust-lang.org |
| WASM toolchain | wasm-bindgen + wasm-pack | wasm-bindgen 0.2.95+ | 2026-05-21 | rustwasm.github.io |
| Résilience | Effect-TS | 3.10+ | 2026-05-21 | effect.website |
| Process isolation | Web Workers + transferable objects | natif | 2026-05-21 | MDN |
| CRDT | Yjs | 13.6.27+ (lazy-loaded séparé) | 2026-05-21 | github.com/yjs/yjs |
| IndexedDB binding | `idb` | 8.x | 2026-05-21 | github.com/jakearchibald/idb |
| Tokens | W3C Design Token Format (DTCG) | stable mai 2026 | 2026-05-21 | designtokens.org |
| Token builder | Style Dictionary | 5.4.1 | 2026-05-21 | github.com/amzn/style-dictionary |
| Crypto sync | TweetNaCl.js (`box`) + libsodium-wrappers fallback | tweetnacl 1.0.3, libsodium 0.7.13 | 2026-05-21 | github.com/dchest/tweetnacl-js |
| Backend | Elixir / Phoenix | 1.19 / 1.8 | 2026-05-21 | hex.pm |
| HTTP server | Bandit | 1.11+ | 2026-05-21 | hex.pm |
| Backend tests | ExUnit + StreamData (PBT) | 1.19 / 1.0+ | 2026-05-21 | hexdocs.pm |
| Tests client | Vitest | 4.0+ floor (forks pool, maxForks 2) — **installé 4.1.7** | 2026-05-22 | vitest.dev |
| DOM test runtime | jsdom | 29.1.1 (Custom Elements + Shadow DOM v1) | 2026-05-22 | github.com/jsdom/jsdom |
| Tests cross-browser | Playwright | 1.58+ | 2026-05-21 | playwright.dev |
| PBT client | fast-check | 3.21+ | 2026-05-21 | fast-check.dev |
| Mutation testing | StrykerJS (TS) + cargo-mutants (Rust) + Mutant.ex (Elixir) | 9.5 / 25.x / 0.13+ | 2026-05-21 | stryker-mutator.io |
| Lint TS | Biome | 2.4+ floor — **installé 2.4.15** | 2026-05-22 | biomejs.dev |
| Lint Rust | clippy strict + rustfmt | rust 1.87 | 2026-05-21 | rust-lang.org |
| Lint Elixir | Credo strict + Dialyzer | 1.7+ / OTP 27 | 2026-05-21 | hex.pm |
| Security Elixir | Sobelow | 0.14+ | 2026-05-21 | hex.pm |
| Bundler client | Vite | 6.x floor — **installé 8.0.14** (transitif via Vitest 4.1.7) | 2026-05-22 | vitejs.dev |
| Package manager | pnpm | 9.x floor — **installé 10.33.0** (packageManager pinned). pnpm 11 disponible mais major breaking → décision dédiée. | 2026-05-22 | pnpm.io |
| License | AGPL-3.0 | — | 2026-05-21 | gnu.org/licenses |
| Funding | NLNet NGI0 Commons Fund | round 2026-06-01 | 2026-05-21 | nlnet.nl/news |
| A11y audit auto | axe-core + Pa11y CI | 4.10+ / 9.x | 2026-05-21 | deque.com |
| Telemetry | OpenTelemetry JS + Elixir | 1.27 / 1.x | 2026-05-21 | opentelemetry.io |

**Justification des écarts au défaut Shinkofa** :
- **Pas de React** dans le core : module framework-agnostic obligatoire. React utilisable côté hôte (theermite.com utilise Next.js, le module s'y plug). Adapter React fourni en Phase 1.5 si demande, mais pas dans le core.
- **Rust→WASM** ajouté en couche critique : Quality.md Foundation indique « strict compiler is the first poka-yoke » ; WASM Rust = compilateur strict + memory safety + sandboxing browser, niveau supérieur à TS strict seul. Justification Monozukuri excédence.
- **Effect-TS** ajouté : closest TS à Erlang/BEAM let-it-crash + algebraic effects. Pousse au-delà de try/catch standard. Alignement Quality.md « Let It Crash ».
- **Yjs lazy-loaded** : ne charge que si l'user opt-in sync. Sinon 0 KB overhead. Décision Performance-Excellence.md (bundle discipline).

---

## 6. Non-functional requirements

| Catégorie | Cible Shinkofa **excédence** | Mesure |
|-----------|------------------------------|--------|
| **Bundle initial** | ≤ **20 KB gzipped** (engine seul, sans Yjs) | bundlesize CI |
| **Bundle Yjs lazy** | ≤ 50 KB gzipped, chargé uniquement si sync opt-in | bundlesize CI |
| **LCP impact** | ≤ **+50 ms** sur hôte vs sans module (p75) | Lighthouse CI, WebPageTest |
| **INP** | ≤ **100 ms** p75 (Shinkofa, vs Google 200ms) | Web Vitals RUM |
| **CLS** | ≤ **0.05** p75 (Shinkofa strict, vs Google 0.1) | Web Vitals RUM |
| **FCP** | ≤ **1.0s** p75 | Lighthouse CI |
| **TTFB** | ≤ **400 ms** p75 (backend Phoenix opt-in) | Lighthouse CI |
| **Lighthouse Performance** | ≥ **95** mobile + desktop | Lighthouse CI |
| **Lighthouse Accessibility** | ≥ **95** | Lighthouse CI |
| **Lighthouse Best Practices** | ≥ **95** | Lighthouse CI |
| **WCAG** | **2.2 AA**, 0 violation axe-core, 0 violation Pa11y | axe-core CI + Pa11y CI |
| **prefers-reduced-motion** | 100% respecté (incl. transitions module) | CSS audit |
| **prefers-color-scheme** | 100% respecté (défaut auto) | CSS audit |
| **prefers-contrast** | high-contrast supporté | CSS audit |
| **Init time** | ≤ **100 ms** (parse + boot Web Component, p75) | Performance API |
| **Adaptation latency** | ≤ **50 ms** (changement axe → repaint) | Performance API |
| **Sync latency** | ≤ **5 s** cross-device (CRDT WebSocket opt-in) | E2E Playwright |
| **Sécurité** | 0 CVE Critical/High npm audit, 0 Bandit/Sobelow HIGH | npm audit + Bandit + Sobelow CI |
| **Crypto** | NaCl `box` (curve25519-xsalsa20-poly1305), keys curve25519, jamais < 256 bits effective | Crypto audit |
| **CSP** | Strict nonce-based, `'unsafe-inline'` interdit, `'unsafe-eval'` interdit, `eval()` 0 occurrence | CSP audit |
| **Cross-browser** | Chrome/Firefox/Safari/Edge 2 dernières majeures + iOS 15.4+ + Samsung Internet 2 dernières | Playwright cross-browser |
| **i18n** | FR (source) + EN + ES, 100% clés, fallback FR→EN→ES | @shinkofa/i18n |
| **Coverage** | ≥ **95% Critical** (modules §7), ≥ 90% Sensitive, ≥ 80% global | vitest + tarpaulin + ExCoveralls |
| **Mutation score** | ≥ **75%** Critical modules | StrykerJS + cargo-mutants + Mutant.ex |
| **Type coverage** | 100% TS strict + 100% Dialyzer specs publics + clippy strict 0 warning | tsc + Dialyzer + clippy |
| **Memory leak (24h soak)** | < 1 MB drift Web Component lifecycle | Chrome DevTools heap snapshots |
| **PII** | 0 PII dans logs, telemetry, exports, IndexedDB schema | Audit regex + manual review |
| **GDPR** | Art. 5, 6, 9, 17, 20 respectés ; consent explicite sync ; portability export JSON | Compliance audit |
| **WAI-Adapt** | Symbols CR + Content WD alignement | W3C interop test |
| **GPII** | Import préférences depuis registry Morphic.org | Test interop |

---

## 7. Quality Archetype — Risk Classification

Chaque module classifié. Détermine coverage floor + gates appliqués.

| Module / composant | Niveau | Coverage floor | MC/DC ? | Justification |
|--------------------|--------|----------------|---------|---------------|
| `@shinkofa/morphic-wasm-core` (validators, mappers, crypto Rust) | **Critical** | 95% + mutation 75% | Oui (conditions ≥4) | Crypto sync E2E + validation préfs entrantes (GPII/WAI-Adapt). Échec = data corruption ou fuite. |
| `@shinkofa/morphic-engine/storage` (IndexedDB + Yjs + Worker sync) | **Critical** | 95% + mutation 75% | Oui | Persistence préférences. Échec = perte données user, contradiction Adaptation gate (Dignity §a). |
| `@shinkofa/morphic-engine/init` (synchronous head-read, zero flash) | **Critical** | 95% | Oui | Échec = flash visible = violation Dignity §a (sensoriel). Race condition zero tolerance. |
| `@shinkofa/morphic-engine/onboarding` (sensoriel-first, ≤3 decision points) | **Critical** | 95% | Non | Échec = violation Dignity §a + Cognitive Load BLOCKING. |
| `sk_morphic.Channels.Sync` (Phoenix CRDT relay) | **Critical** | 95% | Oui | Échec = sync down → users en conflit. Échec backend ≠ down du module (graceful degradation testée). |
| `@shinkofa/morphic-engine/web-component` (`<morphic-provider>`) | **Sensitive** | 90% | Non | Façade publique du module. Régression = consommateurs cassent. |
| `@shinkofa/morphic-engine/tokens` (DTCG + Style Dictionary) | **Sensitive** | 90% | Non | Build pipeline tokens. Erreur silencieuse = thème incohérent. |
| `@shinkofa/morphic-engine/effects` (Effect-TS structured errors) | **Sensitive** | 90% | Non | Couche résilience. Tests sur error paths obligatoires. |
| `sk_morphic.API.Telemetry` (OpenTelemetry opt-in) | **Sensitive** | 90% | Non | Opt-in = échec consent = violation GDPR. |
| `@shinkofa/morphic-engine/ui` (composants visuels onboarding) | **Standard** | 80% | Non | UX, mais Lighthouse + axe gates BLOCKING couvrent. |
| `@shinkofa/morphic-engine/i18n` (chargement clés FR/EN/ES) | **Standard** | 80% | Non | Fallback strategy testée, mais peu de logique. |
| `apps/the-ermite-demo` (intégration démo theermite.com) | **Standard** | 80% | Non | Démo, pas le module. |
| `scripts/build-tokens.ts` | **Tooling** | 60% | Non | Outillage dev, smoke test suffit. |
| `scripts/release.ts` | **Tooling** | 60% | Non | Outillage CI. |

**Source de référence** : `.claude/rules/Quality.md` § Critical Paths + Refonte `Quality-Gates-Refonte.md`.

---

## 8. FMEA simplifiée — modules Critical uniquement

### 8.1 `@shinkofa/morphic-wasm-core`

| Mode de défaillance | Sévérité (1-5) | Mitigation |
|---------------------|----------------|------------|
| Panic Rust → crash module entier | 5 | Tous appels WASM enveloppés `Effect.tryPromise` ; fallback TS validators basique ; supervisor tree pattern. Test : injection panic, vérifier fallback gracieux. |
| Validator passe préfs malformées (faux négatif) | 5 | PBT fast-check côté TS + proptest côté Rust ; corpus fuzzing (Schemathesis sur schemas import) ; mutation testing ≥75%. |
| Crypto `box` mal utilisé (nonce reuse) | 5 | Nonces générés par CSPRNG ne se réutilisent jamais ; assertion runtime + test PBT « 1000 encrypt même message → 1000 ciphertexts différents ». |

### 8.2 `@shinkofa/morphic-engine/storage`

| Mode de défaillance | Sévérité (1-5) | Mitigation |
|---------------------|----------------|------------|
| IndexedDB quota dépassé silencieusement | 4 | Quota check + Effect erreur typée + UI fallback message factuel (Dignity §c) ; tests E2E avec quota artificiellement réduit. |
| CRDT merge conflict produit état impossible | 5 | Yjs garantit no-conflict par construction, mais schema validation Rust WASM AVANT apply ; holdout test set avec conflits malicieux. |
| Sync Worker crash → silence du sync | 4 | Worker restart automatique (supervisor pattern) + telemetry alert opt-in ; circuit breaker côté Effect-TS. |

### 8.3 `@shinkofa/morphic-engine/init`

| Mode de défaillance | Sévérité (1-5) | Mitigation |
|---------------------|----------------|------------|
| localStorage race condition → flash thème | 5 | Lecture **synchrone** en `<head>` AVANT first paint ; test Playwright sur 10 navigateurs avec throttling 3G ; mesure FCP delta. |
| Web Component non défini avant `<morphic-provider>` parsé | 4 | `customElements.whenDefined()` + shadow DOM fallback ; test cross-browser. |
| CSP strict bloque l'injection CSS vars | 4 | Pas d'injection inline ; CSS vars via stylesheet adopted ; nonce serveur-fourni si nécessaire ; test sous CSP strict. |

### 8.4 `@shinkofa/morphic-engine/onboarding`

| Mode de défaillance | Sévérité (1-5) | Mitigation |
|---------------------|----------------|------------|
| Demande identité avant sensoriel | 5 | Test E2E qui parcourt l'onboarding et vérifie l'ordre exact des écrans (sensoriel d'abord) ; assertion défensive dans le code init. |
| Plus de 3 decision points sur un écran | 4 | Lint custom AST qui scan composants `<morphic-step>` et compte les CTA ; test Storybook + axe. |
| Erreur input sans guidance solution | 4 | Tous messages erreur via i18n keys `morphic.errors.*` qui contiennent `{format, example, fix}` structure ; test snapshot copy. |

### 8.5 `sk_morphic.Channels.Sync`

| Mode de défaillance | Sévérité (1-5) | Mitigation |
|---------------------|----------------|------------|
| Channel relay décrypte par erreur (logique cassée) | 5 | Tests ExUnit qui passent ciphertexts random + assertion zero plaintext jamais loggé ; Sobelow scan ; code review obligatoire Couche Critical. |
| Backpressure mal géré → memory blow-up | 4 | Bandit + Phoenix LiveView use GenStage demand-driven ; test load avec 10k clients concurrents. |
| Backend down → module client silently broken | 4 | Heartbeat + Effect-TS retry/backoff ; UI banner factuel « sync indisponible » (pas masqué) ; module reste fonctionnel local-first. |

---

## 9. Human Quality Gates — projets public-facing

Le module est public-facing (consommé par sites publics, intégré sur theermite.com). Toutes les 5 gates s'appliquent + extension Dignity stricte.

| Gate | Critère mesurable | Seuil BLOCKING | Méthode vérif |
|------|-------------------|----------------|---------------|
| **Cognitive Load** | Decision points par écran morphique | **≤ 3** (strict ; Shinkofa floor = 5, module excédence = 3) | Audit AST + Storybook |
| **Sensory Comfort** | prefers-reduced-motion + prefers-color-scheme + prefers-contrast + 16px min + dark/light/high-contrast/sepia | **100%** | CSS audit + Playwright media queries |
| **Error Resilience** | Auto-save préfs à chaque change + messages erreur no-blame format `{format, example, fix}` | Requis | Tests Playwright + audit i18n |
| **Adaptation** | Persistance IndexedDB + sync opt-in CRDT + import GPII | Requis | Tests E2E |
| **Dignity** | 0 dark pattern + opt-out 1-clic + ton factuel + onboarding sensoriel-AVANT-identité + suppression 2 clics + export 1 clic | **0** violation | Audit `rules/Dignity.md` 8 tests |

**Onboarding sensoriel-first** (Dignity.md §a) :
1. Écran 1 : choix thème (light/dark/auto/high-contrast/sepia) — défaut `auto` (respect `prefers-color-scheme`)
2. Écran 2 : choix motion (full/reduced/none) — défaut `auto` (respect `prefers-reduced-motion`)
3. Écran 3 : choix density (comfortable défaut) — option « ajuster plus tard »
4. **AUCUNE** demande d'identité, email, nom, profil HD/ND avant ces 3 écrans
5. Toutes les options « plus tard » avec dégradation gracieuse (jamais un mur)

**Feedback Widget** : intégré dans la démo theermite.com (pas dans le module lui-même — le module est une lib, le widget vit dans l'hôte). 2 clicks max, capture contexte (version module, axes actifs), 0 PII.

---

## 10. Hors scope explicite

Ce qu'on **ne fera PAS** dans cette v2.0.0 :

- **HS-001** Migration in-place de `@shinkofa/morphic-engine` v1.0.0 → v2.0.0 (decision : archivage v1 propre, v2 déploiement neuf, consommateurs migrent en Phase 1.5)
- **HS-002** Adapter React (déférré Phase 1.5, après NLNet) — le core est framework-agnostic ; un wrapper React peut être ajouté quand la demande arrive
- **HS-003** Browser extension (Phase 2, déférré post-NLNet)
- **HS-004** Shinkofa Browser (Phase 3, vision §13)
- **HS-005** IA-based inference du profil (anti-pattern : le user choisit, on n'infère pas en silence — Dignity §B-C)
- **HS-006** Catégorisation au premier contact (« es-tu ND ? » — universel d'abord, jamais catégoriser, cf. Strategic-Context.md L3)
- **HS-007** Compatibilité IE11 ou navigateurs < iOS 15.4 (browserslist Refonte)
- **HS-008** Plugin Wordpress / Drupal / Webflow (Phase 2+, marché secondaire)
- **HS-009** SDK mobile natif iOS/Android (Web → React Native pourrait venir Phase 2+, mais pas v2.0.0)
- **HS-010** Auto-fix accessibility overlay du site host (anti-pattern AccessiBe — JAMAIS, c'est l'inverse de notre proposition de valeur)
- **HS-011** Adaptation textuelle runtime (résumé / extension / simplification du contenu) — hors scope v2.0.0. Décision Jay 2026-05-21 : le périmètre v2 est strictement présentation, navigation, ergonomie, accessibilité ; l'adaptation morphique ne touche pas au texte de l'hôte. Roadmap : **un standard ouvert d'adaptation textuelle** sera spécifié dans une version ultérieure pour que les développeurs hôtes puissent fournir leurs propres variantes (concise / standard / étendue / sans-jargon) et que le moteur les sélectionne sans IA runtime. Aligné WAI-Adapt `easy-lang`. Pas d'IA en runtime dans le module — la dignité du lecteur exige que le texte servi soit un texte écrit par un humain.

---

## 11. Success metrics

### 11.1 Business / écosystème

| Métrique | Cible | Mesure | Échéance |
|----------|-------|--------|----------|
| NLNet dossier soumis | 1 | Confirmation email NLNet | 2026-06-01 |
| NLNet acceptation | Stage 1 passé | Réponse NLNet | T+3 mois |
| Downloads NPM `@shinkofa/morphic-engine` | 100/mois | npm-stat | T+6 mois |
| GitHub stars `theermite/morphic-engine` | 50 | GitHub API | T+6 mois |
| Citations Perplexity / AI Overviews sur requête cible | 1 | Test trimestriel manuel | T+6 mois |
| Sites Shinkofa intégrant le module | 3 (Ermite + Michi + 1 autre) | Audit code | T+9 mois |

### 11.2 Technique

| Métrique | Cible | Mesure |
|----------|-------|--------|
| Uptime backend `sk_morphic` (si déployé) | ≥ 99.5% | Monitoring (Sentry / UptimeRobot) |
| Temps résolution incident P0 | < 4h | Incident log |
| Coverage Critical | ≥ 95% maintenu | CI tarpaulin + vitest |
| Mutation score Critical | ≥ 75% maintenu | StrykerJS + cargo-mutants |
| 0 CVE Critical/High publique | 0 | npm audit + GitHub Advisories |
| Bundle initial gzipped | ≤ 20 KB maintenu | bundlesize CI |

### 11.3 Humain

| Métrique | Cible | Mesure |
|----------|-------|--------|
| Feedback widget NPS theermite.com | ≥ 7/10 | Feedback widget |
| Compliance Dignity (8 tests) | 100% green | Audit trimestriel |
| Compliance Refonte Quality-Gates (4D ≥80/100) | Atteinte v1.0 release | Audit GO/NO-GO |

---

## 12. Visibilité (L2 — magnétique, jamais push)

| Levier | Détail | Statut |
|--------|--------|--------|
| **Big 5** | Hero theermite.com vitrine module / FAQ-SEO morphique vs overlays / Comparison W3C-WAI-Adapt-GPII / Demo interactive / Citations utilisateurs | À définir post-release |
| **SEO** | Meta tags + Open Graph + sitemap + canonical ; pillar article The Ermite « Adaptation morphique vs accessibility overlays (FTC AccessiBe 2025) » | À écrire avant release |
| **GEO** (AI Overviews, Perplexity, Claude-with-web) | JSON-LD `SoftwareApplication` + `TechArticle` + E-E-A-T (auteur Jay, 23y design, ND), contenu Q&A structuré, citations sources primaires (FTC, W3C, NLNet) | À implémenter |
| **Distribution** | Blog The Ermite → LinkedIn/Discord/Telegram (pipeline existant) + Dev.to/Hashnode auto-publish + GitHub topics (`morphic`, `neurodiversity`, `ux-adaptation`, `accessibility`, `web-components`) + README NPM exemplaire | Pipeline existant à étendre |
| **Capture** | CTA "Install in 5 lines" sur theermite.com avec lien GitHub + email capture optionnel sur newsletter Refonte | À implémenter |
| **Funding visibility** | Dossier NLNet public (deadline 2026-06-01), badge "Funded by NGI0" si accepté | À soumettre |
| **Interop standards bodies** | Apparition GPII Morphic.org registry interop (lien import préférences), W3C WAI-Adapt community group participation | Phase 1.5 |

---

## 13. Anti-patterns projet (rappels spécifiques)

### 13.1 Anti-patterns techniques

- **AP-001** Ne PAS coder un composant qui existe déjà dans `@shinkofa/ui` — vérifier inventaire AVANT (Lego Library First, BLOCKING)
- **AP-002** Ne PAS dupliquer les types frontend/backend → `@shinkofa/types`
- **AP-003** Ne PAS hardcoder de texte UI → `@shinkofa/i18n` keys `morphic.*` (FR/EN/ES)
- **AP-004** Ne PAS utiliser `eval()`, `new Function()`, `setTimeout(string)` — CSP strict + 0 occurrence (Security-Excellence)
- **AP-005** Ne PAS stocker JWT ou tokens auth dans `localStorage` — HttpOnly cookie uniquement (le module n'a pas d'auth en propre, mais la démo si)
- **AP-006** Ne PAS introduire de `try/catch` qui swallow — Effect-TS structured errors obligatoire sur tout async (Observability Principles)
- **AP-007** Ne PAS introduire de cycle d'import Madge — détection CI BLOCKING
- **AP-008** Ne PAS dépasser 30 lignes par fonction (sauf justifications documentées par exemption) — Maintainability BLOCKING

### 13.2 Anti-patterns architecturaux

- **AP-009** Ne PAS devenir un fake accessibility overlay — JAMAIS d'auto-fix DOM du site host. Le module **applique** les préférences user via CSS vars sandboxées ; il ne **corrige** pas le site (FTC AccessiBe 2025 trap)
- **AP-010** Ne PAS catégoriser au premier contact — pas de question « es-tu ND ? » avant d'avoir donné de la valeur (Strategic-Context L3 universel)
- **AP-011** Ne PAS inférer le profil en silence — l'user choisit, l'IA ne suppose pas (Dignity §B-C, Loi 8 Behavioral Interoception)
- **AP-012** Ne PAS faire du chronotype auto-adaptation (theme change selon heure) — REJETÉ Wave 2 Standards-Ergonomie.md §12.2
- **AP-013** Ne PAS transmettre les préférences morphiques au LLM sans consent explicite — séparation stricte module / chat (cf. Chat-Engine-Refonte-Spec)
- **AP-014** Ne PAS charger Yjs / sync stack si user opt-out — bundle discipline, lazy import strict

### 13.3 Anti-patterns produit / business

- **AP-015** Ne PAS paywaller un axe morphique — toute adaptation est gratuite, AGPL, toujours (Dignity §e Vente)
- **AP-016** Ne PAS pratiquer fake urgency dans l'onboarding ou settings — 0 compteur, 0 « plus que X jours » (Dignity §d Limite)
- **AP-017** Ne PAS guilt-trip à la suppression — délétion en 2 clics, message neutre (Dignity §g Départ)
- **AP-018** Ne PAS prétendre conformité WCAG du site host — le module fournit des outils ; la conformité du site reste la responsabilité du site (anti-AccessiBe claims FTC)
- **AP-019** Ne PAS citer plateformes externes comme références dans la doc — Shinkofa construit le standard (cf memory `feedback_no_external_benchmarks.md`)

---

## Historique de l'intention

| Date | Changement | Raison | Décideur |
|------|-----------|--------|----------|
| 2026-05-21 | Création CDC v1.0.0 (provisoire, sans lecture Refonte folder) | Démarrage projet | Jay + Takumi |
| 2026-05-21 | Refonte CDC v2.0.0 — alignement Refonte folder + Monozukuri excédence + tri-layer architecture (TS + Rust→WASM + Effect-TS + Web Workers + Phoenix opt-in) | Mandat Jay : « pas moyenne haute, j'aimerais qu'on soit dans l'exceptionnel, applique Monozukuri pour l'excédence ». Lecture 21 docs Refonte. Réécriture intégrale. | Jay (validation) + Takumi (rédaction) |
| 2026-05-22 | §5 Stack — alignement versions installées (Node ≥22 ajouté, TS 5.9.3, Vitest 4.1.7, Biome 2.4.15, jsdom 29.1.1 ajouté, Vite 6→8.0.14, pnpm 9→10.33.0). Aucun changement d'intention, mise en cohérence factuelle uniquement. | Jay : « je n'ai pas envie de prendre de risque de confusion ou d'erreur a cause d'une mauvaise lecture ». | Jay (demande) + Takumi (édition) |

---

*Template version : 2.0.0 — voir `mnk/05-Workflows-Concevoir.md` pour le workflow et `.claude/rules/Quality.md` pour les standards. Document v2.0.0 aligné Refonte 2026 + Monozukuri excédence.*
