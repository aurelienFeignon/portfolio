# Journal de la Phase 3 — Internationalisation

> Ouverte le 2026-08-14.
> Ce document consigne, **au fil de l'eau**, les décisions prises pendant la phase, les mesures
> relevées et les écarts par rapport aux documents de Phase 0. Le bilan final le clôt.
> Les statuts des tâches restent dans [`roadmap.md`](./roadmap.md), seule source de vérité.

---

## 1. Objectif

`/fr/...` et `/en/...` **résolus indépendamment**, avec des métadonnées, un `hreflang` et un sitemap
qui ne mentent jamais sur ce qui existe réellement.

Ce que la phase ne fait pas : aucun style (ADR-0010 est en Phase 4), aucune mise en page
documentaire, aucune scène. Les pages écrites ici sont **structurelles** — elles prouvent que la
route résout la bonne entité dans la bonne langue, rien de plus. P4-02 à P4-06 les habillent.

## 2. Contexte d'ouverture — ce qui est déjà là et ne doit pas être refait

| Acquis | Origine | Conséquence pour la phase |
|---|---|---|
| `src/i18n/locales.ts` : `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `isLocale` | P2-02, par nécessité | **P3-01 le complète**, il ne le recrée pas |
| `getContentLocales(type, slug)` rend les locales où l'entité existe vraiment | P2-05 | C'est la brique de P3-07 (risque R-07) |
| `src/seo/site-url.ts` : `parseSiteUrl`, `buildAbsoluteUrl`, `getSiteUrl` | P1-10, **sans consommateur** | P3-06 le branche enfin — dette 2 de `phase-1-log.md` §7.4 |
| `src/app/layout.tsx` code `lang="fr"` en dur, et le dit | P1-09 | Dette 1 de `phase-1-log.md` §7.4, corrigée en P3-02 |
| ~~`content/` **n'est pas dans l'image de production**~~ — ⛔ **FAUX, mesuré en P4-13** (`phase-4-log.md` §20.8) | P2-03, `phase-2-log.md` §9.4 | L'exigence tient — aucune route ne doit se rendre à la demande — mais ce qui la protège est le **gate de rendu statique**, pas cette absence |

## 3. Décisions à prendre pendant la phase

| # | Décision | Tâche | Ce qui la tranche |
|---|---|---|---|
| 1 | Confirmer ou corriger la contrainte `seo → i18n, routing` | P3-06 | Posée **par défaut** en P1-05 faute de métadonnées à écrire ; elle en aura maintenant |
| 2 | Portée exacte de `dynamicParams = false` | P3-02 | `content/` absent de l'image : une route rendue à la demande chercherait un dossier qui n'existe pas |
| 3 | Statut de `/` : la seule route qui ne peut pas être statique | P3-03 | La négociation `Accept-Language` lit un en-tête de requête (H-04, Q13) |
| 4 | Forme des dictionnaires d'interface | P3-04 | `architecture.md` §4.3 : complétude **garantie par le compilateur**, pas par un test |

Toute décision structurante prise ici est écrite dans un ADR **avant** le code correspondant.
Aucune n'est attendue à ce stade : l'ADR-0005 couvre déjà la stratégie i18n, et ces quatre points
sont des applications, non des révisions.

## 4. Tâches et tests correspondants

| Tâche | Ce qu'elle livre | Ce qui le prouve |
|---|---|---|
| P3-01 | Négociation, repli, complétion de `locales.ts` | Unitaires : `fr`, `en`, `FR`, `de`, chaîne vide, valeur injectée |
| P3-02 | `app/[locale]` + `generateStaticParams` ; locale inconnue → 404 | Intégration : `/de` rend 404 ; **aucune route dynamique** |
| P3-03 | Négociation `Accept-Language` sur `/` avec repli | Unitaires : exact, partiel, pondérations `q`, en-tête absent, repli `fr` |
| P3-04 | Dictionnaires typés, complétude à la compilation | Une clé manquante **fait échouer `tsc`**, vue échouer |
| P3-05 | Table `routeSegments` (identité en v1) et constructeurs d'URL | Unitaires : sections, détails, slugs échappés, aucun double slash |
| P3-06 | `generateMetadata` : title, description, canonical | Intégration : chaque type de page, `canonical` absolu et exact |
| P3-07 | `hreflang` dérivé des locales existantes + `x-default` | Intégration : **aucun `hreflang` vers une page inexistante** |
| P3-08 | `sitemap.xml` et `robots.txt` dérivés du Content Layer | Intégration : le sitemap contient exactement les entités existantes |
| P3-09 | Sélecteur de langue préservant l'entité ; cas sans traduction | Composants : cible correcte, entité conservée, absence de traduction |

## 5. Ordre de travail

Prévu : P3-01 → P3-05 → P3-02 → P3-03 → P3-04 → P3-06 → P3-07 → P3-08 → P3-09.
**Exécuté** : P3-01 → P3-05 → **P3-04** → P3-02 → P3-03 → P3-06 → P3-07 → P3-08 → P3-09.

Deux écarts par rapport à l'ordre des identifiants, dictés par les dépendances réelles :

- **P3-05 avant P3-02.** Les constructeurs d'URL sont ce que le segment de route, les métadonnées,
  le sitemap et le sélecteur de langue utilisent tous. Les écrire après aurait produit quatre
  constructions d'URL à la main, puis une factorisation.
- **P3-04 avant P3-02, et non après P3-03 comme prévu.** Le raisonnement initial — « les
  dictionnaires n'ont de contenu que lorsqu'une page a des libellés » — s'est révélé faux à la
  première ligne du layout : le **lien d'évitement** est un libellé, et il est dans le layout. Les
  dictionnaires devaient donc précéder la première route, pas la suivre.

## 6. Critères de sortie (rappel, `roadmap.md`)

- [x] `/fr/projects/augure` et `/en/projects/augure` résolus **indépendamment**, prouvé par test.
- [x] Aucun `hreflang` vers une page inexistante.
- [x] Sitemap exact.
- [x] Couverture ≥ 95 % sur `src/i18n/**` et `src/routing/**` — **100 %**.

S'y ajoute une vérification héritée de la Phase 2, qui devient réelle ici : **aucune route ne peut
se rendre à la demande** (`phase-2-log.md` §9.4) — [x] gate branché sur `pnpm build`, vu échouer.

Détail et preuves : §17.1.

## 7. Une correction au prompt de reprise, constatée à l'ouverture

Le prompt de reprise annonce que « le contenu d'amorçage contient exprès des entités traduites et
non traduites ». **C'est faux, et c'est une bonne nouvelle** : `content/` est parfaitement
symétrique — mêmes slugs des deux côtés pour les 2 expériences, 2 projets et 5 compétences.

L'asymétrie existe là où elle doit être, dans les **fixtures** :
`tests/fixtures/content/valid/fr/` porte `experiences/evea.md` et `projects/portfolio.md` que
`en/` n'a pas. C'est la seule place correcte, puisque la suite est prouvée indépendante de
`content/` (P2-09) : un test de `hreflang` adossé au contenu réel casserait le jour où P2-11
traduit l'entité qui lui servait de cas.

Conséquence pour P3-07 : le cas « entité non traduite » se teste sur fixtures, jamais sur
`content/`. Le prompt de reprise est corrigé en fin de phase.

---

## 8. P3-01 et P3-05 — le vocabulaire, et un mot qui n'a pas été écrit

`src/i18n/locales.ts` n'a reçu qu'une addition : `LOCALE_NAMES`, les endonymes (« Français »,
« English »). Le reste du vocabulaire existait depuis P2-02, et la tâche consistait surtout à ne pas
le réécrire.

**`parseLocale` n'a pas été créé, et c'est une décision.** `architecture.md` §4.4 et
`testing-strategy.md` §4.2 le nomment, avec la signature `(string) => Locale | null`. `isLocale`
rend déjà ce service sous la forme dont les appelants ont besoin — une **garde de type**, qui
restreint la chaîne au lieu de rendre une valeur à redéranger. Les deux ensemble seraient deux
façons de poser la même question, donc deux endroits à corriger le jour où la réponse change. Les
**comportements** que §4.2 exige (`fr`, `en`, `FR`, `de`, chaîne vide, valeur injectée) sont testés :
c'est ce que le document demandait réellement.

**La table `routeSegments` est l'identité, et elle sert quand même.** Elle est le point unique où
un jour de traduction des segments se fera (ADR-0005). La supprimer au motif qu'elle « ne fait
rien » disséminerait la construction d'URL dans les vues.

Huit mutations appliquées, **sept tuées, une survivante assumée** :

| Mutation | Verdict |
|---|---|
| `encodeURIComponent` retiré du slug | tuée |
| Slash final ajouté à `homePath` | tuée |
| `sectionPath` court-circuite `homePath` | tuée |
| Un segment anglais traduit | tuée |
| `isSection` accepte tout | tuée |
| `SECTIONS` perd une section | tuée |
| `LOCALE_NAMES` en exonymes (« Anglais ») | tuée |
| **`segmentFor` ignore la locale** (`routeSegments.fr[section]`) | **survit** |

> La survivante est **indétectable par construction**, et non un trou de test : la table étant
> l'identité en v1, lire la ligne `fr` ou la ligne de la locale demandée donne le même résultat. Le
> jour où un segment est traduit, le test « les segments ne sont pas traduits » devient un test de
> traduction et la mutation meurt d'elle-même. Consigné plutôt que masqué par un test artificiel.

## 9. P3-04 — la complétude est tenue par le compilateur, vue échouer dans les deux sens

`en.ts` est annoté `: Messages`, type dérivé de `fr.ts`. Une clé manquante ou une clé en trop **ne
compile pas** — vérifié en retirant puis en ajoutant une clé :

```text
src/i18n/messages/en.ts(11,14): error TS2741: Property 'ongoing' is missing in type …
src/i18n/messages/en.ts(47,3):  error TS2353: Object literal may only specify known properties,
                                and 'extraneous' does not exist in type …
```

Aucun test ne pourrait faire mieux : `tsc` échoue avant que la suite ne démarre, et un test se
contourne par un `skip`. Les tests couvrent donc ce que le compilateur ne voit pas — une clé
**présente mais vide**, et une traduction restée en français. La seule égalité tolérée est
`site.name`, « Portfolio » étant le même mot dans les deux langues ; toute autre fait rougir la
suite.

## 10. P3-02 — le layout racine descend dans `[locale]`

`src/app/layout.tsx` et `src/app/page.tsx` ont été **supprimés**. Le layout racine est désormais
`src/app/[locale]/layout.tsx`, et c'est ce qui permet à `<html lang>` de porter la langue réelle.
La dette 1 de `phase-1-log.md` §7.4 (« `lang="fr"` codé en dur ») est levée.

`/` n'est donc plus une page mais une redirection, faite par `src/proxy.ts` (§11).

### 10.1 Trois obstacles rencontrés au build, et ce qu'ils apprennent

| Obstacle | Cause réelle | Traitement |
|---|---|---|
| `Cannot read properties of null (reading 'useContext')` au prérendu de `/_global-error` | **Aucun rapport avec le code** : `pnpm build` avait été lancé dans le conteneur de développement, où `NODE_ENV=development`. Next le déconseille explicitement, et React se retrouve en version incohérente | Aucune correction : `make bundle` et `make build` passent déjà `NODE_ENV=production`. C'est mon appel direct qui était fautif |
| `generateStaticParams` refusé par le validateur de routes | Next impose la signature `{ params: { locale: string, slug: string } }` ; la typer `Locale` ne compile pas | Paramètre typé `string`, garde `isLocale` derrière — la garde cesse d'être décorative, elle est ce qui rend ce `string` utilisable |
| `middleware.ts` déprécié | Next 16.3 : *« The "middleware" file convention is deprecated. Please use "proxy" instead. »* | Fichier nommé `proxy.ts` dès l'écriture. Adopter une convention annoncée obsolète serait planifier une migration pour rien |

Un `global-error.tsx` avait été écrit pour traiter le premier obstacle. Une fois la vraie cause
comprise, il a été **retiré** : le build passe sans lui, et les pages d'erreur localisées sont P4-07.
Le garder aurait été du code spéculatif justifié par un diagnostic faux.

### 10.2 Aucune route ne se rend à la demande — et c'est un gate

C'est la dette de la Phase 2 (`phase-2-log.md` §9.4) qui devient réelle : `content/` n'est pas dans
l'image de production, donc une route rendue à la demande chercherait un dossier absent — et
échouerait **chez le visiteur**, jamais au build.

`export const dynamicParams = false` ne suffit pas : un oubli sur une route future ne produirait
aucune erreur visible. `scripts/check-static-rendering.mts` lit les manifestes de `next build` et
exige que chaque route applicative soit prégénérée ou close. Il est branché sur `pnpm build`, donc
son code de sortie est celui du build, dans la CI comme dans la construction de l'image.

**Vu échouer**, en retirant la déclaration du layout :

```text
✗ Rendu à la demande — 4 route(s) :
  /[locale] — se rendrait à la demande (fallback : null). Ajoutez « export const dynamicParams = false ».
  …
```

> Une sonde a montré autre chose : retirer `dynamicParams` de `[locale]/projects/[slug]` **seul** ne
> change rien, la valeur du segment parent étant héritée. Les déclarations des pages de détail sont
> donc aujourd'hui inertes. Elles sont conservées — elles protègent les routes les plus exposées (un
> slug arbitraire) le jour où P4-02 restructurera le layout — mais le fait est consigné plutôt que
> supposé.

## 11. P3-03 — `/` est la seule chose qui ne peut pas être statique

La négociation lit un en-tête de requête. Une page `/` qui la ferait serait la seule route dynamique
du site, dans le dossier même où l'on vient de prouver qu'il n'y en a aucune. `src/proxy.ts` sort ce
cas du graphe de routes : il ne lit aucun contenu, ne s'exécute que sur `/`, et laisse toutes les
autres URL intactes. C'est la « redirection edge » que `architecture.md` §4.2 prévoyait.

Deux détails qui ne s'anticipent pas :

- **307 et non 301.** La cible dépend du visiteur ; une redirection permanente serait mémorisée par
  le navigateur du premier et servie à tous les suivants.
- **`Vary: Accept-Language`.** Sans cet en-tête, Cloudflare — qui est devant ce site
  (`deploy/README.md` §2) — mémoriserait la redirection du premier visiteur et enverrait tous les
  anglophones vers `/fr`. Le mode de panne est silencieux : le site fonctionne, il répond simplement
  dans la mauvaise langue.

### 11.1 Un test a trouvé une erreur de raisonnement, pas une faute de frappe

La première implémentation parcourait les préférences triées par pondération et rendait la locale
par défaut au premier `*` rencontré. Le test écrit pour `en;q=0.1,*;q=1` a échoué — et c'est **le
test** qui avait tort sur ce cas précis. En le vérifiant contre la RFC 9110 §12.5.4, un second cas
est apparu, sur lequel c'était **l'implémentation** qui avait tort :

```text
fr;q=0.1,*;q=0.9   →  attendu « en », rendu « fr »
```

Le joker vaut pour « toute étiquette que les autres domaines ne couvrent pas » : `fr` étant cité
explicitement, il vaut 0,1 ; `en` ne l'étant pas, il hérite de 0,9 et gagne. Le raisonnement correct
se fait **par locale disponible**, pas par préférence — ce que fait la version actuelle.

## 12. P3-06 et P3-07 — la conséquence la plus lourde de la phase

**`SITE_URL` devient un argument de construction.** Toutes les pages de contenu étant statiques,
leurs `canonical`, leurs `hreflang` et le sitemap sont gravés pendant `next build` — qui ne disposait
pas de cette variable, fournie jusqu'ici au seul `docker run`. Le build échouait.

Aucune option ne permet de rester agnostique du domaine (analyse complète dans l'amendement de
l'[ADR-0008](./adr/0008-self-hosted-vps-deployment.md)). La valeur entre donc par `ARG` dans l'étage
`build`, et l'étage `runner` l'inscrit en `ENV` pour que l'image soit auto-descriptive. Elle est
fournie par `docker-compose*.yml` en local et par une variable de workflow en CI — pas par un secret
de dépôt : un domaine public n'est pas un secret, et une valeur versionnée se relit en revue de code.

**Conséquence à ne pas perdre de vue** : l'artefact n'est plus neutre vis-à-vis du domaine. Changer
de domaine impose une reconstruction, pas une variable d'exécution.

### 12.1 `seo → i18n, routing` est confirmée, et `app → seo` ajoutée

La contrainte `seo → i18n, routing` avait été posée **par défaut** en P1-05, faute de métadonnées à
écrire (`phase-1-log.md` §5 bis). Elle est confirmée telle quelle : le module lit le vocabulaire des
locales, construit des chemins, et n'a besoin de rien d'autre. En particulier il **ne lit aucun
fichier** — les locales réellement disponibles lui sont données par l'appelant.

S'y ajoute un écart, de la même famille que `app → scene` en Phase 1 : `architecture.md` §1.2 ne
cite pas `seo` parmi les dépendances d'`app`, alors que §9 du même document fait alimenter
`generateMetadata` — qui ne peut vivre que dans `app` — par cette couche. Sans cette autorisation,
aucune page ne peut porter de `canonical`. **`app → seo` est ajoutée**, et `architecture.md` corrigé.

### 12.2 Une seule fonction répond à « la même page dans l'autre langue »

`localeAlternates` est lue par trois consommateurs qui posent la même question : le `hreflang`, le
sitemap et le sélecteur de langue. S'ils calculaient chacun leur réponse, le jour où l'un dérive, le
`hreflang` annoncerait une page que le sitemap ignore et que le sélecteur n'atteint pas — la panne
exacte que décrit le risque R-07.

Le sélecteur, lui, lit la même source **autrement** : il propose toujours les deux langues, en
pointant vers la page existante la plus proche quand la traduction manque, et en le disant. R-07 vise
ce qu'on **annonce à un moteur de recherche**, pas ce qu'on offre à un visiteur : supprimer le lien
le priverait du seul moyen de changer de langue depuis cette page.

## 13. P3-08 — le sitemap ne peut pas contredire le `hreflang`

Une entrée par **page réellement servie**, et non par entité : `/fr/projects/augure` et
`/en/projects/augure` sont deux pages, c'est le critère de sortie de la phase. Chaque entrée annonce
toutes les versions existantes, y compris la sienne.

L'union des slugs de toutes les locales, jamais leur intersection : une entité qui n'existe qu'en
français doit figurer au sitemap, dans sa langue seulement.

`robots.txt` **n'interdit pas `/resume/`**, et c'est délibéré. Les PDF portent `X-Robots-Tag:
noindex` (Q10 bis) ; les bloquer ici empêcherait le robot de **lire** cet en-tête — une URL bloquée
par `robots.txt` peut être indexée sur la foi de liens entrants, sans que son `noindex` ait jamais
été vu. Les deux mécanismes se contrarient ; seul le second fait ce qu'on veut.

## 14. Ce que les tests ont trouvé, et ce qu'ils ont failli ne pas trouver

### 14.1 Un test E2E qui passait sans rien inspecter

Le test « aucun `hreflang` ne pointe vers une page inexistante » suit réellement chaque lien
alternatif de chaque page du sitemap. Au premier essai, il est passé au vert **sans en avoir inspecté
un seul** : Next sert l'attribut sous la forme `hrefLang="fr"`, en casse mixte, et l'extraction était
sensible à la casse.

Le site est correct — les noms d'attributs HTML sont insensibles à la casse, un navigateur comme un
moteur y lisent bien `hreflang`. C'est l'**outil de vérification** qui était faux, et il l'annonçait
en vert. Corrigé, et doublé d'un compteur : le test échoue désormais s'il n'inspecte pas au moins un
lien par page.

### 14.2 Le gate de bundle mesurait 4 pages sur 20

`scripts/check-bundle-budget.mts` énumérait les pages prérendues avec un `readdirSync` **non
récursif**. Jusqu'en Phase 3 le site n'avait qu'une route, et rien ne signalait qu'il ne descendait
pas. À l'arrivée du segment `[locale]`, il mesurait `/fr` et `/en`, jamais `/fr/projects` ni
`/fr/projects/augure` — une page de détail qui aurait embarqué du JavaScript client serait passée
sous le budget sans être vue.

Constaté en **lisant la sortie du gate** (« Socle partagé par les 4 routes prérendues ») avec 20
pages au build. Corrigé : 18 routes HTML mesurées, toutes à 0,0 Ko de JS propre.

### 14.3 Dix-sept mutations, dix-sept tuées

| Mutation | Verdict |
|---|---|
| `q=0` traité comme une pondération ordinaire | tuée |
| Joker prioritaire sur une mention explicite | tuée |
| Départage par ordre d'écriture supprimé | tuée |
| Une traduction absente devient un chemin quand même | tuée |
| Ordre des alternatives pris sur les locales disponibles | tuée |
| Le filtre du `hreflang` laisse passer les chemins nuls | tuée |
| Repli d'entité vers l'accueil au lieu de sa section | tuée |
| `canonical` construit dans la locale par défaut | tuée |
| Intersection au lieu de l'union des slugs du sitemap | tuée |
| Tri des slugs retiré | tuée |
| Mention d'indisponibilité non associée au lien | tuée |
| `lang` retiré des libellés de langue | tuée |
| « En cours » ignoré | tuée |
| `Vary` retiré de la redirection | tuée |
| Repli ignoré : le sélecteur peut pointer nulle part | tuée |
| Garde de locale supprimée | tuée |
| **`x-default` toujours sur la première alternative** | **survivait → code mort supprimé** |

La dernière a révélé une redondance, pas un trou : les alternatives suivant l'ordre de `LOCALES`,
dont la tête **est** `DEFAULT_LOCALE`, la recherche explicite ne pouvait rien trouver d'autre que le
premier élément. Le code a été simplifié, et la mutation équivalente (`alternates[length - 1]`) est
tuée.

## 15. Mesures

| Mesure | Budget | Relevé |
|---|---|---|
| Socle JS partagé | ≤ 136 Ko (bloquant 146) | **129,5 Ko**, dont +3,5 Ko applicatifs — **inchangé** depuis la Phase 1 |
| JS propre à chaque route | ≤ 25 Ko (bloquant 40) | **0,0 Ko sur les 18 routes** |
| Taille de l'image de production | ≤ 250 Mo (bloquant 400) | **385 Mo**, contre 381 en fin de Phase 2 |
| Couverture `src/i18n/**`, `src/routing/**` | ≥ 95 % | **100 %** sur les quatre métriques |
| Couverture globale | ≥ 80 % | **100 %** |
| Tests | — | **436** (contre 228 en fin de Phase 2) |
| Pages prégénérées | — | 18 pages HTML + `sitemap.xml` + `robots.txt`, **aucune route à la demande** |

> ⚠️ **+4 Mo sur l'image, et une marge qui se réduit.** Le responsable est le runtime du proxy, seul
> ajout à la trace de production. Il reste 15 Mo sous le seuil bloquant, et `phase-2-log.md` §13.3
> annonce ~7 Mo de runtime MDX à la première page qui rend un corps, en Phase 4 — soit ~392 Mo. La
> marge sera alors de 8 Mo. À surveiller en P4-05, et non à découvrir.

## 16. Couverture : une exclusion ajoutée, et pourquoi ce n'en est pas une fraude

`testing-strategy.md` §6 excluait déjà `src/app/**/layout.tsx` (« composition seule ») et
`src/scene/components/**` (« couvert par E2E »). S'y ajoutent les **routes de l'App Router** —
`page.tsx`, `sitemap.ts`, `robots.ts` — pour la conjonction des deux mêmes raisons.

Ce qui rend l'exclusion honnête est ce qui a été fait **pour** la rendre honnête :

- toute décision à branches a été **sortie** des routes. C'est l'origine de `src/ui/date-range.tsx`,
  qui porte le cas « en cours », et de `entitySitemapPages`, qui porte l'union des slugs ;
- ce qui reste est de la composition : lire le dépôt, passer les données à des modules couverts à
  100 % (`languageOptions`, `pageMetadata`, `buildSitemap`, les composants de `src/ui`) ;
- les routes sont exercées par les E2E **contre l'image de production**, ce qu'un rendu jsdom ne
  ferait pas ;
- les couvrir en Vitest supposerait de leur faire lire `content/`, ce que le garde-fou
  d'indépendance des fixtures interdit (P2-09) : un test de page casserait dès que P2-11 réécrit un
  projet.

## 17. Bilan de la Phase 3

### 17.1 Fait

**Neuf tâches sur neuf** (P3-01 à P3-09).

| Critère de sortie | État |
|---|---|
| `/fr/projects/augure` et `/en/projects/augure` résolus indépendamment, prouvé par test | ✅ intégration sur fixtures (`tests/integration/locale-resolution.test.ts`) **et** E2E contre l'image de production |
| Aucun `hreflang` vers une page inexistante | ✅ unitaires sur `localeAlternates`, **et** un E2E qui suit réellement chaque lien alternatif de chaque page du sitemap |
| Sitemap exact | ✅ unitaires sur `buildSitemap`/`entitySitemapPages`, **et** un E2E qui vérifie qu'aucune URL du sitemap ne renvoie autre chose que 200 |
| Couverture ≥ 95 % sur `i18n` et `routing` | ✅ **100 %** sur les quatre métriques |
| *(hérité de la Phase 2)* aucune route rendue à la demande | ✅ gate branché sur `pnpm build`, **vu échouer** |

**436 tests**, `make ci` vert, 17 mutations appliquées au code de production et toutes tuées.

**Ce que je retiens** : les trois défauts réels de cette phase ont été trouvés en **lisant la sortie
d'un outil**, pas en relisant du code — un test E2E qui passait sans rien inspecter, un gate de
bundle qui mesurait 4 pages sur 20, et une négociation de langue dont le premier jet était faux sur
un cas que la RFC décrit explicitement.

### 17.2 Dérives assumées

| # | Dérive | Traitement |
|---|---|---|
| 1 | **`SITE_URL` devient un argument de construction** | Conséquence inévitable du tout-statique. Trois options pesées, ADR-0008 amendé, journal des révisions à jour (§12) |
| 2 | **`app → seo` ajoutée au graphe** | Même omission que `app → scene` en Phase 1 : §1.2 contredisait §9. `architecture.md` corrigé, règle ESLint mise à jour (§12.1) |
| 3 | **`src/proxy.ts` et non `src/middleware.ts`** | Convention `middleware` dépréciée par Next 16.3, annoncée au build (§10.1) |
| 4 | **`parseLocale` non créé** | `isLocale` rend le même service sous une forme utilisable. Comportements exigés par `testing-strategy.md` §4.2 tous testés (§8) |
| 5 | **Routes de l'App Router exclues de la couverture** | Avec le travail qui rend l'exclusion honnête : toute logique à branches en a été sortie (§16) |
| 6 | **`src/app/layout.tsx` et `src/app/page.tsx` supprimés** | Le layout racine descend dans `[locale]` : c'est ce qui permet à `<html lang>` d'être vrai. Dette 1 de `phase-1-log.md` §7.4 levée |

### 17.3 Reporté

| Sujet | Cause | Reprise |
|---|---|---|
| **Gabarit de titre** (`%s — Portfolio`) | Suppose de décider l'identité de marque du site | P4-08, avec OpenGraph |
| `aria-current` sur le lien de section actif | Le layout ne connaît pas la section affichée ; le lui apprendre demande de le restructurer | P4-02 |
| Mise en forme des dates (« mars 2022 ») | Suppose de choisir une précision d'affichage, laissée au rendu par P2-02 | P4-04, P4-05 |
| **Corps MDX des pages de détail** | L'ADR-0010 décide comment ses composants sont mis en forme | P4-05 — et c'est là que les ~7 Mo de runtime MDX entreront dans l'image |
| Pages 404 et erreur localisées | Next sert ses pages par défaut ; suffisant pour une phase sans style | P4-07 |
| Navigation client (`next/link`) | Aujourd'hui des `<a>` : 0 Ko de JS et un profil `no-js` vrai par construction | P4-02, avec une mesure |

### 17.4 Dette technique connue, tracée

1. **`SITE_URL` a deux sources en production.** L'`env_file` de Compose l'emporte sur l'`ENV` de
   l'image : si `/srv/portfolio/.env` portait une autre origine, le site servirait des canoniques
   d'un domaine et des liens d'exécution d'un autre. **À vérifier dans la checklist de P4-13.**
2. **`dynamicParams = false` des pages de détail est inerte**, la valeur du segment parent étant
   héritée (§10.2). Conservé comme protection d'une restructuration future, mais ce n'est pas ce qui
   protège aujourd'hui — c'est le gate.
3. **La marge sous le seuil d'image se réduit** : 385 Mo, 15 Mo de marge, ~7 Mo attendus en Phase 4.
4. **Le contenu de `content/` est parfaitement symétrique** : le cas « entité non traduite » n'existe
   que dans les fixtures. C'est correct — mais cela veut dire qu'aucun E2E ne peut l'exercer tant que
   P2-11 n'aura pas produit une entité réellement non traduite.

---

## 18. Revue avant push — ce que `/code-review` a trouvé

Rituel du projet, appliqué avant de pousser : cinq défauts, tous réels.

| # | Défaut | Ce qu'il cassait |
|---|---|---|
| 1 | `Accept-Language` : le **nom** du paramètre de pondération comparé en casse sensible | `fr;Q=0.1, en;Q=0.9` rendait `fr`. Les deux entrées héritaient de la pondération maximale, et l'ordre d'écriture décidait à la place du visiteur. La RFC 9110 §5.6.6 rend ce nom insensible à la casse |
| 2 | `Number('')` vaut **0**, pas `NaN` | Un `;q=` tronqué passait le garde-fou et signifiait « surtout pas cette langue » — une **interdiction déduite d'une faute de frappe**. Latent aujourd'hui, observable dès qu'une troisième locale existe |
| 3 | Un **octet NUL brut** dans `negotiate.test.ts` | `file` classait le fichier en `data` : git le traitait comme **binaire**, donc indiffable en revue et infusionnable en cas de conflit |
| 4 | Le sitemap omettait le `x-default` que les métadonnées émettaient toujours | Les deux canaux disent la même chose au même moteur de recherche, et **avaient déjà divergé** — alors que les deux fichiers documentaient l'invariant inverse |
| 5 | `language.current` et `nav.home` jamais rendus | Deux clés traduites que rien n'affiche : un coût de traduction sans contrepartie, et l'illusion qu'un besoin d'accessibilité est traité |

Les deux premiers sont des **erreurs de lecture de spécification**, la classe que la phase avait
déjà rencontrée sur le joker `*` (§11.1). Le quatrième est le plus instructif : la promesse
« une seule source pour trois consommateurs » (§12.2) était tenue pour *quelles* langues annoncer,
et pas pour *comment* les annoncer — la carte `hreflang` était construite deux fois.

Correctifs, chacun à la profondeur du mécanisme et non du symptôme :

- la carte des langues devient **une seule fonction** (`src/seo/hreflang.ts`), que les métadonnées et
  le sitemap appellent tous les deux. Le `x-default` n'est pas « ajouté au sitemap » : la seconde
  construction est **supprimée**. Un test compare désormais les deux sorties sur cinq combinaisons de
  locales disponibles, et échouerait à la prochaine divergence ;
- les deux clés mortes sont retirées, et le dictionnaire porte la règle : aucune clé n'est écrite en
  prévision d'un usage.

## 19. Ce que `/simplify` a corrigé

Quatre agents (réutilisation, simplification, efficacité, altitude). Les trois premiers ont convergé
sur le même résidu, et le quatrième a trouvé ce que personne d'autre n'avait vu.

### 19.1 Le constat le plus profond : les gates se gardaient du zéro, jamais du sous-comptage

Les trois gates du dépôt portaient la même sentinelle — « si je n'ai rien trouvé, j'échoue ». Or le
défaut réellement rencontré cette phase-ci était un sous-comptage **non nul** : 4 pages mesurées sur
20 (§14.2). Aucune des trois sentinelles ne l'aurait vu, et le `{ recursive: true }` ne corrigeait
que l'instance.

Deux confrontations remplacent désormais la comparaison à zéro, chacune **vue échouer** :

| Gate | Ce qu'il confronte | Sonde |
|---|---|---|
| `check-bundle-budget` | pages HTML mesurées **contre** pages déclarées par le manifeste de Next | parcours redevenu non récursif → *« 4 page(s) HTML mesurée(s) pour 18 déclarée(s) »* |
| `check-static-rendering` | pages prégénérées publiques **contre** URL du sitemap | une section retirée du sitemap → *« /fr/projects/augure — prégénérée mais absente du sitemap »* |

La seconde ferme un trou qui n'avait été identifié par personne : l'E2E vérifiait le sens
**sitemap → routes** (chaque URL répond 200) mais jamais **routes → sitemap**. Le jour où une section
gagne des pages de détail sans entrer dans `SECTIONS_WITH_DETAIL`, elles seraient absentes de l'index
**et** invisibles au test de R-07, qui ne parcourt que les URL du sitemap — les deux trous se
composent.

### 19.2 Le gate qui protège la production n'était pas testable

`check-static-rendering.mts` codait `.next` en dur, alors que `check-content.mts` prend sa racine en
argument **précisément** pour être exécuté contre des arbres fautifs par
`tests/integration/content-gate.test.ts`. Le seul échec observé du nouveau gate était une capture de
texte dans ce journal — une observation non rejouable, pour le mécanisme qui protège toute la
production.

Il prend désormais sa racine en argument, et `tests/integration/static-rendering-gate.test.ts`
l'exécute en sous-processus contre dix manifestes fabriqués, en constatant son code de sortie.

### 19.3 Le résidu du refactor `hreflang`, signalé par trois agents sur quatre

La consolidation de §18 avait laissé `buildSitemap` appeler `translatedAlternates` **après**
`hreflangMap`, qui l'appelait déjà : les URL du sitemap et sa carte de langues étaient reconstruites
par deux chemins qui devaient rester d'accord sans que rien ne l'impose. C'est la divergence qu'on
venait de fermer, un niveau plus bas.

`localeLinks` rend maintenant **les deux lectures dont ses appelants ont besoin** — la carte et les
pages —, ce qui rend le couplage structurel. Coût mesuré du calcul en double : 2,2 µs par build, donc
corrigé pour la forme et non pour la vitesse.

### 19.4 `availableLocales` reposait sur la discipline de l'appelant

Le défaut `= LOCALES` était juste pour l'accueil et les sections, et **faux pour toute entité**.
L'omettre sur une page de détail n'aurait produit ni erreur de type ni échec de test : simplement un
`hreflang` vers une traduction absente, la panne exacte que toute cette chaîne existe pour empêcher.

Le paramètre est devenu **obligatoire** partout. L'accueil et les sections passent `LOCALES`
explicitement — ce qui est une affirmation, pas un défaut. L'oubli coûte désormais une erreur de
compilation ; il en a d'ailleurs produit cinq à l'application du changement, toutes dans les tests.

### 19.5 Ce que les routes portaient encore

| Constat | Correctif |
|---|---|
| Le type des `params` recopié **sept fois** | `LocaleParams` / `EntityParams` exportés par `locale-param.ts` — le contrat de Next change de forme environ une fois par version majeure |
| `generateStaticParams` dupliqué à l'identique, les deux copies se renvoyant l'une à l'autre en commentaire | `staticSlugParams(params, list)`, testé |
| Trois `generateMetadata` de section identiques, où le nom de la section figurait **deux fois sans lien** — écrire `projects` dans l'emplacement et lire `skills` dans les messages compilait | `sectionMetadata(section)` dérive les deux d'un seul argument |
| Le test du critère de sortie **réimplémentait** la composition des métadonnées, avec un commentaire l'avouant — il serait resté vert si la page avait cessé de passer `getContentLocales` | `entityMetadata(repository, …)` extrait ; le test appelle le code que les pages appellent |
| `isSection` sans consommateur de production | supprimé, avec ses onze lignes de test |
| `fallbackPath` recalculé par un double ternaire alors qu'il **est** `path` quand la page existe | `path ?? pathFor(…)` |
| `LocaleAlternate & { path: string }` écrit trois fois dans une seule signature | `TranslatedAlternate`, le vocabulaire central de R-07 |
| L'extraction des `<loc>` du sitemap recopiée trois fois en E2E | `sitemapPaths()`, dans le fichier même qui documente la panne d'un extracteur fautif |
| 84 requêtes HTTP séquentielles pour 17 URL distinctes en E2E | `Promise.all` et déduplication des cibles — le coût était linéaire en volume de contenu |
| `src/seo/**` absent des modules critiques de couverture, alors que la phase y a déplacé la vérité de R-07 | seuil à 95 % ajouté (relevé : 100 %) |
| Trois listes doivent s'accorder (`CONTENT_TYPES`, `SECTIONS`, `Messages['sections']`), une seule paire verrouillée | le test d'intégration existant couvre les trois |

### 19.6 Constats refusés, et pourquoi

- **Mutualiser les constantes de test** (`SITE`, `HOME`, `SECTION`, `ENTITY`, déclarées dans trois
  fichiers). L'agent de simplification le déconseille explicitement — trois littéraux d'une ligne,
  l'indirection coûterait plus que la duplication. Les fabriques de `tests/fixtures/builders/`
  n'ont rien à y faire : ces tests portent sur des **props de présentation**, pas sur des entités.
- **Un `scripts/support/gate.mts` partagé.** L'agent qui le propose le classe lui-même en dernier :
  les trois gates diffèrent réellement dans ce qu'ils inspectent, et §19.1 traite la substance du
  problème — la force de la sentinelle, pas sa duplication.
- **Un `getAll(type, locale)` générique sur le dépôt**, qui supprimerait la table `LIST_BY_SECTION`.
  La table est `satisfies`-gardée donc exhaustive par construction, et un accesseur générique
  rendrait un type union qui perdrait les normalisations par type. Arbitrage délibéré, pas défaut.
- **Quatre optimisations mesurées sous le bruit** : revalidation Zod à chaque appel du dépôt
  (0,4–1,1 ms par build), sections du sitemap en série (0 ms à chaud), double appel au dépôt par page
  de détail (aucune E/S, la lecture est mémoïsée), allocations de `governing()` sur le chemin chaud
  (0,12–1,05 µs par requête). Conformément à ce que la Phase 2 a établi, on ne fait rien — mais deux
  **déclencheurs chiffrés** sont consignés ci-dessous.

### 19.7 Déclencheurs chiffrés, à ne pas redécouvrir

- **Revalidation Zod** : le coût est quadratique en nombre d'entités par section (≈ 120·N² µs). À
  N=2, 0,5 ms ; à N=20, ~50 ms ; à N=50, ~300 ms ; à N=100, ~1,2 s. **Le point où cela mérite un
  regard est ~50 entités par section**, pas avant. Mémoïser la validation, et pas seulement la
  lecture, sera alors le correctif.
- **Cascade E2E** : le contrôle de R-07 suit les `hreflang` de chaque page du sitemap. La
  déduplication et la parallélisation appliquées ici tiennent jusqu'à quelques centaines d'URL ; à
  ~50 entités par section, le sitemap en compte ~200 et ce seul test redeviendra le plus long de la
  suite.

### 19.8 Une instabilité observée, et sa cause

Une exécution de `make e2e` a échoué sur trois tests, puis les mêmes ont passé sans modification.
La cause est le **serveur de développement**, qui compile les routes à la demande : la première
requête vers une route jamais visitée peut dépasser le délai d'attente. `make e2e-prod` — celui de
`make ci`, contre l'image de production — est stable et boucle les 50 tests en 4 s. C'est aussi ce
que `testing-strategy.md` §8 désigne comme la vérification qui fait foi. Consigné plutôt que traité :
le correctif serait un préchauffage des routes, qui ne prouverait rien de plus.
