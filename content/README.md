# `content` — Source de vérité du contenu

Markdown/MDX par locale : `fr/` et `en/`, chacune avec `experiences/`, `projects/`, `skills/` (ADR-0001).
Le **nom de fichier fait foi** pour le slug ; un frontmatter invalide casse le build (CF-10), vérifié par `make check-content`, lui-même exécuté par `make build`.

Le contenu comprend, par locale, **2 expériences** (Augure, Askor chez EVEA Conseil),
**6 projets** (Augure, Askor, portfolio, Hephaistos 3D, Dedale, exploration NCM) et
**43 compétences**, dont dix mises en avant. PHP est relié au projet et à l'expérience Askor.

Enrichissement du 2026-11-03 : README GitHub pour Hephaistos et Dedale, documentation et historique
locaux de `/opt/ncm` pour l'exploration NCM (travail local distinct du fork public). Les trois
nouveaux projets sont datés à l'année 2026 ; le jour de création d'un dépôt n'est pas présenté
comme le début exact du travail. Dedale reste privé, sans lien de dépôt public.
Les niveaux demeurent des propositions non affichées (D2), y compris PHP à 4, aligné sur Symfony.

Une réserve à corriger quand tu auras la réponse :

- les **niveaux** (1 à 5) sont une proposition, déduite de la place que chaque technologie occupe
  dans les expériences. C'est un jugement sur toi-même : relis-les.

## Les dates disent ce que tu sais, et rien de plus

Une date s'écrit à **la précision que tu connais** — `'2021'`, `'2021-03'` ou `'2021-03-14'` — et le
site l'affiche telle quelle : « 2021 », « mars 2021 », « 14 mars 2021 ».

Ce n'est pas un confort d'écriture. L'attribut `datetime` du HTML et les données structurées
**réémettent la valeur telle qu'elle est stockée** : écrire `2021-01-01` quand tu ne connais que
l'année affirme ce jour-là à un moteur de recherche. C'est ce qui se passait jusqu'au 2026-08-16, où
les deux expériences portaient un 1ᵉʳ janvier d'attente ; elles disent maintenant `'2021'` et
`'2025'`. Si tu retrouves les vrais mois, précise-les — c'est tout ce qu'il y a à faire.

⚠️ **Une année s'écrit entre quotes.** En YAML, `startedAt: 2021` est un **nombre**, pas une chaîne :
le build casse. `startedAt: '2021'` est correct. Les formes avec tiret (`2021-03`, `2021-03-14`)
n'ont pas ce problème.

## Les règles à connaître avant d'écrire

- une valeur contenant `: ` doit être **entre guillemets**, sans quoi YAML y lit une table imbriquée ;
- chaque entrée de `technologies` doit correspondre au `slug` d'une compétence **de la même locale** (P2-07) ;
- le champ `experience` d'un projet (le poste où il est né) doit correspondre au `slug` d'une
  expérience **de la même locale** ; c'est lui, pas le `type`, qui branche le projet sur le bus de
  la carte mère (`docs/carte-mere.md` §5) ;
- **au plus un** projet `primary: true` par locale — il tient le processeur central —, et **le même**
  dans toutes les locales où sa fiche existe. `primary` est indépendant de `featured`.

Codex et OpenCode sont ajoutés aux outils de développement, aux côtés de Claude Code
(2026-11-03), avec le même niveau proposé de 3, non affiché tant que D2 reste ouverte.
