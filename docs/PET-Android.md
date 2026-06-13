# PET — Module Morphique, cible Android native (Kotlin / Compose)

**Version** : 0.1.0 | **Date création** : 2026-06-13 | **Statut** : Active (roadmap, briques non démarrées)
**Parent** : `docs/CDC.md` §4.4 (cible Android native) | **PET web** : `docs/PET.md` (track séparé, non impacté)

> Journal d'exécution du portage Android. Une nouvelle CIBLE du même module, pas un nouveau produit.
> Même dépôt, sous-dossier Gradle `android/` isolé du workspace pnpm.
> §6 Roadmap mis à jour à CHAQUE brique — pas en fin de session.

---

## 1. Périmètre de cette itération

**Inclus** : socle sensoriel natif + onboarding digne + distribution.
- Axes : thème, contraste, taille de police, motion, densité (miroir des axes web B-007→B-011).
- Onboarding sensoriel-AVANT-identité (Dignity §a) — le différenciateur.
- Persistance locale (DataStore), livraison via Compose, distribution AAR.

**Différé (phases ultérieures, hors cette itération)** :
- Axes cognitifs, complexité de langage, aide à la lecture, daltonisation corrective.
- Modulation par profil holistique (Human Design / neurodiversité).
- Sync E2E chiffrée (réutilisera `wasm-core` via binding), backend Phoenix.
- iOS (SwiftUI).

## 2. Principe d'architecture (rappel CDC §4.4)

Réutilisation des **tokens**, pas du code. Style Dictionary émet une cible Kotlin/Compose
depuis la source DTCG partagée. Cœur logique réécrit en Kotlin pur, testé en miroir du web.
Aucun pont WASM / moteur JS embarqué dans cette itération.

## 3. Classification de risque (par brique)

| Brique | Risque | Justification |
|--------|--------|---------------|
| A-0 Scaffold Gradle + CI | Tooling | Pas de logique métier |
| A-1 Pipeline tokens Compose | Sensitive | Source de vérité partagée — une erreur casse le thème |
| A-2 Axes sensoriels (logique) | Sensitive | Logique d'adaptation, validation enum fermée |
| A-3 Persistance DataStore | Sensitive | Données utilisateur locales |
| A-4 MorphicProvider (Compose) | Sensitive | Livraison runtime à l'UI hôte |
| A-5 Onboarding digne | **Critical** | Contrat Dignity §a (sensoriel AVANT identité) BLOCKING |
| A-6 Distribution AAR | Tooling | Publication artefact |

## 4. Assertions défensives (≥2 par fonction Sensitive/Critical — à écrire au TDG)

| Fonction (cible) | Fichier (prévu) | Assertions |
|------------------|-----------------|------------|
| `setAxis(axis, value)` | `android/morphic/src/.../Axes.kt` | enum fermée rejetée si inconnue + valeur non-nulle + persistance échouée non-fatale |
| `MorphicPreferences (DataStore)` | `.../store/MorphicStore.kt` | clé manquante → défaut (jamais throw) + écriture corrompue tolérée (try/recover) |
| `canCollectIdentity()` | `.../onboarding/Onboarding.kt` | identity_collected === false AVANT sensoriel terminé (Dignity §a) + ordre forcé |
| `applyTokens(scheme)` | `.../theme/MorphicTheme.kt` | scheme non-null + fallback Material 3 si token manquant |

## 5. Veille

[VEILLE] Kotlin 2.4 + Jetpack Compose Material 3 + DataStore + targetSdk 35 / minSdk 24 verifie 2026-06-12 via conception RoK Message Designer (ecosystem standard) + 2026-06-13 via developer.android.com (Compose accessibility, scalable-content)
[VEILLE] style-dictionary compose/object format (genere objet Kotlin Compose) verifie 2026-06-13 via github.com/style-dictionary/style-dictionary PR#599 — confirme la reutilisation des tokens vers Android
[VEILLE] Kover (couverture Kotlin, semantique-aware vs JaCoCo) + PIT/pitest-kotlin (mutation) verifie 2026-06-13 via github.com/Kotlin/kotlinx-kover + gradle-pitest-plugin

Versions exactes (AGP, Compose BOM, Kotlin, DataStore, Kover, PIT) **figées au B-0 scaffold** avec veille datée dédiée.

### 5.bis Stratégie de couverture (piège Compose — BLOCKING)

Le code `@Composable` est en grande partie **généré par le compilateur** : aucun outil
de couverture ne peut le mesurer fiablement (limite connue 2026). Conséquence sur
l'architecture, pas optionnelle :

- Toute **logique** (axes, validation enum, machine d'onboarding, guards, mapping tokens)
  vit dans des classes **Kotlin pures** (non-Composable) → mesurée par Kover, gate 90/95%.
- Les **Composables** restent **fins** (rendu seul, zéro logique) → testés par Compose UI
  test + assertions semantics, **pas** soumis au plancher de couverture.

C'est exactement la séparation logique/UI déjà décidée — la limite outillage la rend obligatoire.

---

## 6. Roadmap — Briques

Format : une ligne par brique. **Mise à jour obligatoire à chaque brique.**

### Phase A — Socle sensoriel Android

| ID | Brique | CDC ref | Statut | Coverage cible | Veille requise | Commit | Date |
|----|--------|---------|--------|----------------|----------------|--------|------|
| A-0 | Scaffold sous-projet Gradle `android/` (library module Kotlin, isolé du workspace pnpm) + CI GitHub Actions (build + android lint + Kover + tests) + versions figées (catalogue `libs.versions.toml`). Minimal : Compose/DataStore/detekt/PIT différés à leurs briques (anti-overengineering). `namespace=com.theermite.morphic`. Licence : AGPL conservée, revue à A-6. | §4.4 | 🟢 Done (CI verte run 27467891375, 3m18s) | Tooling 60% | AGP 9.0.1, Gradle 9.1.0, JDK 21, Kover 0.9.8, SDK 35/24 (figé 2026-06-13) | 2036f3d | 2026-06-13 |
| A-1 | Pipeline tokens : format Style Dictionary `kotlin/object` **custom** (le built-in `compose/object` wrappe Color/.dp/.sp, inadapté aux enums string) → `MorphicTokens.kt` généré depuis la source DTCG partagée. `kotlinOutDir` route le .kt dans `android/` ; `gen-android-tokens.mjs` + gate CI `git diff --exit-code` (fraîcheur). Parité prouvée : 12 tests TS (parité vs `morphic.json`) + test JVM `MorphicTokensTest`. | §4.4 | 🟢 Done (CI verte : CI 27481761672 + android 27481761666) | Sensitive 90% — atteint (build-tokens.ts 100% lignes/fn, 93.9% stmts) | style-dictionary@5.4.1 custom format (2026-06-14) | 4e2dc73 | 2026-06-14 |
| A-2 | Axes sensoriels — logique Kotlin pure : thème / contraste / taille police / motion / densité. API `setX`/`getX`/`resolveAutoX` + validation enum fermée. TDG miroir des axes web B-007→B-011. | §4.4 | ⬜ Pending | Sensitive 90% | — | — | — |
| A-3 | Persistance DataStore (Preferences) : sauvegarde/restauration des axes entre sessions. Clé manquante → défaut, corruption tolérée. | §4.4 | ⬜ Pending | Sensitive 90% | DataStore API | — | — |
| A-4 | `MorphicProvider` composable + CompositionLocal : livraison de l'état résolu à l'UI hôte. Pont vers Material 3 (thème, font scale, reduced motion natifs orchestrés). Composable fin (rendu seul). | §4.4 | ⬜ Pending | Sensitive 90% (logique) / UI test (Composable) | Compose CompositionLocal, Material 3 | — | — |
| A-5 | Onboarding sensoriel-AVANT-identité : machine d'état (idle→thème→motion→densité→completed) + guard `canCollectIdentity()`. Contrat Dignity §a BLOCKING. **Accessibilité du module** : TalkBack lit chaque étape, cibles ≥48dp, 0 issue Accessibility Scanner (CDC §6.bis). | §4.4 | ⬜ Pending | **Critical 95%** (Kover, logique pure) + MC/DC sur le guard | — | — | — |
| A-6 | Distribution : publication AAR sur Maven Central + app exemple (sample) démontrant le drop-in. Dry-run avant publish réel (leçon wasm-pack). | §4.4 | ⬜ Pending | Tooling 60% | Maven Central publish, AGP publishing | — | — |

### Phases ultérieures (différées — hors itération courante)

| ID | Brique | Statut |
|----|--------|--------|
| A-1xx | Axes cognitifs (decision points cap, complexité langage) | ⬜ Deferred |
| A-1xx | Aide à la lecture + daltonisation corrective (miroir B-101→B-104) | ⬜ Deferred |
| A-2xx | Modulation par profil holistique (HD / ND) | ⬜ Deferred |
| A-3xx | Sync E2E chiffrée (binding vers `wasm-core`) + backend Phoenix | ⬜ Deferred |
| A-4xx | Cible iOS (SwiftUI) | ⬜ Deferred |

**Statuts possibles** : ⬜ Pending · 🟡 In progress · 🔵 Tests written (red) · 🟢 Done · 🔴 Blocked · ⬜ Deferred

---

## 7. Historique

- **2026-06-13** : création. Décision Jay : même dépôt, sous-dossier Android ; réutilisation tokens (pas le code) ; sensoriel d'abord. Veille architecture faite (Kotlin/Compose, KMP écarté, tokens via Style Dictionary). Session-2026-06-13-003.
- **2026-06-13** : audit des docs (demande Jay). Architecture validée (Style Dictionary `compose/object` confirmé). Ajouts : NFR Android (CDC §6.bis), classification risque Android (CDC §7), outillage Kover/PIT, piège couverture Compose (§5.bis), accessibilité du module, décisions ouvertes (§8).
- **2026-06-14** : A-1 livrée (commit `4e2dc73`). Format Kotlin **custom** retenu (le built-in `compose/object` enveloppe Color/.dp/.sp, inadapté aux axes string). `MorphicTokens.kt` généré depuis la source DTCG unique ; gate CI de fraîcheur ; parité prouvée côté TS (12 tests) et côté Android (test JVM). CI verte (CI 27481761672 + android 27481761666). Session-2026-06-14-001.

## 8. Décisions ouvertes (à trancher avec Jay avant A-0)

| # | Décision | Options | Reco Takumi |
|---|----------|---------|-------------|
| 1 | **Licence de la brique Android** | AGPL-3.0 (héritée, cohérence NLNet) **vs** Apache-2.0 / MPL-2.0 (adoption tierce) | À trancher : l'AGPL freine toute adoption commerciale d'une brique réutilisable. Si l'objectif Android = réutilisation large, une licence permissive sert mieux le but. Si l'objectif = vitrine open-source pure, AGPL reste cohérente. |
| 2 | **`groupId` Maven** | `com.theermite.morphic` / `com.shinkofa.morphic` / autre | Aligner sur le scope npm `@theermite/*` → `com.theermite.morphic`. |
| 3 | **Axe font-family (dyslexie) dans le socle ?** | Inclure en A-2 (miroir web B-112) vs différer | Différer : les polices (OpenDyslexic, Atkinson) ajoutent du poids ; le socle sensoriel d'abord, font-family en phase suivante. |
