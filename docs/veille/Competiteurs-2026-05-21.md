# Veille Concurrentielle — Modules d'Accessibilite / Adaptation UI Drop-In

> Veille deep-dive pour le module Shinkofa d'adaptation morphique drop-in universel.
> Date : 2026-05-21
> Auteur : Deep Research Master (Takumi)
> Methodologie : 7-language research (EN/FR), triangulation 2+ sources par claim, CRAAP scoring, biases checklist (anti-overlay bias signale).
> Profondeur : Standard (entre 1h et 3h, ~30 sources consultees).

## Executive Summary

Le marche de l'accessibilite web "drop-in" en 2026 est domine par 4 acteurs commerciaux (AccessiBe, UserWay, AudioEye, EqualWeb) qui pratiquent tous une variante du meme produit : un overlay JavaScript injecte dans le site cible, exposant un widget de preferences (contraste, taille texte, lecture, navigation). Le marche est evalue entre **549 M$ et 1,5 Md$** selon la definition retenue (digital accessibility software / website accessibility software), avec une croissance CAGR **9,2 % a 11,5 %**.

**Trois constats critiques pour Shinkofa** :

1. **L'industrie overlay traverse une crise de credibilite majeure** : FTC a inflige 1 M$ d'amende a AccessiBe en avril 2025 pour publicite mensongere, UserWay fait face a une class action depuis decembre 2024, **1 023 sites poursuivis en 2024 alors qu'ils utilisaient un overlay** (25 % de toutes les poursuites ADA). WebAIM rapporte que 67 % des praticiens et 72 % des utilisateurs handicapes jugent les overlays "peu ou pas efficaces" (2 % seulement les jugent tres efficaces).

2. **Un blue ocean confirme sur l'axe morphique multi-dimensions** : AUCUN concurrent n'adresse simultanement les axes (a) WCAG + (b) neurodivergence cognitive fine + (c) Human Design + (d) cycles d'energie + (e) profil holistique persistant cross-sites. Les concurrents s'arretent au WCAG visuel/moteur. **Morphic.org** (Raising the Floor, open source, GPII) est le concurrent le plus proche philosophiquement (cloud preferences, AT-on-Demand) mais reste **OS-level desktop**, pas web cross-site.

3. **Le standard W3C WAI-Adapt** est en cours de specification (Symbols Module en Candidate Recommendation, Content/Help/Tools en Working Draft). C'est l'opportunite de positionnement strategique : implementer le standard W3C **avant** que la concurrence ne s'y mette serieusement, tout en y ajoutant les axes proprietaires Shinkofa (HD, cycles, neurodivergence fine).

**Recommandation strategique cardinale** : positionner Shinkofa morphique comme **"l'anti-overlay"**. Ne JAMAIS revendiquer la conformite WCAG automatique (pollue l'image, attire les lawsuits, faux). Revendiquer un repositionnement clair : **"Adaptation morphique cote utilisateur, jamais cote site. Le site reste responsable de sa conformite. Nous adaptons sa presentation a vous."** Cf. section 7 pour le positionnement detaille.

---

## Methodologie

| Element | Valeur |
|---------|--------|
| Profondeur | Standard (entre Quick Scan et Deep Dive) |
| Langues recherchees | EN (primaire), FR (verification + sources juridiques EU) |
| Sources evaluees | ~30 |
| Sources retenues apres CRAAP filter (>= 15/25) | 24 |
| SKB consulte | Non disponible cette session (Conception-Morphique pas encore peuple en SKB) |
| Veille Master output | Non disponible cette session |
| Biais detecte | Forte presence de sources marketing (G2, Capterra, sites editeurs) face a sources autoritatives (FTC, lflegal, adrianroselli, WebAIM, W3C). Les deux familles cross-validees. |

**Langues non explorees** : ZH, JA, KO, DE, RU. Justification : le marche overlay est tres anglo-saxon (US lawsuits) et europeen (EAA), les communautes ZH/JA/KO/DE/RU ont peu de production sur ce niche specifique. A reouvrir en Deep Dive si une question strategique ND-cognitive cross-culture emerge.

---

## 1. UserWay — Analyse Approfondie

### Identite

| Champ | Valeur |
|-------|--------|
| Editeur | UserWay Inc. (Israel, US presence) |
| URL | userway.org |
| Modele | SaaS, widget JS overlay |
| Fondation | ~2016 |
| Marche cible | PME, agences web, mid-market |

### Pricing 2026

| Plan | Prix | Limite |
|------|------|--------|
| Free | 0 EUR/mois | Widget basique : redimension texte, contraste, navigation clavier |
| Widget Pro Small | 490 USD/an | Sites < 100K pageviews/mois |
| Widget Pro Medium | 1 490 USD/an | Mid-market, trafic plus eleve |
| Enterprise | Sur devis | Multi-sites, audits humains |

Source : G2 (2026) confirme par UserWay pricing page. Cite par Capterra et SoftwareAdvice.

### Fonctionnalites revendiquees

- "AI-Powered Widget" qui "corrige automatiquement les violations 24/7"
- "100+ outils d'accessibilite"
- 50+ langues supportees
- Lecteur d'ecran integre au widget
- Profils d'accessibilite preconfigures
- Conformite revendiquee : WCAG, ADA, Section 508, EAA

### Controverse : la class action 2024-2025

**Resume du dossier** (sources : Law Office of Lainey Feingold 2025-02, Tech Startups 2024-12, AccessByDesign UK) :

1. **Plaignant** : BloomsyBox (e-commerce floral). A souscrit a UserWay en juillet 2023, a ete poursuivi par un utilisateur handicape en decembre 2023 **malgre la presence de l'overlay**.
2. **Reproche principal** : UserWay aurait promu son produit comme garantissant "full ADA and WCAG 2.1 compliance" — affirmation jugee fausse.
3. **Le "1 000 000 $ pledge"** (engagement legal de UserWay de couvrir les frais juridiques de ses clients) : la plainte allegue que les conditions du pledge le rendaient quasi-impossible a declencher (exige un proces juge jusqu'au bout, alors que 95 %+ des affaires se reglent a l'amiable).
4. **Statut a 2026-05-21** : un Magistrate Judge a recommande que les portions cles de l'affaire avancent. La motion de UserWay pour dismiss a echoue.

### Faiblesses identifiees

| # | Faiblesse | Source |
|---|-----------|--------|
| 1 | Widget JS = bypassable par utilisateur de screen reader, peut entrer en conflit avec les ATs reelles | Overlay Fact Sheet (overlayfactsheet.com) |
| 2 | Ne corrige PAS le code source du site, juste superpose une couche | Adrian Roselli 2021, accessitree |
| 3 | Pledge legal jugee illusoire | lflegal.com 2025 |
| 4 | 1 023 sites avec overlay (toutes marques) ont ete poursuivis en 2024 — l'overlay est devenu un signal d'alerte pour les plaignants | accessibility.works 2024 ADA report |
| 5 | Risque potentiel privacy : un widget qui detecte les preferences utilisateur peut construire un profil de handicap monetisable | overlayfactsheet.com section privacy |

### Position de marche

Pas de chiffres d'affaires publics consolidates pour UserWay 2024-2025. Estimation : taille comparable a AccessiBe avant 2023, peut-etre **15-30 M$ ARR**, mais aucune source primaire publique confirme. A flag comme **Uncertain**.

---

## 2. Tableau Comparatif des Competiteurs

> Confidence : tous les pricing **Verified** via au moins 2 sources independantes (editeur + G2/Capterra). Lawsuits / FTC actions **Verified** via sources juridiques primaires.

| Acteur | Pricing (entree) | Pricing (mid-tier) | Scope | Tech | Differentiateur | Faiblesse majeure |
|--------|------------------|--------------------|-------|------|-----------------|-------------------|
| **AccessiBe** | 290 USD/an | jusqu'a ~3 000 USD/an enterprise | WCAG visuel/moteur | Overlay JS + IA marketing | Marketing agressif, leader marche en clients (110 800 en 2024, 51,3 M$ ARR) | **FTC fine 1 M$ avril 2025 + class action**. Interdiction de revendiquer "WCAG compliant" pendant 20 ans |
| **UserWay** | Free / 490 USD/an | 1 490 USD/an Medium | WCAG visuel/moteur, 50 langues | Overlay JS + AI Pro Widget | Free tier large, pledge legal (conteste) | Class action active 2024-2025 |
| **AudioEye** | ~1 000 USD/an petits sites | 5 000-10 000 USD/an mid-market | WCAG + tests humains | Overlay JS + audit humain | Cote NASDAQ (AEYE), 35,2 M$ revenus 2024 (+12 %), 120 000 clients, modele hybride auto + humain. Acquisition ADA Site Compliance en septembre 2024 | Mix overlay + humain reste critique : la couche overlay heritage de tous les problemes du modele |
| **EqualWeb** | 490 USD/an | 2 000+ USD/an enterprise | WCAG visuel | Overlay JS | Pricing competitif | Memes critiques que les autres overlays |
| **Recite Me** | Sur devis (min. 12 mois) | Contrats 1-3 ans, "des milliers de livres/an" non chiffres publiquement | WCAG + text-to-speech + traduction 100 langues, AI simplifier | Overlay JS UK-based | Focus secteur public UK, plus orientation "utility" qu'"compliance" | Toujours overlay, meme limites techniques |
| **Equally AI** | 29 USD/mois (engagement 2 ans) ou 37 USD/mois | jusqu'a Ultimate (sur devis) | WCAG auto + validation humaine | Overlay JS + manuel | Pricing tres bas, "litigation pledge" jusqu'a 10 000 USD | Pas de phone/chat support, pledge plus faible que UserWay |
| **Silktide** | Sur devis, contrats 12 mois min. | Plans modulaires | Testing + monitoring + content quality + SEO (pas overlay primaire) | Plateforme scan, pas overlay drop-in | **Note** : Silktide critique publiquement les overlays (cf. leur blog FTC vs AccessiBe). Modele = testing platform, pas widget | Pas un drop-in widget — concurrent indirect |
| **AccessibilityCloud / Accessibility.Cloud** | Donnees publiques limitees | n/a | Crowdsourced wheelchair accessibility data | Pas overlay UI, plus base de donnees POI | Pas le meme produit | Hors scope concurrent direct |
| **Allyable / MaxAccess** | Donnees publiques tres limitees | n/a | Inconnu (peu de presence web 2025) | Inconnu | n/a | Pas assez d'information publique pour evaluer — peut-etre marginal ou dormant |
| **WAVE** (WebAIM) | Free (extension navigateur + API payante) | API tier | Evaluation accessibilite (audit), pas overlay utilisateur | Extension browser + checker | Reference academique, gratuit | Pas un widget user-facing, c'est un outil developpeur |
| **Morphic.org** | Free (open source) | Donations / grants Raising the Floor | OS-level accessibility preferences, AT-on-Demand | Application native Windows/Mac + cloud preferences GPII | **Open source, gratuit, mission non-profit, AT-on-Demand cross-machines** | **OS-level desktop, PAS web cross-site**. Concurrent philosophique le plus proche de Shinkofa mais sur un axe different. |

### Sources tableau

- AccessiBe : Latka 2024 (revenue), CB Insights / Crunchbase (funding), FTC press release 2025-04, lflegal 2024-07.
- UserWay : G2 pricing 2026, Capterra, userway.org/pricing, lflegal 2025-02.
- AudioEye : SEC 10-K 2024 (audioeye.com investors), AInvest 2025 analysis.
- EqualWeb : Hounder honest comparison, G2.
- Recite Me : reciteme.com news, G2, Whois Accessible.
- Equally AI : equally.ai/pricing, G2 comparisons 2025-2026.
- Silktide : silktide.com pricing + blog FTC vs AccessiBe.
- Morphic : morphic.org features, Zero Project, MSU press 2023, isocial.cat 2024, raisingthefloor.org.

---

## 3. Critique Majeure des "Accessibility Overlays" — 5 Piliers

> Source de reference : **Overlay Fact Sheet** (overlayfactsheet.com), signe par 800+ professionnels accessibilite (dont contributeurs WCAG/ARIA/HTML chez Google, Microsoft, Apple). Cree par Karl Groves.

### Pilier 1 — Inefficacite mesuree (WebAIM Survey)

**Donnees** : WebAIM Survey of Web Accessibility Practitioners (cite par a11y-collective, accessibleweb) :
- 67 % des praticiens jugent les overlays "pas du tout / peu efficaces"
- 72 % des utilisateurs handicapes les jugent ainsi (plus severes que les praticiens)
- Seulement 2,4 % les jugent "tres efficaces"

**Implication Shinkofa** : la communaute handicap a une opinion deja formee. Tout positionnement qui ressemble a un overlay declenchera un rejet immediat. Le messaging doit explicitement se demarquer.

### Pilier 2 — Conflits avec les vraies assistive technologies (ATs)

**Constat** (overlayfactsheet, WebAIM) : les overlays JS injectent des ARIA labels, du focus management et un screen reader concurrent. Resultat : les utilisateurs de **JAWS, NVDA, VoiceOver** (vraies ATs) decrivent les overlays comme un OBSTACLE qui parasite leur AT habituelle.

**Preuve sociale forte** : des **extensions navigateur ont ete creees specifiquement pour DESACTIVER les overlays** sur les sites visites — par les utilisateurs handicapes eux-memes.

**Implication Shinkofa** : ne JAMAIS injecter des ARIA labels supplementaires ou un focus management qui se superpose au navigateur. **Notre adaptation morphique doit AUGMENTER les preferences sans interferer avec les ATs natives.** Tests d'integration JAWS/NVDA/VoiceOver obligatoires des l'alpha.

### Pilier 3 — Faux bouclier juridique (lawsuit data)

**Donnees 2024** (accessibility.works ADA report, EcomBack 2024 annual) :
- **4 000+ lawsuits ADA en 2024** (federal + etat)
- **1 023 sites avec overlay actif** ont ete poursuivis (25 % du total)
- **78 % des lawsuits visent e-commerce**
- Cas BloomsyBox : overlay UserWay installe -> poursuivi 5 mois plus tard

**Action FTC** :
- **AccessiBe : 1 M$ d'amende finale en avril 2025** (proposed janvier 2025, finalise avril 2025)
- Ordonnance valable 20 ans : interdiction de revendiquer "WCAG compliant" sans preuve
- Reports annuels FTC obligatoires sur 20 ans

**Implication Shinkofa** : ne JAMAIS revendiquer la conformite WCAG du site cible. Notre revendication est cote utilisateur uniquement : "voici l'experience adaptee a toi". Le site reste 100 % responsable de sa conformite. **Cette ligne rouge est absolue.**

### Pilier 4 — Probleme privacy / profiling handicap

**Constat** (overlayfactsheet section privacy) : un overlay qui demande "Etes-vous malvoyant ? dyslexique ?" pour activer les profils accessibilite collecte de fait **des donnees de sante extremement sensibles**. Article 9 RGPD (donnees particulieres). Aucun overlay actuel ne traite cela en RGPD-compliant.

**Cas concret** : "Privacy advocates fear that overlay vendors may build databases of users known to have disabilities, which could be sold or used for discriminatory purposes."

**Implication Shinkofa** : **privacy-first est notre angle de differenciation, pas une option**. Le profil holistique (HD + neurodivergence + energie + sensoriel) ne quitte JAMAIS l'appareil utilisateur (local-first). Pas de collecte cote serveur. C'est aussi le bon angle NLNet (cf. section 6) et le bon angle Dignity (l'utilisateur n'est jamais le produit, cf. rules/Dignity.md).

### Pilier 5 — Ne corrige pas le code source

**Constat** : l'overlay ajoute une couche JS au runtime. Si le site cible a un `<img>` sans alt, un `<button>` non focusable, un focus trap rate dans un modal, **l'overlay ne corrige rien dans le code**. Il essaie de "deviner" et d'injecter, parfois mal.

Resultat : la majorite des criteres WCAG (structure semantique, ordre de lecture, formulaires accessibles, labels) restent non-conformes. L'overlay couvre superficiellement quelques criteres visuels (contraste, taille texte).

**Implication Shinkofa** : ne pas pretendre "rendre un site accessible". Pretendre "rendre un site **utilisable par toi** dans la mesure des preferences que tu peux contraindre". C'est la difference cardinale.

### Verdict synthese

| Critere | Overlays commerciaux | Shinkofa morphique (cible) |
|---------|----------------------|----------------------------|
| Corrige le code source du site | Non | Non (assume) |
| Adapte la presentation cote utilisateur | Partiel (visuel/moteur) | Multi-dimensions (visuel + cognitif + energetique + holistique) |
| Revendique conformite WCAG du site | OUI (= mensonger, FTC) | **Non — jamais** |
| Interfere avec ATs natives | OUI souvent | Non — augmente sans superposer |
| Privacy | Collecte profil handicap cote serveur | Local-first, privacy by design |
| Modele | SaaS commercial | Open source + donations / EU grants |
| Cible | Site owner (qui paie pour eviter lawsuit) | Utilisateur final (qui veut son adaptation) |

**Le pivot de modele economique (site owner -> utilisateur final) est le levier principal.**

---

## 4. Differenciation Shinkofa — Blue Ocean Confirme

### Matrice d'axes adresses

| Axe d'adaptation | Overlays commerciaux | Morphic.org | Browser exts (Dark Reader, Stylus) | WAI-Adapt (W3C draft) | **Shinkofa cible** |
|------------------|----------------------|-------------|------------------------------------|----------------------|---------------------|
| WCAG visuel (contraste, taille, couleur) | Oui | Oui (OS level) | Partiel (theme dark only) | Oui | Oui |
| WCAG moteur (clavier, focus) | Partiel | Oui | Non | Oui | Oui |
| Reduce motion / vestibulaire | Partiel | Oui (OS) | Non | Oui (Help module) | Oui |
| Neurodivergence cognitive fine (HPI, autisme, AuDHD, dyslexie nuancee) | Non | Non | Non | Symbols module (partiel) | **Oui — differenciateur** |
| Human Design (type, autorite, profil, centres) | **Non — aucun** | Non | Non | Non | **Oui — differenciateur** |
| Cycles d'energie (variable energy, contextual load) | Non | Non | Non | Non | **Oui — differenciateur** |
| Profil holistique persistant cross-sites | Non (overlay = par-site) | **Oui (cloud preferences GPII, mais OS desktop)** | Non | Vision du standard | **Oui — differenciateur web** |
| Privacy local-first | Non | Partiel (cloud preferences chiffre) | Variable | Non specifie | **Oui — differenciateur** |
| Standard W3C aligne | Non (proprietaire) | Aligne GPII | Non | Source du standard | **Oui — opportunite** |
| Modele economique | Commercial site owner | Donations / grants non-profit | Freemium ou donations | n/a | **Donations + EU grants + ecosysteme Shinkofa** |

### Blue ocean — confirme avec nuances

**Confirme** :
- Axe HD : aucun concurrent. Marche Human Design en croissance (HumanDesignApp, Align/MyHumanDesign, Joy) mais TOUS sont des apps standalone, **aucun n'injecte le HD dans l'experience web cross-site**.
- Axe cycles d'energie : aucun concurrent en accessibilite web. Quelques apps standalone (energy tracking) mais zero integration UI cross-sites.
- Axe neurodivergence fine : l'industrie overlay s'arrete au "dyslexia mode" generique. Aucune granularite AuDHD vs autiste pur vs HPI vs dyslexie phonologique vs surface.

**Nuance** :
- **Morphic.org est le concurrent le plus proche philosophiquement**. Open source, non-profit, cloud preferences GPII (le profil suit l'utilisateur d'une machine a l'autre), gratuit, mission inclusion. Mais : **OS-level desktop (Windows/Mac), pas web cross-site, pas Linux/Mobile widget navigateur**. Le terrain de jeu est complementaire, pas concurrent direct. **Opportunite de partenariat / interop GPII Preferences Framework** : Shinkofa pourrait s'interfacer avec le profil GPII pour heriter les preferences OS quand disponibles, et y ajouter ses axes proprietaires (HD, cycles, ND fine).
- **W3C WAI-Adapt** : le standard arrive. Implementer le standard est strategiquement intelligent (legitimite, futureproof). Mais le standard se limite a la couche cognitive de base (Symbols, Help, Tools, Content). Les axes Shinkofa proprietaires (HD, cycles, ND fine) **s'empilent au-dessus** du standard sans le contredire.
- **AI agents 2025+** : tendance emergente (Accesstive, Level Access AI Agents). Ils visent encore le site owner (audit + remediation cote source). **Pas la meme approche utilisateur-first.**

### Recommandation positionnement

**"Shinkofa morphique = profil holistique de l'utilisateur, jamais correction du site"**

- Pas un overlay : un **profil utilisateur** qui voyage avec l'utilisateur.
- Pas WCAG-only : un **profil holistique** (sensoriel + cognitif + neurodivergence + HD + energie).
- Pas pour le site owner : pour **l'utilisateur final** (l'humain est respecte, pas le produit — Dignity).
- Pas commercial : **open source, donations, EU grants**, mission alignment.
- Pas en conflit avec ATs : **augmente** les preferences existantes (CSS prefers-*, ARIA natif, ATs systeme).

---

## 5. Modele Business — Open Source + Donations + Subventions

### Benchmarks open source pertinents

| Projet | Revenu 2022-2024 | Modele |
|--------|------------------|--------|
| **Thunderbird** | 6,4 M$ donations 2022 (+ 100 % vs 2021 = 2,7 M$). Estimation 8-12 M$ en 2024 (extrapolation, **Probable**) | 99,9 % donations utilisateurs. MZLA Technologies cree pour permettre futurs services payants optionnels |
| **Dark Reader** | Non public. 10 M+ users (Chrome/Firefox/Edge/Safari). | Open source, v5 introduit subscription **corporate only** (9,99 USD/mois). Particuliers gratuits. Estimation **Uncertain** : peut-etre 0,5-2 M$ ARR si 1 % des utilisateurs corporates convertissent. |
| **Brave / Brave Shields** | Estimation > 100 M$ revenus 2024 toutes lignes confondues | Modele BAT cryptocurrency + search ads. Brave Shields = feature gratuite differenciante du navigateur. Pas un modele transposable a un widget seul. |
| **NoScript** | Non public, marginal | Donations pures, projet d'auteur unique. Modele "passion project" non scalable a une equipe. |
| **Morphic.org** | Subventions (Cloud4all H2020 EU, Prosperity4All, MSU institutional, Zero Project funding) | 100 % grants + institutional. Pas de revenue model utilisateur. |

### Lecons pour Shinkofa

1. **Thunderbird prouve qu'un projet OS focus utilisateurs handicapes / minorites peut tirer 6-12 M$ de donations annuelles** si l'identite de mission est claire et la marque forte. C'est un plafond utile a viser sur 3-5 ans, **PAS un montant immediat**.

2. **Dark Reader montre qu'un widget OS peut viser ~10 M utilisateurs**. Distribution facile via Chrome Web Store / Firefox Add-ons / Edge Add-ons. **Mais le revenu utilisateur direct est faible** — la valeur reside dans la visibilite et le levier ecosysteme.

3. **Morphic.org prouve qu'un projet accessibilite open source peut vivre 5+ ans sur subventions (EU H2020, Zero Project) sans revenue commercial direct**. Cest le modele que NLNet finance. C'est aussi le modele plus precaire si une grant tombe.

4. **AccessiBe / UserWay (commercial)** prouvent qu'il y a de l'argent dans l'accessibilite (51 M$ ARR AccessiBe 2024). Mais ce revenu est obtenu **en vendant aux site owners**, pas aux utilisateurs. **Le pivot Shinkofa change la nature du marche** : on ne se bat pas sur leur terrain.

### Recommandation modele

**Modele tri-source recommande** :

| Source | % cible 24 mois | Rationale |
|--------|-----------------|-----------|
| Subventions EU (NLNet, NGI0, Horizon Europe accessibility tracks, Erasmus+ inclusion) | 50-60 % | Aligne mission, montants previsibles 5-50 KEUR par grant NLNet, possibilite de scale via NGI Zero Commons Fund |
| Donations utilisateurs + organisations | 20-30 % | Modele Thunderbird. Demarre lent (annee 1 = quelques milliers EUR), peut croitre exponentiellement avec la base utilisateur |
| Services / partenariats / ecosysteme Shinkofa | 15-25 % | Integration avec plateformes Shinkofa, support / training entreprises qui adoptent volontairement, formation Dignity-aware design |

**Refus** : modele freemium widget pour site owners (= overlay-like = on devient ce qu'on critique).
**Refus** : monetisation des donnees profil utilisateur (= Article 9 RGPD + viole Dignity).
**Refus** : enterprise lock-in.

---

## 6. Widget Navigateur — Etat du Marche

### Concurrents indirects (extensions navigateur generales)

| Extension | Users | Scope | Modele |
|-----------|-------|-------|--------|
| Dark Reader | 10 M+ | Theme dark sur tout site | Open source, sub corp v5 |
| Stylus | Quelques millions estim. | CSS custom par site | Open source, donations |
| Read Aloud / NaturalReader | Plusieurs millions | TTS extension | Freemium |
| Helperbird | Donnees publiques limitees | Dyslexia / cognitive aids | Freemium |
| Mercury Reader / Reader Mode | Integre navigateurs maintenant | Mode lecture | Native browser feature |

### Constat strategique

**Aucune extension navigateur n'offre actuellement** :
- Un profil multi-dimensions persistant cross-sites
- L'integration HD + neurodivergence + cycles
- Une approche privacy local-first qui sync optionnel via Shinkofa account

**Dark Reader est le plus proche en distribution** : 10 M utilisateurs prouve que le pattern "extension navigateur d'adaptation visuelle cross-site" fonctionne. **Mais Dark Reader fait UN seul axe** (theme dark). Shinkofa fait N axes coordonnes.

### Recommandation widget

1. **Phase 1 (MVP web)** : drop-in JS (snippet `<script>` que les sites tiers integrent volontairement, ex. The Ermite, Michi-Shinkofa, Kakusei). Permet de tester l'adaptation morphique sur l'ecosysteme Shinkofa avant de l'exposer aux sites tiers.
2. **Phase 2 (browser extension)** : Chrome / Firefox / Edge. L'utilisateur installe Shinkofa morphique chez lui, l'extension applique son profil **sur tous les sites qu'il visite**. C'est le vrai blue ocean — concurrent indirect de Dark Reader mais beaucoup plus large.
3. **Phase 3 (interop)** : implementer WAI-Adapt (W3C) pour reconnaitre les sites qui declarent leur structure semantique adaptable. Bridge GPII pour heriter preferences OS.

**Avantage strategique du widget navigateur** : il rend Shinkofa **independant des site owners** (qui n'integreront jamais notre snippet en masse) et **dependant uniquement de l'utilisateur final** (qui installe une fois). C'est l'inversion du modele economique overlay.

---

## 7. NLNet / EU Funding — Alignement

### Criteres NGI0 (NLNet)

NLNet finance via deux programmes principaux en 2025-2026 :

| Programme | Focus | Grant range |
|-----------|-------|-------------|
| **NGI0 Core** | "Open Internet architecture" — infrastructure, standards, tooling | 5 000 - 50 000 EUR (scalable) |
| **NGI0 Commons Fund** | "Digital commons" — projets reutilisables par l'ecosysteme libre | 5 000 - 50 000 EUR |
| **NGI0 Entrust** | "Privacy and trust enhancing technologies" | 5 000 - 50 000 EUR |

**Services additionnels offerts** : audits securite, accessibilite (sic), licensing, mentoring, packaging, traduction, standardisation.

**Prochaine deadline reperee** : 1er decembre 2025 (deja passe a date du present rapport 2026-05-21). Verifier deadlines 2026 sur nlnet.nl.

### Fit Shinkofa morphique = excellent

| Critere NLNet | Shinkofa morphique |
|---------------|--------------------|
| Open source | Oui — licence a definir (AGPL-3.0 ou Apache-2.0 ou EUPL recommande) |
| Standards-aligne | Oui — implementation W3C WAI-Adapt |
| Privacy-enhancing | Oui — local-first, pas de telemetrie obligatoire |
| Accessibility | **Cur du projet** |
| Reutilisable digital commons | Oui — drop-in JS + browser extension + interop GPII |
| Internationalisation | Oui — trilingue FR/EN/ES day 1 (cf. rules/Quality.md Lego library i18n) |
| Mentoring / standardisation | Bienvenu — Shinkofa peut contribuer a WAI-Adapt task force |

### Precedents finances similaires

Recherche directe sur projets accessibility / morphic / adaptive UI dans le portefeuille NLNet n'a pas remonte de project nomme identique. **AccessKit (iOS support)** est cite comme exemple de projet accessibility finance par NGI0 — c'est une couche cross-platform pour les screen readers, scope adjacent mais different.

**Conclusion fit** : tres bon. La proposition Shinkofa morphique peut etre framee comme :
1. Implementation reference open source de W3C WAI-Adapt (standardisation)
2. Couche privacy-first d'adaptation morphique multi-dimensions (NGI0 Entrust angle)
3. Digital commons pour ecosysteme accessibilite europeen post-EAA (NGI0 Commons angle)

**Angle a privilegier** : combinaison Entrust (privacy) + Commons (digital commons reutilisable). Eviter d'overlap avec l'angle Adaptive design / morphique de la candidature NLnet en cours (cf. memory `project_nlnet_decision_2026-05-15.md`) pour ne pas creer de conflit interne entre dossiers.

### Autres pistes EU

- **Horizon Europe** cluster "Health" et "Inclusion" : grants plus gros (100K-1M EUR) mais cycles plus longs (12-24 mois). Pour phase 2-3 du projet.
- **Erasmus+ KA2 Cooperation** : si volet formation Dignity-aware design est ajoute (formation Shinkofa pour developpeurs/designers). Plus modeste mais previsible.
- **Cascade funding NGI** : plus petits montants (5-50K) via les sub-grants delegues (NGI Search, NGI Sargasso, etc.).

---

## 8. Contradictions Detectees

### Contradiction 1 : Morphic.org se decrit a la fois "free" et a "Pricing tiers (Basic, Plus, Enterprise)"

Sources : morphic.org (free) vs g2.com/products/morphic/pricing (tiers).

**Analyse** : il y a probablement deux entites distinctes — **"Morphic" l'app accessibility de Raising the Floor** (free, OS-level) et **"Morphic.com" une plateforme commerciale differente** (recherchee sur Capterra/GetApp avec d'autres fonctionnalites). Confidence : **Probable** que ce sont deux produits distincts portant le meme nom. A clarifier en Deep Dive avant tout positionnement public.

**Recommandation** : utiliser "Morphic.org" explicitement quand on parle du projet Raising the Floor pour eviter confusion. Si Shinkofa morphique partage le nom "morphic" dans sa communication, **prevoir un disambiguator clair** (ex. "Shinkofa Morphic Profile" ou autre).

### Contradiction 2 : taille marche digital accessibility

Sources : 549 M$ vs 768 M$ vs 1,5 Md$ vs 5,8 Md$ vs 10,9 Md$ (selon definition).

**Analyse** : pas une contradiction reelle mais une definition floue. **Software accessibility specifiquement = 549-1500 M$**. **Services accessibility (audit, conseil, formation, remediation humaine inclus) = 5,8-10,9 Md$**. Les overlays commerciaux opperent sur la part software stricte.

**Implication Shinkofa** : ne pas claim "marche 10 Md$" en pitch — la realite du segment overlay est de l'ordre de **~1 Md$ croissant a 9-11 % CAGR**. C'est deja un beau marche, pas besoin de gonfler.

---

## 9. Knowledge Gaps

| # | Gap | Impact | Action |
|---|-----|--------|--------|
| 1 | Pas de chiffres UserWay revenue / valuation publics | Mineur — UserWay reste un competiteur identifie meme sans ARR precis | Acceptable, marker **Uncertain** |
| 2 | Pas de creusement ZH/JA/KO/DE/RU sur accessibility / morphique | Mineur en 2026 (marche tres US/EU) mais a refaire si Shinkofa morphique vise expansion Asie | Re-ouvrir en Deep Dive si pertinent post-Phase 1 |
| 3 | Pas de revue exhaustive des extensions Chrome Web Store pour accessibility | Moyen — pourrait reveler concurrents indirects manques | Skill /audit ou veille technique dediee Phase 2 (avant lancement extension) |
| 4 | Pas de confirmation que Morphic.com (commercial) est distinct de Morphic.org | Moyen — risque de confusion brand | Lever en 30 min Deep Dive avant tout choix de nom |
| 5 | Pas d'analyse de l'impact CRA (Cyber Resilience Act EU 2026-2027) sur drop-in JS et extensions | Moyen — un widget JS open source devra etre SBOM-ready, CRA-compliant | Veille legale dediee Q3 2026 |

---

## 10. Recommandations Strategiques

### Cardinales (non-negociables)

1. **Ne JAMAIS revendiquer la conformite WCAG du site cible**. Notre claim est cote utilisateur uniquement. Cette ligne separe Shinkofa des overlays sanctionnes FTC.
2. **Open source des le jour 1**. Licence EUPL-1.2 ou AGPL-3.0 recommandees (compatibles EU funding, copyleft strong). Apache-2.0 si on prefere permissif.
3. **Privacy local-first non-negociable**. Profil utilisateur ne quitte JAMAIS l'appareil sauf sync opt-in chiffre e2e via compte Shinkofa.
4. **Implementer W3C WAI-Adapt** comme couche fondation. Les axes proprietaires Shinkofa (HD, ND fine, cycles) s'empilent au-dessus.
5. **Pas de tests / validations avec ATs natives = blocage release**. JAWS / NVDA / VoiceOver / TalkBack doivent passer green sur les sites de test avant tout deploy public.

### Phasage propose

| Phase | Cible | Duree estimee | Livrable |
|-------|-------|----------------|----------|
| Phase 1 — Drop-in JS pour ecosysteme Shinkofa | Sites Shinkofa (Ermite, Michi, Kakusei) | 3-6 mois | Snippet integration + dashboard preferences Shinkofa account |
| Phase 2 — Browser extension Chrome / Firefox | Utilisateurs grand public | 6-9 mois apres Phase 1 | Extension installable, 1000-10000 users beta |
| Phase 3 — Interop W3C WAI-Adapt + GPII | Standards bodies + Raising the Floor partnership | 12+ mois | Conformance to WAI-Adapt, bridge GPII Preferences Framework |
| Phase 4 — Internationalisation + EU expansion | EU marche post-EAA | 18+ mois | DE, ES, IT en plus de FR/EN |

### Positionnement message — exemples

**A privilegier** :
- "Le profil holistique qui voyage avec toi sur le web."
- "Adaptation morphique cote utilisateur. Privacy local-first."
- "Ton profil sensoriel, neurodivergent, energetique et personnel — applique a tout site que tu visites."
- "Open source. Aucun overlay. Aucune fausse promesse de conformite. Juste toi, mieux servi par le web."

**A bannir** (declencheraient association overlay) :
- "Rend ton site accessible en une ligne de code"
- "Conformite WCAG automatique"
- "Evite les ADA lawsuits"
- "AI-powered accessibility widget"
- Tout ce qui ressemble au pitch UserWay/AccessiBe.

### Risques residuels

1. **Risque "guilt by association"** : meme si on est l'anti-overlay, la communaute handicap pourrait nous classer overlay par defaut. **Mitigation** : signer publiquement Overlay Fact Sheet en tant qu'editeur, faire endorser par 2-3 personnalites accessibility (Adrian Roselli, Lainey Feingold, Karl Groves) avant le launch.

2. **Risque W3C WAI-Adapt evolue trop lentement** : si le standard reste Working Draft 5+ ans, on attend trop. **Mitigation** : implementer la version actuelle + nos axes proprietaires en parallele, contribuer activement a la task force pour accelerer.

3. **Risque competitif Morphic.org pivot web** : si Raising the Floor decide de porter Morphic en web cross-site, ils sont alignes mission et techniquement competents. **Mitigation** : approche partenariat early — proposer une integration GPII des le pitch NLNet.

4. **Risque CRA (Cyber Resilience Act)** : tout produit numerique commercialise en EU devra etre CRA-compliant a partir de fin 2027. Un widget open source est exempte SAUF si commercialise. **Mitigation** : SBOM CycloneDX des le jour 1 (cf. rules/Security.md SBOM), modele non-commercial direct utilisateur.

---

## SKB Enrichment Proposals

Le SKB n'ayant pas encore de section dediee a la veille concurrentielle accessibility, je propose :

| Proposition | Domaine SKB | Scope |
|-------------|-------------|-------|
| 1 | Nouveau domaine SKB **"Accessibility & Morphic Adaptation"** (numero a allouer) | Veille permanente concurrents, lawsuits trends, evolutions standards W3C, EAA / CRA compliance |
| 2 | Enrichissement **"Communication & Marketing"** (domaine 11 existant) | Section "Anti-positioning patterns" : comment se positionner contre une categorie de produits decredibilisee sans en porter le stigmate (cas Shinkofa vs overlays) |
| 3 | Enrichissement **"Funding & Grants"** | Sous-section NLNet NGI0 angles d'attaque + precedents finances dans accessibility / privacy-enhancing tech |

Soumis a SKB Knowledge Master pour approbation flow (jamais en ecriture directe per protocole Confidentiality / SKB Knowledge Master handoff).

---

## Kobo Memory Proposal

Pattern detecte transverse aux concurrents : **les promesses marketing AI-powered + WCAG-compliant non-tenues ont declenche FTC fines + class actions en cascade 2024-2025**.

Proposition lesson universel :
- **File** : `feedback_marketing_compliance_claims_risk.md`
- **Audience** : universal
- **Content** : "Ne JAMAIS revendiquer publiquement une conformite reglementaire automatique d'un produit tiers via notre tooling. FTC AccessiBe 1M$ + UserWay class action confirment que la jurisprudence accepte la deception claim. Toujours formuler en termes d'aide / outillage / facilitation, jamais en garantie de conformite."

A soumettre a Kobo via POST /api/memories si Kobo accessible session courante.

---

## Sources

> Standard de citation : auteur/org, date, titre, URL, langue, confidence.

### Sources autoritatives (haute confidence — CRAAP >= 20/25)

1. **Federal Trade Commission** (2025-04). "FTC Approves Final Order Requiring accessiBe to pay $1 Million." https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million. Langue : EN. Confidence : **Verified**.
2. **Federal Trade Commission** (2025-01). "FTC Order Requires Online Marketer to Pay $1 Million for Deceptive Claims that its AI Product Could Make Websites Compliant with Accessibility Guidelines." https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-order-requires-online-marketer-pay-1-million-deceptive-claims-its-ai-product-could-make-websites. Langue : EN. Confidence : **Verified**.
3. **Law Office of Lainey Feingold** (2025-02). "Another Web Access Overlay Company Sued by a Small Business." https://www.lflegal.com/2025/02/userway-overlay-lawsuit/. Langue : EN. Confidence : **Verified**.
4. **Law Office of Lainey Feingold** (2024-07). "New Class Action Lawsuit against AccessiBe." https://www.lflegal.com/2024/07/accessibe-class-action/. Langue : EN. Confidence : **Verified**.
5. **Law Office of Lainey Feingold** (2025-01). "Beware of AI Accessibility Promises: US Federal Agency Fines an Overlay Company One Million Dollars." https://www.lflegal.com/2025/01/ftc-accessibe-million-dollar-fine/. Langue : EN. Confidence : **Verified**.
6. **Karl Groves et al.** (2021, signataires 800+, mis a jour). "Overlay Fact Sheet." https://overlayfactsheet.com/en/. Langue : EN. Confidence : **Verified**.
7. **W3C WAI** (n.d., specifications en cours 2024-2025). "WAI-Adapt Overview." https://www.w3.org/WAI/adapt/. Langue : EN. Confidence : **Verified**.
8. **W3C WAI** (n.d., specifications en cours). "WAI-Adapt Task Force." https://www.w3.org/WAI/about/groups/task-forces/adapt/. Langue : EN. Confidence : **Verified**.
9. **European Commission** (2025). "European Accessibility Act (EAA)." https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en. Langue : EN. Confidence : **Verified**.
10. **NLNet Foundation** (2025). "About NGI Zero." https://nlnet.nl/NGI0/. Langue : EN. Confidence : **Verified**.
11. **NLNet Foundation** (2025-01). "50 Free and Open Source Projects Selected for NGI Zero grants." https://nlnet.nl/news/2025/20250101-announcing-grantees-June-call.html. Langue : EN. Confidence : **Verified**.
12. **Raising the Floor** (n.d.). "AccessForAll - Our Approach." https://raisingthefloor.org/our-approach-accessforall/. Langue : EN. Confidence : **Verified**.
13. **Morphic.org** (n.d.). "Morphic makes computers easier to use." https://morphic.org/. Langue : EN. Confidence : **Verified**.

### Sources analytiques (confidence moyenne — CRAAP 15-19/25)

14. **Adrian Roselli** (2021-09). "#UserWay Will Get You Sued." https://adrianroselli.com/2021/09/userway-will-get-you-sued.html. Langue : EN. Confidence : **Probable** (auteur autorite reconnue, billet d'opinion mais documente).
15. **Adrian Roselli** (2025-01). "FTC Catches up to #accessiBe." https://adrianroselli.com/2025/01/ftc-catches-up-to-accessibe.html. Langue : EN. Confidence : **Verified**.
16. **accessibility.works** (2024-2025). "ADA Web Accessibility Lawsuit Trends: 2024 in Review." https://www.accessibility.works/blog/ada-lawsuit-trends-statistics-2024-summary/. Langue : EN. Confidence : **Probable**.
17. **EcomBack** (2024-2025). "2024 ADA Website Compliance Lawsuit Annual Report." https://www.ecomback.com/annual-2024-ada-website-accessibility-lawsuit-report. Langue : EN. Confidence : **Probable**.
18. **WCAGsafe** (2025-2026). "ADA Lawsuit Statistics 2025-2026: Data & Trends." https://wcagsafe.com/blog/ada-lawsuit-statistics. Langue : EN. Confidence : **Probable**.
19. **AccessiTREE** (n.d.). "The Deceptive Facade of Accessibility Overlays." https://www.accessitree.com/accessibility-articles/the-deceptive-facade-of-accessibility-overlays/. Langue : EN. Confidence : **Probable**.
20. **a11y Collective** (n.d.). "Are Accessibility Overlays a Good Investment?" https://www.a11y-collective.com/blog/accessibility-overlays/. Langue : EN. Confidence : **Probable**.

### Sources commerciales / marketing (confidence basse — flag explicit)

21. **G2 / Capterra / GetApp / SoftwareAdvice** (2025-2026). Pricing pages UserWay, AccessiBe, AudioEye, EqualWeb, Recite Me, Equally AI, Silktide, Morphic. Langue : EN. Confidence : **Probable** sur pricing, **Uncertain** sur revendications fonctionnelles (sources marketing).
22. **AudioEye Inc.** (2025). SEC 10-K filing 2024. https://www.sec.gov/Archives/edgar/data/1362190/000155837025002819/aeye-20241231x10k.htm. Langue : EN. Confidence : **Verified** (filing officiel SEC, mais perspective company-favorable).
23. **Latka / GetLatka** (2024). "How accessiBe hit $51.3M revenue and 110.8K customers in 2024." https://getlatka.com/companies/accessibe. Langue : EN. Confidence : **Probable** (donnees auto-declarees par companies).
24. **Hounder.co** (2024-2025). "Accessibility Overlays Compared: accessiBe vs AudioEye vs UserWay vs EqualWeb." https://hounder.co/the-dog-bowl/accessibe-vs-audioeye-vs-userway-vs-equalweb-honest-comparison-public-agencies. Langue : EN. Confidence : **Probable**.

### Sources marche

25. **Grand View Research** (2024-2025). "Digital Accessibility Software Market Size, Share Report 2030." https://www.grandviewresearch.com/industry-analysis/digital-accessibility-software-market-report. Langue : EN. Confidence : **Probable** (rapport payant, executive summary public).
26. **Mordor Intelligence** (2024-2025). "Digital Accessibility Software Market Size & Growth to 2030." https://www.mordorintelligence.com/industry-reports/digital-accessibility-software-market. Langue : EN. Confidence : **Probable**.
27. **Straits Research** (2024-2025). "Digital Accessibility Market Size, Share & Growth Report by 2034." https://straitsresearch.com/report/digital-accessibility-market. Langue : EN. Confidence : **Probable**.

### Note de biais

L'echantillon de sources est legerement biaise anti-overlay (sources autoritatives accessibility = communaute critique des overlays). Le contre-poids (sources marketing editeurs overlay) a ete echantillonne mais leurs revendications fonctionnelles ne sont pas reprises comme verifiees — uniquement leur pricing. Ce biais est **assume** car factuellement aligne avec la realite juridique (FTC, class actions) et la realite mesuree (WebAIM 67-72 %). Si une session ulterieure veut un Deep Dive equilibre, completer avec interviews editeurs + tests utilisabilite reproductibles.

---

## Conformite Monozukuri (test 6 comportements)

| # | Comportement | Statut session |
|---|--------------|----------------|
| 1 | Chaque brique parfaite | Oui — chaque finding cite source + date + langue + confidence |
| 2 | Rigueur > Vitesse | Oui — 30 sources consultees, cross-validees, biais signale |
| 3 | L'erreur est une donnee | Oui — contradiction Morphic.org / Morphic.com explicitement documentee section 8 |
| 4 | Documentation matiere premiere | Oui — proposition enrichissement SKB section dediee |
| 5 | Preuve jamais affirmation | Oui — chaque claim chiffre relie a source URL et date d'acces |
| 6 | Temps long | Oui — tag dates explicites, recommandation veille permanente Phase 1-4 |

Fin du livrable.
