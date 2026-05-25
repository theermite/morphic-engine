---
title: "Pourquoi les overlays d'accessibilité ne tiennent pas leurs promesses (et ce que la FTC vient d'acter)"
slug: overlays-accessibilite-ftc-accessibe-2025
locale: fr
date: 2026-05-25
author: Jay Goncalves (The Ermite)
category: Accessibilite numerique
tags:
  - accessibilite
  - WCAG
  - FTC
  - accessibility-overlay
  - AccessiBe
  - jurisprudence
serie:
  name: "Adaptation morphique vs accessibility overlays"
  partie: "1 sur 2"
  suite: overlays-accessibilite-ftc-accessibe-2025  # remplacé par slug article 2 après publication
excerpt: >
  Le 22 avril 2025, la Federal Trade Commission a finalisé un consent
  order contre accessiBe — l'un des plus gros vendeurs d'overlays
  d'accessibilité au monde — à un million de dollars pour publicité
  mensongère. Au-delà de l'amende, le précédent juridique acte ce que
  la communauté technique sait depuis 2019 : un script JavaScript
  injecté dans une page ne rend pas un site conforme WCAG.
coverImage: null
---

# Pourquoi les overlays d'accessibilité ne tiennent pas leurs promesses (et ce que la FTC vient d'acter)

*Premier article d'une série de deux. Le second porte sur l'adaptation morphique comme alternative structurelle.*

Le 22 avril 2025, la Federal Trade Commission américaine a approuvé à
l'unanimité un consent order qui condamne accessiBe — l'un des plus
gros vendeurs d'accessibility overlays au monde — à payer un million de
dollars. Le montant est anecdotique au regard du chiffre d'affaires
2024 de l'entreprise (environ 51,3 millions de dollars selon les
estimations publiques), mais le précédent juridique, lui, ne l'est
pas.

Pour la première fois, une autorité fédérale américaine acte par écrit
ce que les développeurs accessibilité, les utilisateurs de
technologies d'assistance et la communauté handicap répètent depuis
2019 : un overlay JavaScript injecté dans une page ne rend pas un site
conforme à WCAG. Il prétend le faire. Ce n'est pas la même chose.

Cet article retrace deux choses : ce qu'est exactement un overlay
d'accessibilité, et ce que la FTC a précisément reproché à accessiBe.
Le second article de cette série porte sur l'adaptation morphique,
l'approche structurellement différente que nous développons avec
`morphic-engine`.

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
passant de quelques centaines par an à plus de quatre mille en 2022.
Pour un e-commerçant ou un opérateur de service public, l'idée d'un
"bouclier" juridique à 49 dollars par mois est très attractive.

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
proposé. La période de commentaire public s'est ouverte le 6 janvier
et a duré jusqu'au 5 février 2025. Le 22 avril 2025, après examen
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
accessibilité depuis 2019, juridiquement par la FTC depuis 2025.

## La question qui reste ouverte

Si l'overlay n'est pas la réponse, quelle est-elle ?

L'audit WCAG manuel par un expert, suivi d'une remédiation
structurelle du HTML et du CSS, reste le seul chemin établi vers une
conformité réelle. C'est plus exigeant, plus lent, et moins vendable
qu'une ligne de script à coller. Mais c'est aussi le seul chemin qui
produit des sites que les utilisateurs en situation de handicap
peuvent effectivement utiliser.

Au-delà de la conformité WCAG, une autre direction émerge depuis
quelques années : l'adaptation morphique. Plutôt que de réparer en
aval ce qui n'a pas été conçu en amont, elle propose de penser
l'interface, dès sa conception, comme un ensemble de paramètres
morphologiques que chaque utilisateur configure une fois et que la
plateforme honore de bout en bout. C'est l'objet du second article de
cette série.

---

## Sources

- [FTC Order Requires Online Marketer to Pay $1 Million for Deceptive Claims that its AI Product Could Make Websites Compliant with Accessibility Guidelines](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-order-requires-online-marketer-pay-1-million-deceptive-claims-its-ai-product-could-make-websites) — Federal Trade Commission, 3 janvier 2025.
- [accessiBe Inc. — Case 2223156](https://www.ftc.gov/legal-library/browse/cases-proceedings/2223156-accessibe-inc) — Dossier officiel FTC.
- [A million-dollar blunder: How the FTC's settlement with software provider accessiBe can help your business avoid similar missteps](https://www.ftc.gov/business-guidance/blog/2025/04/million-dollar-blunder-how-ftcs-settlement-software-provider-accessibe-can-help-your-business-avoid) — FTC Business Guidance Blog, avril 2025.
- [Beware of AI Accessibility Promises: US Federal Agency Fines an Overlay Company One Million Dollars](https://www.lflegal.com/2025/01/ftc-accessibe-million-dollar-fine/) — Law Office of Lainey Feingold.
- [FTC Catches up to #accessiBe](https://adrianroselli.com/2025/01/ftc-catches-up-to-accessibe.html) — Adrian Roselli, analyse technique.
- [Overlay Fact Sheet](https://overlayfactsheet.com/) — Plus de 700 signataires de la communauté accessibilité.
- [Why 800+ Businesses with AccessiBe Were Still Sued](https://testparty.ai/blog/why-800-businesses-with-accessibe-were-still-sued) — TestParty.

---

*Lire la suite : « L'adaptation morphique : concevoir au lieu de patcher » — second article de cette série, qui présente une alternative structurelle aux overlays et le projet open source `morphic-engine`.*
