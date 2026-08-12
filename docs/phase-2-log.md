# Journal de la Phase 2 — Content layer

> Ouverte le 2026-08-12.
> Ce document consigne, **au fil de l'eau**, les décisions prises pendant la phase, les mesures
> relevées et les écarts par rapport aux documents de Phase 0. Le bilan final le clôt.
> Les statuts des tâches restent dans [`roadmap.md`](./roadmap.md), seule source de vérité.

---

## 1. Objectif

Transformer les fichiers Markdown/MDX en **objets typés et validés**, sans aucune dépendance à
React ni à Three.js. Un contenu invalide **casse le build** (CF-10), il ne produit jamais une page
à moitié vide.

Ce que la phase ne fait pas : aucune page, aucune route, aucun style, aucune locale résolue par le
routeur. La Phase 3 consomme cette couche ; elle ne commence pas ici.

## 2. Décisions à prendre pendant la phase

| # | Décision | Tâche | Ce qui la tranche |
|---|---|---|---|
| 1 | **Bibliothèque MDX** (ADR-0009) | P2-01 | Une compatibilité vérifiée par exécution avec Next 16.3 / React 19.2, pas un domaine de versions annoncé |
| 2 | Version majeure de **Zod** et style de schéma | P2-02 | Contrainte CT-03 (Zod imposé) ; reste à choisir la version et le degré de rigueur (`strict` vs tolérant) |
| 3 | Lecture du **frontmatter** : `gray-matter` ou autre | P2-03 | `architecture.md` §3.2 nomme `gray-matter` ; à confronter à l'état réel du paquet |
| 4 | Emplacement du **rendu MDX** dans le graphe de dépendances | P2-08 | La couche Content ne peut pas produire de React (CT-09) : le compilateur vit ailleurs |

Toute décision structurante prise ici est écrite dans un ADR **avant** le code correspondant.

## 3. Tâches et tests correspondants

| Tâche | Ce qu'elle livre | Ce qui le prouve |
|---|---|---|
| P2-01 | ADR-0009, choix de la bibliothèque MDX | Un prototype construit, servi et **mesuré** : build de production, rendu sans JavaScript, budget de bundle inchangé |
| P2-02 | Schémas Zod + types dérivés (`z.infer`) | Unitaires : chaque champ requis manquant, chaque type incorrect, chaque énumération hors domaine → rejet |
| P2-03 | Lecture du FS, séparation frontmatter/corps, cache | Unitaires sur fixtures : dossier vide, fichier illisible, frontmatter absent, délimiteurs malformés |
| P2-04 | Validation stricte, message nommant le fichier | **Une fixture invalide fait échouer `make build`**, message exploitable, vu échouer |
| P2-05 | Repositories typés | Unitaires : slug inconnu → `null`, locale sans contenu, `getContentLocales` exact |
| P2-06 | Normalisations et dérivations | Unitaires : tri stable, dates ISO, `endedAt` absent ⇒ poste en cours, `featured` |
| P2-07 | Cohérence référentielle | Intégration : une `technology` inconnue des compétences → erreur nommant le fichier et la valeur |
| P2-08 | Compilation MDX en RSC, liste blanche | Composant non autorisé → rejet ; aucun MDX envoyé au client |
| P2-09 | Fixtures valides **et** invalides, fabriques | Les tests ne lisent jamais `content/` : critère de sortie explicite |
| P2-10 | Contenu d'amorçage (2 + 2 + 5, fr + en) | La suite reste verte si ce contenu est réécrit |

## 4. Critères de sortie (rappel, `roadmap.md`)

- [x] Couverture ≥ 95 % sur `src/content/**` (statements, branches, functions, lines) — **100 %**.
- [x] Un frontmatter invalide fait échouer `make build`, **prouvé par un test** — §10.
- [x] Aucun import React ou Three.js dans la couche, **vérifié par le lint** — §7.
- [x] Les fixtures de test sont **indépendantes du contenu réel** — §14.

## 5. Ordre de travail

P2-01 → P2-02 → P2-03 → P2-04 → P2-05 → P2-06 → P2-07 → P2-08 → P2-09 → P2-10.

P2-09 (fixtures) est écrit **au fil des tâches** plutôt qu'à la fin : P2-03 en a besoin dès sa
première ligne. Son identifiant reste distinct parce que son critère de sortie — l'indépendance
vis-à-vis du contenu réel — se vérifie globalement, une fois la couche complète.

P2-11 (rédaction du contenu réel) est hors code et à la charge de l'utilisateur. La phase ne
l'attend pas : P2-10 fournit de quoi tout développer.

---

## 6. P2-01 — l'arbitrage MDX a été rendu sur des exécutions, pas sur des README

Décision : [ADR-0009](./adr/0009-mdx-compilation.md) — **`@mdx-js/mdx` appelé directement**,
`next-mdx-remote` désigné comme repli. Le tableau comparatif complet est dans l'ADR ; ne sont
consignés ici que les constats de mesure et ce qu'ils changent pour la suite.

**Ce qui a réellement été exécuté** — une sonde `src/app/mdx-probe/page.tsx` (supprimée après
mesure) a rendu la même source MDX par les deux candidats, puis une seconde sonde a comparé leurs
messages d'erreur sur trois cas fautifs.

| Mesure | Relevé |
|---|---|
| `next build` (Turbopack, production) | ✅ les deux candidats |
| Route prérendue **statiquement** | ✅ les deux |
| HTML produit | identique à la balise près |
| JS client ajouté à la route | **0,0 Ko** |
| Socle partagé pendant la sonde | 130,0 Ko (cible 136, bloquant 146) — inchangé |
| Rendu depuis l'**image de production** | ✅ `curl` sur `portfolio:local`, les deux sections présentes |
| Compilateur tracé dans `.next/standalone` | ✅ `node_modules/@mdx-js/mdx` |
| Paquets ajoutés au verrou | **+106** (530 → 636) pour `@mdx-js/mdx` seul, +113 avec `next-mdx-remote` |

### 6.1 Deux constats qui ne s'anticipent pas

**La compilation MDX a lieu au build, pas à l'exécution.** Toutes les pages de contenu sont SSG
(`architecture.md` §4.2) : le corps est compilé pendant la construction de l'image, et le conteneur
de production ne sert que du HTML. Le choix de bibliothèque n'a donc **aucun effet sur le TTFB** ni
sur le budget d'exécution du VPS (`performance-budget.md` §7). C'est aussi ce qui rend le coût de
`@mdx-js/mdx` (106 paquets) supportable : il ne pèse que sur le build.

**MDX exécute du JavaScript.** La sonde a rendu `{process.env.SECRET_TOKEN ?? 'rien'}` depuis un
corps MDX, et l'expression a été **évaluée**. Le dossier `content/` est donc du **code**, au même
niveau de confiance que `src/`. Acceptable ici — auteur unique, tout versionné — mais deux
conséquences fermes :

- aucun MDX d'origine tierce ne peut être accepté, jamais, sans changer d'architecture de rendu ;
- la liste blanche de composants de P2-08 **n'est pas une mesure de sécurité**. Elle empêche
  d'utiliser un composant non prévu, pas d'exécuter du JavaScript. Ce point est à rappeler tel quel
  à l'audit de la Phase 14, faute de quoi il sera lu comme une protection.

### 6.2 Signal à surveiller : la taille de l'image de production

Avec les deux candidats installés **et utilisés**, l'image de production est passée de **381 Mo**
(relevé de fin de Phase 1) à **388 Mo**. Le seuil bloquant est à 400 Mo
(`performance-budget.md` §7). La marge se réduit, et le responsable est identifié : le runtime MDX
tracé dans `.next/standalone`.

Rien n'est décidé sur cette base — un seul candidat est retenu, et la mesure sera refaite en P2-08
avec le code réel. C'est consigné ici pour que le jour où le seuil est franchi, on sache depuis
quand la marge s'érode et pourquoi.

---

## 7. Écart assumé : `content → i18n` est ajouté au graphe de dépendances

**Constat** — `architecture.md` §1.2 pose `content → (rien)`. Le même document, en §3.3, exige une
API de contenu **typée par locale** (`getAllProjects(locale: Locale)`), et §3.1 range les fichiers
sous `content/{locale}/…`. La couche Content ne peut donc pas ignorer la notion de locale, et §1.2
lui interdit d'aller la chercher. Les deux passages se contredisent, comme se contredisaient §1.2 et
§5.1 en Phase 1.

**Options**

| Option | Coût | Effet |
|---|---|---|
| (a) Redéfinir les locales dans `src/content` | Aucun sur le moment | **Deux listes de locales**. Le jour où une troisième langue arrive (CF-03), en oublier une produit un contenu introuvable, sans erreur |
| (b) Prendre `locale: string` sans le typer | Aucun | Supprime la garantie à l'endroit exact où elle compte : `hreflang` et `sitemap` seraient dérivés d'une chaîne libre |
| **(c) Autoriser `content → i18n`** | Une ligne de règle ESLint, une mention ici et dans `architecture.md` | Une seule source de vérité des locales |

**Décision : (c).** `i18n` ne dépend de rien : l'autorisation ne peut créer aucun cycle. Ce que
CT-09 protège est que la couche Content reste du **TypeScript pur, sans React, sans Next et sans
Three.js** — pas qu'elle n'importe rien du tout. Ces trois interdictions restent en place et
inchangées.

**Vérifié par échec observé**, la règle ayant été modifiée :

| Import depuis `src/content` | Attendu | Constaté |
|---|---|---|
| `@/i18n/locales` | accepté | ✅ aucun message |
| `@/seo/site-url` | refusé | ✅ `ne peut pas importer src/seo (architecture.md §1.2)` |
| `react` | refusé | ✅ `La couche Content ne dépend pas de React ni de Next (CT-09)` |

**Conséquence** — `src/i18n/locales.ts` est écrit dès maintenant, et ne contient **que** le
vocabulaire : `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `isLocale`. La négociation `Accept-Language`,
les dictionnaires et la règle de repli restent en Phase 3. **P3-01 complète ce fichier au lieu de le
créer** ; la roadmap le signale.

---

## 8. P2-02 — les schémas ont été vus refuser du contenu

Trois schémas (`project`, `experience`, `skill`), leurs types dérivés par `z.infer` et une table
type de contenu → schéma exhaustive par construction. **63 tests**, dont l'essentiel décrit un rejet.

**Zod 4.4.3** est retenu — CT-03 impose Zod, restait la version. Zod 4 n'a **aucune dépendance**
(l'arbre du projet ne bouge pas d'un paquet), `z.iso.date()` valide une date **calendaire** (il
refuse `2024-02-30`, ce qu'une expression rationnelle laisse passer), et `z.prettifyError` produit
un message lisible à plusieurs erreurs — ce sera la matière première du message de P2-04.

Trois choix de rigueur, qui sont des décisions et non des réglages par défaut :

| Choix | Motif |
|---|---|
| `strictObject` partout | Une clé inconnue est une **erreur**. C'est ce qui attrape `feature:` écrit pour `featured:` — la faute la plus coûteuse du lot, puisqu'elle ne casse rien et publie simplement un site faux |
| `featured` avec défaut `false` | Un champ absent ne peut pas faire remonter un contenu par accident. Le défaut est sûr dans le seul sens qui compte |
| Dates au jour près (`AAAA-MM-JJ`) | Une seule forme à écrire, à trier et à comparer. La précision d'affichage (« mars 2022 ») est une décision de rendu, prise en Phase 4 |

**Neuf mutations appliquées au code de production, une à une : les neuf sont tuées.**

| Mutation | Verdict |
|---|---|
| `strictObject` → `object` | tuée |
| Contrôle d'ordre des dates retiré | tuée |
| `.trim()` retiré des textes obligatoires | tuée |
| Motif de slug remplacé par « tout accepter » | tuée |
| `z.iso.date()` → `z.string()` | tuée *(4 tests)* |
| Minimum d'une technologie retiré | tuée |
| Détection de doublons neutralisée | tuée |
| Niveau borné 1–5 → `z.number()` | tuée |
| Minimum d'une réalisation retiré | tuée |

> Le harnais de mutation a d'abord annoncé la cinquième comme **survivante**. Vérification faite à
> la main, son écriture du fichier n'avait pas pris effet avant l'exécution des tests : le code
> n'était pas muté. Un faux négatif d'outil, corrigé en rejouant la mutation seule — et la seule
> direction d'erreur possible ici, puisqu'un « tuée » exige que la suite ait réellement rougi.

---

## 9. P2-03 — deux étapes du pipeline de `architecture.md` §3.2 ont changé

Le chargeur lit `content/{locale}/{type}/`, découpe le frontmatter, en lit le YAML et mémorise le
résultat. **31 tests**, dont onze décrivent un rejet. **Huit mutations appliquées, les huit tuées** :
normalisation BOM/CRLF retirée, délimiteur de fermeture non exigé sur sa ligne, frontmatter non-objet
accepté, slugs en double acceptés, racine absente non signalée, cache retiré, échec mémorisé, panne
système convertie en liste vide.

### 9.1 `gray-matter` remplacé par `yaml`

**Constat, obtenu en exécutant les deux.** `gray-matter` rend `startedAt` sous la forme
`Date { "2024-01-15T00:00:00.000Z" }`, là où `yaml` rend la chaîne `"2024-01-15"`. La cause est le
schéma : `js-yaml` applique YAML 1.1, qui définit un type *timestamp* ; `yaml` applique le schéma
core de YAML 1.2, qui n'en a pas.

Nos schémas attendent une chaîne ISO (P2-02). Avec `gray-matter`, il faudrait reconvertir chaque
date avant validation — et une conversion `Date` → chaîne traverse la question du fuseau horaire,
c'est-à-dire un moyen de décaler une date d'un jour sans que rien ne le signale.

Le même schéma protège d'un second piège : `flag: yes` reste `"yes"` au lieu de devenir `true`.

S'ajoute l'état des paquets : `yaml` 2.9.0, publié en 2026, **aucune dépendance** ;
`gray-matter` 4.0.3, publié en 2021, quatre dépendances dont `js-yaml` 3.

Le découpage `---` lui-même fait dix lignes, et il nous rend une chose que ces bibliothèques ne
donnent pas : **le contrôle du message d'erreur**, qui doit nommer le fichier (CF-10).

### 9.2 Le cache « par requête » devient une mémoïsation par processus

`architecture.md` §3.2 annonçait un cache React (`cache()`). C'est impossible : la couche Content ne
peut pas importer React (CT-09) — le document se contredisait, comme en §1.2.

Ce n'est pas une perte. Le contenu ne change qu'au déploiement (pas d'ISR, H-05) et les pages sont
générées au build : une mémoïsation à la durée du processus est **strictement plus forte** qu'une
mémoïsation par requête, et elle ne peut pas servir deux états différents à deux requêtes puisqu'il
n'existe qu'un état.

Deux détails qui ne se devinent pas, et que les tests fixent :

- **La promesse est mémorisée, pas son résultat** : deux lectures simultanées du même dossier
  partagent le même travail au lieu de le faire deux fois.
- **Un échec n'est pas mémorisé.** Sans éviction, une erreur corrigée dans l'éditeur continuerait
  d'être servie jusqu'au redémarrage du serveur de développement.

### 9.3 Ce qui est une erreur, et ce qui n'en est pas

| Situation | Comportement | Motif |
|---|---|---|
| `content/en/experiences/` absent | liste vide | Une locale peut ne pas tout traduire (risque R-07) |
| **Racine `content/` absente** | **erreur** | Rendrait tout le site vide, en silence : le mode de panne exact à interdire |
| Panne système autre qu'une absence (`ENOTDIR`, droits) | remontée telle quelle | Ce n'est pas « ce contenu n'existe pas » |
| `augure.md` **et** `augure.mdx` | erreur | Deux fichiers pour une seule URL : sinon l'ordre de lecture du système de fichiers décide de ce qui est publié |
| Fichier ni `.md` ni `.mdx` | ignoré | Notes de travail, brouillons |

### 9.4 Un point à vérifier avant la mise en production (P4-13)

`content/` **n'est pas dans l'image de production** : la lecture a lieu au build, toutes les pages
étant statiques. C'est cohérent, et c'est aussi une contrainte à honorer — **aucune route ne doit
pouvoir se rendre à la demande**, sans quoi le serveur chercherait un dossier absent. À vérifier au
moment où les routes existent, en Phase 3 puis avant P4-13.

---

## 10. P2-04 — le build a été vu casser, pour la bonne raison

### 10.1 Le problème que personne ne voit venir

L'exigence CF-10 dit « un frontmatter invalide fait échouer le build ». La lecture naturelle est
« une page rendra ce contenu et échouera ». **En Phase 2, aucune page ne lit le contenu** : un
dossier entièrement fautif passerait donc le build sans un mot. Et même en Phase 4, ne seraient
validés que les fichiers qu'une route rend réellement.

Le contenu est donc validé par un **gate dédié**, `scripts/check-content.mts`, branché avant
`next build` :

```json
"build": "pnpm check-content && next build"
```

Il valide **tout** `content/`, indépendamment des routes, et il tourne aussi bien dans la CI (job
`gates`, `pnpm build && pnpm bundle`) que dans la construction de l'image de production.

### 10.2 Preuve : un contenu fautif écrit exprès, et `make build` vu échouer

Écrit **avant** de regarder si le mécanisme marchait, comme demandé — un fichier `content/fr/projects/augure.mdx`
portant quatre fautes à la fois. `make build` s'est arrêté, code de sortie non nul, sur :

```text
✗ Contenu invalide — 1 problème(s) :

  content/fr/projects/augure.mdx — frontmatter invalide
  ✖ Unrecognized key: "feature"
  ✖ est trop court pour servir de description
    → at summary
  ✖ contient un doublon : chaque technologie ne doit apparaître qu'une fois
    → at technologies
  ✖ doit être une date ISO complète et réelle, au format AAAA-MM-JJ (ex. « 2022-03-01 »)
    → at startedAt

Le build est interrompu volontairement : un contenu invalide ne doit pas
atteindre la production sous forme de page à moitié vide (CF-10).
```

Le message est **exploitable** : il nomme le fichier, chaque champ fautif, et la règle violée en
français. Les quatre défauts sortent **en une seule passe** — corriger, rebuilder, découvrir le
suivant, quatre fois de suite, serait une autre façon d'échouer.

Second cas vérifié : un frontmatter annonçant `slug: augur` dans `augure.mdx` →
*« le frontmatter annonce le slug « augur », mais le nom du fichier impose « augure » »*.

Le contenu fautif a ensuite été supprimé : `content/` est de nouveau vide jusqu'à P2-10.

### 10.3 Ce que le gate exige de la couche, et ce que cela change

Le gate tourne sous **`node` seul**, sans bundler ni exécuteur de tests. C'est la contrepartie
concrète de « la couche Content est du TypeScript pur » (ADR-0001) : si elle avait besoin de Next
pour s'exécuter, l'affirmation serait décorative.

Trois conséquences, toutes assumées et vérifiées :

| Contrainte de `node` | Effet | Vérifié |
|---|---|---|
| ESM exige des spécificateurs complets | Les imports relatifs de `src/content/**` portent leur extension `.ts` (`./errors.ts`), autorisé par `allowImportingTsExtensions` | `tsc`, ESLint, Vitest et **Turbopack** acceptent tous cette forme — build de production refait |
| L'effacement de types ne sait pas produire de code | Plus de propriété de paramètre dans `ContentError` : le champ est déclaré puis affecté | `node scripts/check-content.mts` s'exécute |
| Un paquet sans `type` déclaré est reparsé | `"type": "module"` ajouté à `package.json` | build, tests, lint et budget de bundle rejoués : **socle inchangé à 129,5 Ko** |

> `"type": "module"` est un changement à l'échelle du dépôt, pas un réglage local. Il est sans effet
> ici parce qu'aucun fichier `.js` n'existe : la configuration est en `.ts`, `.mts` ou `.mjs`. Le
> signaler pour que le jour où un `.js` CommonJS est ajouté, on sache pourquoi il ne se charge pas.

### 10.4 Ce que les tests prouvent, et ce qu'ils ne prouvent pas

`tests/integration/content-gate.test.ts` **exécute réellement** le gate dans un processus séparé,
contre des fixtures fautives, et constate son code de sortie — 1 sur cinq familles de fautes, 0 sur
le contenu valide. Le gate étant branché sur `pnpm build`, **son code de sortie est celui du build**.

Ce que ces tests ne prouvent pas, et qui a donc été fait à la main une fois (§10.2) : que `make build`
— donc la construction de l'image Docker — s'arrête bien. Reconstruire une image à chaque exécution
de la suite coûterait plusieurs minutes pour revérifier un maillon déjà vérifié.

**Quatre mutations appliquées, les quatre tuées** : slug non confronté au nom du fichier,
frontmatter invalide accepté, gate sans code de sortie, gate qui ne valide rien.

### 10.5 Une réserve consignée : un gate qui ne trouve rien passe au vert

`content/` étant vide jusqu'à P2-10, le gate affiche aujourd'hui « 0 fichier vérifié » et sort en 0.
C'est un mode de panne silencieuse en puissance : une racine mal résolue produirait exactement la
même sortie. Un avertissement bruyant est émis, et **P2-10 doit rendre ce cas bloquant** une fois le
contenu d'amorçage en place.

---

## 11. P2-05 et P2-06 — l'API de lecture, et là où les décisions d'ordre sont prises

### 11.1 Deux niveaux de type, et pourquoi

| Type | Produit par | Contenu |
|---|---|---|
| `ProjectEntry`, `ExperienceEntry`, `SkillEntry` | le chargeur | le frontmatter validé, plus le corps — exactement le fichier |
| `Project`, `Experience`, `Skill` | le dépôt | la même chose, dérivations appliquées (`isOngoing`) |

Sans cette séparation, `isOngoing` devrait exister dès la validation, c'est-à-dire avant d'avoir été
calculé. La distinction coûte trois lignes de types et supprime une incohérence de fond.

### 11.2 Les tris sont dans la couche, pas dans les vues

Une vue qui trierait elle-même finirait par trier autrement qu'une autre, et le sitemap autrement
que les deux. Trois règles, appliquées une fois :

| Contenu | Ordre | Motif |
|---|---|---|
| Projets, expériences | Date de fin décroissante, **un élément en cours en tête**, puis date de début décroissante, puis slug | C'est l'ordre attendu d'un CV |
| Compétences | Catégorie (`language` → `framework` → `tooling` → `infrastructure` → `practice`), puis niveau décroissant, puis nom | Du plus concret au plus transversal ; l'ordre vient de l'énumération du schéma, qui est donc porteuse de sens |

Trois détails qui ne se voient qu'en les écrivant :

- **Aucune horloge.** Un tri qui dépendrait de « maintenant » donnerait deux résultats à deux
  builds : intestable, et visible en production sous forme de page qui change sans que le contenu
  ait bougé. Une date de fin absente est remplacée par une borne haute (`9999-12-31`), pas comparée
  à la date du jour.
- **Aucune conversion en `Date`.** Le format ISO se compare comme une chaîne ; passer par `Date`
  ferait entrer les fuseaux horaires dans un tri.
- **Le slug tranche les égalités parfaites.** Sans lui, deux entités commencées et terminées le même
  jour pourraient changer d'ordre d'un build à l'autre — donc dans le sitemap.

Le nom des compétences est comparé avec un `Intl.Collator` **de la locale** : « Élasticsearch » se
range à sa place alphabétique au lieu d'être rejeté après « Z ». `Intl` vient de la plateforme,
aucune dépendance (ADR-0005).

### 11.3 Ce que le dépôt rend quand il ne trouve rien

`get*BySlug` rend **`null`**, jamais une exception : un slug inconnu est une **route** inconnue, que
l'appelant traduit en 404 localisée (`architecture.md` §10). Un contenu présent mais invalide, lui,
lève toujours — les deux situations n'ont rien à voir et ne doivent pas se ressembler dans le code.

`getContentLocales(type, slug)` ne rend que les locales où l'entité **existe réellement**, dans
l'ordre de `LOCALES`. C'est la brique du risque R-07 : un `hreflang` vers une traduction absente est
une promesse fausse faite à un moteur de recherche.

**Neuf mutations appliquées, les neuf tuées** : élément en cours relégué en dernier, égalité non
départagée, collateur remplacé par une comparaison brute, niveau croissant, tri en place, recherche
par slug ignorée, toutes les locales déclarées existantes, dérivation « en cours » inversée, filtre
`featured` retiré.

---

## 12. P2-07 — la faute qui n'existe qu'entre deux fichiers

`technologies: ["typscript"]` satisfait le schéma : c'est bien un tableau de chaînes au format slug.
La faute n'apparaît qu'en confrontant le projet aux compétences — et sa conséquence est visible par
un recruteur avant de l'être par moi : un lien mort vers une compétence qui n'existe pas.

**La cohérence se juge à l'intérieur d'une locale.** Un projet anglais qui cite `typescript` a
besoin de `en/skills/typescript.md` ; sinon sa page renvoie vers une compétence absente **dans cette
langue**. Ce choix a immédiatement trouvé un défaut dans nos propres fixtures : `valid/en/` citait
`postgresql` sans que la compétence anglaise existe. Fixture complétée, ce qui est exactement ce
qu'on attend d'une règle le jour où on l'active.

La détection est une **fonction pure** — elle ne connaît ni locale, ni système de fichiers : on lui
donne les références d'un côté, les compétences existantes de l'autre. Le gate de P2-04 l'appelle,
donc **une référence morte casse le build** avec le même traitement que le reste :

```text
content/fr/projects/augure.mdx — cite des technologies inconnues des compétences
de cette locale : « typscript », « postgresql »
```

Toutes les références mortes de tous les fichiers sortent en une passe. **Trois mutations
appliquées, les trois tuées** : références mortes ignorées, contrôle non branché sur le gate,
compétences d'une autre locale acceptées.

---

## 13. P2-08 — la liste blanche refuse *avant* de rendre

Le rendu MDX vit dans `src/ui/mdx/`, jamais dans `src/content` : la couche Content rend `body` sous
forme de chaîne et s'arrête là (CT-09). Le compilateur ne reçoit qu'une chaîne et ne sait rien du
système de fichiers.

### 13.1 Le contrôle est fait avant la compilation, et c'est le seul point non évident

Laissée à React, une balise `<Danger>` absente de la liste blanche produit
`Expected component \`Danger\` to be defined` **au milieu du rendu de la page**, avec un message qui
nomme le composant mais pas le fichier. Un greffon remark relève donc les noms de composants
appelés **pendant la compilation**, et le rendu est refusé avant d'avoir commencé :

```text
content/fr/projects/augure.mdx — utilise « Danger », hors de la liste blanche
des composants MDX (Callout)
```

Le relevé distingue ce qui commence par une majuscule (un composant) de ce qui n'en a pas (une
balise HTML, que MDX rend nativement). Il descend dans les enfants, donc un composant interdit
imbriqué dans un composant autorisé est vu — mutation vérifiée.

### 13.2 Ce que cette liste garantit, et ce qu'elle ne garantit pas

**Elle n'est pas une mesure de sécurité**, et le §6.1 l'a établi par exécution : MDX évalue du
JavaScript sans passer par le moindre composant. Ce qu'elle garantit est **éditorial** — un contenu
ne peut pas appeler un composant qui n'existe pas, donc il ne peut pas exister de page qui « marche
presque ». À rappeler tel quel à l'audit de la Phase 14.

La liste est volontairement minuscule : un seul composant, `Callout`, rendu en `<aside>` et sans
style. La stratégie de style est l'ADR-0010, en Phase 4 ; y ajouter des composants ici reviendrait à
décider de leur mise en forme avant d'avoir tranché comment on met en forme.

**Six mutations appliquées, les six tuées** : liste blanche non appliquée, composants au fil du texte
ignorés, descente dans les enfants supprimée, balises HTML traitées comme des composants, erreur de
compilation avalée, ton par défaut retiré.

### 13.3 Mesure promise en ADR-0009 : l'image de production n'a pas bougé

**381 Mo**, exactement le relevé de fin de Phase 1. Le runtime MDX **n'est pas dans l'image** :
`ls node_modules/@mdx-js` y renvoie « absent ». Next ne trace que ce qu'une route atteint, et aucune
route ne compile encore de MDX.

Les ~7 Mo mesurés en P2-01 réapparaîtront donc en **Phase 4**, avec la première page qui rend un
corps. La marge sous le seuil bloquant (400 Mo) est à surveiller à ce moment-là, pas maintenant.

Même raisonnement pour « aucun MDX n'envoyé au client » : le module n'est pas `'use client'` et le
budget de bundle mesure 0,0 Ko par route — mais c'est aujourd'hui vrai d'un module que rien
n'importe. La vérification qui compte est celle de la Phase 4, sur une page réelle.

---

## 14. P2-09 — l'indépendance des fixtures a été prouvée en cachant le contenu réel

Deux jeux de fabriques, qui ne se remplacent pas :

| Fabrique | Produit | Sert à |
|---|---|---|
| `builders/frontmatter.ts` | du YAML lu sur disque, donc de l'**inconnu** — type de retour `Record<string, unknown>` | tester la validation, y compris avec des valeurs invalides |
| `builders/entities.ts` | ce que **rend le dépôt** : frontmatter validé, corps, dérivations | tester les consommateurs (composants, métadonnées, sitemap) sans passer par le disque |

Typer les premières avec les types dérivés des schémas interdirait d'écrire les cas invalides, qui
sont la moitié de l'intérêt de ces tests.

**La preuve** : la suite complète a été exécutée avec le dossier `content/` **entièrement déplacé
hors du dépôt**. 201 tests verts, couverture 100 %. Aucun test ne lit le contenu réel — ce n'est plus
une intention de conception, c'est un fait constaté.

S'y ajoute un garde-fou permanent (`tests/integration/fixtures-independence.test.ts`), parce qu'un
test futur peut très bien appeler le dépôt de l'application par commodité et casser le jour où un
projet est réécrit. Il refuse dans `tests/**` toute mention de `contentRepository` (l'instance liée à
`content/`) et tout `createContentSource(defaultContentRoot())`. Il vérifie aussi **qu'il trouve bien
des fichiers à inspecter** : un parcours qui ne trouve rien rendrait les deux assertions vertes pour
la pire des raisons.

---

## 15. P2-10 — le contenu d'amorçage, et ce qu'il a immédiatement trouvé

Deux expériences, deux projets et cinq compétences **par locale**, soit 18 fichiers. Chacun porte en
clair la mention « contenu d'amorçage, à remplacer en P2-11 » : il sert à développer les Phases 3 et
4, pas à être publié tel quel.

Il couvre volontairement les cas que le code doit savoir traiter : un poste **en cours** (sans
`endedAt`, qui alimente `isOngoing`), un projet terminé, du `featured` et du non-`featured`, les cinq
catégories de compétences, un corps avec un composant `Callout`, un projet avec un lien de dépôt.

**La première rédaction réelle a fait échouer le gate, sur une faute que personne n'anticipe :**

```text
content/fr/projects/portfolio.mdx — frontmatter YAML illisible —
Nested mappings are not allowed in compact mappings at line 3, column 10
```

`summary: Ce site : un portfolio…` — un `:` suivi d'une espace **dans une valeur non entre
guillemets** fait lire à YAML une table imbriquée. La faute est invisible à la relecture, elle
touchait les deux locales, et elle serait passée inaperçue si le gate n'existait pas : la page aurait
simplement été absente. Les deux valeurs sont désormais entre guillemets, et la règle est écrite
dans `content/README.md` — là où on la lira au moment d'écrire.

**Le cas « aucun contenu trouvé » devient bloquant**, comme annoncé en §10.5 : le gate sort
maintenant en 1 s'il ne valide aucun fichier. Une racine mal résolue produit exactement la même
sortie qu'un contenu parfait ; c'était la dernière panne silencieuse de la chaîne.

---

## 16. Bilan de la Phase 2

### 16.1 Fait

**Dix tâches sur dix** (P2-01 à P2-10). P2-11, la rédaction du contenu réel, est hors code et à la
charge de l'utilisateur ; elle ne bloque pas la Phase 3.

| Critère de sortie | État |
|---|---|
| Couverture ≥ 95 % sur `src/content/**` | ✅ **100 %** sur les quatre métriques — et autant sur `src/ui/mdx/**` et `src/i18n/**` |
| Un frontmatter invalide fait échouer `make build`, prouvé par un test | ✅ vu échouer à la main sur un fichier écrit exprès, puis automatisé sur six familles de fautes |
| Aucun import React / Three.js dans la couche, vérifié par le lint | ✅ règle revérifiée par **échec observé** après modification du graphe |
| Fixtures indépendantes du contenu réel | ✅ **suite complète verte avec `content/` déplacé hors du dépôt** |

**201 tests** (contre 20 en fin de Phase 1), `make ci` vert en 47 s, et **39 mutations appliquées au
code de production, toutes tuées**.

**Ce que je retiens** : la moitié des décisions de cette phase ont été renversées par une exécution,
pas par une relecture.

- `gray-matter` transformait `2024-01-15` en objet `Date` — le paquet nommé par l'architecture était
  le mauvais choix, et cela ne se voyait qu'en l'exécutant.
- Le gate de contenu écrit « pour la forme » a trouvé, sur les **18 premiers fichiers réels**, une
  faute YAML invisible à la relecture, présente dans les deux locales.
- La cohérence référentielle, activée, a immédiatement révélé une incohérence dans nos propres
  fixtures.
- Deux passages de `architecture.md` se contredisaient, encore, comme en Phase 1.

### 16.2 Dérives assumées

| # | Dérive | Traitement |
|---|---|---|
| 1 | **`content → i18n` ajouté au graphe de dépendances** | `architecture.md` §1.2 (`content → rien`) contredisait §3.3 (API typée par locale). L'alternative était une seconde liste de locales vouée à diverger. Justifié en §7, `architecture.md` corrigé, règle ESLint revérifiée par échec observé |
| 2 | **`gray-matter` remplacé par `yaml`** | Le premier convertit les dates en objets `Date`, que nos schémas rejettent. Constaté par exécution, pas déduit (§9.1) |
| 3 | **Cache React par requête → mémoïsation par processus** | La couche Content ne peut pas importer React (CT-09) ; le contenu ne change qu'au déploiement, donc c'est strictement plus fort (§9.2) |
| 4 | **`"type": "module"` et extensions `.ts` explicites** dans `src/content/**` | Exigés pour que la couche tourne sous `node` seul — ce qui est la contrepartie concrète de « TypeScript pur ». Vérifié sur `tsc`, ESLint, Vitest et Turbopack ; socle de bundle inchangé (§10.3) |
| 5 | **`isOngoing` ajouté au modèle de `architecture.md` §3.4** | Dérivation exigée par P2-06. Deux niveaux de types (`*Entry` / entité) plutôt qu'un champ qui existerait avant d'être calculé (§11.1) |

Aucune n'a été appliquée en silence : chacune est justifiée à l'endroit où la décision d'origine
était consignée.

### 16.3 Reporté

| Sujet | Cause | Reprise |
|---|---|---|
| **P2-11** — rédaction du contenu réel (fr + en) | Hors code, à la charge de l'utilisateur | Chemin critique de T1 ; peut démarrer immédiatement, le format étant figé et vérifié par `make check-content` |
| Mesure du runtime MDX dans l'image de production | Aucune route ne compile encore de corps : l'image est à 381 Mo, inchangée | Phase 4, avec la première page qui rend un corps (§13.3) |
| Preuve « aucun MDX envoyé au client » sur une page réelle | Même cause | Phase 4, par le budget de bundle |
| Vérification qu'aucune route ne se rend à la demande | Aucune route n'existe | Phase 3, puis avant P4-13 (§9.4) |
| Ajouts à la liste blanche de composants MDX | La stratégie de style est l'ADR-0010 | Phase 4 |

### 16.4 Dette technique connue, tracée

1. **La liste blanche MDX n'est pas une barrière de sécurité** — MDX exécute du JavaScript sans
   passer par un composant (§6.1). À reprendre tel quel à l'audit de la Phase 14, faute de quoi elle
   sera lue comme une protection.
2. **`content/` n'est pas dans l'image de production** — cohérent avec le tout-statique, mais cela
   interdit toute route rendue à la demande (§9.4).
3. **`messageOf` existe en double**, dans `src/content` et dans `src/ui/mdx` — deux lignes, prix
   assumé du cloisonnement, `ui` ne pouvant pas importer `content`.
4. **Le contenu d'amorçage est du remplissage** et le dit dans chaque fichier. Il ne doit pas se
   retrouver publié : P4-13 vérifiera que P2-11 l'a remplacé.

Rien de tout cela n'est un raccourci pris pour verdir un gate : aucun test n'a été supprimé ni
affaibli, aucun seuil abaissé.

---

## 17. Hors phase — le CV est arrivé, et il n'est pas indexable

Les deux PDF ont été fournis le 2026-08-12, pendant la Phase 2. Ils relèvent de la Phase 10 ; ce qui
est consigné ici est ce qui a été **décidé et appliqué** à leur arrivée, pour ne pas le redécouvrir.

- Placés en `public/resume/cv-fr.pdf` et `cv-en.pdf` — l'emplacement prévu par `architecture.md` §8
  et le nommage acté en Q10. Les noms d'origine portaient espaces et accents, à encoder dans chaque
  URL, chaque lien et chaque nom de pièce jointe.
- **Versionnés dans le dépôt public**, décision de l'utilisateur après signalement : l'historique
  est définitif, et un CV porte des coordonnées personnelles. H-03 cesse d'être une hypothèse.
- **`X-Robots-Tag: noindex`** sur `/resume/*`, posé par l'application (`next.config.ts`) et non par
  Caddy. Motif de l'emplacement : l'en-tête suit alors l'image de production, donc il est déployé
  par la CI et vérifiable en local — un réglage de reverse proxy dépendrait d'une copie manuelle sur
  le serveur, qui est exactement ce qui dérive.
- **Vérifié contre l'image de production** : les deux PDF sont servis en `application/pdf`, portent
  l'en-tête, et la page d'accueil ne le porte pas. **Vu échouer** : l'en-tête remplacé par un autre
  fait rougir les deux assertions, et elles seules.

Conséquence à ne pas manquer : dès le prochain déploiement, `https://aurelienfeignon.com/resume/cv-fr.pdf`
est en ligne — avant même que la Phase 10 n'existe. C'est voulu, et c'est pourquoi l'en-tête a été
posé maintenant plutôt qu'en P3-08.
