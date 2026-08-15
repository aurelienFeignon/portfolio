# `content` — Source de vérité du contenu

Markdown/MDX par locale : `fr/` et `en/`, chacune avec `experiences/`, `projects/`, `skills/` (ADR-0001).
Le **nom de fichier fait foi** pour le slug ; un frontmatter invalide casse le build (CF-10), vérifié par `make check-content`, lui-même exécuté par `make build`.

Ce qui s'y trouve est le **contenu réel** (P2-11, 2026-08-15) : par locale, **2 expériences**
(Augure, Askor chez EVEA Conseil), **1 projet** (ce portfolio) et **40 compétences** groupées en cinq
catégories, dont dix mises en avant. Le contenu d'amorçage de P2-10 a été entièrement remplacé.

Deux réserves à corriger quand tu auras la réponse :

- les **dates de début** sont au 1ᵉʳ janvier (2021 pour Askor, 2025 pour Augure) : le CV ne donne
  que l'année, et le schéma exige un jour. Remplace-les par les vrais mois ;
- les **niveaux** (1 à 5) sont une proposition, déduite de la place que chaque technologie occupe
  dans les expériences. C'est un jugement sur toi-même : relis-les.

Deux règles à connaître avant d'écrire :

- une valeur contenant `: ` doit être **entre guillemets**, sans quoi YAML y lit une table imbriquée ;
- chaque entrée de `technologies` doit correspondre au `slug` d'une compétence **de la même locale** (P2-07).
