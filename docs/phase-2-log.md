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

- [ ] Couverture ≥ 95 % sur `src/content/**` (statements, branches, functions, lines).
- [ ] Un frontmatter invalide fait échouer `make build`, **prouvé par un test**.
- [ ] Aucun import React ou Three.js dans la couche, **vérifié par le lint**.
- [ ] Les fixtures de test sont **indépendantes du contenu réel**.

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
