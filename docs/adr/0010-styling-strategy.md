# ADR-0010 — Stratégie de style : CSS Modules et tokens en variables CSS

- **Statut** : ACCEPTÉ (Phase 4, 2026-08-15)
- **Décide** : comment le portfolio documentaire est mis en forme — portée des règles, provenance
  des valeurs (couleurs, espacements, typographie), et ce qui arrive au navigateur
- **Lié à** : CT-08 (aucune dépendance structurante sans justification), ADR-0003 (la 3D est un
  enrichissement, le documentaire est le socle), `performance-budget.md` §4 (budget JavaScript),
  §7 (taille de l'image), `vision.md` §5.2 (WCAG 2.2 AA)

## Contexte

Rien n'est stylé aujourd'hui, **délibérément** : les Phases 1 à 3 ont posé une réinitialisation
minimale et un style de focus, et se sont arrêtées là (`globals.css`). La Phase 4 écrit les premiers
composants présentables ; la stratégie doit donc être tranchée **avant** eux, pas pendant.

Quatre contraintes encadrent le choix, et trois d'entre elles sont chiffrées :

1. **Le site n'a aucun composant client** : 0,0 Ko de JavaScript propre sur les 16 routes, socle
   partagé à 129,5 Ko. C'est ce qui rend le profil E2E `no-js` vrai *par construction*. Une
   stratégie de style qui exigerait du JavaScript à l'exécution détruirait cette propriété.
2. **L'image de production est à 385 Mo pour un seuil bloquant à 400**, et P4-05 y ajoutera ~7 Mo de
   runtime MDX. Il reste donc ~8 Mo une fois cette dette payée : ce n'est pas le moment d'installer
   une chaîne d'outils volumineuse.
3. **Tout est prérendu statiquement**, `content/` n'étant pas dans l'image. Le style doit être
   entièrement résolu au build.
4. **L'accessibilité prime sur tout le reste** (ordre d'arbitrage du projet). Les contrastes, les
   tailles de cible et le focus visible sont des critères de sortie, pas des préférences — ils
   supposent des valeurs nommées en un seul endroit, pas recopiées composant par composant.

## Ce qui a été vérifié, et comment

Comme pour l'ADR-0009, la décision est rendue sur une exécution. Une sonde (un
`style-probe.module.css` appliqué à `SiteNav`, supprimée après mesure) a été construite par
`make bundle`, c'est-à-dire un `next build` de production avec Turbopack.

| Vérification | Relevé |
|---|---|
| Compilation par Turbopack (Next 16.3) | ✅ aucune configuration ajoutée, aucun greffon |
| Portée des noms de classe | ✅ `class="style-probe-module__e50QiW__probe"` — la collision est impossible, pas seulement improbable |
| JavaScript ajouté à la route | **0,0 Ko** sur les 16 routes |
| Socle partagé | **129,5 Ko — inchangé** (cible 136, bloquant 146) |
| Forme de l'artefact | un fichier `.css` de 632 octets, servi depuis `/_next/static/chunks/`, donc immuable et caché un an par Caddy |
| Référence dans le HTML prérendu | `<link rel="stylesheet" … data-precedence="next">` : la feuille est dans le HTML statique, aucune injection à l'exécution |
| Paquets ajoutés au verrou | **aucun** |

Le dernier point est celui qui tranche : les CSS Modules sont **déjà dans Next**. Il n'y a pas de
dépendance à justifier au titre de CT-08, parce qu'il n'y a pas de dépendance.

## Décision

**CSS Modules pour la portée locale, variables CSS pour les valeurs partagées.**

1. **Un fichier `*.module.css` par composant qui a besoin de style**, à côté de lui
   (`src/ui/site-nav.tsx` ↔ `src/ui/site-nav.module.css`). Les noms de classe sont locaux ; aucun
   sélecteur d'un composant ne peut atteindre le balisage d'un autre.
2. **Toutes les valeurs viennent de tokens** déclarés une seule fois dans `globals.css`, sous forme
   de variables CSS : couleurs, espacements, échelle typographique, rayons, points de rupture
   exprimés en unités relatives. Un composant qui écrit `#1a1a1a` ou `13px` en dur est un défaut de
   revue, pas un raccourci — c'est ce qui garantit qu'un contraste vérifié une fois le reste.
3. **`globals.css` ne porte que ce qui est global par nature** : la réinitialisation, les tokens,
   la typographie de base, le focus visible, `prefers-reduced-motion`. Il ne contient aucun
   sélecteur visant un composant.
4. **Aucun style en ligne** (`style={{…}}`) dans les composants : il échappe aux tokens, à la
   politique CSP de P14-04, et aux media queries.
5. **Le mode sombre, s'il est adopté, se fera par redéfinition de tokens** sous
   `prefers-color-scheme`, jamais par une seconde feuille ni par un composant client. Il n'est pas
   décidé ici et ne fait pas partie du périmètre de la Phase 4.

## Alternatives considérées

| Alternative | Pourquoi écartée |
|---|---|
| **Tailwind CSS v4** | Fonctionnerait, et sans JavaScript client lui non plus. Écarté pour trois raisons cumulées, et non pour un jugement de goût. **(a)** C'est une dépendance structurante au sens de CT-08, plus un greffon dans la chaîne de build, pour un site dont les besoins de mise en forme sont ceux d'un document : trois listes, deux gabarits de page, un en-tête. **(b)** Les utilitaires vivent dans le JSX, ce qui rend le balisage plus difficile à relire *au moment précis* où l'audit d'accessibilité de P4-10 exige de lire la structure du HTML sans la confondre avec sa présentation. **(c)** Le gain propre de Tailwind — la cohérence imposée par une échelle partagée — est ici obtenu par les tokens, pour zéro dépendance. **Déclencheur de réexamen** : si la Phase 8 amène une direction artistique dense (variantes, états, composants nombreux), la question se rouvre — la migration serait mécanique, les tokens existant déjà. |
| **vanilla-extract** | CSS typé à la compilation, zéro runtime : séduisant sur le papier. Écarté sur le risque d'intégration : il exige un greffon de bundler, et le projet construit avec **Turbopack**, dont le support par ce greffon n'est pas celui de Webpack. Adopter un outil dont la compatibilité dépend d'un plugin tiers pour styler un site documentaire ferait porter à la Phase 4 un risque qui n'appartient à aucune de ses tâches. |
| **CSS-in-JS à l'exécution** (styled-components, emotion) | Écarté sans hésitation : les deux exigent un composant client et un runtime, donc du JavaScript sur toutes les pages. Cela contredit l'ADR-0003 et supprimerait la propriété qui rend le profil `no-js` vrai par construction. |
| **Feuille globale unique, sélecteurs sémantiques** (`header nav ul { … }`) | C'est la stratégie la plus légère, et elle est cohérente avec un site documentaire. Écartée sur un mode de panne connu : sans portée, deux composants qui veulent un `ul` différent se départagent par des sélecteurs de plus en plus spécifiques, et le style d'un composant peut être cassé à distance par une règle écrite pour un autre. Les CSS Modules donnent la portée **pour le même coût d'exécution** — aucune dépendance, aucun JavaScript. |

## Conséquences

**Positives**

- Aucune dépendance ajoutée, aucun mégaoctet dans l'image, aucun octet de JavaScript client :
  vérifié, pas supposé (§ *Ce qui a été vérifié*).
- Les valeurs d'accessibilité (contrastes, espacements, tailles de cible) sont nommées en un seul
  endroit ; P4-10 vérifie des tokens, pas quarante littéraux.
- La feuille produite est un fichier statique versionné par empreinte, servi avec un cache d'un an
  par la pile edge — le meilleur cas pour le TTFB et pour R-16.
- Un composant reste supprimable : son fichier de style part avec lui, sans reliquat dans une
  feuille globale.

**Négatives, assumées**

- Un fichier de plus par composant stylé. C'est le prix de la portée, et il est explicite.
- Les CSS Modules ne vérifient rien : un `styles.typo` mal orthographié rend `undefined`, donc une
  classe absente, **sans erreur**. Le mode de panne est silencieux et il est réel. Traitement retenu :
  les composants sont testés par leur rôle et leur texte accessible (RTL), jamais par leur classe —
  un test qui assère sur un nom de classe échouerait pour la mauvaise raison — et l'audit visuel de
  P4-11 sur trois largeurs sert de filet. **Si un jour ce défaut survient réellement**, le correctif
  désigné est la génération de types (`typed-css-modules`), pas un test de classe.
- La feuille de style est bloquante pour le rendu. C'est le comportement voulu ici — un portfolio
  documentaire ne doit pas s'afficher non stylé puis sauter —, et le budget CLS de 0,05 le surveille.

**Déclencheur de réexamen**

Direction artistique dense en Phase 8, ou apparition d'un besoin de style dépendant de l'état
d'exécution (thème choisi par l'utilisateur et persisté, par exemple) : le premier rouvre le choix
de Tailwind, le second impose de décider d'un composant client et de mesurer ce qu'il coûte.
