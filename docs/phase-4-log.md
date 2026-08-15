# Journal de la Phase 4 — Portfolio HTML

> Ouverte le 2026-08-15.
> Ce document consigne, **au fil de l'eau**, les décisions prises pendant la phase, les mesures
> relevées et les écarts par rapport aux documents de Phase 0. Le bilan final le clôt.
> Les statuts des tâches restent dans [`roadmap.md`](./roadmap.md), seule source de vérité.

---

## 1. Objectif

Un portfolio **complet et utilisable sans Three.js**. C'est le socle de tout le reste, le filet de
sécurité permanent du projet, et le jalon **T1** : à la fin de cette phase, le site est en ligne,
supervisé, avec un rollback prouvé.

Ce que la phase fait, que les précédentes n'ont pas fait : elle **met en forme**. Les pages de la
Phase 3 sont structurelles — elles prouvent qu'une route résout la bonne entité dans la bonne
langue, et rien de plus. Aucune n'est présentable, aucune ne rend le corps MDX de son entité.

Ce que la phase ne fait pas : aucune scène, aucune dépendance Three.js dans le dépôt (c'est un
critère de sortie), aucun formulaire de CV (Phase 10 — P4-13 met en ligne un site dont la page de
contact n'existe pas encore, et c'est assumé : le CV est déjà téléchargeable en PDF).

## 2. Contexte d'ouverture — ce qui existe et ne doit pas être refait

| Acquis | Origine | Conséquence pour la phase |
|---|---|---|
| **Contenu réel** : 2 expériences, 1 projet, 40 compétences par locale | P2-11 | Le chemin critique de T1 est levé. Les pages ont de quoi être jugées sur du vrai |
| Content Layer complet, tris et dérivations **dans la couche** | P2-05, P2-06 | Une vue qui trie elle-même est un défaut, pas une commodité |
| `src/ui/` : `SiteNav`, `LanguageSwitcher`, `EntityList`, `DateRange` — testés, **sans style** | P3-02, P3-09 | On les habille, on ne les réécrit pas |
| `src/seo/` : `pageMetadata`, `hreflang.ts` **seule** construction de la carte des langues | P3-06, P3-07 | P4-08 et P4-09 s'y branchent, ne créent pas un second chemin |
| Rendu MDX (`src/ui/mdx/`), liste blanche qui refuse **avant** de rendre | P2-08 | **Aucune page ne l'appelle encore** : P4-05 est la première |
| Quatre gates branchés sur `pnpm build` / `make ci`, tous **vus échouer** | P1 → P3 | Ils ne se gardent plus du zéro mais du sous-comptage |
| Site déployé, derrière Cloudflare Access depuis le 2026-08-15 | P1-15 | P4-16 suppose de lever Access — c'est une étape de la mise en ligne, pas un préalable au code |

Trois chiffres à ne pas découvrir :

- **image de production à 385 Mo**, seuil bloquant 400 — soit **15 Mo de marge**, dont ~7 Mo
  attendus en P4-05 avec le runtime MDX ;
- **0,0 Ko de JS propre sur 16 routes**, socle partagé 129,5 Ko — le profil `no-js` est vrai *par
  construction*, la navigation étant faite de balises `<a>` ;
- **436 tests**, couverture 100 % globale.

## 3. Décisions prises à l'ouverture

| # | Décision | Tâche | Statut |
|---|---|---|---|
| 1 | **Stratégie de style** : CSS Modules + tokens en variables CSS | P4-01 | **Tranchée** — [ADR-0010](./adr/0010-styling-strategy.md) |
| 2 | **Identité de marque** : le site s'appelle « Aurélien Feignon » | P4-02, P4-08 | **Appliquée** en P4-02 (§3.1, §7.2) |
| 3 | Navigation client (`next/link`) ou balises `<a>` | P4-02 | **Tranchée par la mesure** : balises `<a>` (§7.3) |
| 4 | Précision d'affichage des dates (« mars 2022 ») | P4-04, P4-05 | À trancher au rendu, reporté de P2-02 |
| 5 | Composants MDX ajoutés à la liste blanche | P4-05 | Dépend de la décision 1, donc pas avant |

### 3.1 L'identité de marque, et ce qu'elle change

Le dictionnaire portait, à l'ouverture de la phase, `site.name = "Portfolio"`, valeur d'attente de la
Phase 3. Elle devient **« Aurélien Feignon »** — appliqué en P4-02, voir §7.2 : c'est le nom que cherche un recruteur, celui du domaine, et
celui qui doit figurer dans le gabarit de titre (`%s — Aurélien Feignon`, reporté en P4-08) comme
dans les données structurées `Person` (P4-09).

Conséquence immédiate, à ne pas manquer : `site.name` est **un nom propre**, donc identique dans
les deux locales. Le test de non-régression des dictionnaires refuse les valeurs identiques entre
`fr` et `en` — il tolérait déjà `site.name` comme seule exception, pour « Portfolio ». L'exception
reste, sa justification change et doit être réécrite.

## 4. Tâches et tests correspondants

| Tâche | Ce qu'elle livre | Ce qui le prouve |
|---|---|---|
| P4-01 | ADR-0010 : stratégie de style | L'ADR précède le premier composant stylé — pas de style écrit avant |
| P4-02 | Layout documentaire : en-tête, navigation, pied de page, lien d'évitement | Composants : `aria-current` sur la section active ; E2E : le lien d'évitement mène au `main` |
| P4-03 | Accueil : présentation et accès aux trois sections | Composants : les trois sections atteignables ; un seul `h1` |
| P4-04 | Liste et détail des expériences | Composants : dates mises en forme, poste en cours, réalisations |
| P4-05 | Liste et détail des projets, **corps MDX rendu** | Intégration : un corps MDX est rendu ; **mesure de l'image avant / après** |
| P4-06 | Compétences groupées par catégorie | Composants : cinq catégories, ordre stable, état vide |
| P4-07 | Pages 404 et erreur, localisées | E2E : `/fr/projects/inconnu` rend une 404 en français avec des liens de secours |
| P4-08 | Gabarit de titre, OpenGraph, images de partage | Unitaires : `%s — Aurélien Feignon` ; E2E : `og:image` servie et dimensionnée |
| P4-09 | JSON-LD `Person`, `WebSite`, `CreativeWork`, `BreadcrumbList` | Unitaires sur la sérialisation ; E2E : JSON valide et parsable |
| P4-10 | Passe accessibilité : titres, focus, contrastes, points de repère | axe-core sur les cinq types de page, 0 violation serious/critical |
| P4-11 | Responsive documentaire | E2E `mobile-safari` : aucun débordement horizontal, cibles tactiles |
| P4-12 | E2E : navigation complète, deep links, bascule de langue, clavier | E2E-01, E2E-02, E2E-03, E2E-08, E2E-12 de `testing-strategy.md` §4.7 |
| P4-13 | Mise en production (jalon T1) | La CI verte sur `main` fait foi (`deploy/README.md` §4.2) |
| P4-14 | Supervision : healthcheck + sonde externe avec alerte | Une alerte **reçue**, provoquée par un arrêt volontaire |
| P4-15 | Checklist de mise en ligne + rollback en conditions réelles | Rollback **exécuté**, comme en P1-15 |
| P4-16 | Vérification post-déploiement, Access levé | `canonical`, `hreflang`, sitemap et `robots.txt` observés **depuis l'extérieur** |

## 5. Ordre de travail

Prévu : P4-01 → P4-02 → P4-03 → P4-04 → P4-06 → P4-05 → P4-07 → P4-08 → P4-09 → P4-10 → P4-11 →
P4-12 → P4-13 → P4-14 → P4-15 → P4-16.

Deux écarts par rapport à l'ordre des identifiants, dictés par les dépendances réelles :

- **P4-06 avant P4-05.** Les compétences n'ont pas de page de détail et ne rendent aucun corps MDX :
  elles closent la mise en forme des listes avant qu'on ouvre le seul sujet à risque de la phase.
- **P4-05 isolé, et mesuré.** C'est la première page qui compile un corps MDX, donc celle qui fait
  entrer ~7 Mo de runtime dans une image qui n'a que 15 Mo de marge. Elle est traitée seule, avec
  une mesure avant et après, pour que le chiffre soit attribuable.

Le **gabarit de titre** (P4-08) est avancé au moment où `site.name` change, en P4-02 : toutes les
métadonnées en dépendent, et le poser après aurait voulu dire réécrire chaque test de titre.

## 6. Critères de sortie (rappel, `roadmap.md`)

- [ ] Toutes les exigences de la §20 de la mission satisfaites.
- [ ] Lighthouse mobile ≥ 85, **a11y 100**, **SEO 100**.
- [ ] 0 violation axe `serious`/`critical`.
- [ ] Le projet E2E `no-js` passe.
- [ ] **Aucune dépendance Three.js dans le dépôt** à ce stade.
- [ ] **Site en ligne, supervisé, avec un rollback prouvé.**

S'y ajoutent deux vérifications héritées, qui deviennent réelles ici :

- [ ] L'image de production reste **sous 400 Mo** après l'entrée du runtime MDX (P4-05).
- [ ] `SITE_URL` : l'`ENV` de l'image et l'`env_file` de Compose **coïncident** (P4-15).

## 7. P4-02 — le layout documentaire

### 7.1 Là où l'en-tête ne pouvait pas vivre

`aria-current` sur le lien de la section active était reporté de la Phase 3 avec une raison exacte :
*« le layout ne connaît pas la section affichée »*. Deux mécanismes existent pour la lui donner, et
**aucun des deux n'est fermé pour la même raison** — la distinction compte, parce qu'un absolu
inexact invite la session suivante à croire le raisonnement erroné :

- `useSelectedLayoutSegment` **existe** et fait exactement cela. Il impose un **composant client**,
  donc du JavaScript sur les 16 routes : c'est la fin des 0,0 Ko et du profil `no-js` vrai *par
  construction*, qui est la contrainte 1 de l'ADR-0010. Le refus est **chiffré**, pas de principe.
- `headers()` est fermé autrement : la route deviendrait **dynamique**, ce que
  `scripts/check-static-rendering.mts` refuse — et `content/` étant absent de l'image de production,
  elle échouerait **en production**, jamais au build.

⚠️ La première rédaction de ce paragraphe affirmait que « l'App Router ne donne pas cette information
à un layout ». C'est faux tel quel, et la revue l'a relevé.

La seule source honnête restante est **l'arborescence des routes** : chaque section a désormais son
layout, et chacun n'a qu'une valeur possible à déclarer. L'accueil a reçu un **groupe de routes**
`(home)` — des parenthèses, donc aucun segment d'URL ajouté — pour être sur le même plan que les
trois autres. L'alternative, laisser la page d'accueil rendre son propre en-tête, aurait mis deux
mécanismes pour une seule chose et chargé la page de P4-03 d'une responsabilité de layout.

⚠️ **Un composant vert ne prouve pas un layout juste.** `SiteHeader` sait marquer une section ; que la
*bonne* valeur lui parvienne se décide ailleurs, dans quatre fichiers qui pourraient chacun se
tromper sans qu'aucun test de composant ne bouge. D'où un parcours E2E qui visite **deux** sections
plutôt qu'une : une seule page ne peut pas distinguer « le layout déclare la bonne valeur » de « tous
les layouts déclarent la même ».

⚠️⚠️ **Un parcours E2E ne garde que les sections qu'on a pensé à lui nommer**, et rien ne reliait
cette arborescence de fichiers à `SECTIONS`. Une quatrième section aurait reçu son lien, sa route et
son entrée au sitemap — et, faute d'un `layout.tsx` écrit à la main, **une page sans en-tête du
tout**, tous gates verts. `tests/integration/every-section-declares-its-place.test.ts` garde
désormais cet accord. Relevé par la revue, pas par la conception.

⚠️⚠️⚠️ **Ce garde a d'abord été écrit en lisant le texte source** (`current="…"` par expression
régulière), et c'était le mauvais niveau : il rougissait sur un reflow de Prettier ou un
`current={PLACE}` **sans qu'il y ait de défaut**, et verdissait sur la même chaîne laissée dans un
commentaire. Il **appelle** maintenant chaque layout et lit la valeur réellement transmise à
`PlaceLayout` — insensible à la syntaxe. Vérifié par mutation, dans les deux sens : un layout qui
déclare la section du voisin fait rougir, une écriture `current={'skills'}` ne fait pas rougir alors
que la version par expression régulière l'aurait fait.

⭐ **L'exhaustivité, elle, n'est pas dans le test : elle est dans le compilateur.** La table des
layouts est un `Record<CurrentPlace, …>`, et `CurrentPlace` dérive du dictionnaire d'interface —
ajouter une section élargit le type et `tsc` refuse la table incomplète, **avant** que la suite ne
démarre. Un test se contourne par un `skip`, pas `tsc`.

### 7.1 bis — `aria-current` : `true`, et non `page`

Le layout d'une section couvre **aussi ses pages de détail**. Sur `/fr/projects/portfolio`, un
`aria-current="page"` sur le lien « Projets » annoncerait « page courante » sur un lien qui mène
ailleurs — ce que cette valeur affirme précisément, et à tort. C'est `true`, « l'élément courant du
groupe », qui est vrai dans les deux cas.

La valeur plus précise serait accessible au prix de six layouts au lieu de quatre — un groupe de
routes pour distinguer liste et détail dans chacune des deux sections qui ont un détail. Le coût
structurel dépasse le gain : `page` reste réservé à la **marque**, sur l'accueil, où le lien désigne
bien la page affichée. Un parcours E2E visite une page de détail et vérifie qu'aucun
`aria-current="page"` n'y apparaît. Relevé par la revue.

### 7.2 L'identité de marque, appliquée

`site.name` vaut « Aurélien Feignon » dans les deux locales. L'exception du test de non-régression
des dictionnaires est **maintenue et sa justification réécrite** : elle tolérait « Portfolio », un mot
qui se trouvait commun aux deux langues ; elle tolère maintenant un **nom propre**, ce qui la rend
structurelle au lieu de fortuite.

Trois assertions E2E nommaient « Portfolio » (fumée, `no-js`, `no-webgl`) et sont devenues rouges.
C'est le comportement attendu d'un test qui vérifie une valeur décidée, et elles ont été mises à jour
— pas affaiblies.

Décidé au passage, plutôt que subi : **la marque est le lien d'accueil, et il n'y a pas de second
lien « Accueil »**. La clé `nav.home`, retirée en Phase 3 faute d'usage, ne revient donc pas. Doubler
la cible aurait coûté une clé de dictionnaire et fait annoncer deux fois la même page par un lecteur
d'écran. Le texte visible **est** le nom accessible — aucun `aria-label` ne vient le remplacer, ce
qu'interdit WCAG 2.5.3.

### 7.3 Ce que le layout coûte — décision 3, tranchée par la mesure

La consigne de la Phase 3 était « mesure d'abord ». `next/link` **n'a pas été introduit** : rien dans
cette tâche ne le demandait, et la navigation reste faite de balises `<a>`.

| Relevé après P4-02 | Valeur | Seuil |
|---|---|---|
| JS propre à chaque route | **0,0 Ko** sur 16 routes | cible 25 Ko · bloquant 40 Ko |
| Socle partagé | **129,5 Ko — inchangé** | cible 136 · bloquant 146 |
| CSS produit | **2 693 octets**, 2 fichiers statiques immuables | — |
| Pages prégénérées | 16, aucune à la demande, toutes au sitemap | — |
| Violations axe serious/critical | **0** (74 tests E2E verts sur 5 profils) | 0 |

Le profil `no-js` reste donc vrai **par construction** et non par vérification. La décision se rouvre
le jour où une tâche aura besoin d'une navigation client — pas avant, et pas sans une nouvelle
mesure.

### 7.4 Ce qui reste ouvert, et n'a pas été traité ici

**Le sélecteur de langue reste rendu par chaque page**, et non par le chrome. Ses options dépendent de
la page affichée (`languageOptions(LOCATION, …)`) : un layout, qui ne la connaît pas, ne peut pas le
rendre. Les six types de page le portent déjà depuis P3-09, et le profil `no-js` s'en sert pour
changer de langue depuis `/fr/projects` — il n'y a donc **pas** de page sans sélecteur. Ce qui reste
ouvert n'est pas une lacune mais un choix de **placement** : aujourd'hui à l'intérieur du `main`, ce
qui est inhabituel pour une commande de portée globale. À trancher en P4-04 à P4-06, avec les
gabarits.

> ⚠️ Ce paragraphe affirmait d'abord l'inverse — « le sélecteur n'est présent que sur l'accueil » —
> écrit après n'avoir lu que la page d'accueil, et corrigé par la revue avant le push. Consigné
> plutôt qu'effacé : c'est exactement le genre d'affirmation qu'un journal de phase transmet intacte
> à la session suivante.

Le pied de page ne porte, lui, que la mention de droits. Les liens qu'on y attendrait n'existent pas
encore : la page de contact est en Phase 10, et une clé de dictionnaire traduite que rien ne rend est
précisément ce que `fr.ts` interdit.

**Écarté, et pourquoi.** La revue a proposé une refonte plus profonde : le chrome rendu par les
**pages** à partir du `PageLocation` qu'elles déclarent déjà, ce qui supprimerait les quatre
déclarations de layout — et avec elles la classe de panne qu'elles créent, une page manquante n'étant
pas une route alors qu'un layout manquant est une page sans en-tête. L'argument est juste. Il est
écarté ici parce qu'il déplace le chrome dans six fichiers de page au lieu de quatre layouts, qu'il
rouvre le traitement du 404 (P4-07), et que la classe de panne est **déjà gardée** par un test
exhaustif tenu par le compilateur. À reconsidérer si P4-07 ou la Phase 5 fait bouger cette frontière.

### 7.5 Ce que la revue a changé

Le rituel du dépôt — `/code-review` puis `/simplify` avant chaque push — a trouvé neuf défauts réels
sur un travail dont tous les gates étaient déjà verts. Trois méritent d'être retenus au-delà de leur
correctif :

1. **Un `aria-current="page"` faux sur les pages de détail.** Le layout couvre la section entière ;
   la valeur juste dans tous les cas est `true` (§7.1 bis).
2. **Un garde qui lisait une syntaxe qu'il ne possède pas** — faux positifs et faux négatifs
   symétriques (§7.1).
3. **Une affirmation fausse dans ce journal même** : le sélecteur de langue était donné pour absent
   de cinq pages sur six, alors qu'il y est depuis P3-09 (§7.4). Écrit après n'avoir lu qu'une page.

Le reste était de la réutilisation manquée, et le dépôt le disait déjà lui-même : l'extraction du
sitemap dans les parcours E2E portait le commentaire *« écrit une fois : l'extraction était recopiée
trois fois »* — et P4-02 en écrivait une quatrième copie. Elle vit maintenant dans
`tests/e2e/support/sitemap.ts`, avec la déduction d'une page de détail. Les liens de section des
tests de composants ont rejoint `tests/fixtures/builders/`, et le cadrage horizontal partagé par
l'en-tête et le pied de page est devenu `container.module.css` — avant que les gabarits de P4-03 à
P4-06 n'en fassent une troisième et une quatrième copie.

⭐ Un dernier point, mineur en taille et net en principe : `globals.css` portait un `body > main`,
c'est-à-dire le seul sélecteur du fichier visant du balisage possédé par un autre. C'est exactement
ce que la règle 3 de l'ADR-0010 exclut, et le mode de panne est silencieux — une page qui
envelopperait son `<main>` perdrait le pied de page collé, sans erreur. Le layout style désormais la
boîte qu'il possède.
