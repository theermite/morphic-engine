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

Versions exactes (AGP, Compose BOM, Kotlin, DataStore) **figées au B-0 scaffold** avec veille datée dédiée.

---

## 6. Roadmap — Briques

Format : une ligne par brique. **Mise à jour obligatoire à chaque brique.**

### Phase A — Socle sensoriel Android

| ID | Brique | CDC ref | Statut | Coverage cible | Veille requise | Commit | Date |
|----|--------|---------|--------|----------------|----------------|--------|------|
| A-0 | Scaffold sous-projet Gradle `android/` (library module Kotlin + Compose) isolé du workspace pnpm + CI lane (build + lint ktlint/detekt + tests) + versions figées | §4.4 | ⬜ Pending | Tooling 60% | AGP, Kotlin, Compose BOM, DataStore (à figer) | — | — |
| A-1 | Pipeline tokens : cible Style Dictionary → fichier Kotlin/Compose depuis la source DTCG partagée. Test de parité valeurs web↔Android. | §4.4 | ⬜ Pending | Sensitive 90% | style-dictionary cible kotlin/compose | — | — |
| A-2 | Axes sensoriels — logique Kotlin pure : thème / contraste / taille police / motion / densité. API `setX`/`getX`/`resolveAutoX` + validation enum fermée. TDG miroir des axes web B-007→B-011. | §4.4 | ⬜ Pending | Sensitive 90% | — | — | — |
| A-3 | Persistance DataStore (Preferences) : sauvegarde/restauration des axes entre sessions. Clé manquante → défaut, corruption tolérée. | §4.4 | ⬜ Pending | Sensitive 90% | DataStore API | — | — |
| A-4 | `MorphicProvider` composable + CompositionLocal : livraison de l'état résolu à l'UI hôte. Pont vers Material 3 (thème, font scale, reduced motion natifs orchestrés). | §4.4 | ⬜ Pending | Sensitive 90% | Compose CompositionLocal, Material 3 | — | — |
| A-5 | Onboarding sensoriel-AVANT-identité : machine d'état (idle→thème→motion→densité→completed) + guard `canCollectIdentity()`. Contrat Dignity §a BLOCKING. | §4.4 | ⬜ Pending | **Critical 95%** + MC/DC sur le guard | — | — | — |
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
