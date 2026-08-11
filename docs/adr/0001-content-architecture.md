# ADR-0001 — Le contenu Markdown/MDX est la source de vérité unique

- **Statut** : ACCEPTÉ (Phase 0, 2026-08-11)
- **Décide** : structure du contenu, chargement, validation
- **Lié à** : ADR-0004 (surfaces d'affichage), ADR-0005 (i18n)

## Contexte

Le portfolio doit exposer les mêmes informations métier (expériences, projets, compétences) sur
deux surfaces très différentes : des pages HTML rendues par le serveur, et une scène 3D. Il doit
aussi les exposer en plusieurs langues. Le risque central du projet est la **duplication du
contenu** : une même information saisie deux fois diverge toujours, et ici elle divergerait entre
ce que voit un moteur de recherche et ce que voit un visiteur.

Le volume est faible (H-05 : quelques dizaines d'entrées) et le contenu ne change qu'au moment où
je le modifie. Il n'y a pas de contributeur non technique (H-10).

## Décision

1. Le contenu vit dans des fichiers **Markdown/MDX** sous `content/{locale}/{type}/{slug}.md(x)`,
   versionnés avec le code.
2. Un **Content Layer** en TypeScript pur lit, valide et normalise ces fichiers, et expose une API
   de repository typée. Il ne dépend **ni de React, ni de Next.js, ni de Three.js**.
3. Les frontmatters sont validés par des **schémas Zod**, un par type de contenu. Toute violation
   **lève une erreur et fait échouer le build** (exigence CF-10).
4. Le nom de fichier fait foi pour le slug ; une divergence avec le frontmatter est une erreur.
5. La cohérence référentielle (`technologies` ↔ `Skill.slug`) est vérifiée par un test exécuté dans
   les gates.
6. Aucune autre couche ne lit le système de fichiers de contenu. La couche 3D ne reçoit **jamais**
   de contenu métier, seulement de l'état de navigation.

## Alternatives considérées

| Alternative | Pourquoi écartée |
|---|---|
| **CMS headless** (Sanity, Contentful, Strapi) | Introduit un service externe, un compte, une latence réseau, un coût, et un point de panne — pour un contenu que je suis seul à écrire et qui change quelques fois par an. Casse aussi le principe « le contenu est versionné avec le code ». |
| **Contentlayer** | Résout exactement ce problème et génère des types. Mais maintenance incertaine et couplage fort au build : le jour où il casse sur une montée de version de Next, c'est le cœur du site qui est bloqué. Le coût qu'il économise ici est de l'ordre de 200 lignes testables. |
| **Velite** | Alternative moderne et sérieuse à Contentlayer. Écartée pour la même raison de couplage, mais c'est le **repli désigné** si le loader maison devient coûteux. |
| **Contenu en TypeScript** (objets littéraux) | Typage gratuit et zéro parsing, mais le corps rédactionnel long en TSX est pénible à écrire et à relire, et on perd MDX. |
| **Base de données** | Aucun besoin : pas d'écriture à l'exécution, pas de recherche complexe, pas de multi-utilisateur. Ce serait de l'infrastructure à exploiter pour rien — d'autant plus en auto-hébergement. |

## Conséquences

**Positives**

- Une seule définition de chaque information métier ; le risque R-01 est traité à la racine.
- Le Content Layer est testable en Vitest pur, rapidement, avec des fixtures — d'où la cible de
  couverture à 95 %.
- Ajouter un projet = ajouter un fichier par locale. Aucun déploiement de schéma, aucune migration.
- Le contenu invalide ne peut pas atteindre la production : l'erreur survient au build.
- Substituable : si Velite devient préférable, seule l'implémentation interne du Content Layer
  change, pas son API ni ses consommateurs.

**Négatives, assumées**

- Il faut écrire et maintenir le loader (lecture, cache, tri, dérivations) : ~200–300 lignes.
- Toute modification de contenu exige un déploiement. Acceptable à cette fréquence, et la chaîne
  CI/CD (ADR-0008) rend le déploiement automatique.
- Le typage des données de contenu n'est pas généré : il est écrit à la main, dérivé des schémas
  Zod (`z.infer`), donc une seule source de vérité malgré tout.

**Déclencheur de réexamen**

Plus de ~200 entrées, un contributeur non technique, ou un besoin d'édition sans déploiement.
</content>
