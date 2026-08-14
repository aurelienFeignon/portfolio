# `content` — Source de vérité du contenu

Markdown/MDX par locale : `fr/` et `en/`, chacune avec `experiences/`, `projects/`, `skills/` (ADR-0001).
Le **nom de fichier fait foi** pour le slug ; un frontmatter invalide casse le build (CF-10), vérifié par `make check-content`, lui-même exécuté par `make build`.

Ce qui s'y trouve aujourd'hui est le **contenu d'amorçage** de P2-10 : deux expériences, deux projets et cinq compétences par locale, suffisants pour développer. La rédaction réelle est P2-11.

Deux règles à connaître avant d'écrire :

- une valeur contenant `: ` doit être **entre guillemets**, sans quoi YAML y lit une table imbriquée ;
- chaque entrée de `technologies` doit correspondre au `slug` d'une compétence **de la même locale** (P2-07).
