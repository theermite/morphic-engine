# Changelog Module Morphique v1.0.0 → v2.0.0

> **Document de delta explicite.** Pourquoi v2 n'est pas une itération de v1, mais un **replacement complet** aligné Refonte 2026 + Monozukuri excédence.

**Date** : 2026-05-21
**Cross-ref** : `docs/Conception-Morphique/CDC.md` v2.0.0 · `docs/Conception-Morphique/PET.md` v2.0.0 · `docs/Refonte/` (21 docs)

---

## 1. Pourquoi un changelog explicite

Le CDC v1 et PET v1 ont été rédigés **sans lecture du dossier `docs/Refonte/`** (21 documents Refonte Shinkofa 2026 consolidés). Conséquence : les standards Refonte (Quality-Gates chiffrés, Performance Excellence, Security Excellence, Standards Ergonomie, SEO/GEO/Citabilité IA) n'étaient pas appliqués.

Jay a explicitement demandé (2026-05-21) :
> *« Au niveau de la qualité, je ne veux pas qu'on soit dans la moyenne haute. J'aimerais qu'on soit dans l'exceptionnel. Je veux que tu appliques la philosophie Monozukuri pour que l'on soit dans l'excédence. »*

v2 = ré-écriture intégrale aligned avec ce mandat.

---

## 2. Synthèse — 7 axes de rupture

| Axe | v1.0.0 | v2.0.0 |
|-----|--------|--------|
| **1. Périmètre** | Couplé React/Next.js — `@shinkofa/morphic-engine` mono-package mono-couche TS | **Framework-agnostic** (Web Components natifs + vanilla core) ; tri-layer client + Phoenix backend opt-in |
| **2. Architecture** | Mono-couche TypeScript | **Tri-layer** : TS visible + Rust→WASM critique + Effect-TS résilience + Web Workers isolation + Phoenix 1.8/Elixir 1.19 backend (sk_morphic OTP app) |
| **3. Persistence** | Aucune (objets mémoire) | **CRDT Yjs 13.6.27+ lazy-loaded** (50KB séparés) + IndexedDB local-first via `idb` 8.x + sync opt-in chiffré E2E NaCl `box` |
| **4. Adaptation** | Statique (preferences calculées du profil) | **13 axes morphiques** + 3-tier surfacing (4 onboarding sensoriel-first + 4 optionnels + 5 auto-derivés) |
| **5. Standards qualité** | Quality.md baseline (80% coverage générique) | **Refonte 2026 floors excédence** : 95% Critical + 75% mutation + 24h memory leak soak < 1MB + Lighthouse ≥95 toutes catégories + Dignity §a sensoriel-first ordre exact + Anti-overlay (FTC AccessiBe 2024) |
| **6. Open source** | Privé monorepo Shinkofa | **AGPL-3.0 + NLNet NGI0** (deadline soumission 2026-05-26) + démo theermite.com vitrine |
| **7. Méthodologie** | Conception sans dossier Refonte | **Synthèse 21 docs Refonte** → CDC + PET intégrant Performance Excellence, Security Excellence, Quality-Gates chiffrés, SEO-GEO citabilité IA |

---

## 3. CDC v1 → v2 — Changements par section

### §0 — Pourquoi v2.0.0 (NOUVEAU)
**v1** : pas de comparatif explicite avec une version antérieure
**v2** : tableau 7 axes de rupture rendant le saut visible aux évaluateurs externes (NLNet, GitHub readers)

### §1 — POUR QUOI (L3/L2/L1)
**v1** : L3 générique (« digital qui s'adapte »)
**v2** :
- L3 ancré dans **anti-overlay positioning** (FTC vs AccessiBe 2024, 1M$ amende, 1023 sites poursuivis)
- L2 stratégie magnétique en **5 leviers** : NLNet → démo Ermite → NPM → citabilité IA → GPII interop
- L1 brick concrète scaffolding avec config Vitest 4 forks pool (Test Runtime Hygiene Quality.md)

### §2 — Utilisateurs cibles
**v1** : 1-2 personas vagues
**v2** : **5 personas** : Jay dogfood primaire + Dev intégrateur + User ND public + Évaluateur NLNet + Auditeur accessibility legal

### §3 — Features
**v1** : liste ~10-12 features sans IDs structurés
**v2** :
- **F-001 à F-024** (Phase 1) avec user stories + priorités P0/P1/P2 + dépendances explicites
- **F-101 à F-105** (Phase 2 browser extension) séparée
- Mapping 1:1 vers bricks PET (traçabilité bidirectionnelle)

### §4 — Architecture
**v1** : schéma simple frontend mono-couche
**v2** :
- **ASCII diagram tri-layer** : Hôte → Layer 1 Visible (TS+Web Components) → Layer 2 Critique (Rust→WASM) → Layer 3 Résilience (Effect-TS) → Layer 4 Isolation (Web Workers) → Backend Phoenix opt-in
- Persistence flow local-first → opt-in sync explicite
- Liens entrants consommateurs (theermite, Michi, Shizen, Kakusei, extension)

### §5 — Stack technique
**v1** : ~6 lignes sans dates de veille
**v2** : **42 lignes** avec veille datée 2026-05-21 + source officielle pour chaque ligne (TS 5.6, Rust 1.87, wasm-bindgen 0.2.95, Effect-TS 3.10, Yjs 13.6.27, idb 8.x, DTCG stable, Style Dictionary 5.4.1, tweetnacl 1.0.3, Phoenix 1.8, Bandit 1.11, Vitest 4 forks pool, Playwright 1.58, fast-check 3.21, StrykerJS 9.5, cargo-mutants 25.x, Mutant.ex 0.13, Biome 2.4, Credo strict, Sobelow 0.14, Vite 6, pnpm 9, axe-core 4.10, Pa11y 9, OpenTelemetry 1.27)

### §6 — Non-functional requirements
**v1** : ~10 cibles vagues (« performance bonne », « accessible »)
**v2** : **31 cibles chiffrées Shinkofa excédence** :
- Bundle ≤20KB initial / ≤50KB Yjs lazy
- LCP impact ≤+50ms / INP ≤100ms / CLS ≤0.05 (stricts Shinkofa, vs Google 200/0.1)
- Lighthouse ≥95 Performance + ≥95 Accessibility + ≥95 Best Practices
- Init ≤100ms / Adaptation latency ≤50ms / Sync latency ≤5s
- WCAG 2.2 AA + 0 axe + 0 Pa11y violations
- Coverage 95% Critical + mutation 75% + type coverage 100%
- 24h memory leak soak < 1 MB drift
- CSP strict (`unsafe-inline`/`unsafe-eval` interdits, `eval()` 0 occurrence)
- Crypto NaCl `box` curve25519-xsalsa20-poly1305

### §7 — Risk Classification
**v1** : non explicite
**v2** : **14 modules classifiés** :
- 5 **Critical** (wasm-core, storage, init head-read, onboarding, Channels.Sync) — coverage 95% + mutation 75% + MC/DC
- 4 **Sensitive** (web-component, tokens, effects, telemetry) — 90%
- 3 **Standard** (ui, i18n, démo) — 80%
- 2 **Tooling** (scripts) — 60%

### §8 — FMEA simplifiée
**v1** : non présent
**v2** : **15 failure modes documentés** (3 par module Critical) avec sévérité 1-5 + mitigation chiffrée :
- WASM panic, validator faux négatif, nonce reuse
- IDB quota silencieux, CRDT merge impossible, Worker silent
- Race condition flash, Web Component undefined, CSP block
- Demande identité avant sensoriel, >3 decision points, erreur sans guidance
- Channel decrypt erreur, backpressure blowup, backend down silent

### §9 — Human Quality Gates
**v1** : mention vague
**v2** :
- **5 gates BLOCKING** avec seuils chiffrés (Cognitive Load **≤3** strict module — excédence vs Shinkofa floor 5)
- **Onboarding sensoriel-first ordre exact** : 3 écrans (thème → motion → density) AVANT toute identité (Dignity §a)
- Feedback Widget intégré démo theermite.com (pas module — module est lib)

### §10 — Hors scope explicite
**v1** : 2-3 items
**v2** : **HS-001 à HS-010** (migration in-place, adapter React, browser extension Phase 2, browser Phase 3, IA inference, catégorisation premier contact, IE11/iOS<15.4, plugins CMS, SDK mobile natif, auto-fix overlay)

### §11 — Success metrics
**v1** : générique
**v2** : **3 sections (Business + Technique + Humain)** avec cibles datées :
- NLNet soumis 2026-05-26, acceptation T+3 mois
- NPM 100 downloads/mois T+6 mois, GitHub 50 stars T+6 mois
- Citations Perplexity/AI Overviews T+6 mois
- 3 sites Shinkofa intégrés T+9 mois
- Uptime ≥99.5% / Resolution P0 <4h
- NPS feedback ≥7/10 / Compliance Dignity 100% / Refonte 4D ≥80/100

### §12 — Visibilité (L2)
**v1** : non présent
**v2** : **7 leviers** : Big 5, SEO (pillar article anti-overlay), **GEO citabilité IA** (JSON-LD SoftwareApplication + TechArticle + E-E-A-T), Distribution (pipeline The Ermite + Dev.to/Hashnode + GitHub topics), Capture (CTA + email), Funding NLNet badge, Interop GPII/W3C WAI-Adapt

### §13 — Anti-patterns
**v1** : 4-5 items génériques
**v2** : **19 anti-patterns AP-001 à AP-019** en 3 catégories :
- Techniques (Lego Library First, no duplication types, no hardcode i18n, no eval, no JWT localStorage, no try/catch swallow, no Madge cycles, max 30 lignes)
- Architecturaux (anti-overlay, no catégorisation premier contact, no IA inference silence, no chronotype auto, no LLM sans consent, no Yjs eager load)
- Produit (no paywall axe, no dark pattern, no notification push retention, no fausse urgence)

---

## 4. PET v1 → v2 — Changements par section

### §1 — Principe d'exécution
**v1** : brick-by-brick mentionné
**v2** : ajout Monozukuri excédence + Veille marker BLOCKING + Rigueur > Vitesse explicit + erreur = donnée LOGS FIRST

### §2 — Anti-Circular Testing Protocol
**v1** : évoqué
**v2** : **3 layers détaillés** avec tools précis par stack (fast-check + proptest + StreamData / StrykerJS + cargo-mutants + Mutant.ex / Schemathesis sur imports) ; holdout tests 20% Critical

### §3 — Bidirectional Traceability
**v1** : table générique
**v2** : **24 features mappées ligne-à-ligne** vers bricks + tests + Risk level

### §4 — 5 Test Reliability Metrics
**v1** : coverage seule (80%)
**v2** : **6 métriques chiffrées** (95% line Critical + 75% mutation Critical + 0 empty + <10% trivial + <3:1 mock:assert + 100% type) + **24h memory leak soak < 1 MB BLOCKING release**

### §5 — Defensive Assertions
**v1** : non présent
**v2** : **7 fonctions Critical listées** avec assertions minimales :
- `morphic_validate_prefs`, `morphic_encrypt_box`, `morphic_init_head`, `morphic_idb_persist`, `morphic_yjs_apply_update`, `morphic_onboarding_step_render`, `MorphicChannel.handle_in(:sync)`

### §6 — Roadmap Bricks
**v1** : ~14 bricks vagues
**v2** : **29 bricks** structurées en **6 phases** :
- Phase 1.0 Foundation (B-001 à B-006) : scaffolding + CI + provider + head-read + tokens + Style Dictionary
- Phase 1.1 Axes sensoriels (B-007 à B-011) : thème + motion + density + typo + decision points lint
- Phase 1.2 Cognitif + Onboarding + Recovery (B-012 à B-014)
- Phase 1.3 Persistence + Sync (B-015 à B-017) : IDB + Yjs lazy + NaCl `box` + Phoenix Channel
- Phase 1.4 Tri-layer + Workers + Effects (B-018 à B-020) : WASM + Effect-TS + Workers
- Phase 1.5 Démo + Telemetry + Interop + GDPR (B-021 à B-024)
- Phase 1.6 Release publique (B-025 à B-029) : NLNet dossier + README + pillar article + audit GO/NO-GO + npm publish

### §7 — Détail par brick (squelette)
**v1** : minimal
**v2** : squelette enrichi avec **veille marker BLOCKING**, anti-circular layer par test, tests post matrice **17 vérifications** (multi-stack TS/Rust/Elixir : test + coverage + mutation + lint + types + security + bundlesize + a11y + cross-browser)

### §8 — PII Detection
**v1** : générique
**v2** : **4 tools** : regex audit CI + manual review + OpenTelemetry sanitizer + DevTools heap snapshot scan ; patterns énumérés (email RFC 5322, IPv4/6, E.164, IBAN, PAN, MAC, hostnames, paths /home/* /Users/*, JWT)

### §9 — Quality Gates pré-commit
**v1** : 10 items
**v2** : **17 items BLOCKING** (ajout mutation score, bundlesize, defensive assertions, Effect-TS swallow check, AP-004 eval/new Function scan, Conventional Commit + Co-Authored-By, max 3 fichiers)

### §10 — Post-Deploy Verification
**v1** : 7 checks
**v2** : **14 checks** (ajout Web Vitals RUM 7j cohorte réelle, sync E2E cross-device 2 devices, telemetry tcpdump PII, pages erreur nginx 502/503/504 brandées Shinkofa, frame diff Playwright zero-flash sur 3G throttling)

### §11 — Risques exécution
Section vivante (à remplir live), structure identique

### §12 — ADR-light
**v1** : 0 ADR
**v2** : **2 ADR documentés** dès la création :
- ADR-001 : séparation 3 packages (engine + wasm-core + adapter) vs alternatives 1 ou 5 packages
- ADR-002 : Yjs lazy-loaded dynamic import vs bundle initial

### §13 — Déviations vs CDC
Section vivante, structure prête, **migration consommateurs v1→v2** Michi/Shizen/Kakusei tracée (Phase 1.5 cible)

### §14 — Journal session
Structure identique, première entrée 2026-05-21 (B-000 conception CDC+PET v2)

---

## 5. Méthodologie de production v2

| Phase | Action | Output |
|-------|--------|--------|
| 1 | Lecture **21 docs Refonte** via Explore subagent (synthèse 12 sections) | Synthèse Quality Gates chiffrés, Performance Excellence, Security Excellence, Standards Ergonomie, Lego Library mapping, SEO/GEO/Visibilité, Anti-patterns, Compliance checklist 50+ items |
| 2 | Re-lecture templates `CDC.md` + `PET.md` v2.0.0 (MNK-GoRin) | Structure 13/14 sections imposée |
| 3 | Re-lecture rules `Quality.md` + `Dignity.md` + `Monozukuri.md` + `Workflows.md` + `Confidentiality.md` | Floors intégrés |
| 4 | Ré-écriture CDC v2 dense (~270 lignes structurées) | `docs/Conception-Morphique/CDC.md` |
| 5 | Ré-écriture PET v2 (29 bricks, traçabilité bidirectionnelle, 17 quality gates) | `docs/Conception-Morphique/PET.md` |
| 6 | Production changelog explicite | Ce document |
| 7 | Suspension Step 9 (HTML présentation) + Step 10 (Obsidian sync) par mandat Jay 2026-05-21 | — |
| 8 | Présentation à Jay pour Step 11 VALIDATE | — (en attente) |

---

## 6. Ce qui reste à faire

- [ ] **Step 11** : validation explicite Jay (mot d'approbation requis avant toute ligne de code)
- [ ] (Suspendu) Step 9 HTML présentation
- [ ] (Suspendu) Step 10 Obsidian sync `01-Projets/Module-Morphique.md`
- [ ] (Post-validation Jay) Démarrage B-001 (scaffolding monorepo)
- [ ] (Post-validation Jay) Préparation dossier NLNet (deadline 2026-05-26)

---

*Document version : 1.0.0 — créé 2026-05-21 dans le cadre du workflow `/concevoir` Step 7/8 post-mandat Jay « Monozukuri excédence ».*
