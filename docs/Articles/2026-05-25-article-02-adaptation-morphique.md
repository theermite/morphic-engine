---
title: "L'adaptation morphique : concevoir au lieu de patcher"
slug: adaptation-morphique-concevoir-au-lieu-de-patcher
locale: fr
date: 2026-05-28
author: Jay Goncalves (The Ermite)
category: Accessibilite numerique
tags:
  - accessibilite
  - adaptation-morphique
  - morphic-engine
  - neurodiversite
  - design-system
  - open-source
serie:
  name: "Adaptation morphique vs accessibility overlays"
  partie: "2 sur 2"
  precedent: overlays-accessibilite-ftc-accessibe-2025
excerpt: >
  Si les overlays d'accessibilité échouent à tenir leurs promesses,
  comme la FTC vient de l'acter, quelle est l'alternative ? Une voie
  émerge depuis quelques années : l'adaptation morphique. Plutôt que
  de réparer en surcouche, elle propose de concevoir l'interface,
  dès le départ, comme un ensemble de paramètres morphologiques que
  chaque utilisateur configure une fois pour toutes.
coverImage: null
---

# L'adaptation morphique : concevoir au lieu de patcher

*Second article d'une série de deux. Le premier porte sur l'échec
documenté des accessibility overlays et la sanction FTC de 2025
contre accessiBe.*

Le précédent article de cette série posait un constat juridiquement
acté depuis avril 2025 : un overlay JavaScript ne peut pas rendre un
site conforme WCAG, et prétendre le contraire constitue désormais une
publicité mensongère sanctionnable aux États-Unis.

Le constat laisse une question ouverte : si l'overlay n'est pas la
réponse, quelle est-elle ?

Une partie de la réponse est connue depuis longtemps : un audit WCAG
manuel par un expert, suivi d'une remédiation structurelle du HTML et
du CSS, avec des tests automatisés en intégration continue. C'est la
voie standard, exigeante et lente, qui produit des sites accessibles.

Mais une autre direction émerge depuis quelques années, et c'est elle
que cet article explore : l'**adaptation morphique**. Elle ne remplace
pas WCAG. Elle se place au-dessus, et pose une question différente :
non plus seulement "comment ce site est-il accessible aux personnes
handicapées ?", mais "comment ce site s'adapte-t-il à la diversité
réelle de toutes les personnes qui l'utilisent ?".

## Le changement de question

Le problème fondamental d'un overlay, c'est qu'il essaie de réparer en
aval ce qui n'a pas été conçu en amont. Il vit dans la même page, en
parallèle du DOM qu'il prétend corriger, et il entre en collision avec
les technologies d'assistance qui, elles, parlent directement au DOM
d'origine.

L'adaptation morphique inverse la logique. Elle considère que
l'interface n'a pas à être uniforme pour tout le monde, puis adaptée à
la marge pour quelques-uns. L'interface est, dès sa conception, un
ensemble de paramètres morphologiques — taille de texte, densité
d'information, niveau de motion, palette de couleurs, complexité de
navigation, mode de focus, exposition aux distracteurs — que chaque
utilisateur peut configurer une fois pour toutes, et que la
plateforme honore de bout en bout.

## Trois différences structurelles

Trois différences distinguent l'adaptation morphique d'un overlay.

### Première différence : native, pas surimposée

Les paramètres morphiques ne sont pas un module externe greffé à la
fin du développement. Ils sont injectés dans le système de design dès
la première ligne de CSS, dans les tokens de typographie,
d'espacement, de couleur, d'animation. Le composant rendu *est* déjà
la version adaptée. Il n'y a pas de couche intermédiaire entre le DOM
et l'utilisateur. Les technologies d'assistance lisent un DOM cohérent
avec lui-même.

Concrètement, cela veut dire que les variables CSS du site changent
lorsque l'utilisateur change ses préférences. Le `font-size` du body,
les `--color-*` du thème, les `--duration-*` des animations, les
`--spacing-*` du layout : tous sont des tokens calculés à partir des
préférences utilisateur, persistées localement et appliquées avant le
premier paint. L'utilisateur ne voit pas un site "standard" puis un
overlay qui le transforme — il voit, dès la première frame, sa
version du site.

### Deuxième différence : le contrôle reste à l'utilisateur

Un overlay décide à la place de l'utilisateur quelles adaptations
appliquer, quand les afficher, quand les retirer. Il interprète, à
partir d'heuristiques opaques, ce qu'il croit être nécessaire pour
"le profil détecté".

Une adaptation morphique fait l'inverse : elle expose des préférences
explicites — un panneau de contrôle simple, conforme aux mêmes
principes de design que le reste du site — et les persiste. L'utilisateur
n'a pas à reconfigurer l'expérience à chaque visite. Il décide une
fois, puis le site honore cette décision. Et il peut changer d'avis à
tout moment.

Cette différence est éthique autant que technique. L'adaptation
morphique ne présume pas savoir mieux que l'utilisateur ce dont il a
besoin. Elle outille son autonomie au lieu de la remplacer.

### Troisième différence : la diversité cognitive comme cible

Les overlays s'adressent presque exclusivement à un sous-ensemble
étroit de besoins : malvoyance, daltonisme, déficience motrice fine.
Ces besoins sont réels et importants — ils ne sont pas tout ce qui
existe.

L'adaptation morphique reconnaît que la diversité d'usage est beaucoup
plus large : tremblements, hypersensibilité sensorielle, fatigue
oculaire, surcharge cognitive, trouble de l'attention, lecture lente,
dyslexie, sensibilité vestibulaire, surcharge motionnelle, préférences
de densité visuelle. Aucune de ces dimensions n'est exotique ; toutes
affectent une part significative de toute population utilisatrice.

Concevoir pour la neurodiversité dès le départ change la nature du
produit. Ce n'est plus "un site pour les utilisateurs valides, plus
une couche d'adaptation pour ceux qui en ont besoin". C'est un site
dont chaque utilisateur — neurotypique, neurodivergent, handicapé,
fatigué, contextuellement gêné — règle l'interface selon ce qui lui
sert ce jour-là.

## Ce que fait `morphic-engine` concrètement

`morphic-engine` est un moteur d'adaptation morphique
framework-agnostique, publié sous licence AGPL-3.0. Il expose dix-huit
axes d'adaptation indépendants, chacun avec sa persistance locale, ses
garde-fous d'accessibilité et son test de non-régression.

Parmi eux, à titre d'exemples concrets :

- Une **correction de vision des couleurs** basée sur des matrices de
  daltonisation appliquées via un filtre SVG natif, configurable par
  type de déficience (protanopie, deutéranopie, tritanopie) et par
  sévérité.
- Un **guide de lecture** en surcouche, configurable en hauteur, en
  mode (ligne, masque, règle) et en décalage haut/bas pour rester
  compatible avec un navbar fixe.
- Un **mode tremor-filter** qui ajoute une zone d'amorti aux
  interactions pointeur pour les utilisateurs avec tremblements
  (essentiel, par exemple, pour les usagers Parkinson).
- Un **mode reading-focus** qui isole un bloc de contenu et atténue
  tout ce qui l'entoure.
- Une **typographie adaptative** — taille, interligne, espacement,
  contraste — qui respecte les unités relatives et n'écrase jamais
  les préférences système.
- Une **gestion de la motion** conforme à `prefers-reduced-motion` et
  étendue par axe d'intention (parallax, autoplay, transitions,
  feedback haptique visuel).
- Un **mode pomodoro** intégré pour les profils qui ont besoin de
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

Trois recommandations honnêtes selon votre situation.

Si vous lisez ceci en envisageant un overlay d'accessibilité : ne le
faites pas. L'expérience documentée des utilisateurs en situation de
handicap est négative, le précédent juridique américain est désormais
établi, le risque de plainte résiduelle persiste, et la dépense
mensuelle ne produit pas la conformité promise.

Si vous lisez ceci en envisageant une refonte accessibilité de votre
plateforme : la voie qui produit des résultats est plus exigeante mais
sans détour. Audit WCAG manuel par un expert, remédiation structurelle
du HTML et du CSS, tests automatisés en CI avec `axe-core`, et
politique de design qui considère l'accessibilité comme un critère de
qualité au même titre que la performance ou la sécurité.

Si vous lisez ceci en envisageant d'aller plus loin — adapter le site
à la diversité réelle de votre audience — `morphic-engine` est un
candidat. Le code source est public, la licence est AGPL, la roadmap
est documentée dans le repository, et le projet est candidat au
financement NLNet NGI0 Commons pour mai 2026. Le but n'est pas de
remplacer une démarche WCAG, c'est de bâtir au-dessus une couche
d'adaptation qui rend le produit utilisable par des gens dont les
besoins varient au cours de la journée.

## Conclusion de la série

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

## Sources et liens

- [`morphic-engine` — code source AGPL-3.0](https://github.com/theermite/morphic-engine)
- [Premier article de la série : Pourquoi les overlays d'accessibilité ne tiennent pas leurs promesses](/blog/overlays-accessibilite-ftc-accessibe-2025)
- [NLNet NGI0 Commons — programme de financement européen open source](https://nlnet.nl/commons/)
- [WCAG 2.2 — Web Content Accessibility Guidelines](https://www.w3.org/TR/WCAG22/)

---

*Cet article fait partie de la documentation publique du projet
`morphic-engine`, candidat au programme NLNet NGI0 Commons. Le repository
GitHub est sous licence AGPL-3.0 et ouvert aux contributions.*
