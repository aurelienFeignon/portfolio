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
| 4 | Précision d'affichage des dates (« mars 2022 ») | P4-04, P4-05 | **Tranchée : l'année** (§9.1) |
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

## 8. P4-03 — l'accueil

### 8.1 Doubler la navigation, à une condition

L'accueil donne accès aux trois sections que l'en-tête liste déjà. Ce doublon n'est pas un oubli : un
visiteur qui arrive ne doit pas avoir à lire une barre pour savoir ce que le site contient. Mais il
n'est défendable qu'à une condition, et c'est elle qui a décidé de la forme : **`SectionGuide` dit ce
que chaque section contient**, là où la navigation la nomme seulement. Sans cette différence, ce
serait une seconde barre, et les technologies d'assistance annonceraient deux fois la même chose.

Deux conséquences de forme, qui ne sont pas cosmétiques :

- **Ce n'est pas un point de repère `navigation`.** L'en-tête en porte déjà un pour ces trois mêmes
  cibles. La structure est portée par des **titres de niveau 2**, c'est-à-dire par le plan du
  document — que les lecteurs d'écran parcourent aussi, et qui est ce que P4-10 auditera.
- **Le lien est dans le titre, pas l'inverse.** Un titre placé à l'intérieur d'un lien ferait du nom
  accessible de celui-ci la concaténation du titre et de la description. Cette forme garde un nom de
  lien court et un plan juste.

⛔ **La carte n'est pas cliquable dans son ensemble**, et c'est un choix révisé en revue. La première
version étendait la cible par un `::after` recouvrant la carte — le motif dit *stretched link*. Il
coûte deux choses réelles : le texte devient **insélectionnable**, et l'indicateur de focus doit être
reporté sur la carte, ce que cette version faisait par `:has()` **après** avoir supprimé celui du
lien. Dans un moteur sans `:has()`, la seconde règle tombe, la première reste, et les trois liens
n'ont plus d'indicateur du tout (WCAG 2.4.7) — sur la page même que le gate axe audite.

> ⚠️ Ce paragraphe décrivait d'abord la version retirée, en invoquant WCAG 2.4.13 pour justifier ce que
> le code avait écarté au nom de 2.4.7. **Deuxième fois dans ce journal** qu'une prose survit au code
> qu'elle décrit (voir §7.5, point 3). La leçon n'est plus « faire attention » : un paragraphe écrit
> *avant* la fin d'un incrément doit être relu *après*, systématiquement.

### 8.2 Ce qui n'a pas été écrit, et pourquoi

⛔ **Aucun texte de présentation.** La tâche s'appelle « présentation et accès aux trois sections », et
il aurait été facile d'écrire deux phrases sur le parcours d'Aurélien. Elles auraient été du **contenu
éditorial** — dont la place est `content/` et l'auteur son propriétaire (CF-09, ADR-0001) — logées
dans un dictionnaire d'interface, où rien ne les distinguerait d'un libellé de bouton. Et elles
auraient été des **affirmations sur quelqu'un**, écrites par une session qui ne les tient de personne.

La page affiche donc `site.description`, qui existe, est traduite, et sert déjà de description de
page. C'est exact et insuffisant : la phrase est une méta-description, pas une accroche.

**Décision éditoriale ouverte (D7)** — un vrai texte d'accueil, en deux ou trois phrases, dans les
deux langues. Il n'appartient pas à cette phase de l'inventer. Deux voies : une clé de dictionnaire
si la phrase est de l'interface (courte, factuelle), un fichier de `content/` si elle est de l'ordre
du récit. La seconde est plus juste, et suppose un type de contenu qui n'existe pas encore.

⚠️ **Le même constat vaut trois fois de plus, et il est neuf.** Les `sections[x].description` sont la
`<meta name="description">` des pages de section — et depuis P4-03, elles sont aussi la **copie
visible** des cartes de l'accueil. Les deux usages n'ont pas les mêmes contraintes : longueur SEO d'un
côté, accroche lisible de l'autre. Ajuster l'un changera l'autre en silence. Elles entrent donc dans
le périmètre de D7 : le jour où il est tranché, la séparation est `sections[x].summary` (visible) et
`sections[x].description` (méta) — six clés, pas trois.

### 8.3 Relevés

| Relevé après P4-03 | Valeur | Seuil |
|---|---|---|
| JS propre à chaque route | **0,0 Ko** sur 16 routes | cible 25 · bloquant 40 Ko |
| Socle partagé | **129,5 Ko — inchangé** | cible 136 · bloquant 146 |
| CSS produit | **3,6 Ko** (2,7 après P4-02) | — |
| Tests | 455 verts, couverture 100 % | — |
| E2E | 82 verts sur 5 profils, **0 violation axe** | 0 |

⭐ `--text-2xl` est entré dans les tokens **avec son premier usage**, le `h1` de l'accueil — application
de la règle posée en revue de P4-02 : aucun échelon n'est déclaré avant qu'une règle ne le consomme.

### 8.4 Ce que la revue a changé

Neuf constats à nouveau, sur un travail dont tous les gates étaient verts. Trois portent une leçon
qui dépasse leur correctif :

⛔⛔ **Le défaut le plus coûteux était invisible, et mon commentaire affirmait le contraire.**
`container` pose `margin-inline: auto` ; sur un **élément flex**, des marges automatiques annulent
l'étirement (Flexbox §9.4). Le `<main>` se réduisait donc à son contenu au lieu d'aller jusqu'à
`--layout-max-width` : **288 px** entre le `h1` et la marque, alors que le fichier promettait un
alignement « au pixel près ». Aucune erreur, aucun test rouge — et le commentaire faisait écran.

⭐⭐ **La garantie est remontée dans la classe, pas rustinée dans la page.** La première correction
posait `width: 100%` sur `.main` de l'accueil. Or le layout racine met **tout** `<main>` dans une
colonne flex : les cinq gabarits de P4-04 à P4-06 seraient tombés dans le même piège, ou auraient
recopié la ligne et son commentaire. `width: 100%` vit maintenant dans `container.module.css`, où il
ne change rien pour les deux usages en flux normal. Un parcours E2E mesure l'alignement.

⛔ **Une accessibilité qui dépend d'un `:has()` peut se retourner.** La carte entière était cliquable
par un `::after`, et l'indicateur de focus reporté sur la carte par `:has()` — **après** avoir
supprimé celui du lien. Dans un moteur sans `:has()`, la seconde règle tombe et la première reste :
trois liens sans indicateur de focus, sur la page que le gate axe audite. Le motif a été retiré
plutôt que rafistolé ; il rendait aussi le texte insélectionnable.

Le reste est de la réutilisation, et le dépôt la signalait lui-même à chaque fois. `place-layout.tsx`
revendiquait dans son propre en-tête de porter la construction des liens de section « qu'aucun des
quatre layouts n'a alors à répéter » — et l'accueil la recopiait au caractère près : elle est
maintenant dans `section-links.ts`, sur le modèle de `language-options.ts`, et la fabrique de tests
la **délègue** au lieu d'en donner une troisième transcription à la main. Le triplet de cible tactile
en était à son troisième exemplaire : c'est `tap-target.module.css`, le seuil exact auquel
`container.module.css` avait été extrait en P4-02.

⭐ Effet mesurable de ces deux extractions : le CSS produit **descend** de 4,0 à 3,6 Ko alors que la
page a gagné du contenu.

## 9. P4-04 — les expériences

### 9.1 La précision d'affichage, et ce qu'on affirme à une machine

P2-02 avait laissé ce choix au rendu, en citant « mars 2022 » comme forme attendue. **C'est l'année
qui est retenue**, et la raison n'est pas esthétique : le CV source ne donne que des années, le
schéma exige un jour, et `content/` porte donc des **1ᵉʳ janvier d'attente** (décision D1, toujours
ouverte). Écrire « janvier 2021 » afficherait comme un fait un mois que personne ne connaît.

⛔⛔ **La conséquence qui compte n'est pas l'affichage, c'est l'attribut.** `<time
datetime="2021-01-01">` affirme ce jour-là à un moteur de recherche, et le JSON-LD de P4-09 s'y
branchera. La règle retenue est générale et ne dépend pas de D1 : **la valeur lisible par une machine
porte la précision de ce qui est montré**. `datetime="2021"` est une valeur `<time>` valide, et c'est
la seule qui dise ce que l'on sait.

⛔⛔⛔ **Cette règle était annoncée « générale et survivant à D1 ». C'est faux, et la revue l'a
établi.** Ce qui est implanté est une **troncature inconditionnelle dans un composant de
présentation**. Deux conséquences, toutes deux déjà réelles :

- **Elle efface une précision réellement connue.** Le projet « portfolio » de `content/` porte un jour
  exact, et la fiche de projet rend le même `DateRange` : elle émet donc `datetime="2026"` pour une
  date que l'on connaît au jour près. La troncature ne ment jamais — elle dit moins — mais elle
  détruit de l'information, parce qu'une ignorance locale à deux fichiers a été hissée en règle
  globale d'affichage.
- **Elle ne protège que cette vue.** `year()` n'est pas exportée. P4-09 lira `experience.startedAt`
  sur l'entité et réémettra `2021-01-01` dans le JSON-LD : ni type, ni test, ni règle de cloisonnement
  ne l'en empêche — `src/seo` n'a même pas le droit d'atteindre `src/ui`.

⭐⭐⭐ **Le vrai point est que `datetime` et le JSON-LD ne sont pas du rendu : ce sont des émissions de
données.** `src/content/schemas/common.ts` déclare pourtant que « la précision d'affichage est une
décision de rendu, pas de stockage ». P4-04 est la tâche qui invalide cette prémisse — elle avait été
pesée en P2-02, avant que ce cas n'existe.

**Mécanisme général : quand une valeur porte une incertitude, l'incertitude doit voyager avec elle.**
Sinon chaque consommateur redécide, et le premier qui oublie affirme un fait faux — silencieusement,
puisqu'une date complète est toujours valide.

### 9.2 Pourquoi un composant de liste de plus

`EntityList` rend un lien et une note — ce dont la Phase 3 avait besoin pour prouver qu'une route
résout. Une expérience porte quatre informations qu'un recruteur lit ensemble (poste, employeur,
lieu, période), dont l'une — « en cours » — doit se voir **sans ouvrir la fiche**. Les faire entrer
dans une `note` en aurait fait une chaîne concaténée : impossible à mettre en forme, et muette pour
une machine.

⚠️ `EntityList` reste utilisé par les projets et les compétences. P4-05 et P4-06 diront s'il survit
ou s'il rejoint le sort de celui-ci ; le trancher maintenant, sans ces deux cas sous les yeux, aurait
été une abstraction devinée.

### 9.3 Un mot commun aux deux langues n'est pas une exception à accorder

`experience.technologies` valait d'abord « Technologies » en français **et** en anglais. Le test de
non-régression des dictionnaires refuse les valeurs égales, et son unique exception est un nom
propre (`site.name`). L'ajouter à la liste aurait affaibli le garde pour un mot ; l'anglais dit
**« Tech stack »**, qui est de toute façon ce qu'un lecteur anglophone attend sur un portfolio.

⭐ La règle est générale : quand un libellé se trouve identique dans les deux langues, chercher
d'abord la formulation idiomatique — l'exception est le dernier recours, pas le premier.

### 9.4 Relevés

| Relevé après P4-04 | Valeur | Seuil |
|---|---|---|
| JS propre à chaque route | **0,0 Ko** sur 16 routes | cible 25 · bloquant 40 Ko |
| Socle partagé | **129,5 Ko — inchangé** | cible 136 · bloquant 146 |
| Tests | 460 verts, couverture 100 % | — |
| E2E | 86 verts sur 5 profils | — |
| Violations axe serious/critical | **0** sur `/fr`, `/fr/experiences` **et** une fiche | 0 |

⛔⛔ **Cette dernière ligne a d'abord été écrite fausse.** Le journal portait « 0 violation axe » pour
P4-04 alors que le seul audit `AxeBuilder` du dépôt visait `/fr` : **aucune des deux pages livrées
n'était analysée**. La passe complète reste P4-10, mais écrire un chiffre pour des pages que rien
n'inspecte est exactement l'affirmation que ce projet refuse — l'audit couvre donc désormais la liste
et une fiche. Relevé par la revue.

### 9.5 Ce que la revue a changé — la couche de preuve, pas le code

Fait notable : la revue n'a trouvé **aucun défaut dans le code de production**. Les cinq constats
portent tous sur les tests censés prouver le nouveau comportement, et trois d'entre eux étaient des
**gardes verts qui n'avaient rien inspecté** :

⛔⛔ **Une liste désignée par sa position visait le sélecteur de langue.** `getByRole('list').last()`
attrapait le `<ul>` du `LanguageSwitcher` — que ce même diff avait déplacé en fin de `<main>` — et le
garde de résolution des slugs inspectait donc « Français ». Retirer la résolution laissait le test
vert. Correctif à la bonne profondeur : les deux listes de la fiche portent un `aria-labelledby` qui
les rattache à leur titre — un lecteur d'écran annonce « Réalisations, liste de 4 éléments » au lieu
d'une liste anonyme, et le test désigne par le **nom**. ⭐ Vérifié par mutation : la résolution
retirée fait maintenant rougir.

⛔ **Une boucle sur une collection vide passe.** `for (const value of stamps)` ne s'exécutait pas si
`<time>` disparaissait. Un compte précède désormais chaque boucle — c'est le motif que
`i18n-routing.spec.ts` documentait déjà deux fichiers plus loin.

⛔ **Le motif de slug exigeait un trait d'union** (`^[a-z0-9]+(-[a-z0-9]+)+$`), alors que la première
technologie des deux expériences réelles n'en a pas. La propriété testée est maintenant
content-agnostique : un slug est minuscule par schéma, donc une pile résolue contient **au moins une
capitale** ; si la résolution tombait, aucun élément n'en aurait.

⚠️ Et deux `href` identiques dans une fabrique de test donnaient à React **deux clés égales** — un
enfant omis ou dupliqué, sans erreur.

⭐⭐ La leçon n'est pas « mieux relire les tests ». C'est que **trois de ces quatre défauts ont la
même forme** : une assertion qui ne peut pas échouer. Position au lieu de nom, boucle sans compte,
motif trop étroit. Un test neuf devrait être vu rouge avant d'être cru — ce que le cycle TDD impose
pour le code et que ces tests-là, écrits après le comportement, n'avaient pas subi.

### 9.6 Dette nommée — préalable de P4-09

**Ce que P4-04 livre est la troncature, pas la règle.** Elle est honnête (elle n'affirme rien de
faux) et bornée à une vue. Elle n'est pas le bon niveau, et la suite est écrite ici pour ne pas être
redécouverte.

**Correctif au bon niveau** : `isoDateSchema` accepte `AAAA`, `AAAA-MM` **ou** `AAAA-MM-JJ` — soit
exactement le domaine de `<time datetime>`. `content/` écrit alors `2021` pour Askor (honnête) et
`2026-08-11` pour le portfolio (honnête) ; `DateRange` affiche ce qu'on lui donne, `year()`
disparaît, et P4-09 émet le champ **verbatim, juste par construction**.

Coût réel, à ne pas sous-estimer :

- `z.iso.date()` devient une union de trois formes ;
- `isPeriodOrdered` et `byMostRecent` comparent des chaînes de longueurs différentes. La comparaison
  lexicographique ISO reste correcte (`'2021' < '2021-03-01'`), mais c'est une propriété **à tester,
  pas à supposer** ;
- l'affichage doit formater selon la précision reçue — c'est-à-dire le « mars 2022 » que P2-02
  envisageait, mais **conditionnel** ;
- `content/` change, et `common.ts` porte une décision de P2-02 qu'il faut amender explicitement, pas
  contourner.

⚠️ **C'est un préalable de P4-09**, pas une amélioration facultative : sans lui, le JSON-LD affirmera
des jours inventés à un moteur de recherche, et aucun gate ne le verra. La décision d'engager ce
chantier — il touche le schéma de contenu et les fichiers de l'auteur — appartenait à l'utilisateur.

✅ **Décidé et fait le 2026-08-16, avant P4-05** (P4-17, §10).

⭐ Effet de bord heureux : le jour où ce correctif est fait, **D1 cesse d'être une fausseté ouverte**
pour devenir « préciser quand on saura ».

## 10. P4-17 — la précision voyage avec la donnée

Le préalable de §9.6 est levé. `isoDateSchema` accepte `AAAA`, `AAAA-MM` ou `AAAA-MM-JJ` — **exactement
le domaine de `<time datetime>`** pour une date calendaire. `DateRange` ne retranche plus rien : il met
en forme ce qu'il reçoit et réémet la valeur *verbatim*. La propriété que P4-09 exigeait est désormais
vraie **par construction** plutôt que par vigilance.

La preuve tient en trois lignes de HTML servi :

```html
<!-- Askor : le mois n'est pas connu -->
<time dateTime="2021">2021</time>
<!-- Le portfolio : le jour est connu -->
<time dateTime="2026-08-11">11 août 2026</time>
<time dateTime="2026-08-11">August 11, 2026</time>
```

### 10.1 Ce qui a été renversé, et pourquoi c'était nécessaire

`common.ts` déclarait : « la précision d'affichage — “mars 2022” plutôt qu'une date complète — est une
décision de rendu, prise en Phase 4, pas une décision de stockage ». La prémisse est fausse sur le
point qui compte, et P4-04 est la tâche qui l'a révélé : **`datetime` et le JSON-LD ne sont pas du
rendu, ce sont des émissions de données.** Une date complète y affirme un jour à un moteur de
recherche, que l'auteur le connaisse ou non.

⭐⭐⭐ **Quand une valeur porte une incertitude, l'incertitude doit voyager avec elle.** Sinon chaque
consommateur redécide, et le premier qui oublie affirme un fait faux — silencieusement, puisqu'une
date complète est toujours valide. C'est la leçon générale, et elle vaut au-delà des dates.

Corollaire de méthode : la troncature de P4-04 était un correctif **dans une vue** pour un problème
**de donnée**. Elle ne mentait pas, mais elle effaçait les dates réellement connues et ne protégeait
qu'un seul consommateur. Un correctif qui doit être répété par chaque lecteur n'est pas un correctif.

### 10.2 Élargir un domaine, c'est revisiter chaque comparateur

⛔⛔ **Le constat le plus utile de la revue.** Trois défauts, une seule racine : le domaine des dates
avait été élargi sans que tous les consommateurs qui les comparent **en tant que chaînes** soient
rouverts.

**La validation rejetait du contenu juste.** « Commencé en juin 2021, terminé en 2021 » échouait sur
`'2021' >= '2021-06'`, avec le message « `endedAt` est antérieure à `startedAt` » — c'est-à-dire que
le build cassait en accusant l'auteur d'une faute qu'il n'avait pas commise.

**Et le tri lisait mal les dates de fin.** Comparer les chaînes brutes revient à lire une valeur
grossière comme le **début** de sa période. C'est juste pour une date de début, et faux pour une date
de fin : « terminé en 2021 » passait pour antérieur à « terminé le 5 janvier 2021 ».

⭐⭐⭐ **La règle retenue n'invente rien : deux dates ne se comparent que sur ce qu'elles affirment
toutes les deux.** La comparaison est tronquée à la précision commune ; deux valeurs qui ne disent
pas la même chose sont **égales**, et un départage explicite prend le relais (date de début, puis
slug). L'alternative — étendre une date grossière à la fin de sa période — aurait demandé de choisir
une convention que le contenu ne porte pas, et de l'arithmétique calendaire (années bissextiles) pour
rien.

⚠️ Le premier test écrit pour cette règle **ne la discriminait pas** : il passait aussi bien avec la
comparaison brute. Il a fallu choisir un cas où les deux règles divergent — c'est la seule façon de
savoir qu'un test mesure ce qu'il prétend.

### 10.3 Deux pièges rencontrés

⛔ **Le tri comparait par `localeCompare`.** Tant que toutes les dates faisaient dix caractères, la
comparaison lexicographique et la collation ICU donnaient le même résultat. Avec trois longueurs, le
tiret devient porteur — et `localeCompare` le traite comme de la ponctuation, dont le poids dépend
d'une collation qu'aucun test ne contrôle. Les dates se comparent maintenant par **unités de code**,
comme le faisait déjà `isPeriodOrdered`. Quatre cas croisant les trois précisions gardent l'ordre.

⭐ **En YAML, `2021` nu est un entier.** Le schéma attend une chaîne : les valeurs à l'année sont
quotées dans `content/`. Sans cela le build casse — ce qui est le comportement voulu, mais le message
ne dit pas « quote ta valeur ».

### 10.4 Ce qui n'a pas été écrit

`precisionOf()` a été écrit puis **retiré avant le commit** : `src/ui` ne peut pas importer
`src/content`, et c'était son seul usager possible. `DateRange` lit la forme lui-même, en une ligne.
Une fonction exportée sans appelant aurait été du vocabulaire public à maintenir pour rien — la règle
que `fr.ts` applique déjà à ses clés de traduction.

⚠️ **D1 change de nature.** Les mois de début d'Askor et d'Augure ne sont plus une *fausseté ouverte*
inscrite dans `content/` : le contenu dit maintenant exactement ce qu'on sait. La question devient
« préciser quand on saura », et elle ne bloque plus rien.

### 10.5 Relevés

| Relevé après P4-17 | Valeur | Seuil |
|---|---|---|
| JS propre à chaque route | **0,0 Ko** sur 16 routes | cible 25 · bloquant 40 Ko |
| Socle partagé | **129,5 Ko — inchangé** | cible 136 · bloquant 146 |
| Tests | **484** verts, couverture 100 % | — |
| E2E | 86 verts sur 5 profils | — |
| Contenu validé | 86 fichiers | — |

## 11. P4-06 — les compétences

### 11.1 Ce qui n'est pas affiché, et pourquoi c'est le point de la tâche

⛔ **Les niveaux (1 à 5) ne sont pas publiés.** `content/README.md` les qualifie de « proposition,
déduite de la place que chaque technologie occupe dans les expériences. C'est un jugement sur
toi-même : relis-les » — décision **D2, toujours ouverte**. Les afficher publierait comme un fait une
auto-évaluation que personne n'a validée.

⭐⭐ **C'est exactement la même faute que la troncature des dates**, une tâche plus tôt : afficher une
valeur d'attente comme si elle était établie. La différence est qu'ici elle a été vue **avant** de
livrer, et non par une revue après coup. Les niveaux **ordonnent** la liste — un signal doux, interne
au tri — mais ne l'**affirment** pas.

Un parcours E2E garde la décision : elle serait sinon annulée par un simple ajout de champ dans la
vue, sans que rien ne le signale.

### 11.2 Le groupement appartient à la couche, pas à la vue

`groupByCategory` vit dans `src/content/normalise.ts`, avec les autres dérivations. Il **rétablit**
l'ordre des cinq catégories depuis `CATEGORY_ORDER` au lieu de regrouper les suites consécutives
d'une liste supposée triée : sans cela, un `bySkillOrder` modifié demain réordonnerait la page en
silence, et une liste reçue autrement produirait des groupes en double.

Une catégorie que rien ne remplit n'apparaît pas — le cas est réel (R-07), et un titre suivi du vide
est un défaut visible.

### 11.3 Une exception de traduction, et la règle qui la borne

`skills.categories.infrastructure` vaut « Infrastructure » dans les deux langues : c'est la **seconde**
exception du test de non-régression des dictionnaires, après le nom propre `site.name`.

⭐ La règle posée en P4-04 tient : chercher **d'abord** la formulation idiomatique. Elle a servi deux
fois de plus ici — « Frameworks » seul aurait été identique, et « Frameworks et bibliothèques » /
« Frameworks & libraries » décrit mieux une catégorie qui contient Zustand, React Flow et Mercure.
L'exception n'est prise que lorsque dégrader le libellé serait le seul moyen de satisfaire le test.

### 11.4 Ce que la revue a changé

Trois constats méritent d'être retenus au-delà de leur correctif.

⛔⛔ **Un garde de décision produit ne peut observer que des symptômes.** Le parcours E2E qui interdit
les niveaux visait « 3/5 » et « ★ » ; il laissait passer la régression la plus simple,
`TypeScript 5`. Élargi, il attrape les chiffres et perd les étoiles — c'est un **déplacement d'angle
mort**, pas une montée en niveau. Ce qui ferme réellement la classe est le **contrat** : `SkillGroup`
ne porte que `{ slug, name }`, et la route retire `level` à la composition. Le test reste, requalifié
en **filet de dernier recours** pour ce qu'on ajouterait *hors* du composant — son en-tête le dit
maintenant, au lieu d'affirmer qu'il « garde la décision ».

⛔⛔ **La route contournait la façade que le dépôt déclare exclusive.** `groupByCategory` était appelé
directement depuis `skills/page.tsx` — le premier appelant de `normalise.ts` hors de la couche
Content. Le cloisonnement ESLint l'autorise (`app → content` en bloc) : rien n'aurait protesté, et la
phrase « c'est la seule surface que connaissent les couches au-dessus » serait devenue fausse **sans
être amendée**. C'est le troisième cas de cette phase où une prose survit au code qu'elle décrit.
⭐ Le premier contournement d'une façade est gratuit et invisible ; c'est le second qui coûte, parce
qu'il n'a plus de raison de se retenir. `getSkillsByCategory` remet la clause en vigueur.

⭐⭐⭐ **L'ordre des catégories est lu depuis l'énumération du schéma, plus recopié.** Trois formes se
sont succédé : un tableau typé `readonly SkillCategory[]` — qui ne vérifie que ses éléments, si bien
qu'une catégorie oubliée compilait et **disparaissait de la page** ; un `Record<SkillCategory, …>` en
`satisfies`, qui ferme le trou par le compilateur mais écrit la décision **deux fois**, dans l'ordre
des clés et dans les valeurs ; et enfin `skillFrontmatterSchema.shape.category.options`, qui rend la
liste **exhaustive par construction**. Les deux premières *détectent* le problème ; la troisième le
**supprime**. L'ordre du `z.enum` devient porteur de sens, et `schemas/skill.ts` le dit à sa source.

⭐ Quatre extractions au seuil du dépôt : `chip` et son contenant `chip-row`, `bare-list` — dont
l'en-tête porte désormais **la seule** énonciation de la règle `list-style: none` ⇒ `role="list"`,
recopiée jusque-là dans quatre composants dont un cinquième l'avait déjà perdue — et `EmptyNotice`,
où ce qui était dupliqué n'était pas la ligne de JSX mais le **raisonnement** sur R-07, réécrit à la
main dans trois fichiers.

⛔ `site-nav` porte les mêmes six déclarations que `chip-row` et **ne la compose pas** : la
ressemblance y est fortuite. Factoriser sur une identité de valeurs, et non de nature, coûte le jour
où l'une des deux doit bouger.

### 11.5 Relevés

| Relevé après P4-06 | Valeur | Seuil |
|---|---|---|
| JS propre à chaque route | **0,0 Ko** sur 16 routes | cible 25 · bloquant 40 Ko |
| Socle partagé | **129,5 Ko — inchangé** | cible 136 · bloquant 146 |
| Tests | **492** verts, couverture 100 % | — |
| E2E | 89 verts sur 5 profils | — |
| Violations axe serious/critical | **0** sur `/fr`, `/fr/experiences`, une fiche, `/fr/skills` | 0 |

⭐ `chip.module.css` extrait au deuxième exemplaire — la pile technique d'une fiche et les compétences
groupées disent la même chose, un terme court tiré du même référentiel.

## 12. P4-05 — le corps MDX, et un chiffre qui gouvernait la phase

### 12.1 La mesure, qui était la livraison

| Relevé | Avant | Après (corps MDX rendu) | Écart |
|---|---|---|---|
| Image de production | 268,1 Mo | **268,6 Mo** | **+0,5 Mo** |
| dont couche applicative | 38,2 Mo | 38,7 Mo | +0,5 Mo |
| JS propre à chaque route | 0,0 Ko | **0,0 Ko** | — |
| Socle partagé | 129,5 Ko | **129,5 Ko** | — |

⭐ Le compilateur MDX ne franchit **pas** la frontière client : `renderMdx` s'exécute au build, et le
budget de bundle le mesure — 0,0 Ko sur les 16 routes, socle inchangé. C'est ce que l'ADR-0009
promettait, et c'est vérifié plutôt que supposé.

### 12.2 ⛔⛔ La prémisse de la tâche était fausse

P4-05 a été isolée et repoussée **après** P4-06 pour une raison écrite en toutes lettres à l'ouverture
de la phase : « elle fait entrer ~7 Mo de runtime dans une image qui n'a que 15 Mo de marge ». Les
deux termes sont faux.

| | Documenté | Mesuré le 2026-08-16 |
|---|---|---|
| Image de production | 385 Mo | **268,6 Mo** |
| dont image de base | 340 Mo | **229,1 Mo** |
| Marge sous 400 Mo | 15 Mo | **131 Mo** |
| Coût du runtime MDX | ~7 Mo | **+0,5 Mo** |

Même cible de build (`runner`), même digest de base épinglé, même architecture que la CI — la
comparaison est valide, et c'est la première chose vérifiée.

⭐⭐⭐ **Un nombre recopié dans quatre documents et jamais remesuré finit par décider seul.**
Celui-ci a réordonné une phase : il a fait passer P4-06 devant P4-05 et fait traiter cette tâche comme
« le seul sujet à risque ». Le coût n'a pas été grave ici — l'ordre choisi restait défendable — mais
la décision a été prise sur une donnée périmée que personne n'avait de raison de rouvrir.

### 12.3 ⛔⛔⛔ Le seuil qu'on croyait bloquant ne bloquait rien

L'étape de CI qui « mesure la taille de l'image » écrivait la valeur dans le résumé de l'exécution et
**n'en faisait rien**. Le seuil de 400 Mo de `performance-budget.md` §7 n'existait que dans un
tableau.

C'est la tâche censée le consommer qui l'a découvert, **en s'y référant** — et elle ne l'aurait pas
découvert si la marge avait été aussi mince qu'annoncé, puisqu'elle aurait alors regardé le chiffre
au lieu du mécanisme. Le seuil est bloquant depuis cette tâche, et la mesure se fait en **octets**
(`image inspect`) : `image ls` rend une chaîne déjà arrondie, impossible à comparer sans la
réanalyser.

⭐⭐ Ce dépôt a déjà rencontré cette forme — « les gates ne se gardent plus du zéro mais du
sous-comptage » (§2). Ici il ne s'agissait pas d'un sous-comptage mais d'un **non-comptage** : la
valeur était juste, et personne ne la lisait.

### 12.4 Le corps MDX, et la seule exception à l'ADR-0010

Le corps est rendu dans un conteneur `.prose`, **le seul endroit du dépôt où des sélecteurs
d'éléments sont légitimes** : le balisage vient du Markdown de l'auteur et ne peut porter aucune
classe. L'exception est bornée à ce conteneur et vit dans un module, donc dans une portée — rien ne
peut atteindre le balisage d'un autre composant.

⭐ Dette de P4-04 payée au passage : la fiche d'un projet affichait les **slugs bruts** de ses
technologies là où celle d'une expérience les résolvait. Ce n'était pas une duplication mais un
défaut, et il ne se voyait qu'à l'œil. `getTechnologyLabels` remonte la résolution au dépôt et
**lève** sur un slug inconnu — le gate d'intégrité rend le cas impossible, donc un repli silencieux
aurait masqué la panne du gate plutôt qu'un défaut de contenu.

### 12.5 Ce que la revue a changé

⛔⛔ **Le rythme vertical du corps MDX ne s'appliquait à rien.** `.prose p, .prose ul, .prose ol`
(spécificité 0,1,1) l'emportait sur `.prose > * + *` (0,1,0) : la page phare de la tâche rendait un
**mur de texte**, avec 496 tests verts, un axe propre et des budgets tenus. Un parcours mesure
désormais l'écart entre blocs consécutifs, et il a été vérifié par mutation.
⭐⭐ Aucun garde du dépôt ne pouvait voir ce défaut : il n'est ni une erreur, ni une violation
d'accessibilité, ni un dépassement de budget. **Une régression purement visuelle ne se prouve que par
une mesure géométrique.**

⛔⛔ **`.prose` était au mauvais étage, et le même commit faisait le geste inverse à côté.** Il
remontait `.technologies` d'un module de route vers `src/ui`, et laissait `.prose` — plus le chemin
du fichier et l'appel au compilateur — dispersés dans la route projets. L'invariant « un corps
compilé est **toujours** rendu dans son conteneur » n'était porté par rien : un second appelant qui
oublie l'enveloppe obtient exactement le mur de texte ci-dessus. Il y aura un second appelant — les
expériences portent déjà des corps que leur fiche ne rend pas. C'est maintenant `<Prose source file />`.

⛔ **`Callout` portait un nom de classe mort.** `className="callout"`, qu'aucune feuille du dépôt ne
définissait : le composant n'était pas stylé, et son style « réel » avait atterri dans le module d'une
route. ⭐ **Une exception admise pour une raison — le balisage de l'auteur ne peut porter de classe —
avait absorbé un cas qui n'a pas cette raison** : un composant que nous écrivons peut porter la
sienne. L'exception est rebornée, et `components.module.css` la respecte.

⛔⛔ **Le gate de taille était écrit dans l'orchestrateur, pas dans l'outil.** Trois conséquences que
la revue a nommées : `make ci` serait resté vert là où la CI est rouge — alors que le Makefile
s'annonce comme « la SEULE interface documentée » ; le seuil de 400 aurait existé en **deux**
exemplaires, c'est-à-dire la leçon de §12.2 rejouée dans le commit qui l'écrit ; et le palier **cible**
(250 Mo) disparaissait, alors que l'image est déjà au-dessus. `make check-image-size` porte les deux
paliers, la CI l'invoque, et la mutation confirme qu'il bloque.

⛔ **Deux routes reconstruisaient un chemin que la couche contenu possède**, extension écrite en dur,
alors que `.md` et `.mdx` sont l'un et l'autre autorisés pour n'importe quel type. Le message d'erreur
aurait nommé un fichier inexistant — la panne exacte contre laquelle `ContentError.file` existe.
L'entrée chargée publie désormais son `file`.

⚠️ Et l'appariement `<h2 id="technologies">` / `labelledBy="technologies"` était recopié dans les deux
fiches **sans que rien ne relie les deux chaînes** : une faute de frappe rendait la liste anonyme pour
un lecteur d'écran, sans qu'aucun test n'échoue. `TechnologySection` produit l'`id` avec le titre qu'il
désigne — et la fiche d'un *projet* cesse au passage de lire `messages.experience.technologies`.

## 13. P4-07 — la page introuvable, et deux défauts que seul un parcours pouvait voir

### 13.1 Trois sondes pour établir qu'aucune voie ordinaire n'existe

La 404 de Next est servie **hors de tout layout racine**, et c'est structurel ici : le nôtre vit sous
`[locale]` (P3-02, c'est ce qui permet à `<html lang>` d'être vrai). Trois sondes, avant d'écrire
quoi que ce soit :

| Voie | Ce qui a été observé | Verdict |
|---|---|---|
| `[locale]/not-found.tsx` | **Jamais atteinte.** `dynamicParams = false` fait d'un slug inconnu un échec de *routage*, pas un `notFound()` | fermée |
| `app/not-found.tsx` | Rendue, mais **hors du layout racine** : pas de `<html lang>`, aucun paramètre reçu | fermée |
| Idem + enveloppe rendue par le composant | **Deux `<html>`** dans le document | fermée |
| Groupe de routes avec son propre layout racine | Écarterait le segment `[locale]` de la 404, donc sa langue | non retenue |

⛔ **L'absence de `lang` est une violation WCAG 3.1.1, et le gate axe ne l'avait jamais vue** — non
parce qu'il était mal réglé, mais parce qu'aucun parcours ne visitait de 404. Un audit
d'accessibilité ne couvre que les pages qu'on lui donne.

D'où la voie retenue avec l'utilisateur : **le proxy réécrit toute URL inconnue vers une vraie page
prérendue et localisée**, `[locale]/404`.

⚠️ **Le statut est porté par la réécriture** (`{ status: 404 }`). Une réécriture rend **200** par
défaut : servir le bon contenu avec le mauvais statut dirait à un moteur de recherche que la page
existe — l'inverse exact du but.

### 13.2 Deux énumérations qu'on ne peut pas fusionner, donc qu'il faut confronter

Le proxy a besoin de la liste des chemins servis **pour être compilé**, c'est-à-dire *avant*
`next build` ; le sitemap et les pages prégénérées en sont le *produit*. Elles n'existent pas au
même instant : `scripts/generate-route-manifest.mts` écrit donc `SERVED_PATHS`, et c'est une
**seconde énumération** — la forme même de R-07.

⭐⭐ **Elle est confrontée aux pages réellement prégénérées, et non au sitemap.** Le prompt de
reprise demandait « manifeste ↔ sitemap » ; l'écart est délibéré. Il y a **trois** énumérations : ce
que Next a prégénéré (le fait), ce que le sitemap annonce, et ce que le proxy laisse passer. Les
deux dernières sont dérivées. Comparer deux dérivées l'une à l'autre produit un message qui accuse
celle qui n'a pas tort — chacune est donc comparée au **fait**. Le contrôle 3 y gagne au passage son
sens manquant : il ne vérifiait que `pages → sitemap`, il vérifie maintenant les deux sens.

⛔⛔ **Les deux sens du contrôle 4 sont des pannes silencieuses, et elles ne se ressemblent pas.**

| Écart | Conséquence |
|---|---|
| Un chemin **en trop** dans le manifeste | Le proxy laisse passer, Next sert sa 404 interne — sans `lang`. Le défaut que la tâche supprime, réintroduit par la porte de derrière |
| Un chemin **manquant** | Le proxy réécrit une **page réelle** vers la 404, en 404. Elle disparaît du site et de l'index, en répondant proprement |

Les trois cas ont été **vus échouer** sur le build réel, pas sur des fixtures seules : manifeste
augmenté d'un chemin, amputé d'une page, et absent.

### 13.3 ⛔⛔⛔ Le matcher a été faux **deux fois**, et la seconde a été trouvée en revue

Le parcours E2E de cette tâche a trouvé une régression que le commit de travail avait introduite et
que rien ne signalait : **`/resume/cv-fr.pdf` et `cv-en.pdf` répondaient 404**. Ils sont en ligne
depuis la Phase 2.

Cause : le matcher, élargi de `/` à tout le site, énumérait ses exceptions **à la main** —
`favicon.ico|robots.txt|sitemap.xml|images/`. Liste écrite d'imagination, jamais confrontée à
`public/` : elle citait `images/`, qui n'existe pas, et ignorait `resume/`, qui existe.

**Premier correctif, et il était encore faux.** La liste a été remplacée par un critère qu'on croyait
ne pas avoir à entretenir : *un chemin de page ne contient jamais de point*. Il traitait bien les
fichiers réels — et laissait l'inverse passer. `/code-review` l'a relevé, et la mesure sur l'image de
production l'a confirmé :

```text
/wp-login.php                 404 | <html>            ← sans lang
/cv.pdf                       404 | <html>            ← sans lang
/fr/projects/portfolio.html   404 | <html>            ← sans lang
/fr/rien                      404 | <html lang="fr">
```

Une adresse **inexistante portant un point** échappait à la réécriture et recevait la 404 interne de
Next, hors du layout racine, donc sans `lang` — c'est-à-dire **le défaut WCAG 3.1.1 que cette tâche
supprime, réintroduit par la porte de derrière**, sur la classe d'URL que les scanners visitent le
plus.

⭐⭐⭐ **Les deux versions ont la même racine : décider d'après la *forme* d'une URL ce que seul le
disque sait.** Une liste écrite à la main est fausse dès qu'on ajoute un fichier ; un motif est faux
dans l'autre sens, parce qu'une URL inventée peut prendre la forme d'un fichier. Aucun motif ne peut
trancher.

**Correctif retenu : la décision quitte le matcher pour la fonction, sur une liste générée.**
`generate-route-manifest.mts` émet un second export, `PASSTHROUGH_PATHS` — les fichiers de `public/`
**lus sur le disque**, plus les routes-poignées (`robots.txt`, `sitemap.xml`). Le proxy laisse passer
ce qui est dans l'une des deux listes et réécrit tout le reste. Le matcher ne borne plus que le
coût : `_next/` seul en est exclu.

Deux gates neufs ferment ce qui restait de manuel :

| Contrôle | Ce qu'il confronte | Vu échouer |
|---|---|---|
| 5 — *Destination* | `notFoundPath(locale)` **est prégénérée** | destination changée en `/410` → « toute URL inconnue serait réécrite vers une route qui n'existe pas » |
| 6 — *Laissez-passer* | chaque route non-page du build figure dans `PASSTHROUGH_PATHS` | `/robots.txt` retiré → le gate le nomme et donne le fichier à corriger |

⭐ Le contrôle 6 est ce qui rend admissible la seule liste encore écrite à la main (`ROUTE_HANDLERS`,
deux entrées) : elle est **confrontée au build**. Et il travaillera pour P4-08 sans qu'on le lui
demande — une `opengraph-image` est une route non-page, donc il la réclamera.

Mesure après correctif, même commande :

```text
/wp-login.php                 404 | <html lang="fr">
/cv.pdf                       404 | <html lang="fr">
/fr/projects/portfolio.html   404 | <html lang="fr">
/resume/cv-fr.pdf             200 | (pas de <html>)
/robots.txt                   200 | (pas de <html>)
```

⭐⭐ **La revue a trouvé ce qu'un parcours vert cachait.** Les 14 parcours de la tâche étaient tous
verts : aucun ne visitait d'URL pointée, parce qu'aucun n'avait de raison d'en visiter une. Un test
ne couvre que la classe qu'on a pensé à lui donner — le motif du dépôt depuis P4-04.

### 13.4 ⛔⛔ La page introuvable n'avait pas d'en-tête, et le garde ne pouvait pas le voir

Second constat du même parcours : `/fr/rien` était servie **sans bannière et sans navigation**.

`[locale]/404/page.tsx` vit directement sous `[locale]`, où **aucun layout d'endroit** ne la
couvrait — l'en-tête est posé par les layouts d'endroit depuis P4-02, jamais par le layout racine
(§7.1). C'est mot pour mot la panne que `every-section-declares-its-place.test.ts` décrit dans son
propre en-tête… pour une quatrième *section*. La page introuvable n'en est pas une : elle est passée
à travers.

⭐⭐ **Un garde exhaustif l'est sur la dimension qu'il connaît.** Celui-ci était tenu par
`Record<CurrentPlace, …>`, et `CurrentPlace` valait `SectionName | 'home'` — le type disait « les
endroits du site sont les sections plus l'accueil », ce qui a cessé d'être vrai le jour où une
cinquième page a rendu du chrome. Élargir le **type** (`| 'notFound'`) a rendu la ligne du garde
obligatoire avant même que la suite ne démarre, et la mutation le confirme.

⚠️ `current="notFound"` ne marque **rien** — ni la marque, ni un lien de section. Lui donner
`'home'` aurait été plus court et faux : `aria-current="page"` sur un lien qui mène ailleurs, la
faute exacte relevée en revue de P4-02 sur les pages de détail.

### 13.5 Les frontières d'erreur, et ce qu'elles coûtent réellement

Next en impose deux, et elles ne couvrent pas la même chose : `[locale]/error.tsx` rattrape l'échec
d'une page, `global-error.tsx` celui du layout racine — qui doit donc **rendre son propre `<html>`**,
seule exception du framework. Elles ne diffèrent que par cette enveloppe : le reste est
`src/ui/error-notice.tsx`, écrit une fois.

⚠️ **La langue vient de l'URL.** Une frontière d'erreur est un composant client : ni `params`, ni
en-tête de requête. `usePathname` est la seule source, et `localeFromPathname` — l'inverse de
`homePath` — est désormais partagée avec le proxy. Le **repli**, lui, n'est pas partagé : le proxy
négocie `Accept-Language`, les frontières retombent sur la locale par défaut.

⛔⛔ **Le coût est réel, il est mesuré, et c'est la première fois que ce site embarque du JavaScript
applicatif.**

| Relevé | Avant P4-07 | Après | Seuil |
|---|---|---|---|
| Socle partagé | 129,5 Ko | **126,0 Ko** | cible 136 · bloquant 146 |
| JS propre à chaque route | **0,0 Ko** sur 18 | **7,2 Ko** sur 18 | cible 25 · bloquant 40 |
| Première visite (socle + route) | 129,5 Ko | **133,2 Ko** | — |

Trois mesures ont servi à trancher plutôt qu'à constater :

- `global-error.tsx` **seul** coûte déjà 5,3 Ko sur chaque route : le supprimer ne rendrait pas les
  0,0 Ko, et la frontière de page ne pèse que **+2,0 Ko** de plus. Le choix n'était donc pas « l'une
  ou l'autre » mais « les deux, ou aucune » ;
- remplacer `usePathname` par `window.location` n'économise que **0,5 Ko de socle et rien par
  route** — écarté : `window` est absent au prérendu, et la fragilité ne s'achète pas à ce prix ;
- l'image de production reste à **268 Mo**, inchangée.

⭐ **Ce qui est perdu est la formule, pas la propriété.** « Le profil `no-js` est vrai *par
construction* » devient « vrai *par vérification* » : les pages restent du HTML servi, sans
interactivité, et le parcours `no-js` le prouve — il visite maintenant une 404. L'arbitrage est
celui du projet, écrit avant d'être invoqué : **accessibilité > indexabilité > performance du
contenu**. Une page d'erreur sans `lang` est le même défaut WCAG 3.1.1 que la 404 corrigée ici.

⚠️ **Réserve consignée** : une erreur de rendu est presque impossible sur un site entièrement
prérendu sans logique client — et ces frontières sont désormais le principal code client qui
pourrait en produire une. Le déclencheur de réexamen est chiffré : si la Phase 5 fait entrer un
composant client, ces 7,3 Ko cessent d'être le seul JavaScript applicatif et la question ne se
repose pas ; si au contraire P4-13 mesure un LCP sous pression, ce sont les premiers 7,2 Ko à
rouvrir.

### 13.6 Ce qui est testé, et à quel niveau

⭐ **La page d'erreur n'a pas de parcours E2E, et c'est une décision.** Aucune erreur de rendu ne
peut être provoquée honnêtement contre l'image de production : un parcours qui prétendrait le faire
**fabriquerait la panne** au lieu de l'observer — la faute que §12.5 a nommée. `ErrorNotice` est
donc vérifié en test de composant (langue, bouton et non lien, `#main` présent, aucun détail
technique), et la lecture de locale en unitaire.

La 404, elle, ne se prouve **que** par un parcours : ni le proxy seul ni la page seule ne disent que
la réécriture atteint une page prérendue **en portant un 404**. Treize parcours l'établissent, dont
l'audit axe — le premier du dépôt sur une 404 — et un quatorzième sous `no-js`.

⚠️ **Deux de ces parcours ont d'abord échoué pour la mauvaise raison, et le dire est le point.**
Ils attendaient du français sur `/de/projects` et `/rien` ; le profil `desktop-chromium` annonce
`en-US`, et le proxy servait donc l'anglais — correctement. Un test qui n'énonce pas la langue du
visiteur ne teste pas la négociation, il teste le hasard du profil. Ils déclarent maintenant leur
contexte, dans les deux langues.

⭐ Un troisième test passait, lui aussi, pour la mauvaise raison : « refuse de conclure sans
manifeste de routes » fabriquait un build **sans sitemap**, si bien que le gate sortait en 1 avant
même d'arriver au contrôle nommé. Il aurait été vert quoi qu'on écrive. Le build fabriqué est
désormais entièrement sain, et l'échec porte le message attendu.

### 13.7 Relevés

| Relevé après P4-07 | Valeur | Seuil |
|---|---|---|
| Socle partagé | **126,0 Ko** | cible 136 · bloquant 146 |
| JS propre à chaque route | **7,2 Ko** sur 18 routes | cible 25 · bloquant 40 |
| Image de production | **268 Mo** — inchangée | cible 250 · **bloquant 400** |
| Tests | **548** verts *(503 avant la tâche)* | — |
| E2E | **108** verts sur 5 profils *(92 avant)* | — |
| Couverture globale | **98,8 %** — voir §13.8 | ≥ 80 % |
| Violations axe serious/critical | **0**, dont **la 404 pour la première fois** | 0 |
| Pages prégénérées | 18, dont 2 pages introuvables hors sitemap | — |

### 13.8 ⛔ « Couverture 100 % » n'était plus vrai, et depuis deux tâches

Le chiffre a été **remesuré** au lieu d'être recopié, et il ne tient pas : la couverture globale est
de **98,8 %**. Les fichiers non couverts n'appartiennent pas à cette tâche — `git log` les rattache
à P4-02 et P4-05.

⛔⛔ **Cet inventaire, écrit à la main, était faux le jour même** — remesuré le 2026-08-16 à
l'ouverture de la session suivante, il en compte **cinq** et non trois. La table ci-dessous est
celle que la sortie de `make coverage` donne, et non celle qu'on croyait :

| Fichier | Couverture | Origine | Pourquoi |
|---|---|---|---|
| `src/app/[locale]/place-layout.tsx` | 0 % | P4-02 | Le garde des endroits **appelle** les layouts sans les rendre : il lit l'élément `PlaceLayout` retourné, si bien que le corps de celui-ci ne s'exécute jamais |
| `src/ui/technology-section.tsx` | 0 % | P4-05 | Extrait en revue de P4-05, sans test de composant |
| `src/ui/mdx/prose.tsx` | 0 % | P4-05 | **Manquait à la liste d'origine** — extrait par le *même* commit que le précédent (`dfffe9c`) |
| `src/ui/brand-palette.ts` | 0 % | P4-08 | Postérieur à cette section : la valeur unique des deux `ImageResponse` (§14.7 bis), qu'aucun test n'importe |
| `src/ui/company-line.tsx` | 75 % de branches | P4-04 | Une branche jamais exercée |

⭐⭐ **C'est la leçon de §12.2 rejouée sur ce journal lui-même.** §11.5 annonce « 492 verts,
couverture 100 % » pour P4-06, et ce chiffre a survécu à P4-05, qui l'a rendu faux. Il n'a rien
décidé — parce qu'il a été remesuré ici —, mais **rien ne le remesurait**.

⭐⭐⭐ **Et la rejouer à moitié ne suffit pas : le *nombre* a été remesuré, la *liste* a été écrite
de mémoire.** Les deux extractions de P4-05 sont sorties du même commit ; une seule a été nommée.
Un inventaire se lit dans la sortie de l'outil, exactement comme le chiffre qu'il accompagne —
sans quoi il vieillit à la vitesse d'une tâche, et c'est arrivé dès la suivante.

Le gate reste **vert** : les seuils sont à 80 % au global et à 95 % sur les modules critiques, tous
tenus (`src/content`, `src/i18n`, `src/routing`, `src/seo` sont à 100 %). Ce n'est donc pas une
régression de qualité, c'est une **affirmation périmée**. Traitement : les tests de composant
manquants, inscrits en **P4-10** — la passe d'accessibilité relit de toute façon ces fichiers.
Nommés ici plutôt que corrigés : ce sont des composants d'autres tâches, et les mêler à ce diff le
rendrait illisible.

### 13.9 Ce que la revue a changé

Le rituel — `/code-review` puis `/simplify` — a trouvé **huit défauts réels** sur un travail dont
tous les gates étaient verts, dont deux que la mesure a confirmés en production. Cinq méritent
d'être retenus au-delà de leur correctif.

⛔⛔⛔ **Le matcher était encore faux après son premier correctif** (§13.3). C'est le constat le plus
coûteux de la tâche, et il n'a pas été trouvé par un test : les quatorze parcours étaient verts,
aucun ne visitant d'URL pointée. Il l'est maintenant — la mesure qui l'a établi est **rejouable**,
deux lignes de la table du parcours.

⛔⛔ **Deux copies d'un même parcours de disque n'étaient pas équivalentes.** Le générateur lisait
`URL.pathname`, qui est **percent-encodé** ; sa jumelle dans le test partait de `process.cwd()`, qui
ne l'est pas. Elles s'accordaient parce que `/opt/portfolio` n'a ni espace ni accent. Un fichier
nommé `cv fr.pdf` aurait mis `/resume/cv%20fr.pdf` au manifeste et `/resume/cv fr.pdf` au test : le
test aurait réclamé une régénération que la régénération n'aurait pas réparée, et le proxy aurait
réécrit le fichier réel en 404. ⭐⭐ **Deux implémentations d'une même lecture divergent d'abord en
silence** — c'est la thèse de toute cette tâche, appliquée à son propre outillage. Il n'y a plus
qu'un parcours (`scripts/public-paths.mts`).

⛔⛔ **Le contrôle 6 ne vérifiait qu'un sens** — celui-là même que le contrôle 4 a été doublé pour
éviter. Une entrée **périmée** dans les chemins laissés passer (un CV supprimé, une route-poignée
retirée) rouvrait exactement le trou de la tâche : le proxy laisse passer, Next sert sa 404 interne,
sans `lang`. ⭐ Le raisonnement était écrit en toutes lettres dans l'en-tête du fichier, et n'avait
pas été reporté au contrôle suivant.

⛔ **`Vary: Accept-Language` était déclaré sur toutes les réécritures**, y compris celles où la
langue vient de l'URL et où l'en-tête n'est jamais lu. Ce n'est pas une faute de correction mais une
**dépendance déclarée qui n'existe pas** : elle demande au cache partagé une entrée par valeur d'un
en-tête à très forte cardinalité, pour des réponses identiques — et les 404 sont le trafic le plus
volumineux d'un site public.

⛔⛔ **L'invariant central de la tâche n'était vérifié qu'à moitié.** Le site a deux émetteurs de
`<html>` : le layout de locale, que les parcours lisent, et `global-error.tsx`, qui rend sa propre
enveloppe — exclu de la couverture, hors de portée d'un parcours (§13.6), et dont le test de
composant ne voit jamais de `<html>`. Un garde structurel les compte et exige `lang` sur chacun.

⭐⭐⭐ **Et ce garde a payé, à sa toute première exécution, le piège que ce journal documente
depuis §7.1** : il comptait quatre enveloppes pour deux, parce qu'il lisait les `<html>` **cités
dans les commentaires** — ceux-là mêmes qui expliquent pourquoi l'enveloppe existe. *Un garde qui
lit du texte source lit tout le texte source.* Les commentaires sont retirés avant lecture, la
limite restante est écrite dans le fichier, et le compte des enveloppes est ce qui signalerait une
troisième forme.

Le reste est de la réutilisation, et le dépôt le disait à chaque fois :

- **`lead.module.css` était le troisième exemplaire, pas le second** — son propre en-tête annonçait
  « deuxième » et laissait le premier (`.lede` de l'accueil, P4-03) en place. Les deux ne
  différaient que par leur mesure, 50ch contre 60ch, sans raison écrite. ⭐ La valeur retenue est
  **celle qui était déjà servie** : quand deux copies divergent sans raison, la copie en production
  fait foi — choisir l'autre aurait modifié une page déjà revue pour rien.
- **La page introuvable réimplémentait `SectionGuide`**, en allant chercher elle-même
  `sections[x].name` et `sections[x].description`. Elle donnait au passage un **troisième** lecteur
  à des clés dont la double vie est une décision ouverte (D7).
- **La moitié « pages » du manifeste n'avait aucun garde de fraîcheur**, alors que la moitié
  `public/` venait d'en recevoir un. Le générateur prend maintenant sa destination en argument, et
  un test compare octet à octet ce qu'il produit aujourd'hui au fichier committé — ce qui vérifie
  aussi, gratuitement, son idempotence de forme.
- Trois tables de test mesuraient un cas plusieurs fois (colonne constante, corps recopiés), et un
  cas du gate **restait vert quoi qu'on écrive** en attendant `code === 0` sur l'entrée saine du
  premier test.

### 13.10 Constats de revue **écartés**, avec leur raison

| Constat | Raison de l'écart |
|---|---|
| Adopter `experimental.globalNotFound` comme **plancher** sous le manifeste | L'idée est juste — le framework garantirait `<html lang>` même si le manifeste se trompait. Mais c'est un drapeau **expérimental**, non vérifié sur 16.3.0, et un second mécanisme de 404 introduit à la fin d'une tâche. À instruire pour de bon en **P4-10**, avec la sonde qui va avec |
| **Dériver** `ROUTE_HANDLERS` des conventions de l'App Router au lieu de l'écrire | Deux entrées aujourd'hui, et les **deux sens** du contrôle 6 les confrontent désormais au build. La dérivation devient rentable quand P4-08 ajoutera `opengraph-image` — c'est là qu'il faudra la faire, pas avant |
| Rendre le garde des endroits **piloté par l'arborescence** plutôt que par `CurrentPlace` | Constat le plus fin de la revue : si le layout de la 404 avait déclaré `current="home"`, le type ne se serait jamais élargi et rien n'aurait rougi. Vrai, et c'est une refonte d'un garde de P4-02 — **P4-10** |
| `marking(place)` par `switch` exhaustif plutôt qu'une énumération négative | Deux termes aujourd'hui (`home`, `notFound`). Le compilateur ferme déjà le trou : un sixième endroit oublié dans la condition ne compile pas |
| Fusionner `LIST_BY_SECTION`, dupliqué entre le générateur et `app/sitemap.ts` | **Le graphe de dépendances l'interdit** : la table a besoin de `content` *et* de `routing`, et aucune couche ne peut importer les deux — seules les racines de composition le peuvent, et elles sont deux. L'écart échoue **bruyamment** (contrôle 4), pas en silence |
| Quatre optimisations du proxy | Mesurées **sous le bruit** : ~140 ns au total sur une requête qui en coûte 10⁵–10⁶. Conformément à ce que la Phase 2 a établi, on ne fait rien |

⚠️ **Un effet de bord mesuré, et non corrigé ici** : le dépôt n'a **aucune icône**, et tout
navigateur demande `/favicon.ico` à la première visite. Cette requête reçoit désormais la page 404
complète — **14,5 Ko** au lieu de la 404 interne de Next. Ce n'est pas un défaut du mécanisme, c'est
une icône manquante ; sa place est **P4-08**, la tâche des métadonnées et des images de partage. La
mesure est ici pour qu'elle n'y soit pas redécouverte.

### 13.11 Ce que P4-07 laisse ouvert

| Sujet | État |
|---|---|
| Les 7,2 Ko de JavaScript par route | Budgets tenus, déclencheur de réexamen écrit (§13.5) |
| Trois fichiers non couverts | Dette nommée, reprise en P4-10 (§13.8) |
| `messages` et `TONES` inutilisés | Deux avertissements de lint **antérieurs** à cette tâche (P4-05), laissés hors de ce diff |
| Aucun parcours n'exerce une frontière d'erreur | Assumé : la panne n'est pas provocable honnêtement (§13.6) |
| `ROUTE_HANDLERS` reste écrit à la main | Deux entrées, confrontées au build **dans les deux sens** (§13.10) |
| Pas de favicon | Mesuré, reporté en P4-08 (§13.10) |
| Les quatre constats d'altitude écartés | Chacun avec sa raison et sa tâche de reprise (§13.10) |

## 14. P4-08 — le gabarit de titre, le partage, et une image que rien ne référençait

### 14.1 Le gabarit vit au layout, et l'accueil y échappe **par déduction**

`%s — Aurélien Feignon` est déclaré une fois, dans le layout racine : chaque page dit ce qu'elle
est — « Projets » —, et Next ajoute le suffixe. Le poser dans chaque `generateMetadata` aurait été
autant d'occasions de le voir diverger.

⭐ **L'accueil est le seul titre absolu, et ce n'est pas la page qui le déclare.** Son titre **est**
le nom du site : le laisser traverser le gabarit donnerait « Aurélien Feignon — Aurélien Feignon ».
Le faire déclarer par la page aurait été une occasion de l'oublier, pour un oubli qui ne casse rien
de visible — juste un titre qui bégaie. `buildPageMetadata` le déduit de l'**emplacement**, qui le
dit déjà.

⭐ **Le séparateur est une clé de dictionnaire, et les deux langues diffèrent réellement** : tiret
cadratin entouré d'espaces en français, barre verticale en anglais. Ce n'est pas une différence
inventée pour satisfaire le test de non-régression — c'est la formulation idiomatique de chaque
langue, cherchée **d'abord**, comme la règle de P4-04 §9.3 le demande.

### 14.2 ⛔⛔ L'image de partage était générée, prégénérée — et invisible

Le premier build produisait bien `/fr/opengraph-image` et `/en/opengraph-image`, servies en PNG.
**Aucune page ne les référençait.**

Next attache l'image du fichier `opengraph-image.tsx` aux métadonnées du segment… **tant que la page
ne déclare pas d'`openGraph` elle-même**. Dès qu'elle en déclare un — ce que fait chaque page ici,
via `buildPageMetadata` —, il **remplace** celui du parent, image comprise. Le résultat est une
image parfaitement produite que personne ne voit.

⭐⭐ **Le mode de panne est de ceux que ce dépôt traque** : rien n'échoue, rien n'est journalisé, et
personne ne regarde une carte de partage à chaque déploiement. Un parcours E2E suit désormais
l'`og:image` **jusqu'à la réponse** : statut, type et taille. Annoncer une adresse ne prouve pas
qu'elle répond.

`shareImagePath(locale)` rejoint `notFoundPath(locale)` dans `src/routing/paths.ts` : trois endroits
doivent s'accorder au caractère près — le fichier qui produit l'image, les métadonnées qui
l'annoncent, et le manifeste qui autorise le proxy à la laisser passer.

### 14.3 ⭐⭐⭐ Le gate de P4-07 a travaillé pour P4-08, sans qu'on le lui demande

Le journal de P4-07 annonçait : *« il travaillera pour P4-08 sans qu'on le lui demande — une
`opengraph-image` est une route non-page, donc il la réclamera »*. C'est arrivé **deux fois**, et
chaque fois avant qu'un humain ne voie le défaut :

| Ce que le gate a refusé | Ce que ç'aurait coûté |
|---|---|
| `/[locale]/opengraph-image` **non prégénérée** | Un PNG de 1200×630 **calculé à chaque requête** sur un VPS à 2 vCPU, pour une image qui ne change qu'au déploiement. Une route de métadonnée n'hérite pas du `generateStaticParams` de son parent |
| `/fr/opengraph-image` et `/icon` **absentes des laissez-passer** | Le proxy les réécrivait en 404 : partage sans vignette, onglet sans icône |

⭐ **La liste écrite à la main reste écrite à la main, et le journal de P4-07 se trompait sur ce
point.** Il annonçait que P4-08 rendrait la dérivation rentable. Arrivé là, l'ajout tient en une
ligne, tandis que dériver demanderait de réimplémenter la table des fichiers de métadonnées de l'App
Router *et* l'expansion des segments dynamiques. **Une prédiction faite avant de voir le cas ne vaut
pas la mesure du cas** — et les deux sens du contrôle rendent cette liste vérifiée plutôt que crue.

### 14.4 L'icône : une raison mesurée, et une valeur d'attente assumée

Elle existe d'abord parce que son absence coûtait **14,5 Ko** : la requête d'icône que fait tout
navigateur recevait la page 404 complète (§13.10).

⚠️ **C'est un monogramme d'attente, et il est écrit comme tel.** Un logo est une décision de marque,
et elle appartient à l'auteur du site — c'est la règle qui garde les niveaux de compétence non
publiés (D2) et qui a coûté une tâche entière sur la précision des dates. Ce qui est rendu n'en est
pas un : ce sont les **initiales de `site.name`**, dérivées et non écrites, dans la couleur d'accent.
Le jour où un vrai logo existe, il remplace ce fichier et rien d'autre ne bouge.

⚠️ **Et l'effet est partiel, mesuré comme tel** : le `<link rel="icon">` est émis et pointe vers un
PNG de **473 octets**, donc tout navigateur qui lit le HTML l'emploie. Une requête **nue** sur
`/favicon.ico` — signet, certains robots — reçoit toujours la page 404. La fermer demanderait un
`public/favicon.ico` statique, c'est-à-dire une **copie figée** de l'icône générée, qui ne suivrait
pas un changement de `site.name`. C'est exactement la divergence que cette phase passe son temps à
supprimer : le cas résiduel est donc laissé ouvert plutôt que payé de cette monnaie-là.

### 14.5 Ce qui a été sorti des routes pour que l'exclusion reste honnête

`icon.tsx` portait une décision à branches — les initiales d'un nom : un seul mot, des espaces en
trop, une casse quelconque. Elle est dans `src/ui/initials.ts`, couverte à 100 %, et les deux routes
de métadonnée rejoignent les pages et les layouts dans les exclusions. C'est la règle de
`testing-strategy.md` §6 appliquée telle qu'elle est écrite, et non élargie pour l'occasion.

⚠️ **Les couleurs de l'image de partage sont recopiées de `globals.css`, et ne peuvent pas ne pas
l'être** : `ImageResponse` rend hors du navigateur, sans variables CSS. C'est la seule duplication du
palette dans le dépôt, et elle est **gardée** — un test refuse une couleur qui ne serait plus dans
les tokens, et il a été vu rouge. Le mode de panne, sinon, est purement visuel et silencieux.

### 14.6 Ce que la revue a changé

⛔⛔⛔ **Le défaut le plus grave a été livré, et Next l'avait écrit au build.** Faute de
`metadataBase`, Next résolvait lui-même les URL de métadonnée contre `http://localhost:3000` — son
défaut de développement. Les **deux pages introuvables**, seules à ne déclarer aucun `openGraph`,
recevaient donc l'image par convention de fichier… avec une adresse `localhost` **gravée dans du
HTML statique**, prête à partir en production.

```text
⚠ metadataBase property in metadata export is not set for resolving social open
  graph or twitter images, using "http://localhost:3000".
```

⭐⭐⭐ **L'avertissement était dans la sortie du build, en toutes lettres, et personne ne la
lisait.** C'est mot pour mot la leçon de la Phase 3 — *« les trois défauts réels de cette phase ont
été trouvés en lisant la sortie d'un outil, pas en relisant du code »* — et elle a été repayée ici.
Le correctif est une ligne ; le garde qui la protège porte sur **toutes** les pages servies, et non
sur celle qui a échoué : un parcours refuse désormais toute URL absolue dont l'origine n'est pas
celle de construction. **Vu rouge** en retirant `metadataBase`.

Trois autres constats, plus petits :

- ⛔ **L'`alt` de l'image décrivait la page, pas l'image.** Il reprenait `input.description` — la
  description de la *page* — alors que le PNG rend toujours celle du **site**. Sur toute page sauf
  l'accueil, il annonçait donc un contenu que l'image ne montre pas : une description d'image
  fausse, c'est-à-dire pire qu'absente.
- ⛔ **Le commentaire d'`icon.tsx` affirmait être gardé par un test qui ne le lisait pas.** La
  sonde de palette ne parcourait que `opengraph-image.tsx`. Elle lit maintenant **tout `src/app`** —
  la prochaine route de métadonnée qui recopiera une valeur sera couverte sans qu'on y pense.
- ⚠️ **L'`og:image` que nous construisons n'a pas de condensat**, là où celle que Next attache en
  porte un (`?628ff604…`). Une image redessinée garderait donc la même URL, et un cache social
  servirait l'ancienne vignette. Non corrigé : le condensat de Next n'est pas exposé, et le
  fabriquer supposerait de recalculer le contenu de l'image au moment des métadonnées. **Déclencheur
  écrit** : le jour où l'image de partage est redessinée, changer son adresse — un segment de
  version dans `shareImagePath` suffit.

### 14.7 Relevés

| Relevé après P4-08 | Valeur | Seuil |
|---|---|---|
| Socle partagé | **126,4 Ko** *(126,0 après P4-07)* | cible 136 · bloquant 146 |
| JS propre à chaque route | **7,3 Ko** sur 18 routes | cible 25 · bloquant 40 |
| Image de production | **272 Mo** *(268 après P4-07)* — **+4 Mo**, le coût de `next/og` | cible 250 · **bloquant 400** |
| Image de partage servie | 34,1 Ko (fr) · 31,4 Ko (en), 1200×630 | — |
| Icône servie | **473 octets** | — |
| Tests | **569** verts *(548 après P4-07)* | — |
| E2E | **117** verts sur 5 profils *(108 après P4-07)* | — |
| Couverture globale | **98,8 %** | ≥ 80 % |

⭐ **`next/og` n'ajoute aucune dépendance au verrou** — il est fourni par Next. Son coût est de
**+4 Mo dans l'image de production**, mesuré avant/après sur la même cible, et il est **entièrement
de build** : les deux images et l'icône sont gravées, le conteneur n'en calcule aucune.

### 14.7 bis Ce que `/simplify` a changé

⛔⛔ **La sonde de palette ne pouvait pas voir la duplication qu'elle était censée garder.** Elle
vérifie que chaque littéral **est** un token — jamais que deux fichiers désignent le **même**.
L'accent était écrit dans les deux images : en changer un et laisser l'autre gardait la suite verte
pendant que les deux se contredisaient sur la marque.

⭐⭐ **La bonne réponse n'était pas de mieux surveiller, mais de supprimer la copie.**
`src/ui/brand-palette.ts` porte les quatre valeurs **une fois**, les deux routes l'importent, et la
sonde lit désormais tout `src/`. Une duplication qu'un garde ne peut pas voir n'est pas gardée.

⛔ **Un commentaire de test affirmait un fait faux.** Il justifiait un filtre par « sinon le rendu
afficherait `undefined` » — or `Array.join` rend une valeur absente comme une chaîne vide, vérifié à
l'exécution. Le filtre ne protégeait rien, et sa justification demandait de couvrir une branche pour
un danger inexistant. `trim()` dit ce que le code fait vraiment.

Le reste est de la simplification, et la première trouvaille est la plus intéressante :

- **Un seul fait était écrit deux fois, à cinquante lignes d'écart** : « le titre de l'accueil *est*
  le nom du site » gouvernait la balise `<title>` d'un côté et l'`og:title` de l'autre. Les deux ne
  peuvent pas légitimement diverger — si elles le faisaient, l'accueil s'annoncerait autrement qu'il
  ne s'intitule. `isHome` le nomme une fois.
- `sharedTitle()` était **appelée deux fois** dans le même objet de retour, là où `images` était
  hoistée : une asymétrie sans raison, et un site de plus où un futur correctif désynchroniserait
  `og:title` de `twitter:title`.
- `shareImage()` n'avait qu'un appelant, qui l'enveloppait aussitôt dans un tableau.

⭐ **`LOCALE_OPENGRAPH` descend de `i18n` vers `seo`.** `fr_FR` est le vocabulaire d'**OpenGraph**,
pas celui du site : `i18n` est la couche qui ne dépend de rien et qui nomme les langues du *produit*.
Lui faire porter un protocole tiers dont elle n'a aucun usage était le mauvais étage. Le garde est
le même où qu'elle vive — ajouter une locale sans sa forme OpenGraph ne compile pas.

**Constats écartés**, avec leur raison :

| Constat | Raison de l'écart |
|---|---|
| Extraire une enveloppe commune aux deux `ImageResponse` | La ressemblance est **superficielle** : trois propriétés CSS partagées, tout le reste diverge (1200×630 contre 32×32, colonne contre ligne, trois enfants contre un). La vraie duplication était une **valeur**, pas une forme — et elle est supprimée |
| Dériver `title` et `description` de l'accueil, désormais redondants avec le `site` passé au même appel | Ferait de l'accueil le seul emplacement dont le titre est implicite, et `title` cesserait d'être une entrée uniformément obligatoire. La redondance est le côté le moins cher |
| Deux relectures du disque par la sonde de palette | Sous le bruit : une poignée de fichiers, deux fois par exécution |

### 14.8 Les six arbitrages, **tranchés le 2026-08-16 après la fusion**

⚠️ **Ils ont été posés trop tard, et c'est le défaut de méthode de ces deux tâches.** Ils étaient
consignés — dans ce journal, dans le corps de la PR — mais noyés dans de la prose : l'utilisateur les
a découverts **après avoir fusionné**. Un arbitrage enterré dans un rapport n'est pas un arbitrage
posé.

⭐ **Une décision qui n'est pas écrite est relitigée.** Elles le sont ici, datées, avec ce qui les
rouvrirait — pour que la session suivante n'ait pas à les reposer.

| # | Arbitrage | Décision | Ce qui la rouvre |
|---|---|---|---|
| 1 | **7,3 Ko de JS par route** (frontières d'erreur), là où le site était à 0,0 | **Garder les deux.** L'ordre d'arbitrage du projet met l'accessibilité avant la performance du contenu, et une page d'erreur sans `lang` est le même défaut WCAG 3.1.1 que la 404 corrigée | Un LCP sous pression mesuré en P4-13, ou l'arrivée d'un vrai composant client en Phase 5 — qui rendrait la question sans objet |
| 2 | **L'icône est un monogramme d'attente** | **Garder en attendant.** Elle existe pour une raison mesurée : 14,5 Ko de page 404 à chaque requête d'icône sans elle | Un logo fourni par l'auteur : un `icon.png` dans `src/app/` remplace le fichier généré, rien d'autre ne bouge |
| 3 | **`og:type` vaut `website` partout** | **Laisser.** L'annoncer `article` inviterait à chercher un `article:published_time` que nos dates à précision variable ne peuvent pas former | P4-09, qui porte la sémantique d'entité dans le JSON-LD |
| 4 | **`og:image` sans condensat** | **Laisser.** Le condensat de Next n'est pas exposé, et le fabriquer supposerait de recalculer l'image au moment des métadonnées | Le jour où l'image est **redessinée** : versionner son adresse dans `shareImagePath` |
| 5 | **`/favicon.ico` nu reste une 404** | **Laisser.** Le `<link rel="icon">` couvre tout navigateur qui lit le HTML ; fermer le cas nu demanderait une copie **figée** de l'icône générée | Une mesure qui montrerait un volume réel sur cette adresse |
| 6 | **Image de production à 272 Mo** contre une cible de 250 | **Ne rien changer**, conformément à `performance-budget.md` §7.1 : aucune image Node officielle n'atteint 250 Mo | Phase 11, qui doit remplacer cette ligne de budget par « couche applicative par déploiement ≤ 60 Mo » — la quantité réellement pilotable |

⭐⭐ **Ce qu'il faut retenir n'est aucune de ces six décisions**, mais le fait que cinq d'entre elles
étaient **prêtes à être prises avant la fusion** et ne l'ont pas été. Une tâche qui produit des
arbitrages doit les présenter **comme une liste de décisions**, au moment où ils naissent — pas les
consigner en prose dans un journal que personne ne lit avant de fusionner.

## 15. P4-09 — ce que la page dit à une machine, et ce qu'elle refuse de lui dire

### 15.1 Les quatre arbitrages, posés **avant** d'écrire une ligne

⭐⭐⭐ **C'est la leçon de §14.8 appliquée le jour suivant.** P4-07 et P4-08 avaient produit six
arbitrages consignés en prose et découverts après la fusion. Ceux-ci ont été présentés comme une
**liste de décisions avec un défaut recommandé**, au moment où ils sont nés — c'est-à-dire après la
lecture du code et avant la première ligne écrite.

| # | Arbitrage | Décision de l'utilisateur |
|---|---|---|
| 1 | `Person.sameAs` — les URL de profils n'existent **nulle part** dans le dépôt | **Fournies** : GitHub et LinkedIn, entrées dans `src/seo/profiles.ts`, source unique |
| 2 | `Person.jobTitle` — « développeur Full-Stack » n'est écrit que dans une phrase | **Clé de dictionnaire.** Ce n'est pas une affirmation neuve : elle est déjà publiée dans `site.description` |
| 3 | `Person.knowsAbout` dérivé des dix compétences `featured` | **Oui**, par leur nom seul |
| 4 | Portée du `BreadcrumbList` | **Sections et fiches**, là où `architecture.md` §9 n'écrivait que « détails » |

⭐ Le premier ne pouvait pas être tranché par défaut : **une URL de profil ne se devine pas.**
L'adresse du dépôt d'un projet (`content/`) donne le nom de compte GitHub — et une inférence juste
sur l'un aurait autorisé une inférence fausse sur l'autre, LinkedIn n'ayant aucune source.

### 15.2 Ce qui n'est pas affirmé, et c'est le fond de la tâche

Une donnée structurée est lue par une machine et par personne d'autre. Un champ faux n'a **aucun
symptôme** : pas d'erreur, pas de page cassée, pas de test rouge ailleurs. C'est exactement la classe
que P4-17 a coûté une tâche entière à fermer sur les dates, et trois champs ont été refusés pour
cette raison.

| Refusé | Pourquoi |
|---|---|
| Les **niveaux** de compétence (1 à 5) | Auto-évaluation que personne n'a relue — **D2, ouverte**. `/skills` ne les affiche pas depuis P4-06 ; les republier par le canal des machines serait la porte de derrière. `knowsAbout` ne porte que des noms, et deux tests l'exigent dont un parcours |
| Une **organisation** pour les expériences | `Person.worksFor` affirmerait un employeur : or l'une des deux expériences est le projet propre de l'auteur, **société non constituée** (`content/README.md`). Une fiche d'expérience porte donc son fil d'Ariane, et rien d'autre |
| Le **dépôt** d'un projet | `content/` porte `links.repository`, et **aucune page ne le rend**. Une donnée structurée décrit ce que la page affiche ; l'émettre publierait par les métadonnées un lien que le visiteur ne peut pas suivre |
| Une **description** de la personne | Voir §15.5 — c'est la décision éditoriale **D7**, ouverte |

⛔ **Il n'existe pas de type schema.org honnête pour « un poste occupé ».** `CreativeWork` serait
faux. C'est ce qui laisse les fiches d'expérience au seul fil d'Ariane, et c'est écrit plutôt que
subi.

### 15.3 `dateCreated` était le dernier endroit où P4-17 pouvait se perdre

P4-04 l'annonçait en toutes lettres : *« P4-09 lira `experience.startedAt` sur l'entité et réémettra
`2021-01-01` dans le JSON-LD : ni type, ni test, ni règle de cloisonnement ne l'en empêche »*. P4-17
a rendu la propriété vraie **par construction** en faisant voyager la précision avec la donnée — il
restait à ne pas la retrancher ici.

Le champ est réémis **verbatim** : `2021` reste `2021`. Un parcours le compare à l'attribut
`datetime` **réellement servi** sur la même page, ce qui le rend indépendant du contenu du jour : les
deux canaux lisent la même valeur, et c'est cela qu'il faut garder.

### 15.4 ⭐⭐ Le garde d'origines de P4-08 a rougi, et l'assouplir aurait été la mauvaise réponse

Le parcours « aucune page ne grave une autre origine que celle de construction » est devenu rouge dès
le premier build : les données structurées gravent légitimement **trois** origines étrangères — le
vocabulaire `https://schema.org` et les deux profils publics.

La réponse facile était « toute origine externe est tolérée ». Elle aurait rendu le `localhost` de
P4-08 **réinvisible, dans le garde même qui existe pour lui**. Chaque origine admise est donc
**nommée**, et elle l'est en **important sa source** : recopier les profils dans le test en aurait
fait une seconde écriture, celle-là même que `src/seo/profiles.ts` supprime.

### 15.5 Ce que la revue a changé

`/code-review` a trouvé **quatre défauts réels** sur un travail dont tous les gates étaient verts.
Deux relèvent de classes que cette phase a déjà payées.

⛔⛔ **Une œuvre dont l'auteur n'avait pas de nom.** `CreativeWork.author` désignait la personne par
son seul `@id`, alors que le nœud `Person` complet n'est émis que par l'accueil. Pour qui ne lit
qu'une fiche de projet — ce que fait tout consommateur de données structurées —, la référence
résolvait vers un **nœud anonyme**. Le `@id` reste ce qui rattache les deux au même être ;
`personReference` y ajoute le nom, qui est ce qui rend la référence lisible seule.

⛔⛔ **La personne était décrite avec la description du site.** `Person.description` recevait
`site.description` — « Portfolio de développeur Full-Stack : expériences, projets et compétences » —,
c'est-à-dire une phrase écrite pour décrire des **rubriques**, affirmée sur quelqu'un, et répétée mot
pour mot sur le nœud `WebSite` du même graphe.
⭐⭐ **C'est la faute de l'`alt` d'image de P4-08, à l'identique** : décrire A avec le texte de B. Une
description fausse est pire qu'absente. Le champ est retiré ; aucune prose sur Aurélien n'existe dans
ce dépôt, et en écrire une est la décision **D7**. Le jour où elle est tranchée, sa place est là.

⛔ **`Person.url` désignait l'origine nue**, qui n'est pas une page mais une **redirection 307**
négociant `Accept-Language` (P3-03), absente de tout sitemap. Le commentaire juste au-dessus
promettait déjà « l'accueil de la locale par défaut » — **quatrième fois de cette phase qu'une prose
survit au code qu'elle décrit**. C'est désormais `/fr`. `WebSite.url` garde l'origine, et la raison
est écrite : un `WebSite` **est** le site, là où `Person.url` promet une page qui parle de quelqu'un.

⚠️ Et un parcours échouait par `TypeError` avant d'atteindre l'assertion qui garde D2 : il lisait la
longueur d'un champ que l'émetteur **omet** délibérément quand la liste est vide. Un test doit
échouer en disant pourquoi.

### 15.5 bis Ce que `/simplify` a changé — et l'altitude est l'angle le plus tranchant

⛔⛔ **Le câblage rouvrait la classe d'erreur que `page-metadata.ts` existe pour fermer.** Chaque
route de section nommait désormais sa section **trois fois** — dans son `PageLocation`, dans
`sectionMetadata(…)`, et dans les données structurées — sans que rien ne relie les trois. Une seule
écriture par route, `SECTION`, dont les trois consommateurs dérivent. C'est aussi
`projectStructuredData` qui écrivait `'projects'` deux fois dans la même fonction, là où
`CreativeWork.url` et le dernier niveau du fil d'Ariane de la **même page** auraient pu désigner deux
sections différentes.

⭐⭐ **Deux fonctions dont les corps ne différaient que par un argument.** `sectionStructuredData` et
`experienceStructuredData` produisaient toutes deux `jsonLdDocument([breadcrumbNode(…)])`, et
`trailTo` acceptait déjà exactement la signature qui les réunit. Il n'y en a plus qu'une,
`breadcrumbStructuredData` ; la prose sur l'absence de type schema.org honnête pour « un poste
occupé » s'y déplace intacte.

⛔ **La garde nullable de `JsonLd` était une branche morte, couverte par un test écrit pour elle** —
c'est-à-dire, mot pour mot, ce que le commit précédent de cette même branche venait de supprimer dans
`trailTo`. Le principe était appliqué à un fichier du lot et pas à l'autre. Le prop est devenu non
nullable ; son type reste **structurel** (`Record<string, unknown>`) et non `JsonLdDocument`,
`src/ui` n'ayant pas le droit d'importer `src/seo`.

⭐ Réutilisation : `freezeSiteUrl` extrait au **deuxième exemplaire identique** — la restauration de
`SITE_URL` est du code de garde, et une copie qui oublie le `delete` fait échouer une **autre** suite
que celle qui a fauté ; `makeSkill` remplace un faux dépôt écrit à la main, ce qui rend le garde D2
strictement plus fort ; `SCHEMA_CONTEXT` et `personId` sont **dérivés** en E2E au lieu d'être
transcrits ; un document n'est plus téléchargé deux fois dans le même parcours ; et deux assertions
qui ne pouvaient pas échouer ont été retirées.

⭐⭐ **Le parcours qui lie le fil d'Ariane au `h1` visite désormais les deux sections à détail.** Le
nom de la feuille est choisi par deux chemins différents — la route d'expérience passe
`experience.role`, le composeur de projet dérive `project.title`. N'en garder qu'un laissait l'autre
sans mécanisme, et c'est ce qui autorise la décision à vivre dans une route : elle est **confrontée**.

⚠️ **Deux constats écartés, avec leur raison.** `projectStructuredData` reconstruit un `PageLocation`
que la route possède déjà : le passer en paramètre serait **incohérent avec `entityMetadata`**, qui
prend `section` et `slug` et construit le sien — l'uniformité des deux composeurs vaut mieux qu'une
construction en moins. Et `await (await request.get(path)).text()` apparaît huit fois dans trois
parcours, dont **six antérieures** à cette tâche : le double téléchargement de ce diff est corrigé,
l'extraction d'un `htmlOf` partagé est un déclencheur écrit et non un refactor à faire passer dans
une PR de fonctionnalité.

### 15.5 ter Ce que la mesure d'efficacité a établi, et le seul coût qui atteint un visiteur

Tout le travail que ce diff ajoute au build est **sous le plancher de bruit** que le dépôt s'est fixé
(`phase-2-log.md` §18.3) : ~0,4 ms à chaud sur 851 ms de génération statique. La seule E/S neuve est
`getFeaturedSkills` sur les deux accueils — **3,06 ms à froid**, 0,7 % du budget. Par la règle du
dépôt, on ne fait rien.

⚠️ **Un chiffre à consigner tout de même** : `phase-3-log.md` §19.7 place le déclencheur de la
revalidation Zod à **~50 entités par section**. `skills` en compte **40**. L'appel ajouté est
linéaire — les compétences n'ont pas de page de détail —, mais on s'approche du seuil.

⭐⭐ **Le seul coût qui atteint réellement un visiteur, personne ne l'avait chiffré** : chaque page
embarque son JSON-LD **deux fois** — le `<script>` servi, plus une copie échappée dans la charge RSC
(`self.__next_f`), **34 % plus grosse** à cause du triple échappement. Soit **~200 octets brotli par
page** de duplication pure.
⚠️ **Ce n'est pas un défaut de ce diff** : tout balisage rendu par le serveur figure dans les deux
canaux — « Aurélien Feignon » apparaît 24 fois dans `/fr.html`. Aucune API publique de Next ne permet
d'émettre un `<script>` hors de l'arbre React. Le chiffre est ici pour ne pas être redécouvert, et
pour que P4-13 sache d'où viennent ces octets s'il mesure un LCP sous pression.

Deux corrections écrites malgré des gains nuls, **parce que le dépôt a déjà payé pour les apprendre** :

- ⛔ **Le contrôle « chaque page du sitemap porte des données structurées » téléchargeait 14 pages en
  série.** C'est mot pour mot le motif que `phase-3-log.md` §19.5 a supprimé et dont §19.7 a écrit le
  déclencheur chiffré. Le réintroduire dans le commit qui cite la leçon aurait été le comble.
- ⛔⛔ **`sitemapPaths` refaisait sa requête à chaque appel, alors que sa propre docstring affirme
  « lu une seule fois pour tous les profils E2E ».** Cinquième prose de cette phase à survivre au code
  qu'elle décrit, et la seule trouvée par la **mesure** : cinq téléchargements du même sitemap sur les
  parcours de cette tâche. La promesse est désormais mémoïsée — pas son résultat, comme la couche
  Content le fait depuis P2-03.

### 15.6 ⭐ Deux branches mortes, trouvées par la sortie de `make coverage`

`trailTo` prenait un `PageLocation` complet et traitait le cas « accueil » — qu'aucun appelant ne lui
passe, l'accueil n'ayant pas de fil d'Ariane — plus un `entityName` optionnel qui ne pouvait jamais
manquer. Deux lignes jamais exécutées, invisibles à la relecture, **nommées par le rapport de
couverture**.

Elles ont été **supprimées, pas couvertes** : écrire un test pour une branche inatteignable donne un
chiffre vert et un mécanisme qui ment. La signature dit maintenant ce qui existe — une locale, une
section, et une feuille optionnelle.

### 15.7 ⚠️ Le piège de casse de la Phase 3, repayé

Un parcours comparait `dateCreated` à l'attribut `datetime` servi, et échouait : Next rend l'attribut
sous la forme **`dateTime`**, en casse mixte. Les noms d'attributs HTML étant insensibles à la casse,
le site est correct — c'est l'extraction qui était fausse.

⭐ C'est mot pour mot `phase-3-log.md` §14.1, où `hrefLang` avait rendu un test **vert sans rien
inspecter**. Ici il a échoué, et pour la seule raison qui vaille : l'assertion de non-vide écrite
avant de croire l'extraction.

### 15.8 ⛔ `/code-review` s'ancre sur le répertoire de la **session**, pas sur le dépôt qu'on édite

Le premier appel du rituel a relu un **autre dépôt** — celui d'où la session avait été ouverte — et
rendu six constats sur du code Python sans aucun rapport. Rien ne le signalait : le rapport était
crédible, structuré, et faux de bout en bout.

⭐⭐ **Un outil qui répond à côté répond quand même.** Vérifier que le rapport nomme des fichiers du
diff en cours est le seul contrôle qui coûte zéro. Le second appel, avec le chemin passé
explicitement, a rendu les quatre constats de §15.5.

### 15.9 Relevés

| Relevé après P4-09 | Valeur | Seuil |
|---|---|---|
| Socle partagé | **126,4 Ko — inchangé** | cible 136 · bloquant 146 |
| JS propre à chaque route | **7,3 Ko — inchangé** sur 18 routes | cible 25 · bloquant 40 |
| Image de production | **273 Mo** *(272 après P4-08)* — **+0,5 Mo** | cible 250 · **bloquant 400** |
| Tests | **606** verts *(569 après P4-08)* | — |
| E2E | **128** verts sur 5 profils *(117 après P4-08)* | — |
| Couverture globale | **98,69 %** *(98,61 après P4-08)* | ≥ 80 % |
| Mutations appliquées | **15** avant la revue, **13 rejouées** après le refactor — toutes tuées | — |

⭐⭐ **Une seule de ces mutations n'est pas tuée par la suite unitaire, et c'est instructif** : coller
`SECTION = 'projects'` sur la page des compétences laisse les 606 tests verts. Les routes ne sont pas
exercées par Vitest, et c'est **écrit** (`testing-strategy.md` §6, exclusion assumée). Le banc E2E,
lui, la tue sur **six parcours** — la vérification a été faite, pas supposée. C'est exactement ce qui
rend l'exclusion honnête, et la première fois qu'elle est éprouvée par une mutation.

⭐ **Zéro octet de JavaScript client ajouté**, et c'est vérifié plutôt que supposé : un
`<script type="application/ld+json">` est un bloc de **données**, pas de code. Le budget de bundle le
mesure — 7,3 Ko par route, exactement comme avant la tâche.

### 15.10 Ce que P4-09 laisse ouvert

| Sujet | État |
|---|---|
| `Person.description` | Vide tant que **D7** n'est pas tranchée. Le jour où l'accroche existe, sa place est ce champ |
| `links.repository` n'est **rendu par aucune page** | Dette nommée ici : le contenu le porte, personne ne l'affiche, et le JSON-LD ne peut donc pas l'annoncer. À reprendre avec la fiche de projet |
| Les profils vivent dans `src/seo/profiles.ts` | **Déclencheur écrit** : au troisième consommateur — un « À propos » (Phase 9), une page de contact (Phase 10) —, la question d'un type de contenu « personne » se rouvre. Deux ne la justifient pas |
| `knowsAbout` sur l'accueil | Les dix compétences vivent sur `/skills`. `Person` décrit une personne, pas la page qui la porte ; s'il fallait resserrer, sa place serait `/skills` |
| CSP et blocs `ld+json` | **Note écrite dans le code** pour l'ADR-0015 (Phase 14) : une `script-src` stricte les supprimerait **en silence**. La politique devra porter un `nonce` ou un condensat |

## 16. D7 et D3 — l'accroche vient du CV, et on ne publie pas de volume

### 16.1 ⭐⭐ Ce qui change n'est pas qu'une accroche existe, c'est **d'où elle vient**

P4-03 avait refusé d'écrire un texte de présentation, et avait raison : une prose sur le parcours
d'Aurélien rédigée par une session est une **affirmation sur quelqu'un** que personne ne tient de
lui. L'accueil affichait donc `site.description`, une méta-description — *exact et insuffisant*,
comme le disait §8.2.

Elle affiche désormais le **profil du CV, mot pour mot**. Ce texte n'est pas neuf : le site le
distribue déjà en PDF depuis la Phase 2. Rien n'est inventé, et les deux canaux disent la même chose.

⚠️ **Clé de dictionnaire (`site.intro`), pas `content/`.** La règle opérationnelle est écrite dans
`fr.ts` : *« si une phrase parle d'une expérience ou d'un projet en particulier, elle est du
contenu »*. Celle-ci ne nomme ni l'un ni l'autre. Un type de contenu « personne » coûterait un
schéma, un gate, des fixtures et une route pour un texte unique. **Déclencheur de réouverture** : le
jour où ce texte doit porter du balisage — un lien, une emphase, un second paragraphe.

⭐ `site.jobTitle` a été **aligné sur le CV** au passage : il porte « senior », que la clé omettait
depuis P4-09. Deux documents publiés par le même site ne peuvent pas s'intituler différemment.

⭐ Effet de bord : `Person.description` du JSON-LD, que P4-09 avait laissé **vide plutôt que rempli
avec la mauvaise valeur**, a enfin la bonne. Un test vérifie qu'elle diffère de celle du `WebSite`
du même graphe — c'est la confusion exacte qu'une revue avait écartée.

⚠️ **Le second volet de D7 reste ouvert**, et ce n'est pas un oubli : les `sections[x].description`
sont toujours à la fois la méta-description d'une page de section et la copie visible des cartes de
l'accueil. Les séparer en six clés porterait **trois valeurs identiques** — une duplication sans
contenu derrière. Le jour où la copie d'une carte doit différer de sa méta, la séparation est
`sections[x].summary` / `sections[x].description`.

### 16.2 D3 — close par « assumé », et l'inventaire est la raison

Le GitHub ne contient que **quatre projets scolaires ENI de 2021** — `api_sortir` (PHP/Symfony),
`ENITPEnchere` (Java/JEE), `AppSortie` (React Native), `appSortieAndroid` (Java) —, zéro étoile,
dernier push octobre 2021, plus ce portfolio.

⭐⭐ **Les publier à côté d'Augure abaisserait le signal au lieu de le monter.** Un CTO lit le plus
faible, pas le plus fort, et le CV annonce un profil senior. La profondeur technique est déjà portée
par les fiches d'expérience. Le levier reste d'écrire un projet représentatif d'aujourd'hui, pas
d'ajouter du volume.

## 17. P4-10 — la passe d'accessibilité, et un défaut que P4-07 avait laissé ouvert

### 17.1 ⭐⭐⭐ Ce qui change n'est pas le nombre de contrôles, c'est leur **périmètre**

Chaque tâche de la phase avait ajouté son audit axe sur les pages qu'elle venait d'écrire : `/fr` en
P4-03, la liste et une fiche en P4-04, `/fr/skills` en P4-06, la 404 en P4-07. **Sept pages nommées à
la main** — et P4-07 avait écrit la conséquence en toutes lettres : *« un audit d'accessibilité ne
couvre que les pages qu'on lui donne »*. C'est ainsi que la 404 est restée sans `<html lang>` depuis
P3-02 sans que le gate axe la voie.

Le périmètre est désormais **dérivé du sitemap**, plus les deux pages introuvables qui n'y figurent
pas — celles-là mêmes qui portaient le défaut. Une huitième page écrite demain est auditée sans que
personne y pense.

⚠️ **Trois contrôles ne sont pas dans axe**, et c'est pourquoi ils sont écrits à la main :
`heading-order`, `page-has-heading-one` et `landmark-one-main` sont classés *best-practice* par
axe-core, donc **hors** des tags WCAG audités. Les ajouter à la liste de tags ferait entrer des
dizaines de règles de style ; les exiger explicitement dit ce que la mission demande — « titres,
focus, contrastes, points de repère » — et rien d'autre. Le **contraste**, lui, est dans `wcag2aa` :
il est déjà couvert, et un contrôle séparé donnerait deux mesures du même critère.

### 17.2 ⛔⛔ Un défaut réel, encore ouvert après P4-07 — et mesuré

Le matcher du proxy exclut `_next/`, pour ne pas faire traverser une fonction à chaque ressource
statique. Une adresse **inconnue** sous ce préfixe ne recevait donc pas la 404 réécrite mais la 404
**interne** de Next, servie hors de tout layout. Relevé avant/après, même commande :

```text
sans le plancher : /_next/inexistant → 404 | <html>              ← sans lang
avec le plancher : /_next/inexistant → 404 | <html lang="fr">
```

C'est la violation WCAG 3.1.1 que P4-07 avait supprimée **par la porte principale**, restée ouverte
par celle-ci. `experimental.globalNotFound` pose `src/app/global-not-found.tsx` **sous** le mécanisme
de réécriture.

⭐ **Le drapeau est expérimental sur Next 16.3, et c'est vérifié plutôt que cru** : le build
l'annonce (`Experiments (use with caution) : ✓ globalNotFound`). P4-07 l'avait écarté faute d'avoir
instruit ce point — l'instruction était le travail, et elle a trouvé un défaut.

⚠️ Un parcours garde le plancher, ce qui rend le drapeau **retirable sans surprise** : son retrait ne
casserait rien de visible, juste l'attribut que personne ne regarde.

### 17.3 ⭐⭐ Le garde des endroits ne tenait qu'un sens

`LAYOUTS` est un `Record<CurrentPlace, …>` : le compilateur exige qu'un endroit **du type** ait sa
ligne. Il ne dit rien d'un `layout.tsx` posé dans l'arborescence sans que le type bouge — et P4-07
avait nommé le cas sans le fermer : *« si le layout de la 404 avait déclaré `current="home"`, le type
ne se serait jamais élargi et rien n'aurait rougi »*.

Le garde lit désormais le **disque** et le confronte à la table. Les deux sens sont tenus : le
compilateur pour type → table, le disque pour arborescence → table.

⭐ Il a immédiatement trouvé un écart réel : le dossier s'appelle `404`, l'endroit `notFound`. Deux
traductions existaient déjà — `(home)` est un groupe de routes, `404` un chiffre qu'un identifiant
TypeScript ne peut pas porter. Elles sont dans une table `Record<CurrentPlace, string>`, exhaustive
par construction : un sixième endroit ne compile pas tant qu'on n'a pas dit **où** il vit.

### 17.4 La dette des cinq fichiers, soldée — et `brand-palette` a demandé mieux qu'un test

Quatre fichiers ont reçu leur test de composant. Le cinquième, `brand-palette.ts`, restait à 0 % pour
une raison différente : les deux gardes qui le surveillent parcourent `src/` comme du **texte** et ne
chargent aucun module.

⭐ **Lire un fichier n'est pas l'exécuter.** Le garde des tokens **importe** désormais le palette et
confronte chaque valeur au token du même nom. Il est strictement plus fort : le texte d'un fichier
peut contenir la bonne couleur dans un commentaire pendant que la constante en porte une autre, et le
contrôle textuel le laisserait vert.

⭐ `PlaceLayout` était à 0 % alors qu'un garde l'exerçait — celui-ci l'**appelle** sans le rendre,
pour lire la valeur transmise. Les deux ne mesurent pas la même chose et aucun ne remplace l'autre :
là-bas *quel endroit chaque layout déclare*, ici *ce que le layout en fait*.

### 17.5 Ce que les mutations ont dit, et une qui a survécu à bon droit

⛔⛔ **Le premier harnais de mutation était faux, et il déclarait « survivant » ce qu'il n'avait
jamais exécuté.** Trois mutations cassaient le JSX ; `make build` échouait ; le parcours tournait
contre l'**image précédente** et passait au vert. C'est la panne de « succès silencieux » que ce
dépôt traque, écrite dans son propre outillage de vérification. Le harnais exige désormais un build
vert avant de conclure.

⭐⭐ **Une mutation survit, et c'est correct.** Renommer notre règle `:focus-visible` ne fait pas
rougir le parcours du focus — l'anneau par défaut du navigateur prend le relais, et WCAG 2.4.7 est
satisfait par lui. Ce qui doit rougir est `outline: none`, la suppression **de tout** indicateur :
c'est le cas, vu rouge. Le test mesure le **résultat exigé**, pas le mécanisme qui le produit — la
première mutation était fausse, pas le test.

### 17.6 Relevés

| Relevé après P4-10 | Valeur | Seuil |
|---|---|---|
| Socle partagé | **126,4 Ko — inchangé** | cible 136 · bloquant 146 |
| JS propre à chaque route | **7,3 Ko — inchangé** | cible 25 · bloquant 40 |
| Image de production | **273 Mo — inchangée** | cible 250 · **bloquant 400** |
| Tests | **622** verts *(606 après P4-09)* | — |
| E2E | **135** verts sur 5 profils *(128 après P4-09)* | — |
| Couverture globale | **100 %** sur les quatre métriques *(98,69 après P4-09)* | ≥ 80 % |
| Violations axe serious/critical | **0** sur **les 16 pages servies**, périmètre dérivé | 0 |

⭐⭐ **La couverture revient à 100 %**, et pour la première fois depuis P4-05 le chiffre est vrai —
c'est celui que §13.8 croyait annoncer.

### 17.7 Ce que la revue a changé — huit constats, tous dans mes propres gardes

Aucun défaut dans le code de production. Les huit portent sur les gardes neufs, et **plusieurs
documentaient un contrat plus fort que ce qu'ils vérifiaient réellement** — la classe que cette phase
traque, retournée contre son propre outillage.

⛔⛔ **La thèse de la tâche, appliquée partout sauf à la page que la tâche ajoute.**
`global-not-found.tsx` était le seul document servi qui n'était **ni audité par axe, ni contrôlé sur
son plan de titres** : seul son `lang` était vérifié. Le périmètre distingue désormais les *pages du
site* — qui portent les trois points de repère — des *documents servis*, qui incluent le plancher.
Celui-ci n'a ni bannière ni pied de page et ne peut pas en avoir : Next ne l'entoure d'aucun layout,
et les recopier hors du layout en ferait une seconde source.

⛔ **Trois gardes promettaient plus qu'ils ne mesuraient.** Le contrôle des noms accessibles
affirmait lire le *nom calculé* et ne lisait que le texte et `aria-label` — un lien nommé par
`aria-labelledby`, par `title` ou par l'`alt` d'une image aurait produit un **faux échec**. Le
contrôle du focus promettait d'accepter un fond repeint et n'échantillonnait que le contour. Et le
lien d'évitement était déclaré « visible » sur sa seule géométrie, qu'un `opacity: 0` ou un
`clip-path` laisse intacte. Les trois disent maintenant ce qu'ils font, et le font.

⛔ **Un garde qu'on ne peut pas satisfaire se contourne, il ne se répare pas.** Le garde des endroits
lisait tous les `layout.tsx` du sous-arbre : un `projects/[slug]/layout.tsx` — parfaitement légitime —
l'aurait rendu rouge **sans qu'aucune déclaration ne puisse le satisfaire**, `DIRECTORY_OF` associant
un dossier à un `CurrentPlace`. Il ne considère plus que les enfants directs de `[locale]`, et ce que
la borne laisse passer est écrit : un layout imbriqué qui poserait un second en-tête est attrapé par
le compte des points de repère de cette même tâche.

⭐⭐ **Une exclusion de couverture avec la mauvaise raison est une exclusion non justifiée.** J'avais
exclu `global-not-found.tsx` en recopiant le motif de `global-error.tsx` — « il faudrait simuler
`usePathname` » —, or ce composant n'a ni hook, ni props, ni asynchronie. L'exclusion est retirée et
le composant **testé**.

⚠️ **Un audit de dix-sept documents dans un seul test, contre les 30 s par défaut de Playwright.**
Mesuré à 9 s ici ; sur un runner chargé, la CI serait rouge sur du code conforme — le pire signal
possible. Le délai est désormais explicite.

⚠️ Et l'en-tête du garde des enveloppes annonçait **deux** émetteurs de `<html>` pendant que son
assertion en attendait trois. Une prose qui survit au code qu'elle décrit, dans le fichier même dont
c'est le sujet.

⚠️ **Un constat non traité, avec sa raison** : les audits axe par tâche (P4-03, P4-04, P4-06, P4-07)
n'ont pas été retirés, si bien que cinq pages sont auditées deux fois. Ils sont conservés parce que
chaque parcours reste **lisible seul** — un lecteur de `skills.spec.ts` y voit que la page est
auditée —, et le coût est de quelques secondes. Le déclencheur de retrait est le jour où ce doublon
pèse sur la durée de la suite.

### 17.8 Relevés définitifs

| Relevé après revue | Valeur | Seuil |
|---|---|---|
| Tests | **625** verts | — |
| E2E | **135** verts sur 5 profils | — |
| Couverture globale | **100 %** sur les quatre métriques | ≥ 80 % |

## 18. P4-11 — le responsive, et deux défauts que rien ne pouvait signaler

### 18.1 ⭐⭐⭐ La première tâche de la phase sans garde derrière elle

Un débordement horizontal ne lève rien, ne casse aucun test, et n'apparaît dans aucun rapport axe :
la page s'affiche, elle se lit simplement de travers. Une cible tactile trop courte est du même
ordre — ni erreur, ni violation rapportée, ni dépassement de budget.

C'est la forme que P4-05 avait déjà rencontrée : un mur de texte livré avec 496 tests verts, un axe
propre et les budgets tenus. **Une régression purement géométrique ne se prouve que par une mesure
géométrique**, et cette tâche a donc commencé par mesurer, pas par corriger.

Trois contrôles, aucun jugement esthétique : **débordement** du document, **cibles tactiles** contre
le token, et **rognage** — parce qu'un `overflow: hidden` quelque part absorbe le dépassement, ce
qui est pire et invisible à la première mesure.

⚠️ **Les largeurs ne sont pas des appareils.** 320 / 375 / 768 / 1024 / 1440 couvrent un domaine ;
émuler un téléphone particulier mesurerait ce téléphone-là.

### 18.2 ⛔⛔ Deux défauts réels, en production, trouvés par la première exécution

| Défaut | Portée |
|---|---|
| **Le sélecteur de langue n'avait aucun module CSS** — son lien faisait la hauteur d'une ligne | **Les 16 pages servies**, à toutes les largeurs tactiles |
| Le lien « retour à l'accueil » était **nu dans trois fichiers** | La 404 localisée, le plancher, les frontières d'erreur |

Ni l'un ni l'autre n'était visible autrement. Le sélecteur est en place depuis **P3-09** et a
traversé cinq tâches, dont une passe d'accessibilité complète : axe ne rapporte pas WCAG 2.5.8, qui
est une contrainte de **taille**, pas de sémantique.

⭐ Les deux correctifs composent `tapTarget`, le module extrait en P4-03 « au troisième exemplaire ».
Son en-tête annonçait déjà : *« P4-11 vérifiera les cibles sur trois largeurs. Qu'elles viennent
toutes d'ici est ce qui rend cette vérification tenable. »* C'est exactement ce qui s'est passé —
deux fichiers à corriger au lieu de six.

⚠️ **Le seuil est lu dans le token, jamais recopié dans le test.** Écrire « 44 » dans le parcours en
ferait une seconde source, et le jour où `--tap-target-min` change, le garde défendrait l'ancienne
valeur en silence.

### 18.3 Le profil `mobile-safari` n'avait pas de dossier propre

Seul des cinq. Sans conséquence tant qu'aucun parcours n'était spécifiquement mobile — et c'est ce
qui rendait l'exigence de P4-11, *« E2E `mobile-safari` : aucun débordement horizontal, cibles
tactiles »*, impossible à satisfaire au bon endroit.

⭐ Une largeur émulée par `setViewportSize` n'est pas un téléphone : elle ne dit rien du
`devicePixelRatio`, ni de la façon dont WebKit calcule les métriques de police. Le balayage complet
reste sur `desktop-chromium` ; le profil mobile vérifie que le **moteur** ne dément pas ce que la
géométrie annonce.

### 18.4 Ce que les mutations ont dit

**Trois appliquées, trois tuées** : le sélecteur privé de sa cible tactile, une boîte figée à 900 px
de large, et un conteneur qui **rogne** au lieu de déborder — cette dernière étant celle que le
premier contrôle ne peut pas voir, et la raison d'être du troisième.

⛔ **Une restauration a échoué en silence**, et il faut le dire : `git checkout --` ne rend pas un
fichier **non suivi**, et le module neuf est resté muté après sa mutation. Constaté en relisant
l'arbre plutôt qu'en le supposant propre — le réflexe que ce dépôt applique aux gates s'applique
aussi à son propre outillage.

### 18.5 Relevés

| Relevé après P4-11 | Valeur | Seuil |
|---|---|---|
| Socle partagé | **126,4 Ko — inchangé** | cible 136 · bloquant 146 |
| JS propre à chaque route | **7,3 Ko — inchangé** | cible 25 · bloquant 40 |
| Image de production | **273 Mo — inchangée** | cible 250 · **bloquant 400** |
| Tests | **627** verts *(625 après P4-10)* | — |
| E2E | **140** verts sur 5 profils *(135 après P4-10)* | — |
| Couverture globale | **100 %** sur les quatre métriques | ≥ 80 % |
| Débordement horizontal | **0** sur 16 pages × 5 largeurs | 0 |

⭐ Aucun octet de CSS de mise en page conditionnelle n'a été nécessaire : **le site n'a toujours
aucune media query de largeur**. La mise en page fluide de l'ADR-0010 tenait déjà ; ce que P4-11
apporte est la **preuve**, et deux cibles tactiles qui manquaient.

### 18.6 Ce que la revue a changé — dont une régression que la tâche avait elle-même introduite

⛔⛔ **Le sélecteur de langue a reçu un module qui compose `bareList` sans
`role="list"`.** `bare-list.module.css` porte pourtant l'invariant en toutes lettres :
`list-style: none` **retire la sémantique de liste à VoiceOver sous Safari** — le lecteur d'écran
cesse d'annoncer « liste de 5 éléments ». Six consommateurs sur sept portaient l'attribut, le
septième non, et **rien ne le disait**. La régression touchait les 16 pages servies, sur le moteur
même que le profil mobile de cette tâche venait couvrir.
⭐⭐ Le correctif n'est pas l'attribut, c'est le **garde** : `every-bare-list-keeps-its-role.test.ts`
confronte les modules qui composent `bareList` aux composants qui emploient leur classe. Vu rouge
avant d'être cru.

⛔⛔ **`composes` ne s'est pas propagé en chaîne.** `.textLink` composait `.accentLink` en comptant
sur le `composes: tapTarget` que celui-ci porte ; le CSS servi n'avait pas la cible tactile, et les
trois liens de retour sont retombés sous le seuil — **dans le commit qui les corrigeait**, trouvés
par le parcours de cette tâche. ⭐ Une composition transitive est une **hypothèse sur l'outil**, pas
une propriété du CSS.

⛔⛔ **Deux lecteurs du même token, divergents dans le commit qui les écrit.** Le balayage de
`desktop-chromium` lisait `--tap-target-min` en gardant son unité, celui de `mobile-safari`
multipliait sans condition : exprimer le token en `px` faisait calculer 704 à l'un et 44 à l'autre,
donc rougir toutes les cibles d'une page conforme. Il n'y a plus qu'un lecteur,
`tests/e2e/support/responsive.ts`.

⛔ **Le contrôle de rognage n'inspectait que `main`** — donc tout sauf l'en-tête et le pied de page,
qui en sont les **frères**. Or c'est exactement là qu'un rognage échappe au contrôle de débordement :
un `overflow: hidden` sur une bannière absorbe le dépassement, la page ne glisse plus, et le texte
est coupé. Le périmètre est le document.

⚠️ **Et le lien d'évitement n'était pas exclu par ce que le commentaire prétendait** : il est replié
par `translateY(-150%)`, ce qui laisse sa boîte intacte. Il est mesuré comme les autres et tient le
seuil sur ses propres mérites — le prétendre exclu aurait masqué le jour où il ne le tiendrait plus.

⚠️ **Un point tranché plutôt que laissé plausible** : `accentLink` retire le soulignement, ce qui
laissait les trois liens de retour distingués par la seule couleur — 2,72:1 contre le texte courant,
sous les 3:1 de WCAG 1.4.1. Le cas est discutable, chacun étant le contenu unique de son paragraphe ;
`.textLink` rend le soulignement et **lève la question au lieu de l'arbitrer**.

## 19. P4-12 — l'inventaire, et ce qu'il a démenti

### 19.1 ⭐⭐⭐ La tâche était un inventaire, et l'inventaire a contredit la mission

Le prompt de reprise annonçait, en toutes lettres : *« P4-12 est en grande partie déjà écrite […]
Les scénarios E2E-01 à E2E-03, E2E-08 et E2E-12 de `testing-strategy.md` §4.7 sont couverts par les
parcours de P4-07 à P4-11. »* La première chose à faire était de le **constater**, pas de le croire.

Trois des cinq ne l'étaient pas :

| Scénario | Ce que le banc portait réellement |
|---|---|
| **E2E-01** | Trois clics isolés dans trois fichiers — accueil → compétences, liste → fiche, 404 → projets. Aucune **traversée** continue, et aucun retour d'aucune sorte |
| **E2E-03** | La bascule de langue n'était exercée que depuis une page de **section**, dans le profil `no-js`. Or c'est le seul endroit où elle ne prouve rien : le repli de P3-09 et la cible juste y sont **la même URL** |
| **E2E-08** | Le focus visible et le lien d'évitement, oui (P4-10). « Tab jusqu'aux trois sections, Entrée navigue » : rien |

E2E-11 et E2E-12, eux, l'étaient — et sur un périmètre **plus large** que ce que la stratégie
exige : les dix-sept documents servis, et non quatre pages nommées. En écrire une seconde mesure
aurait produit exactement la duplication que cette phase passe son temps à supprimer.

⭐⭐ **La forme du défaut est celle que la phase entière traque**, et elle a frappé le document qui
demande de ne plus la produire : *une affirmation sur le monde que rien ne confronte au monde*.
L'affirmation était sincère, plausible, et fausse sur trois points.

### 19.2 ⭐⭐⭐ Un inventaire écrit dans un journal est déjà périmé — il est donc devenu un garde

Écrire ce tableau ici et s'arrêter là aurait reproduit la panne un cran plus loin : le jour où un
quinzième scénario entre dans §4.7, ou bien où l'un des quatorze est écrit, rien ne le dirait.

`tests/integration/every-e2e-scenario-has-a-status.test.ts` lit les scénarios **dans le bloc de code
de §4.7** — pas dans le document entier, où les identifiants apparaissent aussi en prose — et tient
trois sens :

| Sens | Ce qu'il attrape | Vu rouge |
|---|---|---|
| document → table | un quinzième scénario ajouté à §4.7 sans statut | ✅ |
| table → document | un statut qui nomme un scénario retiré du document | ✅ *(même assertion)* |
| table → disque | un scénario **couvert** qu'aucun parcours ne revendique | ✅ |
| table → disque | un scénario **reporté** qu'un parcours revendique déjà | ✅ |
| table → roadmap | un report vers une tâche qui n'existe pas | ✅ |

⭐ **Aucun chemin de fichier dans la table.** La localisation d'un parcours vit dans le parcours,
sous la forme d'une annotation `@covers E2E-xx` en tête de fichier. La nommer une seconde fois dans
la table en ferait deux écritures à accorder.

⚠️ **Ce que le garde ne prouve pas, et qui est écrit dans son en-tête** : `@covers` est une
**déclaration**. Il vérifie qu'elle existe et qu'elle est cohérente, jamais que le parcours mesure
ce que le scénario décrit — aucun test ne peut lire cette intention. Ce qu'il ferme est l'oubli
silencieux, c'est-à-dire précisément le défaut trouvé au §19.1.

Les deux reports pointent vers des tâches réelles : **P10-10** pour les quatre scénarios de CV, qui
n'ont pas d'objet avant que le formulaire existe, et **P6-10** pour E2E-13 et E2E-14, qui supposent
l'état de scène. Le retour de E2E-01 exerce déjà la moitié « back » de E2E-13 ; le déclarer couvert
affirmerait l'autre moitié, qui n'existe pas.

### 19.3 ⭐⭐ Une mutation a survécu, et le défaut était le périmètre — pas la mutation

`tabIndex={-1}` posé sur **toute** la navigation principale laissait le parcours clavier **vert**.

Interrogée avant le test, comme la phase l'a appris de P4-10, la mutation avait raison : l'accueil
offre **deux** chemins au clavier vers les trois sections — l'en-tête et le `SectionGuide` de
P4-03 —, et le scénario « Tab jusqu'aux trois sections » y reste satisfait. Le test mesure le
résultat exigé, pas le mécanisme.

⛔ **Mais le parcours ne visitait qu'une page**, et sur les quinze autres l'en-tête est la **seule**
source : la mutation y rendait les sections inatteignables au clavier sans rien faire rougir. C'est
le trou de P4-10 à l'identique — *un garde ne couvre que ce qu'on lui donne*. Le balayage porte
désormais aussi sur une page de section, et la mutation est tuée.

### 19.4 ⛔⛔ Le harnais de mutation a déclaré « tuée » une mutation qu'il n'avait jamais éprouvée

Première mutation, premier verdict : *TUÉE*. Faux. Le filtre `-g` passé à Playwright contenait une
apostrophe droite là où le titre du test porte une apostrophe typographique ; **aucun test n'a été
sélectionné**, Playwright sort en 1 sur « No tests found », et le harnais a lu ce 1 comme un échec
de test.

⭐⭐ **C'est la panne de P4-10 — un harnais qui conclut sur une exécution qui n'a pas eu lieu —
reproduite dans l'outillage écrit pour la traquer**, et cette fois par l'autre bout : là-bas le
build échouait et le banc tournait contre l'image précédente, ici le banc tournait sur zéro test. Le
harnais vérifie désormais, **avant de muter**, que le filtre sélectionne au moins un test.

⛔ Et la restauration a menti aussi : `git checkout --` **ne restaure pas un fichier non suivi**, et
deux mutations du garde — encore neuf, donc non indexé — sont restées en place, contaminant les deux
exécutions suivantes. Le piège est écrit dans le prompt de reprise depuis P4-11 ; il a été payé une
seconde fois. Les mutations ont été rejouées proprement, sur copie de sauvegarde.

| # | Mutation | Verdict |
|---|---|---|
| 1 | la liste des projets pointe vers la **section** au lieu de la fiche | ✅ tuée — E2E-01 |
| 2 | le proxy **redirige** une fiche vers sa section | ✅ tuée — E2E-02 |
| 3 | le sélecteur de langue d'une fiche retombe sur la **section** | ✅ tuée — E2E-03 |
| 4 | `tabIndex={-1}` sur la navigation, périmètre « accueil seul » | ⛔ **survivante** — §19.3 |
| 4′ | la même, périmètre élargi à une page de section | ✅ tuée — E2E-08 |
| 5 | un scénario couvert rebasculé en « reporté » | ✅ tuée |
| 6 | un quinzième scénario ajouté à §4.7 | ✅ tuée |
| 7 | un report vers une tâche inexistante (`P6-42`) | ✅ tuée |
| 8 | une annotation `@covers` retirée | ✅ tuée — vue rouge à l'écriture du garde |

⭐ La mutation 3 n'est **tuable par aucun test unitaire** : elle vit dans une route, et les routes
sont exclues de Vitest (`testing-strategy.md` §6). C'est la seconde fois que cette exclusion est
éprouvée par une mutation plutôt que défendue par un raisonnement — la première était P4-09 §15.9.

### 19.5 Ce que la tâche a refusé de faire, et pourquoi

⛔ **Une fiche n'offre aucun retour visible** : ni fil d'Ariane rendu, ni lien vers sa liste. Le
`BreadcrumbList` de P4-09 est pourtant émis sur les sections **et** sur les fiches — la position
exacte pour laquelle la même tâche avait refusé `links.repository` : *« une donnée structurée décrit
ce que la page montre »*. Les deux dettes sont désormais **la même dette**, et elle est nommée.

**Arbitrage du 2026-08-16, posé avant d'écrire une ligne** : le parcours revient par le **bouton du
navigateur**, ce qu'un visiteur fait quand rien d'autre n'existe. Rendre un fil d'Ariane serait du
produit dans une tâche de parcours — trois sections et les fiches à regabariter, un choix de design,
des clés de dictionnaire. *Ce qui rouvre la question* : la reprise de la fiche de projet, où
`links.repository` attend déjà.

⛔⛔ **Et le critère de sortie « Lighthouse mobile ≥ 85 / a11y 100 / SEO 100 » n'est mesuré nulle
part** — le mot n'apparaît que dans quatre documents. Aucun gate, aucun parcours, aucune étape de CI
ne produit un score. C'est le défaut du seuil de 400 Mo, que P4-05 avait découvert **en s'y
référant** : *un seuil que rien ne fait respecter n'est pas un seuil*. **Arbitrage : dette nommée,
portée par P4-13 et P4-15**, la mesure se faisant de toute façon contre le site déployé. *Ce qui
rouvre la question* : une mise en ligne effectuée sans que le score ait jamais été relevé.

### 19.6 Ce qui n'est pas observable, et qu'aucun parcours ne prétendra tenir

- **Le cas « entité non traduite »** du sélecteur de langue : `content/` est parfaitement symétrique
  depuis P2-11, si bien que le repli vers la section n'a aucune occurrence à observer. Il est tenu
  par les tests unitaires de `languageOptions`, sur fixtures — et c'est une réserve de sortie de la
  Phase 3, toujours vraie.
- **La part « état de scène cohérent » de E2E-02** : elle suppose `data-scene-focus`, livré par
  P6-07. Poser l'attribut aujourd'hui serait une architecture cachée.

### 19.7 Relevés — et un chiffre qui ne correspond plus

| Relevé après P4-12 | Valeur | Seuil |
|---|---|---|
| Socle partagé | **126,4 Ko — inchangé** | cible 136 · bloquant 146 |
| JS propre à chaque route | ⚠️ **8,2 Ko** sur 18 routes *(documenté : 7,3)* | cible 25 · bloquant 40 |
| Image de production | **273 Mo — inchangée** | cible 250 · **bloquant 400** |
| Tests | **632** verts *(627 après P4-11)* | — |
| E2E | **144** verts sur 5 profils *(140 après P4-11)* | — |
| Couverture globale | **100 %** sur les quatre métriques | ≥ 80 % |
| Mutations | **12 appliquées, 11 tuées**, 1 survivante traitée (§19.3) | — |

⛔⛔ **Le JS par route vaut 8,2 Ko, et cinq documents en portent 7,3.** Le chiffre a été remesuré
parce que le prompt de reprise demande de le remesurer — et il ne correspond pas.

⭐ **Ce que la mesure établit, et rien de plus.** Cette branche ne touche **aucune ligne** de `src/`,
ni `package.json`, ni `pnpm-lock.yaml`, ni `content/`, ni le `Dockerfile` : `git diff main` sur ces
chemins est **vide**. L'artefact mesuré est donc exactement celui de `main`. Les 8,2 Ko sont la
valeur du site tel qu'il est déployé, pas un effet de P4-12.

⚠️ **Ce qui n'est PAS établi** : d'où vient l'écart de +0,9 Ko. P4-07 a **mesuré** 7,2 Ko, P4-08 a
**mesuré** 7,3, puis P4-09, P4-10 et P4-11 ont écrit « 7,3 — inchangé » trois fois de suite. L'une de
ces trois « inchangé » a pu être recopiée plutôt que relevée — c'est la faute que ce journal reproche
depuis §7 —, ou l'écart peut venir de l'environnement de mesure. Trancher demanderait de rejouer
`make bundle` sur chacun des trois commits, ce qui est une investigation et non cette tâche.

⭐⭐ **Le budget n'est pas en cause** : 8,2 Ko contre une cible de 25 et un seuil bloquant de 40. Ce
qui est en cause est le **chiffre écrit**, et c'est exactement la leçon n°3 de la phase — *un nombre
recopié et jamais remesuré finit par décider seul* —, payée ici sur le chiffre qui sert d'argument à
l'arbitrage n°1 de §14.8. L'arbitrage tient, sa valeur d'appui change.

Les documents portent désormais **8,2 Ko, daté et mesuré**, et cette entrée dit ce qui reste à
établir plutôt que de l'inventer.

### 19.8 Ce que la revue a changé — trois constats, tous dans le garde et les parcours neufs

Aucun défaut dans `src/` : cette branche n'en touche pas une ligne. Les trois portent sur ce que la
tâche ajoute, et **deux sont la thèse de la tâche retournée contre elle**.

⛔⛔ **La couverture partielle était écrite en prose, dans l'en-tête des parcours.** Deux scénarios
décrivent une chose qui n'existe pas encore — l'état de scène pour E2E-02, le formulaire de CV pour
E2E-10 —, et la table du garde ne savait dire que « couvert » ou « reporté ». La réserve vivait donc
dans un commentaire : *une chose écrite quelque part que rien ne confronte au moment où elle compte*,
c'est-à-dire exactement ce que cette tâche reproche à la mission qu'elle a démentie. Le statut porte
désormais `completedBy` et `missing`, et la tâche nommée est vérifiée comme les autres.

⛔⛔ **`@covers` était accepté d'un fichier qu'aucun profil ne joue.** `playwright.config.ts` ne
sélectionne que `shared/**` et `profiles/<profil>/**` : un parcours posé à la racine de `tests/e2e`,
ou sous un dossier de profil mal orthographié, **ne s'exécute jamais** — et rendait pourtant son
scénario vert dans l'inventaire. Un garde qui déclare couvert ce que rien ne mesure, dans le fichier
écrit pour fermer cette classe. La configuration est désormais **importée** — lire un fichier n'est
pas l'exécuter (P4-10) — et les dossiers joués sont dérivés de ses `testMatch` réels.

⚠️ **Et un durcissement, pas un défaut vivant** : les chemins déduits du sitemap étaient interpolés
dans un `new RegExp`. Un slug portant un `.` affaiblirait l'assertion, un `+` la ferait lever. Cela
ne peut pas arriver aujourd'hui — `slugSchema` restreint le domaine à `[a-z0-9-]` et le gate de
contenu le fait respecter —, mais faire dépendre le sens d'une assertion d'un invariant écrit
ailleurs et jamais cité est précisément ce que ces parcours reprochent au reste. Les chemins sont
comparés tels quels.

### 19.9 Ce que la passe de simplification a changé

⭐ **Le balayage au clavier était écrit deux fois** dans le même test — une fois pour collecter,
une fois pour s'arrêter sur une cible. Un seul `tabThrough(page, stop)`, et la borne anti-boucle
n'existe plus qu'à un endroit.

⭐ **Deux structures portaient plus que ce que quiconque lisait** : les scénarios extraits de §4.7
rendaient `id → libellé` alors que seuls les identifiants servent, et les revendications rendaient
`id → fichiers` alors que seule l'appartenance sert. Une richesse morte est une invitation à
diverger ; le libellé reste **exigé** par le motif — un identifiant seul n'est pas une ligne de
scénario — sans être capturé.

⭐ **Les seize parcours étaient relus trois fois**, une par contrôle. C'est la **promesse** qui est
mémoïsée, pas son résultat — le motif que `support/sitemap.ts` applique depuis P4-09, après la même
mesure. `everySpecFile` est extraite au deuxième exemplaire, entre les revendications et le contrôle
des orphelins.

⚠️ **Un point non traité, avec sa raison** : le parcours de E2E-01 asserte `aria-current` sur les
sections qu'il traverse, ce que `site-chrome.spec.ts` asserte déjà pour deux d'entre elles. Le
doublon est conservé — il porte la **troisième**, que ce fichier-là ne visite pas, et un parcours
doit rester lisible seul (la raison écrite en P4-10 §17.7 pour les audits axe en double).

## 20. P4-13 — la mise en production, et le critère de sortie que rien ne mesurait

### 20.1 Ce que P4-13 est réellement, et ce qu'elle n'est pas

Le site est **déployé en continu depuis P1-15** : chaque poussée sur `main` publie une image sur GHCR
et la déploie sur le VPS. P4-13 n'installe donc rien — elle **prononce** que ce qui est déployé est
le portfolio documentaire complet, et cela suppose d'avoir vérifié ce que la Phase 3 et la Phase 4
lui ont laissé à vérifier. C'est une tâche de **constat**, et la valeur y est dans ce qu'on refuse de
supposer.

### 20.2 ⛔⛔ « Lighthouse ≥ 85 / a11y 100 / SEO 100 » n'était mesuré nulle part

Le critère est écrit depuis la Phase 0. Le mot « Lighthouse » n'apparaissait que dans **quatre
documents** : aucun gate, aucun parcours, aucune étape de CI ne produisait un score. C'est le défaut
du seuil de 400 Mo, à l'identique — *un seuil que rien ne fait respecter n'est pas un seuil* —, et il
a été trouvé de la même façon : **en s'y référant**, pendant l'inventaire de P4-12.

`scripts/check-lighthouse.mts` le mesure désormais contre l'**image de production**, sur l'accueil et
une fiche (déduite du sitemap, jamais nommée), en mobile et en desktop. Branché sur `make ci` **et**
sur la CI, dans le job qui porte déjà l'image et Chromium.

⭐ **Aucun `chrome-launcher`, aucune installation de navigateur** : le script tourne dans le service
`e2e`, dont l'image Playwright porte Chromium. On le lance avec un port de débogage et Lighthouse s'y
branche — une dépendance de moins, et le navigateur audité est exactement celui du banc.

**Justification de la dépendance** (CT-08). *Problème* : produire les scores que le critère de sortie
exige. *Pourquoi celle-ci* : Lighthouse **est** la mesure nommée par le critère ; approximer ses
métriques à la main donnerait un nombre qu'on n'aurait pas le droit d'appeler « Lighthouse ».
*Alternatives* : `@lhci/cli` (une chaîne de serveur et de rapports dont rien ici n'a besoin) ; un
audit maison en Playwright (écrire « Lighthouse ≥ 85 » sur cette base serait plus faux que de ne rien
écrire). *Catégorie* : **dépendance de test**, comme `@axe-core/playwright` que `testing-strategy.md`
§3 qualifie explicitement de « non structurante » — elle n'entre pas dans l'image de production.

### 20.3 ⭐⭐ Trois manières de juger, parce que les catégories ne se mesurent pas pareil

Le premier jet les traitait toutes au score, avec un seul message d'avertissement. Il était **faux**,
et la mesure l'a montré tout de suite.

| Catégorie | Verdict | Relevé | Ce qui a décidé |
|---|---|---|---|
| accessibilité | **score ≥ 100, bloquant** | **100** partout | structurel : l'attribut est là ou il n'y est pas |
| SEO | **score ≥ 100, bloquant** | **100** partout | idem |
| bonnes pratiques | **aucun audit en échec**, bloquant | 78 | voir ci-dessous |
| performance | **relevé**, jamais bloquant | 99–100 | voir ci-dessous |

⭐⭐ **« Bonnes pratiques » plafonne à 78 en local, et le chiffre ne dit rien du site.** Les deux
seuls audits en échec sont `is-on-https` (poids 5) et `redirects-http` (poids 1), qui échouent quand
l'origine n'est pas un **contexte sûr** — ici `http://web:3000`, par le réseau Docker. La production
est en HTTPS avec HSTS et une redirection 308 **vérifiée depuis l'extérieur** (`deploy/README.md`
§2). Juger la catégorie sur son score mesurerait donc le banc : elle est jugée sur une propriété qui
parle du site — *aucun autre audit ne doit échouer*. Une API dépréciée, une erreur de console ou une bibliothèque vulnérable font rougir ;
un seuil à 95 serait resté rouge en permanence et aurait fini supprimé.

⛔ **Le premier message d'avertissement était faux, et c'est ce qui compte.** Il annonçait « le score
dépend de la charge de la machine » pour *les deux* catégories non bloquantes. C'est vrai de la
performance — mesurée **100 puis 99 sur la même page à deux tirs**, sans qu'une ligne ait bougé — et
faux des bonnes pratiques, dont le 78 est parfaitement déterministe. **Une explication fausse est
pire qu'aucune** : elle range un chiffre parmi le bruit, et plus personne ne le regarde. Les deux
raisons sont désormais énoncées séparément.

⚠️ **Ce que cet audit ne mesure pas** : le réseau, le CDN, le TTFB depuis une autre région. Il juge
l'**artefact**, pas le service. Le relevé qui fait foi pour la performance est **P4-16**.

### 20.4 Le gate vu rouge, trois fois — une par manière de juger

| Mutation | Ce qui devait rougir | Verdict |
|---|---|---|
| `<html lang="">` | accessibilité, au score | ✅ 100 → **95/96**, sortie 2 |
| la méta-description retirée de `pageMetadata` | SEO, au score | ✅ 100 → **92**, sortie 2 |
| `is-on-https` retiré de la liste des audits que le banc seul empêche | bonnes pratiques, aux audits | ✅ sortie 2, l'audit nommé |

⛔ **Une quatrième mutation n'a rien prouvé, et le harnais l'a dit** : déclarer la page `noindex` par
un `export const metadata` a **cassé le build** — une route ne peut pas exporter à la fois `metadata`
et `generateMetadata`. Le contrôle du code de sortie du build, écrit après la panne de P4-10, a
refusé de conclure au lieu d'auditer l'image précédente. C'est la deuxième fois de la phase qu'il
gagne sa place.

### 20.5 Relevés

| Relevé après P4-13 | Valeur | Seuil |
|---|---|---|
| Lighthouse **accessibilité** | **100** — accueil et fiche, mobile et desktop | 100, **bloquant** |
| Lighthouse **SEO** | **100** — idem | 100, **bloquant** |
| Lighthouse **bonnes pratiques** | **78 en local, 100 en CI** — et aucun audit en échec hors les deux du banc | audits, **bloquant** |
| Lighthouse **performance** | 99–100 selon le tir | 85, relevé — P4-16 fait foi |
| Image de production | **273 Mo — inchangée** | cible 250 · bloquant 400 |
| Socle partagé | **126,4 Ko — inchangé** | cible 136 · bloquant 146 |

⭐ **La dépendance n'entre pas dans l'image** : 273 Mo avant comme après. C'est ce que
`testing-strategy.md` §3 entend par « dépendance de test, non structurante », et c'est **mesuré**
plutôt que déduit du fait qu'elle est en `devDependencies`.

### 20.6 ⛔ Ce qui bloque la clôture de P4-13, et qui n'est pas à moi

`SITE_URL` a **deux sources en production**, et l'`env_file` de Compose l'emporte sur l'`ENV` de
l'image. Si `/srv/portfolio/.env` portait une autre origine, le site servirait des canoniques d'un
domaine et des liens d'exécution d'un autre — **sans que rien n'échoue**. La dette est écrite depuis
`phase-3-log.md` §17.4 avec la mention « à vérifier dans la checklist de P4-13 ».

Ce qui est établi d'ici : la CI construit avec `https://aurelienfeignon.com` (lu dans
`.github/workflows/ci.yml`). Ce qui ne l'est pas : la valeur du `.env` sur le VPS.

**Les deux voies sont fermées depuis la machine de développement**, et les deux ont été essayées :

```text
ssh -o BatchMode=yes portfolio       → Permission denied (publickey)
curl https://aurelienfeignon.com/fr  → 302 vers cloudflareaccess.com   (conforme, §4.2)
```

⛔⛔ **Et le diagnostic tiré de la première ligne était faux.** J'en avais conclu que l'entrée
`~/.ssh/config` était périmée — l'adresse ne ressemblant pas à une IP Hetzner de Nuremberg. Elle ne
l'est pas : **le VPS est le même, et la clé demande simplement une passphrase**. `BatchMode=yes`
interdit toute invite, et OpenSSH rend alors le même `Permission denied (publickey)` que pour une
clé non autorisée.

⭐⭐⭐ **Deux causes très différentes derrière un message identique** — « cette clé n'est pas
autorisée » et « cette clé n'a pas été déverrouillée » — et rien dans la sortie ne les distingue.
J'ai comblé l'écart par une hypothèse sur le monde, exactement ce que cette phase passe son temps à
refuser. La vérification qui coûte zéro : `ssh-add -l`, qui répond ici **« The agent has no
identities »** — les deux agents de la machine tournent et ne portent aucune clé.

La passphrase appartient à l'utilisateur et ne se demande pas. Deux voies propres : `ssh-add` une
fois dans un terminal, ce qui charge la clé dans l'agent (`/run/user/1000/openssh_agent`) et rend la
vérification exécutable ici ; ou l'utilisateur exécute les deux lectures et en donne la sortie.

P4-13 **reste ouverte**. Prononcer la mise en production sans ce relevé serait une affirmation sur le
monde que rien ne confronte au monde — la faute que cette phase entière traque, commise sur la tâche
qui la clôt.

### 20.7 Ce que la revue a changé — dont un gate qui n'a jamais pu échouer

⛔⛔⛔ **`| tee` avalait le code de sortie : l'étape Lighthouse ne pouvait pas faire échouer la CI —
et le gate de taille d'image non plus, depuis P4-05.** Le shell par défaut d'Actions est
`bash -e {0}`, **sans `pipefail`** : l'étape sort avec le statut de `tee`, toujours 0. Vérifié à la
main :

```text
bash -e            -c 'false | tee /dev/null; echo $?'   →  0
bash -eo pipefail  -c 'false | tee /dev/null; echo $?'   →  1
```

⭐⭐⭐ **P4-05 avait rendu le seuil d'image bloquant après avoir découvert qu'il n'était appliqué nulle
part. Il ne l'était toujours pas *dans la CI*** — seulement dans `make ci`, qui n'a pas de tuyau. Un
seuil peut donc être appliqué **à un endroit sur deux**, et c'est le tuyau d'affichage qui décide.
Les deux étapes portent désormais `shell: bash` (qui sélectionne `-eo pipefail`) et `2>&1`, sans quoi
le détail de l'échec partait sur stderr et n'atteignait jamais le résumé de la CI.

⛔ **Un audit tombé en erreur se lisait comme un succès.** Le filtre écartait `score === null`, ce qui
couvre les audits informatifs **et** ceux dont `scoreDisplayMode` vaut `error`. « Bonnes pratiques »
étant jugée sur cette liste et jamais sur son score, un audit planté n'apparaissait nulle part : un
gate qui verdit sur une panne de son propre instrument.

⚠️ **`process.exit(1)` tronquait l'explication.** Quand la sortie standard est un tuyau — ce qu'elle
est en CI —, Node écrit de façon asynchrone et `process.exit()` abandonne la file. C'est
`process.exitCode` qui laisse le processus se terminer une fois les écritures vidées. Vérifié en
rejouant une mutation à travers `| cat` : les quatre lignes de détail arrivent entières.

⭐⭐⭐ **Et le chiffre « 78 » était lui-même une mesure d'un seul endroit, énoncée comme
universelle** — la faute que ce journal reproche depuis §7, commise dans la tâche qui la corrige sur
Lighthouse. La **première exécution en CI l'a démenti le jour même** : là-bas l'image est servie sur
`http://localhost:3000`, que Chrome tient pour un **contexte sûr**, si bien que `is-on-https` passe
et que « bonnes pratiques » vaut **100**. En local, le service `e2e` joint `http://web:3000` par le
réseau Docker, et le score tombe à 78.

⭐⭐ **Le mécanisme, lui, était juste, et c'est ce qui a sauvé le gate** : juger la catégorie sur ses
**audits** rend le verdict identique des deux côtés, là où un seuil sur le score aurait été vert en
CI et rouge en local — c'est-à-dire un gate dont la conclusion dépend de l'endroit où on l'exécute.
La liste `LAB_ONLY_FAILURES` n'est donc pas une excuse pour un banc imparfait : c'est ce qui rend la
mesure **portable**.

⚠️ **Et un accès de propriété qui ne compilait que par accident** : `threshold.minimum` était lu après
avoir déstructuré `verdict`, ce qui ne discrimine pas l'union. Personne ne l'a vu parce que **les
`.mts` de `scripts/` ne sont pas dans le périmètre de `tsconfig.json`** — une exposition antérieure à
cette tâche, valable pour les six scripts. Le test porte maintenant sur `threshold.verdict`, et le
fichier a été typecheck explicitement en mode strict.

### 20.8 Les deux prérequis, vérifiés sur le serveur — et une prémisse fausse depuis la Phase 2

La clé SSH portant une passphrase, la vérification est passée par l'agent de l'utilisateur, chargé
par lui. Toutes les commandes sont en **lecture seule** ; rien n'a été modifié sur le serveur.

**Prérequis 1 — `SITE_URL` a deux sources, et l'`env_file` l'emporte.** Levé, et au-delà de ce qui
était demandé : les trois écritures coïncident, et surtout le site **sert** ce qu'elles annoncent.

| Source | Valeur |
|---|---|
| `/srv/portfolio/.env` — celle qui l'emporte | `https://aurelienfeignon.com` |
| `Config.Env` du conteneur en cours | `https://aurelienfeignon.com` |
| `ENV` gravé dans l'image | `https://aurelienfeignon.com` |

⭐ **Et la vérification qui compte n'est aucune des trois** : ce que l'origine rend réellement.
`canonical` et les **trois** `hreflang` portent le bon domaine, le sitemap servi compte 14 URL et
**zéro** d'une autre origine. Trois variables d'environnement peuvent coïncider et un HTML gravé au
build dire autre chose — c'est le document servi qui tranche.

**Prérequis 2 — « aucune route ne peut se rendre à la demande ».** L'exigence tient : `/fr/inexistant`
rend **404 avec `<html lang="fr">`** sur l'origine, et le gate de rendu statique refuse toute route
non prégénérée. Mais la **raison** écrite depuis la Phase 2 est fausse.

⛔⛔ **`content/` EST dans l'image de production** — 87 fichiers, 384 Ko, à `/app/content` — alors que
quatre documents affirment le contraire depuis P2-03, et que le prompt de reprise en faisait un
prérequis de cette tâche. Le mécanisme : le **traceur de fichiers de Next** inclut les fichiers lus
au build dans la sortie `standalone`, que le `Dockerfile` copie telle quelle. Reproduit à l'identique
sur l'image locale — `.next/standalone/content` existe.

⭐⭐⭐ **L'affirmation était une déduction, jamais une mesure** : « on ne copie que `.next/standalone`,
donc `content/` n'y est pas ». Elle est fausse parce qu'un outil intermédiaire fait quelque chose que
personne ne lui a demandé. C'est exactement la forme des six défauts déjà livrés de cette phase — *une
affirmation sur le monde que rien ne confronte au monde* —, et celle-ci a vécu **quatre phases**, en
tête des réserves de sortie de la Phase 2, recopiée dans le tableau des acquis de la Phase 3, dans
`architecture.md`, et dans le prompt de reprise.

⚠️ **Ce que cela change, et ce que cela ne change pas.** Rien à corriger : le contenu est public — le
site le publie —, 384 Ko sont sous le bruit de mesure de l'image, et une route qui se rendrait à la
demande fonctionnerait au lieu de tomber. C'est précisément le point : **le filet de sécurité auquel
la Phase 2 croyait n'existe pas**. Ce qui protège les routes est le gate `check-static-rendering.mts`,
et lui seul. Les quatre écritures portent désormais la correction plutôt que la croyance.

### 20.9 Ce que P4-13 laisse ouvert

| Sujet | État |
|---|---|
| Performance contre le **site réel** | **P4-16**, et cela suppose de lever Cloudflare Access. L'audit d'ici juge l'artefact, pas le service |
| Supervision (healthcheck + sonde externe) | **P4-14** — le conteneur a son healthcheck, aucune sonde n'observe de l'extérieur |
| Checklist de mise en ligne et rollback rejoué | **P4-15**. Le rollback a été **prouvé** en P1-15 (26 sondes, aucune indisponibilité observée) ; la checklist reste à écrire |
| Les `.mts` de `scripts/` hors du périmètre de `tsconfig.json` | Six fichiers, exposition antérieure à cette tâche (§20.7) |
