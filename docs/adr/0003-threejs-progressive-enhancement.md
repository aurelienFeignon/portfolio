# ADR-0003 — Three.js est un enrichissement progressif, jamais une condition d'accès

- **Statut** : ACCEPTÉ (Phase 0, 2026-08-11)
- **Décide** : montage du canvas, paliers de capacité, ordre de chargement
- **Lié à** : ADR-0002, ADR-0004

## Contexte

L'expérience 3D est le cœur de l'identité du portfolio, mais elle entre en tension directe avec
quatre exigences non négociables : indexation, accessibilité, performance, utilisabilité mobile.
Un portfolio de développeur qui ne se charge pas chez un recruteur, ou qui n'apparaît pas dans les
résultats de recherche, a échoué — quelle que soit la beauté de sa scène.

Trois populations ne verront jamais la scène : les robots d'indexation et d'aperçu de lien, les
utilisateurs de lecteurs d'écran, et les appareils sans WebGL ou trop limités. Une quatrième la
verra mais ne doit pas subir ses animations : `prefers-reduced-motion`.

## Décision

**Le produit est construit dans l'ordre inverse de l'effet : le documentaire d'abord, la 3D par
dessus.**

1. La Phase 4 livre un portfolio **complet et utilisable sans Three.js**. C'est un critère de
   sortie, pas une intention.
2. Le canvas est monté côté client uniquement, par import dynamique `ssr: false`, **après**
   l'interactivité du contenu (déclenchement en `idle`). Il n'entre jamais dans le chemin critique
   du LCP.
3. Le canvas porte `aria-hidden="true"` et n'est pas focusable. **Il ne contient aucune
   information** : rien n'y est écrit qui n'existe pas dans le DOM.
4. Une fonction pure `resolveCapabilityTier(input)` détermine le palier :

   | Palier | Conditions | Expérience |
   |---|---|---|
   | `full` | WebGL2, desktop, pointeur fin, pas de reduced-motion | Scène complète, transitions animées |
   | `reduced` | reduced-motion, ou appareil moyen | Scène rendue, **coupes instantanées**, ambiance désactivée |
   | `lite` | Mobile, WebGL1 seul, mémoire faible | Scène décorative non interactive, ou visuel statique |
   | `none` | Pas de WebGL, JS absent, `save-data`, échec de chargement | Documentaire pur, aucun coût |

5. Toute défaillance (échec d'import, perte de contexte WebGL, erreur d'asset) fait **basculer en
   `none`** via une error boundary. Le contenu reste intact et aucun message anxiogène n'est
   affiché.
6. Le palier `none` n'est pas un mode dégradé honteux : c'est un rendu propre et fini, testé au
   même titre que les autres (projets Playwright `no-webgl` et `no-js`).

## Alternatives considérées

| Alternative | Pourquoi écartée |
|---|---|
| **Scène toujours montée, message d'erreur si WebGL absent** | Transforme une limite technique en cul-de-sac pour l'utilisateur. Inacceptable pour un robot ou un lecteur d'écran. |
| **Rendu serveur de la 3D** (images pré-calculées à la place de la scène pour les crawlers) | Complexité importante, et deux représentations à maintenir. Le rendu serveur d'images statiques reste utile comme *contenu du palier `lite`*, pas comme substitut d'indexation : c'est le HTML qui indexe. |
| **Détection par user-agent** | Peu fiable, se périme, et rate le vrai critère (capacités réelles, préférences déclarées). |
| **3D d'abord, contenu injecté ensuite** | Inverse exactement les priorités du projet. Ruine LCP, indexation et accessibilité. |
| **Deux sites séparés** (immersif et classique) | Duplication, divergence, double maintenance, contenu dupliqué pour le SEO. |

## Conséquences

**Positives**

- Le SEO et l'accessibilité ne dépendent d'aucune réussite technique côté client.
- Le budget de performance devient tenable : le chunk 3D est exclu du chemin critique par
  construction, et cette exclusion est vérifiée automatiquement (analyse du graphe de dépendances
  des chunks initiaux).
- Le mobile a une réponse architecturale (`lite`), et non un rattrapage de dernière minute (R-05).
- Une panne de la scène n'est jamais une panne du site.

**Négatives, assumées**

- La scène apparaît légèrement après le contenu sur les connexions lentes. C'est un choix : mieux
  vaut un contenu lisible tout de suite qu'une scène complète tardive. Une transition d'apparition
  soignée évite l'effet de surgissement.
- Quatre paliers signifient quatre expériences à concevoir, tester et maintenir. Coût réel,
  contenu par le fait que `none` est simplement le livrable de la Phase 4.
- Certains effets (occlusion, post-traitement) devront être renoncés s'ils ne tiennent pas dans le
  budget. L'ordre d'arbitrage du projet tranche : a11y > SEO > perf du contenu > richesse 3D.

**Déclencheur de réexamen**

Aucun envisagé : cette décision est le socle du produit. Une remise en cause équivaudrait à changer
de projet, et devrait être traitée comme telle.
</content>
