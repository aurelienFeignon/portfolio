# ADR-0004 — Le contenu des écrans est du DOM superposé, en instance unique

- **Statut** : ACCEPTÉ (Phase 0, 2026-08-11) — implémentation validée en Phase 7
- **Décide** : comment le contenu s'affiche « sur » les moniteurs 3D
- **Lié à** : ADR-0001, ADR-0003

## Contexte

Les trois moniteurs de la scène doivent afficher les expériences, les projets et les compétences.
Trois manières existent : peindre le texte dans une texture, projeter du DOM sur un plan 3D
(`<Html transform>` de drei), ou superposer du DOM classique aligné sur la position projetée de
l'écran.

Deux contraintes dominent : le contenu ne doit exister qu'**une seule fois** dans le DOM (risque
R-01 : double lecture par lecteur d'écran, contenu dupliqué pour les crawlers, divergence), et il
doit rester **lisible et accessible**.

## Décision

1. Le contenu des écrans est du **DOM standard superposé au canvas**, positionné à partir de la
   projection 2D de la position du moniteur. Ce n'est ni une texture, ni du CSS3D transformé.
2. Une **instance unique** de chaque bloc de contenu existe. En mode immersif, elle est **déplacée
   par un portail React** vers le conteneur superposé ; sinon elle reste dans le flux documentaire.
   Un portail déplace les nœuds, il ne les duplique pas — c'est le mécanisme qui garantit R-01.
3. Le contenu est rendu par le serveur dans le flux documentaire. Le déplacement n'a lieu qu'après
   hydratation, et uniquement dans les paliers `full` et `reduced`.
4. Le panneau superposé conserve un ordre de tabulation cohérent et un rôle sémantique correct ; il
   est lisible même si la scène est en cours de transition.
5. `<Html transform>` de drei reste autorisé pour des éléments **purement décoratifs et sans
   information** (une LED, une horloge d'ambiance). Jamais pour du contenu.

## Alternatives considérées

| Alternative | Pourquoi écartée |
|---|---|
| **Texte rasterisé en texture** (canvas 2D → texture, ou `troika-three-text`) | Le texte devient une image : non sélectionnable, non indexable, invisible pour les lecteurs d'écran, flou au zoom, coûteux à mettre à jour, et impossible à internationaliser proprement (longueurs variables). Contredit ADR-0001 et l'exigence d'accessibilité. Explicitement déconseillé par la mission (§23). |
| **`<Html transform>` de drei pour le contenu** | Séduisant : c'est du vrai DOM collé au plan 3D. Mais le texte transformé en CSS3D perd en netteté selon l'angle, l'occlusion est approximative, les performances chutent avec la quantité de DOM transformé, le défilement à l'intérieur est délicat, et le comportement du focus clavier dans un élément transformé est imprévisible. Trop de risques pour la surface qui porte l'essentiel du contenu. **Conservé pour la décoration.** |
| **Deux rendus** (un caché pour le SEO, un visible dans la scène) | Contenu dupliqué dans le DOM : exactement le risque R-01, avec en prime un soupçon de dissimulation côté moteur de recherche. Rejeté. |
| **Panneau fixe indépendant de la scène** (simple tiroir latéral) | Robuste, mais perd complètement la métaphore : l'écran 3D ne servirait plus à rien. C'est le **repli désigné** si le positionnement projeté s'avère instable en Phase 7. |

## Conséquences

**Positives**

- Texte natif : net, sélectionnable, zoomable, traduisible, lu correctement par les technologies
  d'assistance, indexé sans exécution de la scène.
- Une seule instance de contenu : aucune divergence possible, contrainte vérifiable par un test
  d'intégration qui compte les occurrences dans le DOM.
- Le contenu reste utilisable si la scène est lente à s'initialiser.
- Les composants d'affichage sont identiques en mode documentaire et en mode immersif : c'est le
  positionnement qui change, pas le rendu.

**Négatives, assumées**

- L'alignement DOM ↔ 3D doit être recalculé à chaque changement de caméra et de taille de fenêtre.
  Risque de décalage d'une image pendant les transitions : atténué en masquant le panneau pendant
  la transition, puis en le révélant à l'arrivée (ce qui est aussi meilleur en lisibilité).
- L'illusion est moins forte qu'avec un contenu réellement plaqué en perspective. Compromis accepté
  au nom de l'ordre d'arbitrage du projet (a11y > SEO > perf > richesse 3D).
- Le mécanisme de portail demande de la rigueur (le contenu doit rester monté au même endroit dans
  l'arbre React pour ne pas perdre son état). Cas de test dédié en Phase 7.

**Déclencheur de réexamen**

Si le positionnement projeté produit des décalages visibles impossibles à corriger, basculer vers
le repli « panneau fixe » plutôt que vers `<Html transform>` — la robustesse prime sur l'effet.
</content>
