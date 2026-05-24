# Plan NLNet Submission — 2026-06-01

> Objectif : maximiser probabilité de financement NLNet NGI0 Commons.
> Deadline : **2026-06-01** (8 jours depuis 2026-05-24).
> Budget Jay (recalibré sur rythme observé 2026-05-21 → 2026-05-24 = ~35 bricks en 3.5j) : **~12h focus** sur 2 sessions.
> Stratégie : blinder la démo + cohérence Dignity-first AVANT submission.
> Marge avant deadline : ~3-4 jours après soumission jeudi pour relecture finale.

---

## Verdict NLNet actuel (avant corrections)

| Critère NLNet | Statut | Note |
|---------------|--------|------|
| 1. Open source license | OK | AGPL-3.0 conforme NGI Commons |
| 2. Common good / privacy / accessibility | OK | 18 axes ND, Machado-Oliveira, WAI-Adapt CR |
| 3. Technical maturity | OK | 1248 tests, mutation, PBT, Rust WASM, tri-layer |
| 4. Demonstrable | RISQUE | 5+ axes invisibles/non-testables dans Lab |
| 5. Long-term sustainability | RISQUE | B-024b Delete GDPR absent, Feedback Widget absent |

**Mon estimation actuelle : "GO probable" (~40-50%).**
**Apres corrections du plan : "GO solide" (~70-80%).**

---

## Sprint en 2 sessions (~6h chacune = 12h total focus)

> Estimation recalibrée sur rythme observé Jay 2026-05-21 → 2026-05-24 (~35 bricks en 3.5j calendaires, pas H24).
> Format ci-dessous garde la **structure logique** (engine d'abord, consumer ensuite, dossier en dernier) — pas un découpage rigide par jour.

### Bloc 1 — Cohérence engine (~2h)

#### 1.1 — B-024b Delete GDPR Article 17 (engine)
- **Pourquoi** : sans Delete, "Dignity-first" est marketing. Critère 5 NLNet.
- **Scope** :
  - Module `packages/engine/src/delete-gdpr.ts`
  - API : `deleteAllPreferences()` (clear localStorage + IndexedDB + dispatch event)
  - 2 clics max (Dignity §g — zéro guilt-trip)
  - Snapshot AVANT delete (rollback 60s possible si user regrette)
  - Test Critical 95% + mutation 75% (GDPR)
- **DOD** : exporté dans `index.ts`, tests verts, version bumpée `2.0.0-beta.3`, publish Verdaccio.
- **Estimation** : ~1h30.

#### 1.2 — B-021d SSR-safe Custom Elements (engine)
- **Pourquoi** : SSR error en logs prod (`HTMLElement is not defined`). Critère 3.
- **Scope** :
  - `morphic-provider.ts:38` + `command-palette.ts:325` — guard `typeof HTMLElement === 'undefined' ? class {} : HTMLElement`
  - Test holdout SSR : import depuis Node sans jsdom
- **DOD** : zero SSR error logs post-deploy The-Ermite.
- **Estimation** : ~30min.

**Total Bloc 1 : ~2h. Livrable : engine 2.0.0-beta.3 publié + Delete GDPR + SSR-safe.**

---

### Bloc 2 — Démo crédible (consumer Lab) (~2h30)

#### 2.1 — Lab : UI Reading Focus (B-102 visible)
- **Pourquoi** : axe livré côté engine mais sans UI dans Lab. Critère 4.
- **Scope** : ajouter dans CognitiveSection de `MorphicLab.tsx` :
  - Toggle on/off + slider intensity (low/medium/high)
  - Wire vers `setReadingFocus(intensity)`
  - i18n FR/EN/ES (3 clés dans `lab.morphic.cognitive.reading_focus.*`)
- **Estimation** : ~45min.

#### 2.2 — Lab : resolver WAI Symbols mock (B-104 testable)
- **Pourquoi** : sans resolver, le renderer est silencieux. Critère 4.
- **Scope** :
  - Resolver mock minimal : map 10 BCI indices courants → URLs ARASAAC (CC BY-NC-SA) ou Mulberry (CC BY-SA)
  - Bouton "Test démo" dans CognitiveSection qui wrappe quelques mots du Lab avec `adapt-symbol="N"`
- **Estimation** : ~45min.

#### 2.3 — Lab : badges "behavioral active" axes sans rendu (B-106/107/108/012)
- **Pourquoi** : 4 axes paraissent cassés faute de feedback visuel. Critère 4.
- **Scope** : ajouter badge `morphic-state-badge` (pattern v4) pour chaque axe comportemental :
  - decisionPointsCap : "Cap actif : N points/écran"
  - clickDelay : "Délai actif : Xms · Y clics bloqués"
  - dwellClick : "Dwell actif : Xms"
  - tremor : "Filter actif : window N"
- **Estimation** : ~1h.

**Total Bloc 2 : ~2h30. Livrable : Lab visuel intègre, 0 axe "invisible".**

---

### Bloc 3 — Chrome-safe + Feedback Widget (~3h30)

#### 3.1 — Chrome-safe extension : colorVision + Reading Guide
- **Pourquoi** : axes engine-DOM peuvent altérer logo navbar. Critère 4.
- **Scope** :
  - `colorVision` (SVG filter sur `<html>`) : appliquer le filter à un wrapper `main` au lieu de `<html>` côté engine ; ou ajouter un opt-out sélecteur côté chrome The-Ermite
  - `Reading Guide` (overlay full-viewport) : `pointer-events: none` déjà OK, mais z-index doit rester sous navbar (ou clip-path qui exclut la zone navbar)
- **Estimation** : ~1h30. Peut nécessiter mini-patch engine (`setColorVisionTarget` ?) — à décider après lecture du module.

#### 3.2 — B-021c Feedback Widget D25 (skip Lighthouse CI pour gagner temps)
- **Pourquoi** : D25 architectural requirement Shinkofa. Critère 5.
- **Scope** :
  - Composant `<FeedbackWidget>` dans `Shinkofa-Shared/packages/ui/` (réutilisable)
  - 2 clics max, capture auto (page, action, timestamp, browser), zéro PII
  - Bouton flottant bottom-right, modale simple, POST vers endpoint The-Ermite ou Resend email
- **Estimation** : ~2h.

**Total Bloc 3 : ~3h30. Livrable : démo The-Ermite blindée + Feedback Widget actif.**

---

### Bloc 4 — Dossier NLNet + Release + Article (~4h30)

#### 4.1 — B-027 Pillar article The-Ermite (visibilité L2)
- **Pourquoi** : preuve que le projet a un véhicule de communication. Critère 5 + L2.
- **Scope** : article "Adaptation morphique vs accessibility overlays — pourquoi la FTC a poursuivi AccessiBe en 2024" (~2000 mots) + JSON-LD `SoftwareApplication`.
- **Estimation** : ~1h30 (dictaphone Hibiki + édition).

#### 4.2 — B-028 Audit final GO/NO-GO Quality-Gates Refonte
- **Pourquoi** : preuve auto-évaluation rigoureuse. Critère 3.
- **Scope** : exécuter `/audit` morphic-engine, livrer rapport `docs/Audits/Audit-GO-NO-GO-2026-05-28.md` (4D ≥ 80/100 + Lighthouse ≥95 + axe 0).
- **Estimation** : ~30min.

#### 4.3 — B-025 Dossier NLNet (rédaction)
- **Pourquoi** : c'est l'artefact qui détermine le financement. Le rest n'est que support.
- **Scope** :
  - Template NLNet 2026 (récupérer depuis nlnet.nl/propose)
  - Sections : Description (2 pages) — Comparison existing solutions — Plan & deliverables — Team & background — Budget
  - Liens vers : repo GitHub, démo live, présentation HTML, audit GO/NO-GO, article pillar
  - Insister sur 3 différentiateurs : tri-layer architecture (TS+Rust+Effect), 18 axes (vs 3-5 concurrents), Dignity-first (vs accessibility overlays)
- **Estimation** : ~2h30 (rédaction collaborative Jay+Takumi).

**Total Bloc 4 : ~4h30. Livrable : dossier NLNet soumis avant 2026-06-01.**

---

## Hors scope NLNet (différés post-financement)

| Brick | Pourquoi différé |
|-------|------------------|
| B-012b language complexity | Pas critique pour démo NLNet |
| B-012c Lint AST | Attend composants `<morphic-step>` |
| B-014 | **REDONDANT** — B-109 livre déjà Recovery Mode. À nettoyer du PET. |
| B-020 Web Workers | Perf, pas bloquant fonctionnel |
| B-022 OTel Telemetry | Pas critique submission |
| B-023 GPII import | Différentiateur, mais pas bloquant v2.0.0 |
| B-029 Release v2.0.0 publique | Peut se faire post-NLNet (tag + npm + GitHub release) |

---

## Stale files à committer en début de J1

`git status` morphic-engine montre :
- `packages/adapter/package.json` (modifié, non commité)
- `pnpm-lock.yaml` (modifié)
- `.npmrc` (untracked)
- `packages/adapter/LICENSE` (untracked, AGPL)
- `packages/engine/LICENSE` (untracked, AGPL)
- `packages/engine/README.md` (untracked)

Audit B-026 originale. À nettoyer en début de J1 (commit `chore(packages): finalize LICENSE + README + .npmrc`).

---

## Ce qu'il faut emporter dans la session fraîche

1. **Lire en premier** : `docs/CDC.md`, ce fichier (`docs/Plan-NLNet-Submission.md`), `docs/PET.md` §6 Roadmap (statut bricks)
2. **Charger contexte Obsidian** : `_Cross-Project.md`, `_Index.md`, `Morphic-Engine.md`, `Morphic-Engine-Notes-Jay.md`
3. **Lire** : `Session-2026-05-24-003.md` (contexte v5 chrome-safe) + `Session-2026-05-24-004.md` (cette session, à créer en clôture)
4. **Démarrer par** : tâche 1.1 (B-024b Delete GDPR engine) après commit des stale files

---

## Critères de succès du sprint

- Dossier NLNet soumis avant 2026-06-01 (BLOCKING deadline externe)
- Démo Lab : 0 axe "invisible" ou "non-testable"
- Engine : Delete GDPR opérationnel + SSR-safe
- Feedback Widget actif sur démo (preuve D25)
- Article pillar publié sur The-Ermite (preuve véhicule comm)
- Audit GO/NO-GO ≥ 80/100 4D

Si les 6 critères passent : probabilité GO NLNet ≈ 70-80%.
