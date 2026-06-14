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

Versions exactes (AGP, Compose BOM, Kotlin, DataStore, Kover, PIT) figées **à la brique qui les introduit**, veille datée dédiée (A-0 : AGP/Gradle/Kover/SDK ; A-1 : Style Dictionary ; A-3 : DataStore/coroutines ; A-4 : Compose/Kotlin).

**Correction A-4 (2026-06-14)** : la veille de conception annonçait « Kotlin 2.4 ». La réalité est **Kotlin 2.2.10** — AGP 9.0.1 embarque KGP 2.2.10 et le compilateur Compose doit matcher exactement la version Kotlin. Compose figé à **1.10.6** (BOM 2026.03.01) car la 1.11 exige AGP 9.2 + compileSdk 37 (au-delà de notre chaîne AGP 9.0.1).

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
| A-2 | Axes sensoriels — logique Kotlin pure : `axes/Axes.kt` (5 enums fermées liées aux tokens A-1 + membre `AUTO`, `resolve(SystemSignals)`, `fromValue` poka-yoke) + `state/MorphicState.kt` (porteur mémoire, `setX(String)` valide+rejette l'inconnu, `getX`, `resolvedX(signals)`). Résolution `auto` = signal système **en paramètre** (lecture déléguée à A-4). Divergence Android documentée : pas de signal « less contrast » → AUTO contraste = MORE/NO_PREFERENCE. TDG miroir B-007→B-011. | §4.4 | 🟢 Done (CI verte : CI 27482187405 + android 27482187410) | Sensitive 90% — logique pure 100% testée (chaque méthode + 2 branches/resolve) | aucune dépendance ajoutée (junit/stdlib) | 7af8845 | 2026-06-14 |
| A-3 | Persistance DataStore (Preferences) : `persistence/MorphicStore.kt` — `save(state)` écrit un snapshot 1-string-par-axe (miroir web `idb-storage`), `load()` reconstruit via les setters validés A-2 derrière un garde `fromValue != null`. Clé manquante OU valeur corrompue → axe reste à `AUTO` (jamais d'exception). **DataStore injecté** (pas créé) → couche Kotlin pure, testable JVM sur fichier temp (pas d'émulateur), mesurable Kover. TDG miroir B-015. | §4.4 | 🟢 Done (CI verte : CI 27482892303 + android 27482892299) | Sensitive 90% — 5 tests (vide→défauts, round-trip, corruption tolérée, clés partielles, écrasement) | androidx.datastore:datastore-preferences@1.2.1 + kotlinx-coroutines-test@1.9.0 (figé sur la 1.9.0 transitive de DataStore, 2026-06-14) | 7a380ef | 2026-06-14 |
| A-4 | `MorphicProvider` composable + `LocalMorphic` CompositionLocal : livraison de l'état résolu à l'UI hôte, pont Material 3 (clair/sombre + mouvement réduit orchestrés). **Split §5.bis** : logique pure `theme/MorphicResolution.kt` (`systemSignals` raw→SystemSignals ; `resolveAll` → `ResolvedMorphic` ; `useDarkColorScheme`) mesurée Kover ; Composable fin (`MorphicProvider.kt`) non flooré, validé en app réelle. Parité web : expose les choix résolus, **n'impose pas** les valeurs numériques (l'hôte décide le rendu). Robolectric différé (CI JVM-only). | §4.4 | 🟢 Done (CI verte : CI 27483301232 + android 27483301235) | Sensitive 90% — 6 tests logique pure (seuil reduce-motion, pass-through, resolveAll AUTO+concret, décision dark) | compose-compiler kotlin 2.2.10 + compose-bom 2026.03.01 (ui 1.10.6 / material3 1.4.0) ; compileSdk 35→36 (2026-06-14) | 8949c6c | 2026-06-14 |
| A-5 | Onboarding sensoriel-AVANT-identité : machine d'état pure `onboarding/Onboarding.kt` (idle→thème→motion→densité→completed) + guard pur `canCollectIdentity(state)` (contrat Dignity §a BLOCKING) ; gardes d'ordre AVANT mutation (snapshot-stable), reset RGPD-friendly. Écran Compose fin `MorphicOnboardingScreen.kt` accessible (titre heading TalkBack, contentDescription/contrôle, cibles ≥48dp) — copie fournie par l'hôte (i18n hôte), non flooré §5.bis, validé en app réelle (TalkBack + Accessibility Scanner = validation locale Jay). Miroir web `onboarding.ts`. | §4.4 | 🟢 Done (CI verte : CI 27495115010 + android 27495115028) | **Critical — 100% mesuré** (rapport Kover, artefact run 27495606377 : `MorphicOnboarding` 37/37, `MorphicOnboarding$Companion` 1/1, `OnboardingKt`/`OnboardingState`/`OnboardingStep` 100%) + **MC/DC guard 4 combos** (TT/TF/FT/FF). Composable + DTOs UI à 0% = couche non mesurable §5.bis (validée en vraie app). Couverture auditable via artefact CI (§8 #4). | aucune dépendance ajoutée (compose-bom déjà épinglé A-4) | 24cc0b9 | 2026-06-14 |
| A-6 | Distribution : pipeline de publication Maven Central (vanniktech) + app exemple `:sample` (drop-in provider+onboarding+guard). **Publish réel différé** (compte Central Portal + namespace + GPG + secrets côté Jay, cf. `android/PUBLISHING.md`). Licence module **Apache-2.0** (override sous-arbre, web reste AGPL). Signature conditionnée à la clé (dry-run local non signé). | §4.4 | 🟢 Done (CI verte run 27499275603 : dry-run `publishToMavenLocal` + `:sample:assembleDebug` verts) | Tooling 60% — config + dry-run prouvés CI (pas de tests unitaires : outillage) | vanniktech maven-publish 0.36.0 + activity-compose 1.13.0 (vérifiés 2026-06-14) | 8b65be3 | 2026-06-14 |

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
- **2026-06-14** : A-2 livrée (commit `7af8845`). Logique des 5 axes en Kotlin pur (`Axes.kt` + `MorphicState.kt`), miroir du web, sans framework Android → mesurable Kover. Décision : signal système passé en paramètre de `resolve` (lecture = A-4). Validation enum fermée + rejet de l'inconnu. CI verte (CI 27482187405 + android 27482187410). Session-2026-06-14-001.
- **2026-06-14** : A-3 livrée (commit `7a380ef`). Persistance via Jetpack DataStore Preferences (`MorphicStore.kt`). **Décision archi** : DataStore injecté dans `MorphicStore` (pas créé en interne) → couche pure Kotlin, testée sur fichier temp JVM (pas d'émulateur), mesurable Kover comme A-1/A-2. `load()` tolère clé manquante et valeur corrompue (garde `fromValue`, jamais d'exception). Veille : `datastore-preferences@1.2.1` + `coroutines-test@1.9.0` (aligné sur la coroutines-core 1.9.0 transitive de DataStore). 5 tests TDG. CI verte (CI 27482892303 + android 27482892299). Session-2026-06-14-001.
- **2026-06-14** : A-6 livrée (commits `d09cc7b` licence + `8cc16d4` pipeline+sample + `221363a` CI + `8b65be3` fix signature). **Phase A terminée.** Pipeline de publication Maven Central via vanniktech 0.36.0 (Central Portal, AGP 9, vérifié CHANGELOG) : coordinates `com.theermite.morphic:morphic:0.1.0`, POM Apache-2.0, zéro PII (dev = handle public). App `:sample` (provider A-4 + onboarding A-5 + guard) = vraie app de validation TalkBack/Accessibility Scanner ; activity-compose 1.13.0. **Décisions #1 (Apache-2.0) + #2 (groupId) tranchées par Jay.** **Publish réel différé** : checklist `android/PUBLISHING.md` (compte Central Portal + namespace `com.theermite` + GPG + 4 secrets GitHub) ; workflow `release-android.yml` inerte sur tag. **Itération CI** : 1er run rouge (`signMavenPublication` sans signataire sur le dry-run local) → signature conditionnée à la présence de clé (`8b65be3`) → vert (run 27499275603). Pas de SDK sur le VPS, tout prouvé CI. Session-2026-06-14-002.
- **2026-06-14** : A-5 livrée (commit `24cc0b9`). Onboarding sensoriel-AVANT-identité, **brique la plus exigeante de la phase**. Machine d'état pure (`Onboarding.kt`) + guard `canCollectIdentity(state)` (contrat Dignity §a BLOCKING) — miroir du web `onboarding.ts`. **Décision Jay** : livrer aussi un écran Compose fin accessible (`MorphicOnboardingScreen.kt`) — pas seulement la logique. Split §5.bis : logique floorée Kover (MC/DC 4 combos sur le guard, gardes d'ordre AVANT mutation), Composable non flooré validé en vraie app. La copie est fournie par l'hôte (i18n hôte) → parité « le module expose, l'hôte rend ». Reset préserve les choix d'axes (RGPD). Aucune dépendance ajoutée. CI verte (CI 27495115010 + android 27495115028). **Limite honnête** : la CI génère le rapport Kover mais ne l'affiche pas et aucune borne ne bloque < 95% → couverture prouvée par construction (chemins tracés), pas lue. Auditabilité = §8 décision #3. Session-2026-06-14-002.
- **2026-06-14** : A-4 livrée (commit `8949c6c`). Premier usage de Compose. `MorphicProvider` + `LocalMorphic` livrent l'état résolu à l'UI ; pont Material 3 clair/sombre. **Split §5.bis appliqué** : 3 fonctions pures (`MorphicResolution.kt`) testées Kover, Composable fin non flooré. **Décision** : Robolectric différé (CI JVM-only) — Composable validé en app réelle. **Parité** : le provider expose les choix, n'impose pas les valeurs numériques (le web non plus — l'hôte décide le rendu). **Veille corrigée** (POMs Maven en direct, fetchs hallucinaient) : Kotlin 2.2.10 (= KGP embarqué AGP 9.0.1), compose-bom 2026.03.01 (ui 1.10.6 / material3 1.4.0, dernier compatible AGP 9.0.x), compileSdk 35→36. 6 tests TDG. CI verte (CI 27483301232 + android 27483301235). Session-2026-06-14-001.

## 8. Décisions ouvertes (à trancher avec Jay avant A-0)

| # | Décision | Options | Reco Takumi |
|---|----------|---------|-------------|
| 1 | **Licence de la brique Android** | AGPL-3.0 **vs** Apache-2.0 / MPL-2.0 | **TRANCHÉ 2026-06-14 → Apache-2.0** (décision Jay). Le but = réutilisation large comme drop-in ; une licence permissive sert ce but. `android/morphic/LICENSE` + mention README ; le web reste AGPL. |
| 2 | **`groupId` Maven** | `com.theermite.morphic` / `com.shinkofa.morphic` | **TRANCHÉ 2026-06-14 → `com.theermite.morphic`** (décision Jay). Aligné scope npm `@theermite/*` + namespace Android. |
| 3 | **Axe font-family (dyslexie) dans le socle ?** | Inclure en A-2 (miroir web B-112) vs différer | Différer : les polices (OpenDyslexic, Atkinson) ajoutent du poids ; le socle sensoriel d'abord, font-family en phase suivante. |
| 4 | **Rendre le plancher Kover auditable** (soulevé A-5) | ~~(a) `koverVerify` borne 95% scopée~~ **impossible** : Kover 0.9.x `KoverVerifyRule` n'a pas de `filters` par règle (vérifié sur l'API publique `KoverReportsConfig.kt`) → un gate « 95% onboarding + 90% module » n'est pas exprimable en une passe. (b) rapport en artefact CI ; (c) statu quo | **TRANCHÉ 2026-06-14 → option (b)** (décision Jay). Le rapport Kover (HTML+XML) est uploadé en artefact sur chaque run `android` → couverture **lisible/auditable**, pas bloquante. Un vrai gate 95%-scopé attend soit un bump Kover (si une version ultérieure ajoute les filtres par règle), soit l'isolation de l'onboarding dans son propre module Gradle — surdimensionné maintenant. |
