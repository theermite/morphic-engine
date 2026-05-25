---
title: "Adaptation morphique vs accessibility overlays : ce que la FTC a confirmé en 2025"
slug: adaptation-morphique-vs-accessibility-overlays
locale: fr
date: 2026-05-25
author: Jay Goncalves (The Ermite)
category: Accessibilite numerique
tags:
  - accessibilite
  - WCAG
  - FTC
  - accessibility-overlay
  - morphic-engine
  - neurodiversite
excerpt: >
  En avril 2025, la Federal Trade Commission a finalisé un consent order
  contre accessiBe, condamnant l'entreprise à un million de dollars pour
  publicité mensongère sur les capacités de son overlay d'accessibilité.
  Au-delà de l'amende, le jugement marque un tournant : il acte
  juridiquement ce que la communauté technique sait depuis des années,
  et il oblige à repenser ce qu'on appelle "rendre un site accessible".
coverImage: null
---

# Adaptation morphique vs accessibility overlays : ce que la FTC a confirmé en 2025

Le 22 avril 2025, la Federal Trade Commission américaine a approuvé à
l'unanimité un consent order qui condamne accessiBe — l'un des plus
gros vendeurs d'accessibility overlays au monde — à payer un million de
dollars. Le montant est anecdotique au regard du chiffre d'affaires
2024 de l'entreprise (environ 51,3 millions de dollars selon les
estimations publiques), mais le précédent juridique, lui, ne l'est pas.

Pour la première fois, une autorité fédérale américaine acte par écrit
ce que les développeurs accessibilité, les utilisateurs de
technologies d'assistance et la communauté handicap répètent depuis
2019 : un overlay JavaScript injecté dans une page ne rend pas un site
conforme à WCAG. Il prétend le faire. Ce n'est pas la même chose.

Cet article explique trois choses : ce qu'est exactement un
accessibility overlay, ce que la FTC a reproché à accessiBe, et
pourquoi l'adaptation morphique — l'approche que nous développons avec
`morphic-engine` — est une réponse structurellement différente, et non
une variation sur le même thème.

## Qu'est-ce qu'un accessibility overlay ?

Un accessibility overlay est un script tiers que le propriétaire d'un
site web ajoute à ses pages, généralement via une ligne de code
unique. Une fois chargé, le script analyse le DOM, injecte un widget
flottant — souvent une icône en forme de bonhomme — et propose à
l'utilisateur de modifier certains aspects de l'expérience : taille de
texte, contraste, lecture vocale, surlignement de liens, etc.

Le pitch commercial est puissant. Il tient en trois promesses :

1. Une seule ligne de code à coller, aucune modification du site
   d'origine.
2. Conformité WCAG 2.1 AA "automatique", garantie par une IA.
3. Protection juridique contre les recours ADA aux États-Unis.

Le marché que ces promesses adressent est immense. Aux États-Unis, le
Americans with Disabilities Act expose les propriétaires de sites
publics à des recours civils si leur plateforme n'est pas accessible.
Le nombre de plaintes ADA digitales déposées a explosé après 2017,
passant de quelques centaines par an à plus de 4 000 en 2022. Pour un
e-commerçant ou un opérateur de service public, l'idée d'un "bouclier"
juridique à 49 dollars par mois est très attractive.

Le problème, c'est qu'aucune des trois promesses n'est vraie.

## La promesse marketing face à la réalité technique

Un site web accessible n'est pas un site qui *propose* des outils
d'adaptation. C'est un site dont la structure HTML, les attributs
ARIA, les contrastes, les libellés alternatifs, les focus visibles, la
navigation au clavier, l'ordre de lecture et le code sémantique
*permettent* aux technologies d'assistance déjà utilisées par les
personnes en situation de handicap — lecteurs d'écran NVDA, JAWS,
VoiceOver, agrandisseurs ZoomText, navigateurs vocaux — de produire
une expérience cohérente. WCAG décrit ces exigences sur quatre
principes : perceptible, utilisable, compréhensible, robuste.

Un overlay JavaScript ne peut techniquement pas réécrire ces fondations.
Il vit *par-dessus* un DOM dont il n'est pas l'auteur. Il peut, au
mieux, masquer certains problèmes superficiels — augmenter le contraste
visuel, agrandir le texte — au prix d'effets collatéraux qui en
créent d'autres.

L'analyse technique la plus complète à ce jour est le *Overlay Fact
Sheet*, signé par plus de 700 spécialistes accessibilité (chercheurs,
développeurs, utilisateurs de technologies d'assistance) qui documente
six catégories de problèmes récurrents :

- L'overlay duplique ou contredit les annonces faites par le lecteur
  d'écran déjà actif sur la machine de l'utilisateur, produisant un
  double discours inintelligible.
- L'overlay change l'ordre de tabulation au runtime, brisant la
  cartographie mentale que l'utilisateur clavier s'est construite.
- L'overlay injecte des attributs ARIA hasardeux qui invalident le
  contrat sémantique d'origine (par exemple, `role="button"` posé sur
  un `<div>` sans `tabindex` ni gestionnaire de touche Entrée).
- L'overlay déclenche des animations ou des transformations CSS qui
  ignorent `prefers-reduced-motion`, déclenchant nausées et crises de
  migraine chez les utilisateurs vestibulaires.
- L'overlay capture la frappe clavier de manière agressive, empêchant
  l'utilisateur d'accéder à ses propres raccourcis système.
- L'overlay communique vers ses serveurs des données d'utilisation
  qui, dans plusieurs juridictions européennes, posent un problème
  RGPD non résolu.

Le résultat documenté est paradoxal : pour beaucoup d'utilisateurs en
situation de handicap, un site équipé d'un overlay est *moins*
accessible qu'un site standard. Une extension de navigateur dédiée,
*Should I Use An Overlay*, est même apparue spécifiquement pour
*bloquer* les overlays détectés sur les pages visitées.

## L'affaire FTC vs accessiBe : ce qui a été acté

Le 3 janvier 2025, la Federal Trade Commission a déposé une plainte
contre accessiBe Inc. et publié simultanément un consent order
proposé. La période de commentaire public s'est ouverte le 6 janvier,
elle a duré jusqu'au 5 février 2025. Le 22 avril 2025, après examen
des commentaires reçus, la Commission a approuvé le consent order
final à l'unanimité.

Deux séries de manquements sont reprochés à accessiBe.

Le premier concerne la promesse de conformité WCAG. La FTC retient
qu'accessiBe a "misrepresented the ability of its AI-powered web
accessibility tool to make any website compliant with the Web Content
Accessibility Guidelines (WCAG)" — autrement dit, que la promesse
"notre IA rend votre site conforme WCAG" était dénuée de fondement
scientifique vérifiable. L'ordre interdit désormais à accessiBe de
faire toute affirmation, explicite ou implicite, selon laquelle ses
produits automatisés rendent un site conforme à WCAG ou peuvent
maintenir cette conformité dans le temps, sauf à fournir les preuves
contemporaines de chaque affirmation.

Le second porte sur la stratégie marketing d'accessiBe. La FTC retient
que l'entreprise "deceptively formatted third-party articles and
reviews to appear as if they were independent opinions" et qu'elle a
"failed to disclose material connections to online reviewers". En
clair, des articles, témoignages et avis publiés sur internet et
présentés comme émanant d'experts indépendants étaient en réalité
financés par accessiBe sans que ce lien soit divulgué. Le consent
order impose désormais une divulgation "claire et apparente" de tout
lien matériel entre l'entreprise et un endossement.

L'amende d'un million de dollars représente, comme l'a noté l'expert
accessibilité Adrian Roselli, environ deux pour cent du chiffre
d'affaires 2024 d'accessiBe. Le précédent juridique, lui, est sans
prix : il est désormais établi qu'un overlay ne peut pas, en droit
américain, être présenté comme une solution de conformité WCAG sans
preuves contemporaines à l'appui.

## Le contexte : plus de 800 entreprises clientes poursuivies

Le consent order FTC ne réglera pas, à lui seul, la situation des
clients d'overlays. Selon le décompte tenu par TestParty, plus de 800
sites équipés d'AccessiBe ou d'overlays concurrents ont fait l'objet
de plaintes ADA en 2023 et 2024. L'overlay, censé protéger contre
ces plaintes, n'a empêché ni leur dépôt, ni leur recevabilité, ni leur
résolution coûteuse.

L'écart entre la promesse marketing et la réalité juridique est donc
documenté à deux niveaux : techniquement par la communauté
accessibilité depuis 2019, juridiquement par la FTC depuis 2025. Ce
qui reste, c'est la question suivante : si l'overlay n'est pas la
réponse, quelle est-elle ?

## L'autre voie : l'adaptation morphique

L'adaptation morphique part d'un constat différent. Le problème
fondamental d'un overlay, c'est qu'il essaie de réparer en aval ce qui
n'a pas été conçu en amont. Il vit dans la même page, en parallèle du
DOM qu'il prétend corriger, et il entre en collision avec les
technologies d'assistance qui, elles, parlent directement au DOM
d'origine.

L'adaptation morphique inverse la logique. Elle considère que
l'interface n'a pas à être uniforme pour tout le monde, puis adaptée à
la marge pour quelques-uns. L'interface est, dès sa conception, un
ensemble de paramètres morphologiques — taille de texte, densité
d'information, niveau de motion, palette de couleurs, complexité de
navigation, mode de focus, exposition aux distracteurs — que chaque
utilisateur peut configurer une fois pour toujours, et que la
plateforme honore de bout en bout.

Trois différences structurelles distinguent l'adaptation morphique de
l'overlay.

**Première différence : l'adaptation est native, pas surimposée.** Les
paramètres morphiques ne sont pas un module externe greffé à la fin du
développement. Ils sont injectés dans le système de design dès la
première ligne de CSS, dans les tokens de typographie, d'espacement,
de couleur, d'animation. Le composant rendu *est* déjà la version
adaptée. Il n'y a pas de couche intermédiaire entre le DOM et
l'utilisateur. Les technologies d'assistance lisent un DOM cohérent
avec lui-même.

**Deuxième différence : le contrôle reste à l'utilisateur, pas au
script.** Un overlay décide à la place de l'utilisateur quelles
adaptations appliquer, quand les afficher, quand les retirer. Une
adaptation morphique expose des préférences explicites — un panneau de
contrôle simple, conforme aux mêmes principes de design que le reste
du site — et les persiste. L'utilisateur n'a pas à reconfigurer
l'expérience à chaque visite. Il décide une fois, puis le site honore
cette décision.

**Troisième différence : la cible n'est pas seulement le handicap, c'est
la diversité cognitive.** Les overlays s'adressent presque
exclusivement à un sous-ensemble étroit de besoins : malvoyance,
daltonisme, déficience motrice fine. L'adaptation morphique reconnaît
que la diversité d'usage est beaucoup plus large — tremblements,
hypersensibilité sensorielle, fatigue oculaire, surcharge cognitive,
trouble de l'attention, lecture lente, dyslexie, sensibilité
vestibulaire, surcharge motionnelle, préférences de densité visuelle.
Aucune de ces dimensions n'est exotique ; toutes affectent une part
significative de toute population utilisatrice. Concevoir pour la
neurodiversité dès le départ change la nature du produit.

## Ce que fait `morphic-engine` concrètement

`morphic-engine` est un moteur d'adaptation morphique framework-agnostique,
publié sous AGPL-3.0. Il expose dix-huit axes d'adaptation indépendants,
chacun avec sa persistance locale, ses garde-fous d'accessibilité et son
test de non-régression. Parmi eux, à titre d'exemples concrets :

- Une correction de vision des couleurs basée sur des matrices de
  daltonisation appliquées via un filtre SVG natif, configurable par
  type de déficience et par sévérité (B-021h scope-cible).
- Un guide de lecture en surcouche, configurable en hauteur, en mode
  (ligne, masque, règle) et en décalage haut/bas pour rester compatible
  avec un navbar fixe (B-021i).
- Un mode tremor-filter qui ajoute une zone d'amorti aux interactions
  pointeur pour les utilisateurs avec tremblements (essentiel, par
  exemple, pour les usagers Parkinson).
- Un mode reading-focus qui isole un bloc de contenu et atténue tout
  ce qui l'entoure.
- Une typographie adaptative — taille, interligne, espacement,
  contraste — qui respecte les unités relatives et n'écrase jamais les
  préférences système.
- Une gestion de la motion conforme à `prefers-reduced-motion` et
  étendue par axe d'intention.
- Un mode pomodoro intégré pour les profils qui ont besoin de
  micro-pauses régulières (TDAH, post-burnout).

Aucun de ces axes n'est imposé. Aucun n'est activé par défaut au-delà
de ce que les standards web exigent déjà. Aucun ne capture la frappe
clavier ni l'ordre de focus. L'utilisateur configure une fois ; le
moteur stocke ses préférences en local ; le site honore.

Le moteur est conçu pour être intégré dans le système de design d'un
site, pas pour être collé en surcouche en fin de développement. Le
travail d'intégration est, par construction, le travail
d'accessibilité. Il n'y a pas de raccourci.

## Pour les développeurs et les propriétaires de sites

Si vous lisez ceci en envisageant un overlay d'accessibilité, la
recommandation honnête est : ne le faites pas. L'expérience documentée
des utilisateurs en situation de handicap est négative, le précédent
juridique américain est désormais établi, le risque de plainte
résiduelle persiste, et la dépense mensuelle ne produit pas la
conformité promise.

Si vous lisez ceci en envisageant une refonte accessibilité de votre
plateforme, la voie qui produit des résultats est plus exigeante mais
sans détour : un audit WCAG manuel par un expert, une remédiation
structurelle du HTML et du CSS, des tests automatisés en CI avec axe-core,
une politique de design qui considère l'accessibilité comme un critère
de qualité au même titre que la performance ou la sécurité. Cette
voie produit des sites accessibles. Elle est moins vendable, mais elle
est honnête.

Si vous lisez ceci en envisageant d'aller plus loin — adapter le site
à la diversité réelle de votre audience — `morphic-engine` est un
candidat. Le code source est public, la licence est AGPL, la roadmap
est documentée dans le repository, et le projet est candidat au
financement NLNet NGI0 Commons pour mai 2026. Le but n'est pas de
remplacer une démarche WCAG, c'est de bâtir au-dessus une couche
d'adaptation qui rend le produit utilisable par des gens dont les
besoins varient au cours de la journée.

## Conclusion

L'affaire FTC vs accessiBe n'est pas un fait divers. C'est le moment
où une approche entière de l'accessibilité numérique a perdu, devant
une autorité régulatrice, le droit de prétendre faire ce qu'elle ne
fait pas. L'industrie devra recomposer ses promesses. Les
propriétaires de sites devront recomposer leurs décisions
d'investissement. Et les personnes en situation de handicap, qui
n'ont pas attendu la FTC pour savoir que l'overlay ne les servait pas,
verront peut-être enfin se réduire l'écart entre ce qu'on leur vend et
ce qui les sert.

L'adaptation morphique n'est pas la fin de l'histoire. C'est une
direction parmi d'autres dans une recomposition qui va prendre des
années. Mais c'est une direction qui ne se trompe pas de question :
elle ne demande pas comment rattraper après coup une accessibilité qui
n'a pas été conçue. Elle demande comment concevoir, dès le départ, une
interface qui s'adapte à la personne qui l'utilise.

C'est ce que `morphic-engine` essaie de faire.

---

## Sources

- [FTC Order Requires Online Marketer to Pay $1 Million for Deceptive Claims that its AI Product Could Make Websites Compliant with Accessibility Guidelines](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-order-requires-online-marketer-pay-1-million-deceptive-claims-its-ai-product-could-make-websites) — Federal Trade Commission, 3 janvier 2025.
- [accessiBe Inc. — Case 2223156](https://www.ftc.gov/legal-library/browse/cases-proceedings/2223156-accessibe-inc) — Dossier officiel FTC.
- [A million-dollar blunder: How the FTC's settlement with software provider accessiBe can help your business avoid similar missteps](https://www.ftc.gov/business-guidance/blog/2025/04/million-dollar-blunder-how-ftcs-settlement-software-provider-accessibe-can-help-your-business-avoid) — FTC Business Guidance Blog, avril 2025.
- [Beware of AI Accessibility Promises: US Federal Agency Fines an Overlay Company One Million Dollars](https://www.lflegal.com/2025/01/ftc-accessibe-million-dollar-fine/) — Law Office of Lainey Feingold.
- [FTC Catches up to #accessiBe](https://adrianroselli.com/2025/01/ftc-catches-up-to-accessibe.html) — Adrian Roselli, analyse technique.
- [Overlay Fact Sheet](https://overlayfactsheet.com/) — Plus de 700 signataires de la communauté accessibilité.
- [Why 800+ Businesses with AccessiBe Were Still Sued](https://testparty.ai/blog/why-800-businesses-with-accessibe-were-still-sued) — TestParty.
- [`morphic-engine` repository](https://github.com/theermite/morphic-engine) — Code source AGPL-3.0.

---

*Cet article fait partie de la documentation publique du projet
`morphic-engine`, candidat au programme NLNet NGI0 Commons. Le repository
GitHub est sous licence AGPL-3.0 et ouvert aux contributions.*
