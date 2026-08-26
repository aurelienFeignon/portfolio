# Journal de la Phase 6 — Navigation spatiale

> Ouverte le 2026-08-26.
> Ce document consigne, **au fil de l'eau**, les décisions prises pendant la phase, les mesures
> relevées et les écarts par rapport aux documents de Phase 0. Le bilan final le clôt.
> Les statuts des tâches restent dans [`roadmap.md`](./roadmap.md), seule source de vérité.
> Phases précédentes : [`phase-5-log.md`](./phase-5-log.md), [`phase-4-log.md`](./phase-4-log.md).

---

## 1. Objectif

**Faire suivre la scène à l'URL** — ADR-0002, et rien de plus. Un seul sens de flux :

```text
URL ──▶ resolveSceneState(pathname) ──▶ SceneState ──▶ getCameraTarget(state) ──▶ caméra
```

Ce que la phase fait : elle donne à la scène une **raison de bouger**, et une seule. Le bouton
précédent, le partage d'URL et l'ouverture directe doivent fonctionner **par construction** — c'est
la mitigation écrite du risque R-03, et c'est ce qui distingue cette phase d'un « ajout
d'animations ».

Ce que la phase **ne fait pas** : aucun contenu sur les écrans (Phase 7), aucune modélisation ni
direction artistique (Phase 8), aucun objet secondaire (Phase 9). Et surtout, aucun état de
navigation détenu par la scène : *la scène ne modifie jamais son propre état*.

## 2. Contexte d'ouverture — ce qui existe et ne doit pas être refait

| Acquis | Origine | Conséquence pour la phase |
|---|---|---|
| **Les quatre cadrages sont calculés**, position et cible sur la normale de chaque dalle | P5-05 (`layout.ts`) | P6-02 les **lit**, il ne les invente pas. Aucune cote ne s'écrit hors de `layout.ts` |
| `frameloop="demand"` en place, **rien n'appelle `invalidate()`** | P5-04 | P6-04 est le premier code qui aura une image à demander — et c'est là que P5-10 devient observable |
| La correction de champ sous 16:9, pure et éprouvée | P5-06 (`framing.ts`) | Le `fov` interpolé de P6-04 devra passer **par elle**, sinon la transition annule la correction |
| `src/routing/` : une seule construction d'URL, table `routeSegments` **par locale** | P3-05 | P6-01 en est l'inverse, et P6-03 en est l'appelant. Aucun segment ne s'écrit en dur |
| Frontière d'erreur et bascule terminale en `none` | P5-07 | Une transition qui jette ne doit pas ressusciter la scène : `mount-state.ts` reste seul juge |
| Le garde d'isolation avec témoin | P5-09 | Tout module de scène lu depuis le chunk de première visite doit rester **sans Three.js** |
| `every-e2e-scenario-has-a-status.test.ts` **reporte E2E-13 et E2E-14 vers P6-10** | P4-12 | Écrire ces deux parcours suppose de basculer leur statut dans le garde — il le dira |

Cinq chiffres à ne pas découvrir, relevés à la clôture de la Phase 5 :

- **socle 127,1 Ko**, **11,0 Ko de JS par route**, **chunk 3D différé 234,5 Ko** (somme de **deux**
  chunks depuis P5-08 — les relevés antérieurs en comptaient un seul, ils ne se comparent pas) ;
- **image de production 281 Mo** ; **764 tests** verts, couverture **100 %** ; **153 parcours E2E** ;
- ⛔ **TBT à 2 090 ms** (×3,3 depuis la Phase 4) : toute animation de caméra s'ajoutera à un thread
  principal déjà chargé au montage. Dette portée en Phase 11, `performance-budget.md` §6.2.

⛔ **Trois portes ne tournent pas dans `make test`** et se découvrent donc en CI : `make coverage`
(seuil **95 %** sur `src/scene/state`), `make bundle` (budgets **et** isolation de la scène) et
Lighthouse. Chacune a refusé une tâche de la Phase 5 après un `make test` vert.

## 3. Décisions prises à l'ouverture

⭐⭐⭐ **Posées avant la première ligne**, comme une liste de choix avec un défaut recommandé —
c'est la leçon de `phase-4-log.md` §14.8, où six arbitrages consignés en prose ont été découverts
*après* la fusion.

| # | Arbitrage | Décision de l'utilisateur (2026-08-26) | Ce qui la rouvre |
|---|---|---|---|
| 1 | **Une entité qui n'existe pas** — `/fr/projects/inexistant` affiche une 404, mais l'URL reste celle-là, et la couche scène ne peut pas lire `content/` (`architecture.md` §1.2) | **Section + slug tel quel** : `{ focus: 'projects', detail: 'inexistant' }`. `detail` **nomme**, il ne vérifie pas. Signature `(pathname)` inchangée, telle que trois documents l'écrivent | Le jour où un index de slugs descend légitimement jusqu'au client — donc pas avant la Phase 7, et au prix d'un amendement d'ADR-0002 |
| 2 | **Une locale inconnue** — `/de/projects` rend une 404 (garde `isLocale`) | **`overview`**. Une seule règle : ce qui n'est pas une page connue rend la vue d'ensemble, exactement comme `/fr/inconnu` | Une troisième locale, qui n'y change rien : c'est `isLocale` qui décide, pas une liste recopiée |
| 3 | **Où vivent les trois fonctions de la phase** | **Un fichier par fonction**, et ce n'est pas un goût — voir §3.1 | Une mesure qui montrerait que `layout.ts` n'entre plus dans le chunk de première visite par ce chemin |

### 3.1 ⭐⭐ Pourquoi les trois fonctions ne partagent pas un fichier

`getCameraTarget` (P6-02) devra importer `layout.ts` — le plan coté du bureau entier. Or
`resolveSceneState` sera lue par le montage de la scène, qui vit dans le chunk de **première
visite** : c'est P6-07 qui l'y amènera, en exposant `data-scene-focus` au DOM.

Les loger ensemble y ferait entrer tout `layout.ts`. **Un module est indivisible du point de vue
d'un bundler : importer une fonction, c'est embarquer ses voisines.** C'est exactement ce que P5-08
a payé — 10,8 → 11,3 Ko parce qu'un aiguillage de trois lignes habitait le même fichier que le
formatage du panneau —, vérifié dans les source maps des chunks servis. Le découpage est donc une
**contrainte mesurée héritée**, pas une préférence d'organisation.

## 4. Tâches et tests correspondants

| Tâche | Ce qu'elle livre | Ce qui le prouve |
|---|---|---|
| P6-01 | `resolveSceneState(pathname)`, pure | Unitaires : les quatre exemples de `testing-strategy.md` §4.3, le mapping **dérivé** de `SECTIONS` × `LOCALES`, les formes qu'aucune route ne sert |
| P6-02 | `getCameraTarget(state)` | Unitaires : les quatre cadrages **lus** dans `layout.ts`, jamais recopiés |
| P6-03 | `getRouteForScreen(screen, locale)` | Unitaires : **l'aller-retour** — `getRouteForScreen` puis `resolveSceneState` redonne le même focus, sur les trois écrans et les deux locales |
| P6-04 | Transition de caméra pilotée par la route, interruptible | ⛔ Le `fov` **interpolé avec la position** (16° → 36°) ; l'interruption d'une transition en cours ; `invalidate()` image par image |
| P6-05 | Écrans interactifs : survol, focus, activation → `router.push` | La scène ne bouge **pas** au clic : c'est la route qui change |
| P6-06 | Équivalents DOM accessibles (CF-06) | Toute action de la scène a un `<a href>` focusable |
| P6-07 | `data-scene-focus` exposé au DOM | ⛔ Il entre dans le chunk de première visite : aucun import Three.js sur ce chemin |
| P6-08 | `reduced-motion` : coupes instantanées | `transitionMs(true)` vaut 0 — la valeur existe déjà dans `layout.ts` |
| P6-09 | ADR-0012 : stratégie d'animation de caméra | Décidée **sur le ressenti réel**, ce que la Phase 0 refusait d'anticiper |
| P6-10 | E2E : back/forward, deep link, clavier, reduced-motion | **E2E-13 et E2E-14**, dont le garde de P4-12 attend le basculement de statut |

## 5. Ordre de travail

Prévu : P6-01 → P6-03 → P6-02 → P6-09 → P6-04 → P6-07 → P6-08 → P6-05 → P6-06 → P6-10.

Deux écarts par rapport à l'ordre des identifiants, dictés par les dépendances réelles :

- **P6-03 avant P6-02.** L'aller-retour `getRouteForScreen` → `resolveSceneState` est une propriété
  de la couche **navigation**, sans une cote de scène ; la fermer tout de suite verrouille le
  contrat que P6-05 emploiera. P6-02, lui, ouvre la dépendance à `layout.ts`.
- **P6-09 avant P6-04.** L'ADR sur l'animation de caméra est nommée « à trancher en Phase 6 » depuis
  la Phase 0, *parce qu'elle dépend du ressenti réel*. Elle se pose au moment où l'on choisit entre
  interpolation maison et bibliothèque de ressorts — c'est-à-dire **avant** d'écrire le rig, pas
  après. `CT-08` l'exige : aucune dépendance structurante sans justification écrite.

## 6. Critères de sortie (rappel, `roadmap.md`)

- [ ] Couverture **≥ 95 %** sur `src/scene/state/**`, **zéro import Three.js** dans ce dossier.
- [ ] Back/forward et deep links corrects.
- [ ] Mapping écran ↔ section **exhaustif et testé**.

S'y ajoutent trois vérifications héritées, qui deviennent réelles ici :

- [ ] La transition **invalide image par image** sans laisser la boucle en `always` (P5-10, reportée
      derrière P6-04).
- [ ] Le `fov` est **interpolé avec la position**, et passe par `fovForAspect` (P5-05, P5-06).
- [ ] `data-scene-focus` n'amène **aucun** module Three.js dans le chunk de première visite (P5-09).

---

## 7. P6-01 — l'état de scène, dérivé de l'URL et de rien d'autre

**Livré le 2026-08-26.** `src/scene/state/scene-state.ts` : `SceneFocus`, `SceneState`, `OVERVIEW`,
`resolveSceneState(pathname)`. Pure, sans Three.js, sans lecture du contenu.

⭐⭐ **La lecture de l'URL n'est pas dans `scene`, et c'est la décision de conception de la tâche** —
prise en passe de simplification, voir §7.7. `parsePagePath` vit dans `src/routing/paths.ts`, contre
`pathFor` dont elle est l'inverse ; `resolveSceneState` n'en est qu'une **projection de neuf
lignes**. Couverture **100 %** sur les quatre métriques, dans les deux couches.

### 7.1 ⭐⭐ La règle tient en une phrase : la FORME, jamais l'EXISTENCE

C'est ce qui rend la fonction décidable sans lire une ligne de `content/` — et
`architecture.md` §1.2 interdit `scene → content`, ce qui n'est pas une commodité mais la garantie
que la scène ne peut pas devenir une seconde source de contenu (ADR-0001).

| Ce que l'URL montre | Verdict | Pourquoi |
|---|---|---|
| Une forme qu'**aucune route ne sert** — locale inconnue, segment de section inconnu, **section sans fiche d'entité**, plus profond qu'une entité | `overview` | Le site ne sert rien à cette adresse, dans aucune langue |
| Une forme **servie**, dont l'entité n'existe pas | La section, `detail` = ce que l'URL nomme | Le visiteur est réellement dans cette zone ; la 404 qu'il voit ne change pas où il se trouve |

⭐ **Les deux moitiés de cette règle sont les arbitrages 1 et 2 de §3**, et elles ne se déduisent
pas l'une de l'autre : la première est une limite de **connaissance** (cette couche ne peut pas
savoir), la seconde une limite de **forme** (le site n'a pas cette route). Les confondre aurait donné
soit une caméra qui saute à l'accueil sur un slug mal tapé, soit une caméra qui cadre Projets sur
`/de/projects`.

### 7.2 ⭐⭐ Le mapping est DÉRIVÉ, à deux endroits, et c'est la seule chose qui le tienne exhaustif

- **Le type** : `SceneFocus = 'overview' | Section`. Une quatrième section devient un focus sans que
  personne y pense, et le `Record` que P6-02 lui devra échouera au typage. ADR-0002 exige cette
  exhaustivité ; l'écrire en union littérale l'aurait perdue au premier ajout.
- **Le banc** : il boucle sur `SECTIONS` × `LOCALES` et construit ses URL avec `sectionPath`. Une
  section ajoutée sans segment fait rougir la suite toute seule. *Dérive le périmètre, ne l'énumère
  pas* — leçon 5 de la Phase 4.

⛔ Et la résolution du segment passe par `routeSegments[locale]`, **jamais par un littéral**. La
table est l'identité en v1 (ADR-0005), donc un `'projects'` écrit en dur serait vert aujourd'hui et
cesserait de résoudre le jour où `/fr/projets` existe — sans que rien ne le dise, puisque c'est
précisément le seul endroit que ce changement doit toucher.

### 7.3 ⛔ Deux pièges de découpe, tous deux tenus par assertion

1. **`decodeURIComponent` jette.** `entityPath` encode tout slug ; l'inverse doit décoder, sinon
   l'aller-retour de P6-03 est faux dès qu'un slug sort de `[a-z0-9-]`. Mais un échappement tronqué
   — `/fr/projects/%E0%A4%A`, qu'aucun encodage n'a pu produire — fait **jeter** la fonction, et
   l'exception ferait tomber la scène entière sur une adresse tapée à la main. Elle est rattrapée :
   la section reste, l'entité est nulle. *Le visiteur est dans Projets, sur rien.*
2. **Une barre finale laisse un segment vide.** `/fr/projects/` doit désigner la section, pas une
   entité dont le nom serait la chaîne vide. La distinction est explicite dans le code, et le banc
   la tient dans les deux sens.

### 7.4 Vu rouge, puis éprouvé par mutation

Le banc a d'abord échoué faute de module — ce qui ne prouve rien d'autre que son existence. Chaque
propriété a donc été éprouvée séparément, en cassant le code une fois par propriété :

**Quatorze mutations, toutes tuées**, réparties sur les trois fichiers après la relocalisation :

| Mutation | Verdict |
|---|---|
| La barre finale n'est plus retirée | **tuée** — 3 tests |
| Elle en retire **deux** au lieu d'une | **tuée** — 1 test |
| La locale n'est plus validée | **tuée** — 4 tests |
| La profondeur n'est plus bornée | **tuée** — 2 tests |
| L'accueil n'est plus distingué d'une section | **tuée** — 2 tests |
| Un segment de section inconnu est accepté | **tuée** — 3 tests |
| La section est avalée par la fiche d'entité | **tuée** — 3 tests |
| La fiche d'entité n'est exigée nulle part | **tuée** — 2 tests |
| Le slug n'est plus décodé | **tuée** — 2 tests |
| Toute section porterait une fiche | **tuée** — 1 test |
| Le segment est mal inversé | **tuée** — 3 tests |
| L'accueil cadre un écran | **tuée** — 4 tests |
| `detail` est jeté | **tuée** — 2 tests |
| `OVERVIEW` est reconstruit au lieu d'être rendu | **tuée** — 1 test |

⭐ Le harnais **vérifie que la mutation s'est appliquée** (comptage du motif, `assert` sur
l'unicité) et **distingue un échec de chargement d'un échec de test** : sans ces deux contrôles, une
mutation qui casse la compilation se lit comme une mutation tuée, et un motif qui ne correspond à
rien se lit comme un code sain. Les deux pièges sont documentés dans ce dépôt, et repayés en P5-08.

### 7.5 Relevés

| Relevé | Avant | Après | |
|---|---|---|---|
| Tests | 764 | **803** | +39 |
| Couverture `src/scene/state` | 100 % | **100 %** | seuil 95 % |
| Couverture `src/routing` | 100 % | **100 %** | seuil 95 % |
| Socle partagé | 127,1 Ko | **127,1 Ko** | inchangé |
| JS propre à chaque route | 11,0 Ko | **11,0 Ko** | inchangé |
| Isolation de la scène (P5-09) | ✓ | **✓** | témoin : 2 chunks différés porteurs |

⚠️ **« Inchangé » n'affirme rien d'autre que ce qui est écrit** : ce module n'a **aucun appelant**
aujourd'hui, donc il n'entre dans aucun chunk. Le vrai relevé se prendra en **P6-07**, quand
`data-scene-focus` l'amènera dans le chemin de première visite. Écrire ici « le mapping ne coûte
rien » serait la forme d'affirmation que la Phase 5 a appris à ne pas croire sur parole.

### 7.6 ⛔⛔ Ce que la revue a changé — deux URL de la même classe, deux verdicts opposés

Les deux constats sont de la **même famille**, et c'est ce qui les rend intéressants : la règle de
§7.1 était écrite juste et **appliquée à moitié**. Tous deux ont été reproduits avant d'être crus —
le second en lisant `src/proxy.ts`, qui tranche la question.

1. ⛔ **`/fr/skills/typescript` cadrait l'écran Compétences.** Les compétences n'ont **pas** de page
   de détail en v1 : `SECTIONS_WITH_DETAIL` les exclut, `src/app/[locale]/skills` n'a pas de
   `[slug]`, et le proxy y réécrit une 404. C'est donc une *forme qu'aucune route ne sert*, qui
   devait rendre `overview` — comme `/fr/projects/augure/extra` le faisait déjà. **Deux URL de la
   même classe, deux verdicts opposés**, dans le module qui documente la règle en tête de fichier.
   ⭐⭐ **Le banc ne pouvait pas le voir** : il dérivait son périmètre de `SECTIONS` et ne croisait
   jamais `SECTIONS_WITH_DETAIL`. *Un périmètre dérivé ne garde que la dimension dont il est
   dérivé* — c'est la leçon 5 de la Phase 4, rencontrée du côté où elle ne se voit pas.
2. ⛔ **`/fr/projects/augure/` rendait la vue d'ensemble** sur une page **servie en 200**. La barre
   finale était absorbée derrière une section (cas codé et testé) et **perdue** derrière un slug, où
   elle comptait comme un segment de trop. `src/proxy.ts` pose pourtant l'équivalence au caractère
   près — `pathname.replace(/\/$/, '')`, « une barre finale désigne la même page ».
   ⭐ **Le correctif est de retirer la barre une fois, en tête**, plutôt que de la traiter à deux
   endroits : une règle écrite deux fois est une règle qui ne vaut qu'à un endroit sur deux.

⭐ Les deux propriétés neuves sont entrées **avec leurs mutations** : « toute section porterait une
fiche » et « la barre finale n'est plus retirée » sont tuées, comme les six autres.

### 7.7 ⭐⭐⭐ Ce que la passe de simplification a changé — la lecture d'URL remonte dans `routing`

Quatre angles ont été passés. **L'efficacité n'a rien rendu, et c'est mesuré** : les quatre pistes
possibles valent ~100 ns par appel réunies — cinq ordres de grandeur sous une image — et deux
d'entre elles coûteraient des octets dans le chunk de première visite pour ce gain. La fermeture du
module fait **702 octets gzip** et ne tire rien d'inattendu : ni `sections.ts` ni `locales.ts`
n'importent quoi que ce soit à l'exécution. Pas de P5-08 ici.

**L'altitude, elle, a rendu un verdict, et l'argument qui l'emporte était écrit dans le dépôt.**

⛔⛔ **`src/routing/sections.ts` documente noir sur blanc qu'un segment de section n'est *jamais* une
chaîne à valider** — « c'est un dossier de l'App Router, donc une valeur littérale du code », note
posée en revue avec le retrait d'un `isSection`. Or `sectionForSegment` est exactement le lecteur que
cette note déclarait inutile, et il avait été écrit dans `scene`, sans rouvrir la décision. ⭐⭐ **Une
décision argumentée qu'on contourne au lieu de l'amender est pire qu'une décision fausse** : la
prochaine revue relit la note, la croit, et referme le sujet. Elle est **amendée** — la note reste
vraie de la *construction*, elle a cessé de l'être de la *lecture*, et la différence est écrite là où
elle se pose.

De là, trois duplications tombaient d'elles-mêmes :

| Ce qui était écrit deux fois | Où c'est écrit une fois maintenant |
|---|---|
| `pathname.replace(/\/$/, '')` — l'équivalence de la barre finale, **mot pour mot** dans `src/proxy.ts` | `withoutTrailingSlash` dans `paths.ts`, appelée par les deux |
| `isLocale(pathname.split('/')[1])` — ce que fait déjà `localeFromPathname` | `localeFromPathname`, dont `paths.ts` dit qu'elle est le point unique |
| `(SECTIONS_WITH_DETAIL as readonly Section[]).includes(…)`, y compris dans le banc | `isSectionWithDetail`, garde de type dans `sections.ts` |

⭐⭐ **La première est celle qui coûtait le plus cher** : le commentaire citait `src/proxy.ts` comme
autorité, mais *un commentaire n'est pas un lien*. Le jour où le proxy passe de l'équivalence à une
redirection — ou où `next.config` adopte `trailingSlash` —, la scène aurait gardé l'ancienne règle et
cadré la mauvaise zone sur une page servie en 200, **sans un rouge**. C'est le motif que §7.6 venait
de corriger *à l'intérieur* du module, réintroduit **entre** modules.

⭐⭐⭐ **Le résultat est que `parsePagePath` est l'inverse manquant de `pathFor`**, à la place que ce
dépôt donne déjà à `localeFromPathname` contre `homePath`. Bénéfice immédiat pour **P6-03** :
l'aller-retour qu'exige `testing-strategy.md` §4.3 est désormais une propriété de `routing`, éprouvée
sur `pathFor ∘ parsePagePath = id` pour toutes les locales et tous les lieux — au lieu d'un second
inverse à écrire.
⭐ Et la découpe reste franche : l'effondrement « ce qui n'est pas un écran → `overview` » est une
décision de **scène**, pas de routage. `parsePagePath` rend `null`, `resolveSceneState` projette.

⚠️ **Un constat de la revue est nommé et NON traité** : `entityPath('fr', 'skills', 'x')` compile et
fabrique une adresse que le site ne sert nulle part, parce que `entityPath` et `PageLocation.entity`
prennent `Section` et non `SectionWithDetail`. La contrainte est tenue par **trois** itérations
indépendantes — le sitemap, le générateur de manifeste, et maintenant la lecture d'URL. Resserrer les
deux types serait la forme profonde ; c'est un changement de `routing` qui touche `src/seo` et
`src/app`, donc hors du périmètre de P6-01. Écrit dans `sections.ts`, à l'endroit où la question se
repose.

### 7.8 Ce que P6-01 laisse ouvert

- **`SceneState` n'est encore lu par personne.** C'est voulu — P6-02 le consomme, P6-07 l'expose —
  mais cela veut dire qu'aucun parcours ne l'exerce : la seule preuve aujourd'hui est unitaire.
- ⚠️ **Le nom de focus et le nom de cadrage ne coïncident pas** : `SceneFocus` parle en anglais
  (`overview`, `projects`, `skills`), `ViewId` de `layout.ts` parle en français (`accueil`,
  `projets`, `competences`). La correspondance est le cœur de **P6-02**, et elle doit y être
  **exhaustive par le typage** — un `Record<SceneFocus, ViewId>` —, jamais une suite de `if`.
- ⚠️ **`parsePagePath` attend un chemin**, sans requête ni fragment — ce que rend `usePathname()`.
  Rien ne le vérifie à l'exécution, et c'est assumé : les appelants prévus sont ce hook et le proxy,
  qui lit `request.nextUrl.pathname`. Le jour où une autre source l'alimente, la question se repose
  **là**, pas ici.
- ⚠️ **`entityPath` accepte une section sans fiche d'entité** — voir §7.7, nommé et non traité.


---

## 8. P6-03 — l'autre sens du flux, et l'arbitrage qui l'empêche d'être vacant

**Livré le 2026-08-26.** `getRouteForScreen(focus, locale)` et `SCENE_FOCUSES`, dans
`scene-state.ts`, contre `resolveSceneState` dont ils sont l'inverse. **30 tests** sur le module,
couverture **100 %**.

### 8.1 ⭐⭐⭐ L'arbitrage, posé avant la première ligne — et ce qu'il évitait

`testing-strategy.md` §4.3 écrit `getRouteForScreen('skills', 'en') → '/en/skills'`, ce qui se lit
comme *l'un des trois écrans*. Écrite ainsi, la fonction aurait été **un alias d'une ligne de
`sectionPath`**, et sa propriété d'aller-retour n'aurait rien affirmé que
`pathFor ∘ parsePagePath = id` — tenu depuis P6-01 — n'affirmait déjà. Le « mapping écran ↔ section
testé exhaustivement » qu'exige le même paragraphe serait devenu **vacant** : les deux vocabulaires
sont le même.

| Arbitrage | Décision de l'utilisateur (2026-08-26) | Ce qui la rouvre |
|---|---|---|
| Que prend `getRouteForScreen` ? | **Un `SceneFocus`** — les quatre états, `overview` compris | Un état de scène non représentable en URL, ce qu'ADR-0002 traite déjà comme un déclencheur de réexamen |

⭐⭐ **La raison qui emporte n'est pas l'élégance, c'est le nombre de portes.** « Revenir au bureau »
— touche Échap, clic hors écran (P6-05) — est une navigation comme une autre. Restreinte aux trois
écrans, la fonction aurait obligé P6-05 à appeler `homePath` **à côté** : ADR-0002 n'aurait plus *un*
sens de flux mais deux, dans l'ADR même qui n'en veut qu'un. **ADR-0002 est amendé**, avec sa ligne
au journal des révisions — jamais de changement silencieux.

### 8.2 ⛔⛔ L'aller-retour SEUL ne prouve rien pour `overview`

C'est l'écriture qui l'a montré, pas la relecture. La propriété
`resolveSceneState(getRouteForScreen(f, l)).focus === f` est satisfaite, pour `f = 'overview'`, par
**n'importe quelle adresse que le site ne sert pas** — elle s'effondre justement vers la vue
d'ensemble. `/fr/bureau` passait.

⭐⭐ **Une propriété d'aller-retour est aveugle sur la valeur qui absorbe les erreurs.** Elle est donc
doublée : la route doit désigner une **vraie page**, `parsePagePath(route) !== null`. La mutation
« une route d'accueil inventée » le confirme — elle survit à l'aller-retour, elle meurt sur celle-ci.

### 8.3 Deux décisions d'écriture, et leur raison

- ⭐ **Pas de `switch` exhaustif.** `overview` est le seul cas particulier ; *tout le reste est une
  section par construction*. Un `switch` devrait être rouvert à chaque section ajoutée, alors qu'elle
  doit précisément suivre toute seule — l'exhaustivité par le typage serait ici un frein, pas un
  garde.
- ⭐⭐ **`SCENE_FOCUSES` est exporté, et sa complétude est tenue.** Deux propriétés se vérifient sur
  l'ensemble et non cas par cas (l'aller-retour, et le cadrage de P6-02). Mais une liste dérivée peut
  **rétrécir en silence** : amputée de `'overview'`, elle laissait les boucles vertes. Le banc la
  confronte à un `Record<SceneFocus, true>` littéral — ajouter une section sans l'y déclarer **ne
  compile pas**, ce qui oblige un humain à passer par là. Mutation vue **survivante avant**, tuée
  après.

⭐ Les deux fonctions vivent dans le **même fichier**, et c'est la règle appliquée à elle-même :
*l'inverse vit contre l'aller*. Leur empreinte d'import est identique — `routing` seul, pas de
`layout.ts` —, donc la contrainte de §3.1 est respectée. C'est la démonstration que cette règle porte
sur l'empreinte et non sur la forme.

### 8.4 Éprouvé par mutation — quatre, toutes tuées

| Mutation | Verdict |
|---|---|
| L'accueil est rendu pour tous les focus | **tuée** — 8 tests |
| Une route d'accueil **inventée** (`/fr/bureau`) | **tuée** — 3 tests |
| La locale est figée à `fr` | **tuée** — 2 tests |
| Le périmètre est amputé de `overview` | **tuée** — 1 test |

### 8.5 Relevés

| Relevé | Avant | Après | |
|---|---|---|---|
| Tests | 803 | **815** | +12 |
| Couverture `src/scene/state` | 100 % | **100 %** | seuil 95 % |
| Socle partagé | 127,1 Ko | **127,1 Ko** | inchangé |
| JS propre à chaque route | 11,0 Ko | **11,0 Ko** | inchangé |
| Isolation de la scène (P5-09) | ✓ | **✓** | témoin sur 2 chunks différés |

⚠️ Même réserve qu'en §7.5, et elle vaut toujours : **aucun de ces deux modules n'a d'appelant**.
Le vrai relevé se prend en P6-07.

### 8.6 Ce que P6-03 laisse ouvert

- ⚠️ **Le nom `Screen` n'existe toujours pas dans le code**, et c'est assumé : les trois écrans sont
  désignés par ce qu'ils **montrent** (`SceneFocus`), pas par leur place. La correspondance avec les
  dalles physiques — `dalleGauche`, `dalleCentre`, `dallePortable` — vit déjà dans `layout.ts`
  (`CAMERAS[ViewId].focusNodeId`), en français. **P6-02 est l'endroit où les deux vocabulaires se
  rencontrent**, par un `Record<SceneFocus, ViewId>` exhaustif. N'en inventer aucun quatrième.
- ⚠️ `getRouteForScreen` n'a **aucun appelant** : P6-05 est le premier. Sa seule preuve est unitaire.
