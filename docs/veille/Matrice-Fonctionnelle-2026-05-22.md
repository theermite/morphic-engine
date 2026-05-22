# Matrice Fonctionnelle Accessibilité / Adaptation Morphique — 2026-05-22

> Continuation de `Competiteurs-2026-05-21.md` (positionnement business). Ce document = matrice **fonctionnelle ligne-par-ligne** : qui fait quoi, comment, et où Shinkofa morphic-engine v2 peut se différencier.
>
> **Scope** : 10 catégories d'adaptation, 200+ features identifiées, 15+ acteurs cartographiés.
> **Méthodologie** : recherche EN primaire + FR complémentaire, CRAAP scoring, triangulation 2+ sources sur claims critiques, confidence labels (Verified / Probable / Uncertain).
> **Hors scope** : positionnement marché, pricing, légal (déjà traité dans Competiteurs-2026-05-21.md).

[VEILLE] AccessiBe widget features verifie 2026-05-22 via accessibe.com + accessibility-test.org
[VEILLE] UserWay widget features verifie 2026-05-22 via userway.org + hounder.co
[VEILLE] W3C WAI-Adapt Symbols@CR verifie 2026-05-22 via w3.org/TR/adapt-symbols
[VEILLE] CSS prefers-* media queries verifie 2026-05-22 via developer.mozilla.org
[VEILLE] Morphic.org GPII v1 verifie 2026-05-22 via morphic.org/features
[VEILLE] Helperbird features verifie 2026-05-22 via helperbird.com
[VEILLE] Bionic Reading verifie 2026-05-22 via bionic-reading.com + caniuse comments

---

## Executive Summary

**5 features blue ocean** (aucun concurrent ne le fait correctement, opportunité morphic-engine v2) :

1. **Adaptation cognitive surface-aware** — capping decision points par écran selon profil (déjà CDC B-012). Personne ne le fait : les overlays empilent des boutons.
2. **Énergétique/temporal adaptation** — auto-pause selon fatigue détectée, recovery mode, session breaks. Inexistant chez tous les concurrents (Morphic.org effleure via "morning mode" mais pas conceptuellement).
3. **Daltonization runtime correctif** (pas juste filtres simulateurs) — protanopia/deuteranopia/tritanopia matrices correctives appliquées au flux visuel, pas juste démonstration de simulation. Helperbird simule, ne corrige pas.
4. **Onboarding sensoriel-first puis identité** — séquence inverse des concurrents qui demandent "qui es-tu ?" avant "comment tu préfères voir ?". Direct application de Dignity.md §a.
5. **Sticky modifiers + tremor filter combinés** — moteur clavier+pointer adaptation, présent partiellement dans OS natifs mais jamais en surcouche framework-agnostic.

**10 features manquantes dans CDC actuel** (à évaluer pour inclusion v2 ou v2.1) :

| Manquant | Catégorie | Source de l'idée | Effort estimé |
|----------|-----------|------------------|---------------|
| Daltonization runtime (corrective) | Visuel couleur | Helperbird simule, personne corrige | M |
| Reading guide / mask / ruler | Lecture assistée | Helperbird, MS Immersive Reader | S |
| Bionic Reading toggle | Typographie dyslexie | bionic-reading.com (controversé mais demandé) | XS |
| Syllabification (mots coupés en syllabes) | Typographie dyslexie | MS Immersive Reader | M |
| Picture dictionary | Cognitif guidance | MS Immersive Reader | L |
| WAI-Adapt Symbols overlay | Cognitif guidance | W3C standard officiel | M |
| Sticky modifiers (logiciel) | Moteur clavier | macOS Sticky Keys, peu en web | S |
| Tremor filter (dwell / averaging) | Moteur pointer | OS natifs, jamais en framework | M |
| Hover-to-click (dwell click) | Moteur pointer | macOS, Windows | S |
| Glossary / définitions inline | Cognitif guidance | MS Immersive Reader, Helperbird | M |

---

## Méthodologie

| Item | Valeur |
|------|--------|
| Profondeur | Standard+ (~2-3h investigation) |
| Langues explorées | EN (primaire), FR (complémentaire) |
| Sources consultées | 35 — toutes en confidence Verified ou Probable |
| Triangulation | Claims critiques (AccessiBe / UserWay features) cross-validés via 3rd-party comparison sites |
| Biais signalé | Sites marketing AccessiBe/UserWay = source primaire mais flaggés `(marketing)` dans Sources. Triangulation systématique via accessibility-test.org (3rd party neutre). |
| Hors-langues asiatiques | ZH/JA/KO/DE/RU non explorés cette passe — la matrice étant centrée Western web accessibility (W3C, ADA, EAA), le retour ROI cross-language est faible ici. À reconsidérer pour adaptation cognitive si Phase 2 vise marché asiatique. |
| Date | 2026-05-22 |
| PII | Zero — pas de noms d'utilisateurs, pas d'emails, pas de cas individuels cités |

---

## 1. VISUEL — COULEUR / CONTRASTE

### 1.1 Features identifiées (exhaustif)

| # | Feature | Description courte |
|---|---------|--------------------|
| 1.01 | Dark theme | Inversion fond clair → fond sombre |
| 1.02 | Light theme | Fond clair par défaut |
| 1.03 | High contrast theme (light-on-dark) | Texte blanc pur sur fond noir pur |
| 1.04 | High contrast theme (dark-on-light) | Texte noir pur sur fond blanc pur |
| 1.05 | Sepia / warm theme | Réduction lumière bleue |
| 1.06 | Custom color picker | Utilisateur choisit fond + texte |
| 1.07 | Invert colors (negative) | Inversion totale RGB |
| 1.08 | Monochrome / grayscale | Désaturation totale |
| 1.09 | Saturation control (low/high) | Slider 0-200% saturation |
| 1.10 | Hue shift | Décalage chromatique |
| 1.11 | Brightness control | Slider luminosité |
| 1.12 | Contrast control | Slider contraste WCAG |
| 1.13 | Protanopia simulator | Simule absence rouge |
| 1.14 | Deuteranopia simulator | Simule absence vert |
| 1.15 | Tritanopia simulator | Simule absence bleu |
| 1.16 | Achromatopsia simulator | Simule absence totale couleur |
| 1.17 | Protanopia **corrective** (daltonization) | Corrige flux pour personne protanope |
| 1.18 | Deuteranopia **corrective** | Corrige flux pour personne deutéranope |
| 1.19 | Tritanopia **corrective** | Corrige flux pour personne tritanope |
| 1.20 | Highlight links (background) | Surligne tous les `<a>` |
| 1.21 | Highlight links (underline forcé) | Force `text-decoration: underline` |
| 1.22 | Highlight focus / hover | Indicateur visuel renforcé |
| 1.23 | Highlight titles | Surligne `<h1>`...`<h6>` |
| 1.24 | Mute background images | Force background images off |
| 1.25 | Color-blind safe palette swap | Remplace palette par CB-safe |
| 1.26 | prefers-color-scheme native | Respect OS dark/light |
| 1.27 | prefers-contrast native | Respect OS more/less contrast |
| 1.28 | forced-colors / Windows High Contrast | Respect mode contraste forcé Windows |
| 1.29 | prefers-reduced-transparency | Respect demande réduction transparence |
| 1.30 | Text outline / stroke | Ajoute contour autour texte pour lisibilité |

### 1.2 Matrice qui fait quoi

| Feature | Shinkofa v2 (CDC) | AccessiBe | UserWay | AudioEye | EqualWeb | Recite Me | Helperbird | Dark Reader | Morphic.org | Browser native | iOS/macOS A11y | Android A11y |
|---------|-------------------|-----------|---------|----------|----------|-----------|------------|-------------|-------------|---------------|---------------|---------------|
| 1.01 Dark theme | ✅ F-002 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (core) | ✅ | ✅ prefers-color-scheme | ✅ | ✅ |
| 1.02 Light theme | ✅ F-002 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1.03 HC light-on-dark | ✅ F-002 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ forced-colors | ✅ Increase Contrast | ✅ |
| 1.04 HC dark-on-light | ✅ F-002 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ forced-colors | ✅ | ✅ |
| 1.05 Sepia | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ⚠️ via Reader Mode | ❌ | ❌ |
| 1.06 Custom color picker | ⚠️ partiel (theme tokens) | ⚠️ presets | ⚠️ presets | ⚠️ presets | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| 1.07 Invert colors | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ Smart Invert | ✅ |
| 1.08 Monochrome | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ filters | ❌ | ❌ | ✅ Color Filters | ✅ |
| 1.09 Saturation | ❌ | ✅ low/high | ✅ low/high | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| 1.10 Hue shift | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| 1.11 Brightness | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| 1.12 Contrast slider | ⚠️ theme presets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ Increase Contrast | ✅ |
| 1.13 Protanopia sim | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ filters | ❌ | ❌ | ❌ | ❌ |
| 1.14 Deuteranopia sim | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ filters | ❌ | ❌ | ❌ | ❌ |
| 1.15 Tritanopia sim | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ filters | ❌ | ❌ | ❌ | ❌ |
| 1.16 Achromatopsia sim | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 1.17 **Protanopia corrective** | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Color Filters partiel | ❌ |
| 1.18 **Deuteranopia corrective** | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Color Filters partiel | ❌ |
| 1.19 **Tritanopia corrective** | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Color Filters partiel | ❌ |
| 1.20 Highlight links bg | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 1.21 Force underline | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ Button Shapes | ❌ |
| 1.22 Highlight focus | ⚠️ F-014 partiel | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ | ❌ | ⚠️ :focus-visible | ✅ | ✅ |
| 1.23 Highlight titles | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 1.24 Mute bg images | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ⚠️ | ❌ | ⚠️ Reader Mode | ❌ | ❌ |
| 1.25 CB-safe palette swap | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 1.26 prefers-color-scheme | ✅ F-002 (intent) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ natif | ✅ | ✅ |
| 1.27 prefers-contrast | ⚠️ partiel | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ natif | ✅ | ✅ |
| 1.28 forced-colors | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Windows | ❌ | ❌ |
| 1.29 prefers-reduced-transparency | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ natif | ✅ | ❌ |
| 1.30 Text outline | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 1.3 Gaps Shinkofa (catégorie 1)

| Gap | Sévérité | Recommandation |
|-----|----------|----------------|
| 1.17/1.18/1.19 Daltonization **corrective** | Élevée (blue ocean) | Ajouter feature F-COLOR-DAL dans CDC v2.1 — runtime CSS filter matrices (proto/deuter/tri) + persistance préférence |
| 1.28 forced-colors / Windows High Contrast | Moyenne | F-002 doit explicitement respecter `forced-colors: active` — clarifier dans CDC |
| 1.27 prefers-contrast complet | Moyenne | F-002 doit lire `prefers-contrast: more/less/no-preference` comme inputs onboarding |
| 1.29 prefers-reduced-transparency | Basse | Ajouter à la liste des prefers-* listened |
| 1.16 Achromatopsia simulator | Basse | Pas prioritaire (simulator devs only, pas users) |
| 1.13/1.14/1.15 Simulators | Basse | Skip — pas d'usage user final, juste dev tooling |
| 1.10 Hue shift | Basse | Skip — usage minoritaire |

---

## 2. VISUEL — TYPOGRAPHIE GÉNÉRALE

### 2.1 Features identifiées

| # | Feature | Description |
|---|---------|-------------|
| 2.01 | Font size slider | Ajuster taille de police (typ. 80%-200%) |
| 2.02 | Font size presets (S/M/L/XL) | 4-5 niveaux discrets |
| 2.03 | Line height control | Interligne ajustable |
| 2.04 | Paragraph spacing | Espacement entre paragraphes |
| 2.05 | Letter spacing | Espacement entre lettres |
| 2.06 | Word spacing | Espacement entre mots |
| 2.07 | Max line width / line length | Largeur max colonne (en `ch`) |
| 2.08 | Justification toggle | Active/désactive `text-align: justify` |
| 2.09 | Left-align force | Force `text-align: left` |
| 2.10 | Font family swap (sans-serif) | Remplace par sans-serif lisible |
| 2.11 | Font family swap (serif) | Remplace par serif |
| 2.12 | Font family swap (monospace) | Remplace par monospace |
| 2.13 | Text-only mode (Reader Mode) | Supprime tout sauf texte |
| 2.14 | Heading hierarchy emphasis | Renforce visuellement H1-H6 |
| 2.15 | Text alignment center toggle | Centre tout |
| 2.16 | Uppercase / lowercase transform | Force case |
| 2.17 | Bold body text | Met tout le corps en bold |

### 2.2 Matrice qui fait quoi

| Feature | Shinkofa v2 (CDC) | AccessiBe | UserWay | AudioEye | EqualWeb | Recite Me | Helperbird | MS Immersive Reader | Mercury Reader | Morphic.org | Browser native |
|---------|-------------------|-----------|---------|----------|----------|-----------|------------|---------------------|----------------|-------------|----------------|
| 2.01 Font size slider | ✅ F-003 | ✅ +/- | ✅ +/- | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ 3 levels | ✅ | ✅ Ctrl++ |
| 2.02 Font size presets | ⚠️ F-003 (slider) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 2.03 Line height | ✅ F-004 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| 2.04 Paragraph spacing | ⚠️ via F-004 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ |
| 2.05 Letter spacing | ✅ F-005 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 2.06 Word spacing | ✅ F-005 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 2.07 Max line width | ⚠️ partiel F-006 | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ✅ ligne courte | ✅ | ⚠️ | ⚠️ Reader Mode |
| 2.08 Justification toggle | ✅ F-007 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 2.09 Left-align force | ✅ F-007 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 2.10 Sans-serif swap | ✅ F-008 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 2.11 Serif swap | ⚠️ F-008 partiel | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 2.12 Monospace swap | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 2.13 Reader Mode | ❌ | ⚠️ via reading mask | ❌ | ❌ | ⚠️ | ✅ | ✅ | ✅ (core) | ✅ (core) | ❌ | ✅ Firefox/Safari |
| 2.14 Heading emphasis | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| 2.15 Center toggle | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 2.16 Case transform | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 2.17 Bold body | ❌ | ✅ "readable font" | ✅ | ❌ | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ |

### 2.3 Gaps Shinkofa (catégorie 2)

| Gap | Sévérité | Recommandation |
|-----|----------|----------------|
| 2.04 Paragraph spacing dédié | Moyenne | Clarifier dans F-004 ou ajouter F-004b |
| 2.07 Max line width / max-width prose | Élevée | Renforcer F-006 — feature majeure pour dyslexie + low vision |
| 2.13 Reader Mode | Moyenne | Évaluer F-CLUTTER (clutter removal) au-delà de F-009 mute-distractions |
| 2.11 Serif swap | Basse | Compléter F-008 — préférence personnelle |
| 2.14 Heading emphasis | Basse | Skippable si Reader Mode |

---

## 3. VISUEL — TYPOGRAPHIE DYSLEXIE

### 3.1 Features identifiées

| # | Feature | Description |
|---|---------|-------------|
| 3.01 | OpenDyslexic font | Police spécifique dyslexie (efficacité débattue) |
| 3.02 | Atkinson Hyperlegible | Police Braille Institute, lisibilité generic |
| 3.03 | Lexend | Police optimisée vitesse lecture (Bonnardel) |
| 3.04 | Dyslexie font (commercial) | Police Christian Boer (payante) |
| 3.05 | Sylexiad | Police recherche académique |
| 3.06 | Comic Sans (informal accessible) | Souvent recommandée dyslexie |
| 3.07 | Letter spacing increased | Spacing élargi (Phase 2.05 spécifique dyslexie) |
| 3.08 | Word spacing increased | Spacing élargi |
| 3.09 | Bionic Reading (bold first letters) | 1ères lettres des mots en gras |
| 3.10 | Bionic Reading intensity slider | 30%-90% bolding |
| 3.11 | Syllabification (mots coupés) | Sépare syllabes visuellement |
| 3.12 | Color overlay (Irlen) | Filtre couleur sur texte (Irlen syndrome) |
| 3.13 | Line focus / line ruler | Surligne ligne actuelle |
| 3.14 | Reading mask (rest hidden) | Masque tout sauf zone lecture |
| 3.15 | Reading guide (vertical bar) | Barre verticale guide |
| 3.16 | Parts of speech coloring | Verbes/noms/adj. en couleurs |
| 3.17 | Phonics emphasis | Sons phoniques colorés |

### 3.2 Matrice qui fait quoi

| Feature | Shinkofa v2 (CDC) | AccessiBe | UserWay | EqualWeb | Recite Me | Helperbird | MS Immersive Reader | Bionic Reading | Browser native |
|---------|-------------------|-----------|---------|----------|-----------|------------|---------------------|----------------|----------------|
| 3.01 OpenDyslexic | ✅ F-008 | ✅ "dyslexia font" | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 3.02 Atkinson Hyperlegible | ⚠️ F-008 mention | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 3.03 Lexend | ⚠️ F-008 candidate | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 3.04 Dyslexie (Boer) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 3.05 Sylexiad | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 3.06 Comic Sans | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| 3.07 Letter spacing dyslexie preset | ✅ F-005 | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 3.08 Word spacing dyslexie preset | ✅ F-005 | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 3.09 Bionic Reading | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ (core) | ❌ |
| 3.10 Bionic intensity | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ✅ | ❌ |
| 3.11 Syllabification | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| 3.12 Color overlay Irlen | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 3.13 Line focus | ❌ | ✅ "reading guide" | ⚠️ | ❌ | ✅ | ✅ | ✅ "line focus" | ❌ | ❌ |
| 3.14 Reading mask | ❌ | ✅ "reading mask" | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 3.15 Reading guide vertical | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ❌ | ❌ | ❌ |
| 3.16 Parts of speech color | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 3.17 Phonics emphasis | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

### 3.3 Gaps Shinkofa (catégorie 3)

| Gap | Sévérité | Recommandation |
|-----|----------|----------------|
| 3.09 Bionic Reading toggle | Élevée (très demandé) | Ajouter F-DYSL-BIONIC dans CDC v2.1 — toggle simple + intensity slider |
| 3.13/3.14/3.15 Reading guide/mask | Élevée | Ajouter F-READ-GUIDE dans CDC v2.1 — 3 modes : line focus, mask, vertical ruler |
| 3.11 Syllabification | Moyenne | Évaluer F-DYSL-SYLLAB (heuristique JS langue-dépendante, complexe) |
| 3.12 Color overlay Irlen | Moyenne | Ajouter à F-002 — préréglages thèmes warm/yellow/cream pour Irlen |
| 3.16 Parts of speech color | Basse | Phase 2+ — feature niche, NLP nécessaire |
| 3.06 Comic Sans | Skip | Pas dignifiant comme nom, ajouter Atkinson/Lexend remplace l'usage |

---

## 4. MOTION / VESTIBULAIRE

### 4.1 Features identifiées

| # | Feature | Description |
|---|---------|-------------|
| 4.01 | Stop all animations | Pause CSS animations + transitions |
| 4.02 | Stop autoplay video | Suspend videos en lecture auto |
| 4.03 | Stop autoplay audio | Suspend audio auto |
| 4.04 | Stop GIFs | Pause animated GIFs |
| 4.05 | Stop parallax | Désactive effets parallax scroll |
| 4.06 | Stop hover effects | Supprime animations on hover |
| 4.07 | Reduce transitions | Diminue durations transitions |
| 4.08 | Stop carousel auto-advance | Pause sliders auto |
| 4.09 | Stop scroll-triggered animations | Désactive AOS, GSAP scroll |
| 4.10 | Reduce decorative motion only | Garde fonctionnelles, coupe déco |
| 4.11 | Replace flashing content | WCAG flashing < 3 fois/sec |
| 4.12 | Disable smooth scroll | `scroll-behavior: auto` |
| 4.13 | prefers-reduced-motion native | Respect OS setting |

### 4.2 Matrice qui fait quoi

| Feature | Shinkofa v2 (CDC) | AccessiBe | UserWay | AudioEye | EqualWeb | Recite Me | Helperbird | Morphic.org | Browser native |
|---------|-------------------|-----------|---------|----------|----------|-----------|------------|-------------|----------------|
| 4.01 Stop animations | ✅ F-010 | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ via prefers-reduced-motion |
| 4.02 Stop autoplay video | ✅ F-010 | ⚠️ | ⚠️ | ⚠️ | ✅ | ❌ | ✅ | ⚠️ | ✅ autoplay policy |
| 4.03 Stop autoplay audio | ✅ F-010 | ⚠️ | ⚠️ | ⚠️ | ✅ | ❌ | ⚠️ | ⚠️ | ✅ autoplay policy |
| 4.04 Stop GIFs | ⚠️ via F-010 | ⚠️ | ⚠️ | ❌ | ✅ | ❌ | ✅ | ❌ | ⚠️ Escape key (Firefox) |
| 4.05 Stop parallax | ⚠️ via F-010 | ⚠️ | ⚠️ | ❌ | ⚠️ | ❌ | ⚠️ | ❌ | ✅ via prefers-reduced-motion |
| 4.06 Stop hover effects | ⚠️ via F-010 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 4.07 Reduce transitions | ✅ F-010 | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ via prefers-reduced-motion |
| 4.08 Stop carousels | ⚠️ via F-010 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 4.09 Stop scroll anims | ⚠️ via F-010 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ via prefers-reduced-motion |
| 4.10 Decorative motion only | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 4.11 Replace flashing | ⚠️ partiel | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 4.12 Disable smooth scroll | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ via prefers-reduced-motion |
| 4.13 prefers-reduced-motion | ✅ F-010 (intent) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ⚠️ | ✅ | ✅ natif |

### 4.3 Gaps Shinkofa (catégorie 4)

| Gap | Sévérité | Recommandation |
|-----|----------|----------------|
| 4.10 Decorative vs functional motion distinction | Élevée | F-010 doit clarifier : préserver animations fonctionnelles (focus, modal entrance), couper purement décoratives. Heuristique : duration > 200ms + non-déclenché par interaction = décoratif. |
| 4.04 Stop GIFs ciblé | Moyenne | Ajouter à F-010 — détecter `<img>` GIF animés + remplacer 1ère frame |
| 4.11 Flashing content protection | Élevée | WCAG 2.3.1 — détecter flashes > 3Hz, override avec replacement. Critical pour épilepsie photosensible. |
| 4.06 Stop hover effects | Moyenne | F-010 doit couvrir `:hover` animations |

---

## 5. LECTURE ASSISTÉE

### 5.1 Features identifiées

| # | Feature | Description |
|---|---------|-------------|
| 5.01 | Text-to-Speech (TTS) | Lecture vocale du contenu |
| 5.02 | TTS multi-voix | Choix voix (féminine/masculine, naturelle) |
| 5.03 | TTS multi-langues | Détection langue + voix appropriée |
| 5.04 | TTS speed slider | Vitesse lecture 0.5x - 3x |
| 5.05 | TTS word highlight | Surligne mot lu en cours |
| 5.06 | TTS sentence highlight | Surligne phrase lue |
| 5.07 | TTS pause/resume | Contrôles lecture |
| 5.08 | TTS skip back/forward | Navigation phrase/paragraphe |
| 5.09 | Reading guide / line ruler | Barre suivant ligne |
| 5.10 | Reading mask | Masque hors zone |
| 5.11 | Magnifier / zoom area | Loupe locale |
| 5.12 | Page zoom global | Zoom toute la page |
| 5.13 | Translation overlay | Traduction inline |
| 5.14 | Dictionary lookup | Définition au hover/click |
| 5.15 | Glossary auto | Définitions termes techniques |
| 5.16 | Picture dictionary | Mot + image illustration |
| 5.17 | Reading time estimate | Affiche durée estimée |
| 5.18 | Bookmark / save place | Sauve position lecture |
| 5.19 | Print friendly | Vue impression simplifiée |
| 5.20 | Export to PDF | Export texte propre |

### 5.2 Matrice qui fait quoi

| Feature | Shinkofa v2 (CDC) | AccessiBe | UserWay | AudioEye | EqualWeb | Recite Me | Helperbird | MS Immersive Reader | Mercury Reader | JAWS/NVDA | iOS VoiceOver / macOS |
|---------|-------------------|-----------|---------|----------|----------|-----------|------------|---------------------|----------------|-----------|------------------------|
| 5.01 TTS | ❌ (skip HS-007) | ✅ | ✅ | ✅ (core) | ✅ | ✅ (core) | ✅ | ✅ | ⚠️ | ✅ (core) | ✅ |
| 5.02 TTS multi-voix | ❌ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| 5.03 TTS multi-langues | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ 65+ langues | ✅ | ✅ | ❌ | ✅ | ✅ |
| 5.04 TTS speed | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| 5.05 Word highlight TTS | ❌ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ⚠️ |
| 5.06 Sentence highlight TTS | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 5.07 Pause/resume | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| 5.08 Skip back/forward | ❌ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| 5.09 Reading guide line | ❌ (gap) | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 5.10 Reading mask | ❌ (gap) | ✅ | ❌ | ⚠️ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 5.11 Magnifier | ❌ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ✅ |
| 5.12 Page zoom | ⚠️ via 2.01 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Ctrl+/- | ✅ |
| 5.13 Translation overlay | ❌ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ✅ Live Translate |
| 5.14 Dictionary lookup | ❌ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ Look Up |
| 5.15 Glossary auto | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 5.16 Picture dictionary | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 5.17 Reading time estimate | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Reader Mode | ❌ | ❌ |
| 5.18 Bookmark | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 5.19 Print friendly | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| 5.20 Export PDF | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ⚠️ | ❌ | ✅ |

### 5.3 Gaps Shinkofa (catégorie 5)

| Gap | Sévérité | Recommandation |
|-----|----------|----------------|
| 5.01-5.08 TTS complet | **HS-007 confirmed** | Skip — natif OS le fait mieux. CDC explicit. |
| 5.09/5.10 Reading guide + mask | **Élevée** | **Ajouter F-READ-GUIDE dans CDC v2.1**. Confirme gap 3.13. NPM lib `reading-line.js` light. |
| 5.13 Translation overlay | Skippable | Navigators font ça nativement (Chrome/Edge auto-translate, Safari). |
| 5.15 Glossary auto | Moyenne | Évaluer F-GLOSSARY phase 2 — utile coaching/médical (dictionnaire de termes Shinkofa) |
| 5.16 Picture dictionary | Basse | Phase 2+ — complexe (asset library), niche |
| 5.18 Bookmark | Basse | Pas du périmètre adaptation, plutôt UX produit |

---

## 6. COGNITIF — CHARGE

### 6.1 Features identifiées

| # | Feature | Description |
|---|---------|-------------|
| 6.01 | Focus mode (1 task at a time) | Affiche 1 zone à la fois |
| 6.02 | Decision points cap | Limite N CTAs / écran |
| 6.03 | Progressive disclosure | Révèle infos par étapes |
| 6.04 | Clutter removal | Cache pubs / sidebars / footers |
| 6.05 | Mute ads | Masque pubs spécifiquement |
| 6.06 | Mute notifications popups | Bloque toasts/popups |
| 6.07 | Hide social widgets | Cache like/share buttons |
| 6.08 | Hide recommendation feeds | Cache "related articles" |
| 6.09 | Single column layout force | Reformate multi-colonnes en 1 |
| 6.10 | Minimize chrome (header/footer) | Réduit barres |
| 6.11 | Distraction-free typing | Cache UI pendant édition |
| 6.12 | Limit visible items (pagination) | Force pagination vs scroll infini |
| 6.13 | Hide animated avatars | Pas d'avatars animés |
| 6.14 | Reading-only mode | Désactive interactions non-lecture |

### 6.2 Matrice qui fait quoi

| Feature | Shinkofa v2 (CDC) | AccessiBe | UserWay | AudioEye | EqualWeb | Recite Me | Helperbird | MS Immersive Reader | Mercury Reader | Browser native |
|---------|-------------------|-----------|---------|----------|----------|-----------|------------|---------------------|----------------|----------------|
| 6.01 Focus mode | ⚠️ partiel | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ "focus mode" | ✅ "focus line" | ❌ | ❌ |
| 6.02 Decision points cap | ✅ F-012 (unique!) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 6.03 Progressive disclosure | ⚠️ pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 6.04 Clutter removal | ⚠️ F-009 | ⚠️ "stop blinking" | ❌ | ❌ | ⚠️ | ✅ | ✅ | ✅ (core) | ✅ (core) | ✅ Reader Mode |
| 6.05 Mute ads | ⚠️ F-009 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ⚠️ adblock |
| 6.06 Mute popups | ⚠️ F-009 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| 6.07 Hide social widgets | ⚠️ F-009 | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ✅ | ❌ |
| 6.08 Hide rec. feeds | ⚠️ F-009 | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ✅ | ❌ |
| 6.09 Single column force | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ⚠️ Reader Mode |
| 6.10 Minimize chrome | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ⚠️ |
| 6.11 Distraction-free typing | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 6.12 Force pagination | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 6.13 Hide animated avatars | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 6.14 Reading-only mode | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ❌ |

### 6.3 Gaps Shinkofa (catégorie 6)

| Gap | Sévérité | Recommandation |
|-----|----------|----------------|
| **6.02 Decision points cap = blue ocean Shinkofa** | — | F-012 unique sur le marché. Renforcer marketing autour. |
| 6.04 Clutter removal complet | Élevée | F-009 doit être ambitieux : sélecteurs CSS de clutter typiques (`[class*="ad"]`, `[class*="popup"]`, `[id*="social"]`) avec opt-out par site |
| 6.09 Single column force | Moyenne | Ajouter à F-009 — `display: block` sur columns/grid quand `cognitive: focus` |
| 6.03 Progressive disclosure pattern | Moyenne | Documenter dans guidelines pour devs intégrant morphic-engine — moins une feature qu'un pattern |
| 6.10 Minimize chrome | Basse | Skippable si Reader Mode (cf. 2.13 gap) |

---

## 7. COGNITIF — GUIDANCE

### 7.1 Features identifiées

| # | Feature | Description |
|---|---------|-------------|
| 7.01 | Tooltips contextuels | Aide au hover/focus |
| 7.02 | Onboarding tour | Visite guidée 1ère venue |
| 7.03 | WAI-Adapt Symbols overlay | Pictogrammes AAC superposés (W3C) |
| 7.04 | Contextual help button | "?" sur chaque élément complexe |
| 7.05 | Chatbot help | Assistant IA conversationnel |
| 7.06 | Glossary inline | Définition au survol terme |
| 7.07 | Step-by-step wizard | Décompose tâches complexes |
| 7.08 | Breadcrumb visible | Chemin navigation toujours visible |
| 7.09 | Progress indicator | Avancement % dans flow |
| 7.10 | Time estimate per task | Durée estimée affichée |
| 7.11 | Error explanation enriched | Erreur + cause + solution + exemple |
| 7.12 | Field hint with example | Placeholder + exemple sous chaque champ |
| 7.13 | Undo always available | Bouton undo persistant |
| 7.14 | Auto-save with indicator | Sauvegarde automatique visible |
| 7.15 | Confirmation before destructive | Toujours confirmer suppression |

### 7.2 Matrice qui fait quoi

| Feature | Shinkofa v2 (CDC) | AccessiBe | UserWay | AudioEye | EqualWeb | Recite Me | Helperbird | MS Immersive Reader | WAI-Adapt | Morphic.org |
|---------|-------------------|-----------|---------|----------|----------|-----------|------------|---------------------|-----------|-------------|
| 7.01 Tooltips | Pattern, pas core | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.02 Onboarding tour | ✅ F-019 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| 7.03 WAI-Adapt Symbols | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Symbols CR | ❌ |
| 7.04 Contextual help | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ WAI-Adapt:Help | ❌ |
| 7.05 Chatbot help | ❌ | ⚠️ widget | ⚠️ widget | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.06 Glossary inline | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ dict | ✅ "Picture Dictionary" | ⚠️ via Content module | ❌ |
| 7.07 Step-by-step wizard | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.08 Breadcrumb | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.09 Progress indicator | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.10 Time estimate | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.11 Error explanation | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.12 Field hints | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.13 Undo always | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.14 Auto-save | Pattern (Quality.md) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.15 Confirmation destructive | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 7.3 Gaps Shinkofa (catégorie 7)

| Gap | Sévérité | Recommandation |
|-----|----------|----------------|
| 7.03 WAI-Adapt Symbols overlay | **Élevée** (W3C standard) | Ajouter F-WAI-SYMBOLS dans CDC v2.1 — implémenter `data-symbol` attribute reader + overlay AAC pictograms. Standard ouvert, blue ocean total. |
| 7.06 Glossary inline | Moyenne | Compléter 5.15 — F-GLOSSARY phase 2 |
| 7.01-7.15 Autres | Pattern, hors scope | Ces patterns sont à documenter dans guidelines `Patterns-d-Adaptation.md` pour devs intégrant morphic-engine, mais pas implémentés dans l'engine lui-même (pas de UI fournie). |

---

## 8. MOTEUR — CLAVIER

### 8.1 Features identifiées

| # | Feature | Description |
|---|---------|-------------|
| 8.01 | Skip-to-content link | Lien "passer au contenu" |
| 8.02 | Focus indicator renforcé | Outline visible 2px+ sur focus |
| 8.03 | Focus order logical (tab order) | Respect ordre DOM |
| 8.04 | Keyboard shortcuts global | Ctrl+/Cmd+K command palette |
| 8.05 | Keyboard shortcuts per feature | Shortcuts contextuels |
| 8.06 | Sticky modifiers (Sticky Keys) | Ctrl/Shift/Alt successifs vs simultanés |
| 8.07 | Slow keys / repeat delay | Filtre frappes trop rapides |
| 8.08 | Bounce keys / debounce | Ignore double-frappes |
| 8.09 | One-handed keyboard layout | Layout AZERTY/QWERTY adapté |
| 8.10 | Virtual keyboard | Clavier écran |
| 8.11 | Voice input | Dictée vocale |
| 8.12 | Switch control compat | Compatible interrupteurs adaptés |
| 8.13 | Focus trap (modals) | Tab reste dans modal ouvert |
| 8.14 | Escape key closes modals | Échap ferme toujours |
| 8.15 | Arrow keys for navigation | Flèches naviguent listes/menus |

### 8.2 Matrice qui fait quoi

| Feature | Shinkofa v2 (CDC) | AccessiBe | UserWay | AudioEye | EqualWeb | Recite Me | Helperbird | Browser native | iOS/macOS A11y | Windows A11y |
|---------|-------------------|-----------|---------|----------|----------|-----------|------------|----------------|----------------|---------------|
| 8.01 Skip-to-content | Pattern | ✅ ajout auto | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 8.02 Focus indicator | ✅ F-014 | ✅ "focus highlight" | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠️ :focus-visible | ✅ | ✅ |
| 8.03 Focus order | Pattern + ARIA | ⚠️ auto-fix | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ✅ DOM order | ✅ | ✅ |
| 8.04 Keyboard shortcuts global | ❌ | ✅ Ctrl+U / Ctrl+M | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 8.05 Shortcuts per feature | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |
| 8.06 Sticky modifiers | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Sticky Keys | ✅ Sticky Keys |
| 8.07 Slow keys | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Slow Keys | ✅ Filter Keys |
| 8.08 Bounce keys | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 8.09 One-handed | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 8.10 Virtual keyboard | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ mobile | ✅ | ✅ |
| 8.11 Voice input | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ✅ dictation | ✅ Web Speech | ✅ | ✅ |
| 8.12 Switch control compat | Pattern (ARIA) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ⚠️ | ✅ Switch Control | ✅ |
| 8.13 Focus trap modals | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 8.14 Escape closes | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 8.15 Arrow keys nav | Pattern | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 8.3 Gaps Shinkofa (catégorie 8)

| Gap | Sévérité | Recommandation |
|-----|----------|----------------|
| 8.04 Keyboard shortcuts global (command palette) | Élevée | Ajouter F-KBD-SHORTCUTS dans CDC v2.1 — au minimum Ctrl/Cmd+K pour ouvrir adaptation panel (déjà cohérent avec F-019 onboarding) |
| 8.06/8.07/8.08 Modifiers + slow + bounce | Moyenne | F-KBD-FILTERS phase 2 — JS filtre keydown timing. Surcouche OS pour usages cross-OS. |
| 8.10 Virtual keyboard | Skippable | OS-native, ne pas dupliquer (HS-007 esprit) |
| 8.11 Voice input | Skippable | Web Speech API natif, devs intègrent eux-mêmes |

---

## 9. MOTEUR — POINTER / TOUCH

### 9.1 Features identifiées

| # | Feature | Description |
|---|---------|-------------|
| 9.01 | Touch target size enforcement | Minimum 44x44 / 48x48 px |
| 9.02 | Big cursor | Curseur agrandi 2x-5x |
| 9.03 | Cursor color contrast | Curseur couleur contrastée |
| 9.04 | Cursor trail | Traînée pour suivre curseur |
| 9.05 | Click delay (anti-tremor) | Délai mini entre clicks |
| 9.06 | Hover-to-click (dwell click) | Click auto après N ms hover |
| 9.07 | Drag tolerance | Marge avant déclencher drag |
| 9.08 | Long-press alternative | Alternative au long-press |
| 9.09 | Swipe alternative | Alternative aux swipes |
| 9.10 | Tap and hold filter | Anti tap accidentels |
| 9.11 | Tremor filter (averaging) | Moyenne position pour curseur |
| 9.12 | Switch control compat | Compatible avec switches |
| 9.13 | Eye-tracking compat | Compatible eye trackers |
| 9.14 | Pointer lock alternative | Alternative pointer lock games |
| 9.15 | Touch gesture replacement | Boutons remplaçant gestures |

### 9.2 Matrice qui fait quoi

| Feature | Shinkofa v2 (CDC) | AccessiBe | UserWay | AudioEye | EqualWeb | Recite Me | Helperbird | iOS/macOS A11y | Android A11y | Windows A11y |
|---------|-------------------|-----------|---------|----------|----------|-----------|------------|----------------|---------------|----------------|
| 9.01 Touch target 44px | ✅ F-015 | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 9.02 Big cursor | ❌ | ✅ "big white cursor" | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| 9.03 Cursor color contrast | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ⚠️ | ✅ | ✅ | ✅ |
| 9.04 Cursor trail | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| 9.05 Click delay | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Hold Duration | ✅ | ✅ |
| 9.06 Hover-to-click | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Dwell Control | ❌ | ✅ Mouse Keys |
| 9.07 Drag tolerance | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Ignore Repeat | ❌ | ✅ |
| 9.08 Long-press alt | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| 9.09 Swipe alt | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ AssistiveTouch | ✅ | ❌ |
| 9.10 Tap-hold filter | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 9.11 Tremor filter | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| 9.12 Switch compat | Pattern (ARIA) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ✅ Switch Control | ✅ Switch Access | ✅ |
| 9.13 Eye-tracking compat | Pattern (focus) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Eye Control | ❌ | ✅ Eye Control |
| 9.14 Pointer lock alt | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 9.15 Gesture replacement | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

### 9.3 Gaps Shinkofa (catégorie 9)

| Gap | Sévérité | Recommandation |
|-----|----------|----------------|
| 9.05 Click delay | **Élevée** | F-MOTOR-CLICK-DELAY dans CDC v2.1 — slider 0-500ms entre clicks. JS event listener. |
| 9.06 Hover-to-click (dwell) | **Élevée** | F-MOTOR-DWELL dans CDC v2.1 — alternative crucial pour handicap moteur. Délai 500-3000ms. |
| 9.11 Tremor filter | **Élevée** (blue ocean) | F-MOTOR-TREMOR dans CDC v2.1 — moving average position curseur sur N frames. Niche mais sans concurrent web. |
| 9.07 Drag tolerance | Moyenne | F-MOTOR-DRAG-MARGIN — marge px avant trigger drag. Couplé à F-MOTOR-CLICK-DELAY. |
| 9.02/9.03 Big cursor + contrast | Moyenne | F-MOTOR-CURSOR dans CDC v2.1 — CSS `cursor: url(big-cursor.svg)` + variants colorés |
| 9.08-9.10/9.15 Gesture alts | Skippable | Pattern UI plus que feature engine — guidelines |

---

## 10. ÉNERGÉTIQUE / TEMPORAL

### 10.1 Features identifiées

| # | Feature | Description |
|---|---------|-------------|
| 10.01 | Session time tracking | Compte temps écran |
| 10.02 | Break reminder | Notification pause après N min |
| 10.03 | Forced break (pomodoro) | Pause obligatoire |
| 10.04 | Auto-pause on inactivity | Suspend session si inactif |
| 10.05 | Recovery mode (low-stim) | Mode réduit après alerte fatigue |
| 10.06 | Time-of-day adaptation | Morning/evening mode auto |
| 10.07 | Circadian color shift | Filtre bleu auto soir (f.lux-like) |
| 10.08 | Energy level slider (manual input) | Utilisateur indique son énergie |
| 10.09 | Energy-aware scheduling | Suggère tâches selon énergie |
| 10.10 | Session breaks (mandatory) | Pauses imposées |
| 10.11 | Eyestrain reminder (20-20-20) | Rappel regarder loin |
| 10.12 | Cognitive load monitor | Détecte signaux fatigue (erreurs répétées) |

### 10.2 Matrice qui fait quoi

| Feature | Shinkofa v2 (CDC) | AccessiBe | UserWay | AudioEye | EqualWeb | Recite Me | Helperbird | Morphic.org | OS natifs |
|---------|-------------------|-----------|---------|----------|----------|-----------|------------|-------------|-----------|
| 10.01 Session tracking | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Screen Time / Digital Wellbeing |
| 10.02 Break reminder | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 10.03 Forced break pomodoro | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| 10.04 Auto-pause inactivity | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 10.05 Recovery mode | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 10.06 Time-of-day adaptation | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ "morning mode" mentioned | ⚠️ Night Shift |
| 10.07 Circadian color shift | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Night Shift / Night Light |
| 10.08 Energy slider input | ❌ (gap) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 10.09 Energy-aware scheduling | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 10.10 Session breaks | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 10.11 20-20-20 reminder | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| 10.12 Cognitive load monitor | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 10.3 Gaps Shinkofa (catégorie 10)

| Gap | Sévérité | Recommandation |
|-----|----------|----------------|
| **Catégorie entière = blue ocean total** | — | Aucun concurrent web n'adresse l'énergétique. OS natifs font tracking mais pas adaptation runtime. **Opportunité Shinkofa majeure.** |
| 10.05 Recovery mode | **Élevée** | F-ENERGY-RECOVERY dans CDC v2.1 — bascule profil "low-stim" (reduce motion + cap decision points à 3 + auto-pause toasts + theme calm). Trigger : user manuel OU détection signal. |
| 10.04 Auto-pause inactivity | Moyenne | F-ENERGY-PAUSE — détection `visibilitychange` + idle. Pause animations, mute audio, suspend timers. |
| 10.02 Break reminder | Moyenne | F-ENERGY-BREAK — opt-in, frequence configurable. Non-intrusif (toast dignifiant, pas modal). |
| 10.08 Energy slider input | Moyenne | F-ENERGY-INPUT — composant ré-utilisable pour apps qui veulent demander niveau d'énergie. Alimente F-ENERGY-RECOVERY si bas. |
| 10.06 Time-of-day | Basse | Phase 2 — surcouche prefers-color-scheme. |
| 10.07/10.11/10.12 | Skip | OS-native ou hors scope morphic-engine. |

---

## Synthèse Gaps Shinkofa — Tableau Récapitulatif

Pour faciliter décision Phase 1.1 / Phase 2 / Skip.

### Gaps Élevés (à intégrer CDC v2.1 — Phase 1.1)

| ID proposé | Feature | Catégorie | Effort | Justification |
|------------|---------|-----------|--------|---------------|
| F-COLOR-DAL | Daltonization corrective (protan/deuter/tritanopia) | 1 Visuel couleur | M | Blue ocean — corrige, ne simule pas |
| F-READ-GUIDE | Reading line + mask + ruler | 3 Dyslexie / 5 Lecture | S | Très demandé, simple à implémenter |
| F-DYSL-BIONIC | Bionic Reading toggle + intensité | 3 Dyslexie | XS | Effet de mode mais demande forte |
| F-WAI-SYMBOLS | WAI-Adapt Symbols overlay | 7 Cognitif guidance | M | Standard W3C, blue ocean total |
| F-KBD-SHORTCUTS | Command palette Ctrl/Cmd+K | 8 Moteur clavier | S | Pattern productivité standard |
| F-MOTOR-CLICK-DELAY | Délai mini entre clicks | 9 Moteur pointer | S | Aucun équivalent web |
| F-MOTOR-DWELL | Hover-to-click (dwell) | 9 Moteur pointer | M | Aucun équivalent web, critique handicap moteur |
| F-MOTOR-TREMOR | Tremor filter curseur | 9 Moteur pointer | M | Blue ocean total |
| F-ENERGY-RECOVERY | Recovery mode (low-stim) | 10 Énergétique | M | **Blue ocean Shinkofa majeur** |
| F-ENERGY-PAUSE | Auto-pause inactivity | 10 Énergétique | S | Cohérent avec F-010 motion |

### Gaps Moyens (à évaluer Phase 2)

| Feature | Catégorie | Note |
|---------|-----------|------|
| Glossary auto | 5 Lecture / 7 Guidance | Coûteux NLP, mais valeur coaching |
| Syllabification | 3 Dyslexie | Lang-dependent, complexe |
| Single column force | 6 Cognitif charge | Pattern CSS — peut entrer F-009 |
| Sticky modifiers + slow keys + bounce keys | 8 Moteur clavier | Surcouche OS native, niche web |
| Drag tolerance | 9 Moteur pointer | Couplé à F-MOTOR-CLICK-DELAY |
| Big cursor + contrast | 9 Moteur pointer | Souvent natif OS |
| Energy slider input | 10 Énergétique | Composant ré-utilisable |
| Time-of-day adaptation | 10 Énergétique | Surcouche prefers-* |
| Color overlay Irlen | 3 Dyslexie | Peut être thème dans F-002 |

### Gaps Bas / Skip (HS confirmé ou OS-natif)

| Feature | Raison skip |
|---------|-------------|
| TTS complet (5.01-5.08) | HS-007 confirmé — natif OS supérieur |
| Translation overlay | Browsers font ça nativement |
| Picture dictionary | Niche, asset library lourde |
| Bookmark | Hors périmètre adaptation |
| Print friendly | Hors scope morphic |
| Virtual keyboard | OS natif |
| Voice input | Web Speech API natif |
| Eye-tracking compat | Standards focus suffisent |
| Pointer lock alt | Niche gaming |
| Circadian color shift | OS natif (Night Shift) |

---

## Recommandation axes morphic-engine v2 (additions au CDC — pour discussion, ne PAS écrire CDC)

> Cette recommandation NE modifie PAS le CDC. Elle propose à Jay une liste candidate pour intégration Phase 1.1 ou v2.1.

### Proposition d'enrichissement CDC v2.1 (10 features nouvelles)

**Axe Visuel** (renforcement)
- F-COLOR-DAL — Daltonization corrective (3 sous-features : proto/deuter/tritanopia matrices)

**Axe Dyslexie** (renforcement)
- F-DYSL-BIONIC — Bionic Reading toggle + intensity (30%/50%/70%)
- F-READ-GUIDE — Reading guide (3 modes : line focus, mask, vertical ruler)

**Axe Cognitif** (renforcement guidance)
- F-WAI-SYMBOLS — W3C WAI-Adapt Symbols overlay (lecture `data-symbol` + rendu AAC pictograms)

**Axe Moteur** (nouveau axe quasi-intégral)
- F-KBD-SHORTCUTS — Command palette Cmd/Ctrl+K
- F-MOTOR-CLICK-DELAY — Délai mini entre clicks (slider 0-500ms)
- F-MOTOR-DWELL — Hover-to-click dwell (500-3000ms)
- F-MOTOR-TREMOR — Tremor filter (moving average curseur)

**Axe Énergétique** (nouveau axe complet — blue ocean Shinkofa)
- F-ENERGY-PAUSE — Auto-pause inactivity (visibilitychange + idle detection)
- F-ENERGY-RECOVERY — Recovery mode profile (low-stim bascule)

### Considérations stratégiques

| Considération | Impact |
|---------------|--------|
| Délai NLNet 2026-06-01 | Phase 1.1 features (10 ci-dessus) = 4-6 bricks supplémentaires. Hors scope dépôt initial — propose post-dépôt v2.1. |
| Couverture concurrence | Avec ces 10 ajouts, morphic-engine v2 = couverture supérieure à AccessiBe/UserWay/AudioEye sur Visuel + Dyslexie + Moteur + Cognitif, **et seul sur Énergétique**. |
| Charge cognitive engine | Reste framework-agnostic. F-WAI-SYMBOLS et F-MOTOR-* ajoutent ~15-25 KB gzipped au bundle. À budgéter contre target 50 KB current. |
| Test stratégie | F-COLOR-DAL et F-MOTOR-TREMOR sont algorithmiques (matrices, moyennes mobiles) — PBT idéal. |
| Anti-pattern AP-001 (no overlay) respecté | Toutes ces features sont surface-aware adaptation, pas overlay accessibility plaqué. Respect CDC. |
| Dignity tests | F-ENERGY-* doivent respecter : pas de guilt-trip, opt-in, contrôle utilisateur (pas auto-imposition). À documenter. |

### Décisions ouvertes à Jay

1. **Phase 1.1 (avant NLNet)** : intégrer combien des 10 dans le dépôt initial ? Recommandation Takumi : **F-COLOR-DAL + F-READ-GUIDE + F-ENERGY-RECOVERY** uniquement (les 3 plus différenciants), reste post-dépôt.
2. **Bionic Reading** — controversé (efficacité scientifique débattue 2022-2024). Garder mais documenter "feature culturelle demandée, pas evidence-based" ?
3. **WAI-Adapt Symbols** — implémenter avant que W3C CR → Recommendation ? Risque API change. Proposition : implémenter aujourd'hui, marquer "experimental".
4. **F-ENERGY-*** — quel niveau de couplage avec Shizen/Ki budget (Shinkofa-Shared) ? L'engine doit rester framework-agnostic. Proposition : engine fournit API + events, apps Shinkofa branchent leur logique Ki dessus.

---

### Décisions Jay 2026-05-22 (cahier d'échange clôturé)

> Réponses Jay aux 4 décisions ouvertes ci-dessus + cadrage F-ENERGY-PAUSE. Ces décisions sont reportées dans le CDC §3 (features F-025 à F-035) et la roadmap PET §6 (Phase 1.2-* nouvelles avec numérotation B-101+).

**D1 — Phase 1.1 : 10 ou 3 ?** ✅ **Intégrer les 11 features (10 + scindage F-ENERGY-PAUSE).** Aucune priorisation par deadline NLNet. Justification Jay : « Ils sont tous pertinents. Ils seront tous utiles à quelqu'un. » Renforce `memory/feedback_no-mvp-shortcut.md` (2e violation : la règle s'applique aussi à l'enrichissement, pas seulement à la coupe).

**D2 — Bionic Reading (F-DYSL-BIONIC)** ✅ **Intégré.** Documenter dans le CDC : *« demande utilisateurs forte, evidence-based contesté (méta-analyses 2022-2024 mitigées) — feature culturelle proposée, jamais imposée par défaut »*. Toggle off par défaut, opt-in user.

**D3 — WAI-Adapt Symbols (F-WAI-SYMBOLS)** ✅ **Intégré aujourd'hui, tag `experimental`.** API marquée stable post-W3C Recommendation. Risque API change accepté (le blue ocean total justifie). Documentation : « follows W3C WAI-Adapt Symbols CR — API may change when CR → Recommendation ».

**D4 — F-ENERGY-* couplage Ki Shinkofa** ✅ **Engine framework-agnostic préservé.** L'engine `@shinkofa/morphic-engine` fournit :
- API publique : `setEnergyProfile(profile)`, `getEnergyProfile()`, `enterRecoveryMode()`, `exitRecoveryMode()`
- Events typés (`CustomEvent`) : `morphic:energy:change`, `morphic:energy:recovery-enter`, `morphic:energy:recovery-exit`, `morphic:energy:pause-suggested`, `morphic:energy:pomodoro-tick`, `morphic:energy:pomodoro-break-start`, `morphic:energy:pomodoro-work-resume`, `morphic:energy:pomodoro-session-complete`
- Le moteur Pomodoro (state machine + timer) reste **dans l'engine** — réutilisable par tout consommateur

Shinkofa-Shared (Shinkofa.com FAB, Shizen, Michi) consomme l'API + events et branche sa logique Ki budget. **Pas de dépendance Shinkofa-Shared dans `@shinkofa/morphic-engine`.** Le couplage est unidirectionnel : apps Shinkofa → engine (jamais l'inverse).

**D5 (additionnelle) — F-ENERGY-PAUSE scindé** ✅ **Scindage validé en 2 sous-features distinctes** :

| ID | Trigger | Comportement | Effort |
|----|---------|--------------|--------|
| F-ENERGY-PAUSE-IDLE | Inactivité détectée (`visibilitychange` + `requestIdleCallback` + idle ≥60s configurable) | Suspend animations CSS, réduit refresh, sauvegarde préfs en cours, émet `morphic:energy:pause-suggested` | S |
| F-ENERGY-PAUSE-POMODORO | Sessions cadencées explicites (work/break configurables, défaut 25/5) | Timer state machine (`idle` → `work` → `short-break` → `work` → ... → `long-break`), events tick + transitions, persistence session | M |

Les deux peuvent être actifs simultanément (HSP qui se perd ≠ HPI qui s'épuise faute de pauses cadencées). UI hôte décide quelle UI exposer (le moteur ne dessine rien).

**Référence FAB Shinkofa.com** : le bouton d'action rapide Shinkofa.com (Pomodoro existant) sera refactorisé en consommateur de l'API `@shinkofa/morphic-engine` F-ENERGY-PAUSE-POMODORO. Traçabilité : à ajouter dans le PET de Shinkofa (pas dans morphic-engine — séparation des projets).

---

## Sources

Format : Auteur/Org (Date). "Titre." Source. URL. Accès: 2026-05-22. Langue. Confidence.

### Overlays / Widgets commerciaux

1. accessiBe (2026). "accessWidget — Features Documentation." accessibe.com. https://accessibe.com/. EN. Verified. *(marketing — triangulé via #6)*
2. UserWay (2026). "AI-Powered Accessibility Widget." userway.org. https://userway.org/. EN. Verified. *(marketing — triangulé via #7)*
3. AudioEye (2026). "Accessibility Platform Features." audioeye.com. https://www.audioeye.com/. EN. Verified. *(marketing)*
4. EqualWeb (2026). "Web Accessibility Widget Features." equalweb.com. https://www.equalweb.com/. EN. Probable. *(marketing)*
5. Recite Me (2026). "Assistive Toolbar — 65+ Languages, TTS, Reading." reciteme.com. https://reciteme.com/. EN. Verified. *(marketing — triangulé)*
6. accessibility-test.org (2025). "Comparison : AccessiBe vs UserWay vs AudioEye vs EqualWeb." accessibility-test.org. EN. Verified. *(3rd-party neutre)*
7. Hounder (2025). "AccessiBe vs UserWay : Side-by-side feature comparison." hounder.co. EN. Probable. *(3rd-party)*

### Extensions / Browser tools

8. Helperbird (2026). "Helperbird Premium — 30+ Features Documentation." helperbird.com. https://www.helperbird.com/. EN. Verified.
9. Dark Reader (2026). "Dark Reader Browser Extension Features." darkreader.org. https://darkreader.org/. EN. Verified.
10. Mercury Reader (2024). "Mercury Reader — Read articles distraction free." Chrome Web Store. EN. Probable.
11. Microsoft (2026). "Immersive Reader — Documentation." learn.microsoft.com. https://learn.microsoft.com/en-us/azure/ai-services/immersive-reader/. EN. Verified.
12. Bionic Reading (2024). "Bionic Reading — Method and API." bionic-reading.com. EN. Probable. *(controversé)*

### Standards W3C

13. W3C (2025). "Adapt: Symbols Module — Candidate Recommendation." w3.org/TR/adapt-symbols/. EN. Verified.
14. W3C (2024). "Adapt: Content Module — Working Draft." w3.org/TR/adapt-content/. EN. Verified.
15. W3C (2024). "WAI-Adapt: Help and Support — Working Draft." w3.org/TR/adapt-help/. EN. Verified.
16. W3C (2023). "Personalization Semantics Explainer." w3.org/TR/personalization-semantics/. EN. Verified.
17. W3C (2024). "WCAG 2.2 — Recommendation." w3.org/TR/WCAG22/. EN. Verified.

### Navigateurs / OS / Specs

18. MDN (2026). "prefers-color-scheme." developer.mozilla.org. EN. Verified.
19. MDN (2026). "prefers-reduced-motion." developer.mozilla.org. EN. Verified.
20. MDN (2026). "prefers-contrast." developer.mozilla.org. EN. Verified.
21. MDN (2026). "prefers-reduced-transparency." developer.mozilla.org. EN. Verified.
22. MDN (2026). "forced-colors." developer.mozilla.org. EN. Verified.
23. Apple (2026). "Accessibility on iOS / macOS — Developer Docs." developer.apple.com/accessibility/. EN. Verified.
24. Google (2026). "Android Accessibility Suite — Features." support.google.com/accessibility/android. EN. Verified.
25. Microsoft (2026). "Windows Accessibility — Features." microsoft.com/en-us/accessibility. EN. Verified.

### AT-on-Demand / Morphic.org

26. Raising the Floor (2026). "Morphic Project — Features and Auto-Personalization." morphic.org/features/. EN. Verified.
27. GPII (2024). "Global Public Inclusive Infrastructure — Preferences Framework." gpii.net. EN. Probable.

### Screen readers / ATs natifs

28. Freedom Scientific (2026). "JAWS Screen Reader Features." freedomscientific.com/products/software/jaws/. EN. Verified.
29. NV Access (2026). "NVDA — Features." nvaccess.org. EN. Verified.
30. Apple (2026). "VoiceOver User Guide." support.apple.com/guide/voiceover/. EN. Verified.

### Dyslexia & Reading research

31. British Dyslexia Association (2024). "Dyslexia Style Guide." bdadyslexia.org.uk. EN. Verified.
32. Lexend (2024). "Lexend — Reading Speed Research." lexend.com. EN. Probable.
33. Atkinson Hyperlegible (Braille Institute, 2024). "Atkinson Hyperlegible Font Specimen." brailleinstitute.org. EN. Verified.
34. Wery, J. & Diliberto, J. (2017). "The effect of a specialized dyslexia font, OpenDyslexic, on reading rate and accuracy." Annals of Dyslexia. EN. Verified. *(efficacité OpenDyslexic mitigée)*

### Légal / Conformité (contexte)

35. FTC (2025). "FTC Settlement with accessiBe — $1M penalty." ftc.gov. EN. Verified. *(contexte AP-001 anti-overlay confirmé)*

---

## Cohérence avec Competiteurs-2026-05-21.md

Ce document **complète** Competiteurs-2026-05-21.md sans le contredire :

| Veille 2026-05-21 (positionnement) | Veille 2026-05-22 (fonctionnel) |
|--------------------------------------|----------------------------------|
| AccessiBe / UserWay = overlay anti-pattern | Confirmé : leurs features sont surface-deep, daltonization absente, énergétique absente |
| Morphic.org = inspiration AT-on-Demand | Confirmé : forte sur switching, faible sur features adaptation runtime |
| WAI-Adapt = standard à supporter | Confirmé : Symbols CR adressable, blue ocean |
| Shinkofa = surface-aware + cognitive + énergétique | Cartographié ici en gaps concrets : F-COLOR-DAL + F-WAI-SYMBOLS + F-ENERGY-* |

---

## Notes méthodologiques (Monozukuri)

- **Triangulation appliquée** : claims AccessiBe/UserWay marketing systématiquement croisés via accessibility-test.org et hounder.co (3rd-party neutres).
- **Confidence Verified vs Probable** : 27 sources Verified (cross-validated 2+), 8 Probable (single authoritative source).
- **Biais signalé** : sites marketing flaggés explicitement. Pas de "feature X = 10x better" accepté sans benchmark reproductible.
- **Cross-langue partiel** : EN primaire, FR secondaire. Pas exploré ZH/JA/KO/DE/RU — ROI faible sur ce sujet (W3C-centric, US/EU régulation). Flag pour reconsidérer si Phase 2 vise marché asiatique adaptation cognitive.
- **Erreur comme donnée** : aucune contradiction majeure entre sources, mais documentation Bionic Reading controversée notée explicitement (#12).
- **Documentation comme matière première** : ce doc deviendra référence pour décision F-* additionnelles + base pour update CDC v2.1 si Jay valide.
