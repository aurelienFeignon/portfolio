# La carte mère — conception (D14)

> Rédigé le 2026-10-29, à l'issue d'une séance de conception avec l'utilisateur.
> Rendu jetable de référence : <https://claude.ai/artifact/Y2w3Gq53HcZX7NeQnYBVrk> (privé, version 5).
> Il fixe l'image et les règles, pas le code : il a été écrit vite, en un seul fichier, avec
> environ 200 appels de dessin et du texte peint. Ne pas en reprendre la structure.

## 1. Pourquoi

Le retour qui a tout déclenché : **« ça n'a aucun lien »**. NEXUS (D11) montre trois emblèmes
abstraits — une pile de plateaux, un prisme, un gyroscope — autour d'un noyau. C'est soigné, mais
rien dans ces formes ne dit « expériences », « projets » ou « compétences » à quelqu'un qui n'est
pas du métier.

Deux pistes ont été essayées puis écartées :

- **un arbre** (racines = compétences, tronc = expériences, fruits = projets) — rendu jugé grossier ;
- **un arbre doré, dans l'esprit d'Elden Ring** — mieux, « mais ce n'est pas encore ça » ;
  l'utilisateur a ensuite demandé une image tirée de l'informatique.

La **carte mère** a été retenue : tout le monde reconnaît un circuit imprimé, et chaque section y
trouve une place qui se comprend sans légende.

## 2. Ce que la scène doit faire

**Objectifs**

- Que le lien entre l'image et chaque section **se voie sans explication**.
- Que la scène soit **calculée depuis le contenu** : ajouter une compétence, une expérience ou un
  projet ne demande aucun placement à la main.
- Qu'elle **montre les relations réelles** : quelle compétence sert à quel projet, quel projet est
  né chez quel employeur.

**Non-objectifs**

- Une visualisation de données exhaustive : la carte reste une composition, lisible à l'œil, pas un
  graphe à interroger.
- Changer la navigation, le panneau de lecture, l'i18n ou les routes.
- Des assets importés : tout reste procédural (P8-01 n'est pas déclenché).

**Anti-objectifs — ce qui ferait échouer la scène même si elle fonctionne**

- Un rendu **grossier** : primitives nues, tubes uniformes. C'est ce qui a fait rejeter l'arbre.
- Un **plat de spaghettis** : des pistes qui se croisent au point de ne plus rien dire.
- Une scène qui **porte de l'information que le DOM n'a pas**, ou du texte de contenu peint.
- Une régression des budgets (`performance-budget.md`) au nom de l'image.

## 3. Ce qui ne change pas

- La route reste la **seule** source de vérité (ADR-0002) : `resolveSceneState` → `getCameraTarget` → caméra.
- La 3D reste un enrichissement (ADR-0003) : `aria-hidden`, montage après `idle`, rien au palier `none`.
- Le contenu vit dans le `ReadingPanel`, en instance unique (ADR-0004) ; les étiquettes de scène
  restent du HTML projeté (`LabelProjector`), hors de la racine de scène.
- Transitions de 1,6 s interruptibles, coupe instantanée sous `prefers-reduced-motion` (ADR-0012),
  orbite bornée, parallaxe, cadrage dans la zone libre (`setViewOffset`).
- Thème sombre unique, aucun post-traitement, aucune dépendance ajoutée, aucun module drei
  supplémentaire. Formes déterministes (générateur à graine).
- Le temps de scène accumulé (P8-12, `ambient-motion.ts`).

## 4. La composition

| Élément | Section | Ce qu'il montre |
|---|---|---|
| **Le circuit imprimé** | — | Plaque sombre, pistes fines de fond, pastilles de soudure, trous de fixation, liseré de bord. Le décor de ville vue de haut. |
| **Les puces** | Compétences | Une puce par compétence, rangée dans la **zone de sa famille** (`category`), zone encadrée. Taille et hauteur croissent avec `level`. Une diode à la teinte de la famille. Broches sur les quatre côtés. |
| **Le bus principal** | Expériences | Une frise dans le temps : huit pistes parallèles qui traversent la carte de la première année à aujourd'hui. Un **tronçon par employeur**, une teinte par employeur, un **jalon par année**. |
| **Les processeurs** | Projets | Un processeur par projet : boîtier, capot métallique, broches. Le **projet principal** tient le gros processeur central ; les autres sont plus petits, autour de lui. |
| **Les pistes de liaison** | — | Une piste relie une puce à **chaque projet qui utilise cette compétence** (`technologies`), et un projet né chez un employeur au **tronçon du bus** de cet employeur. |
| **Les impulsions** | — | Des paquets lumineux courent sur le bus (dans le sens du temps) et sur les pistes de liaison (vers les processeurs). C'est l'animation ambiante. |
| **Les petits composants** | — | Résistances et condensateurs semés dans l'espace libre : la densité d'une ville. |

Palette : celle de NEXUS (`PALETTE`, `layout.ts`) — fond nuit, cyan, violet, bleu ciel. Cinq
familles de compétences demandent cinq teintes ; les deux qui manquent (le rendu emploie un ambre
et un vert d'eau) s'ajoutent à `PALETTE` et aux tokens de `globals.css`, et passent la vérification
de contraste de P8-08 (§9).

*Choix du rédacteur* — **teintes** : la palette des familles et celle des employeurs se partagent
les mêmes teintes (§5).

## 5. Les règles de placement et d'expansion

Tout se calcule dans un module **pur**, sans three ni JSX, testable comme `layout.ts` aujourd'hui
(voir §7) : il reçoit le contenu (§6) et rend les positions, tailles, chemins et cadrages.

**Compétences**

- Une zone par famille ; les puces s'y rangent **en étagères**, de la plus grande à la plus petite.
- Les zones se répartissent autour du quartier des processeurs ; quand celui-ci grandit, elles sont
  repoussées vers l'extérieur.
- Une compétence qu'aucun projet n'utilise reste sur la carte, **sans piste**. C'est vrai, et
  c'est lisible.

**Expériences — le bus**

- Une année = un pas de la frise. La carte garde sa taille : le pas se resserre avec le nombre
  d'années.
- **Au-delà de 8 années**, le bus fait un **lacet** (demi-tour à 45°) et repart dans l'autre sens,
  au lieu d'élargir la carte.
- **Deux postes simultanés** prennent **deux voies parallèles** : sur les années de recouvrement, le
  bus se dédouble, puis la voie secondaire rejoint la principale. Les voies sont attribuées dans
  l'ordre des débuts ; une voie libérée se réutilise. ⭐ C'est le cas réel : EVEA Conseil court de
  2021 à aujourd'hui (fiche sans `endedAt`), Augure s'y ajoute en parallèle depuis 2025.
- Une année **sans poste** reste une piste éteinte (grise).
- Un changement d'employeur sur une même voie est marqué d'un décrochement à 45°.
- *Choix du rédacteur* — **teintes des employeurs** : elles parcourent la palette en cycle, dans
  l'ordre des débuts, et peuvent coïncider avec celle d'une famille de compétences. La collision
  est acceptée : le survol isole ce qu'il éclaire, et le bus ne se confond pas avec une zone de
  puces. Aucune seconde série de teintes.
- *Choix du rédacteur* — **fin du bus** : « aujourd'hui » est l'année **du navigateur**, lue au
  montage de la scène, pour que le bus s'allonge seul au 1er janvier sans redéploiement. Le module
  pur la reçoit **en paramètre** (jamais `new Date()` en son sein), ce qui garde les bancs
  déterministes.

**Projets — les processeurs**

- Le projet principal (règle de désignation : §6) tient le processeur central. Les autres se placent
  sur des emplacements autour de lui, dans un **quartier des processeurs** qui grandit avec leur nombre.
- Les pistes d'un côté de processeur sont réparties le long de ce côté ; leurs canaux de
  dégagement se **resserrent** quand le côté est chargé, plutôt que d'empiéter sur les zones.
- **Au-delà d'un seuil de liaisons** (à mesurer par le constructeur — l'ordre de grandeur est
  « quand les canaux ne tiennent plus »), chaque zone de compétences sort par **son propre bus** vers
  le quartier des processeurs, et de courtes pistes rejoignent chaque processeur. C'est la parade
  au plat de spaghettis.
- Un projet rattaché à une expérience se branche sur le tronçon de cette expérience, à l'année de
  son début (bornée à la période du poste). C'est le **rattachement** (`experience`) qui décide,
  jamais le `type` : un projet sans rattachement ne se branche pas sur le bus, et un projet `personal`
  rattaché (Augure) s'y branche.

**Cadrages**

Les quatre vues (ensemble, compétences, expériences, projets) sont **calculées depuis les boîtes
englobantes** de ce qu'elles montrent, avec la règle existante de cadrage dans la zone libre : la
caméra suit l'expansion d'elle-même.

## 6. Ce que la scène lit du contenu

⛔ **C'est une rupture avec D11**, qui posait « la scène ne lit pas `content` ». La carte en a
besoin ; ce qu'elle lit doit rester **minimal**, **sérialisable**, et passer par la frontière
existante (le serveur rend la page, la scène différée reçoit ses données) :

| Type | Champs lus |
|---|---|
| Compétence | `slug`, `category`, `level` |
| Expérience | `slug`, `startedAt`, `endedAt` (absent = en cours) |
| Projet | `slug`, `startedAt`, `technologies`, le champ « principal » et le rattachement à une expérience (ci-dessous) |

Les **noms** (compétences, employeurs, projets) ne sont pas nécessaires à la géométrie ; ils servent
aux étiquettes HTML (§8), qui les prennent du DOM ou du dictionnaire comme aujourd'hui.

**Changements de contenu décidés par l'utilisateur le 2026-10-29**

- **Augure** et **Askor** deviennent aussi des **projets** (deux nouvelles fiches, dans les deux
  langues), en plus de leurs fiches d'expérience. Leurs technologies reprennent celles des fiches
  d'expérience correspondantes. **Le constructeur rédige un brouillon** (résumé, type, corps FR et
  EN) à partir des fiches d'expérience ; **l'utilisateur le relit et fournit les dates de début
  exactes** avant fusion — le schéma exige une date ISO, les expériences ne portent que l'année. Ce
  lot de contenu bloque le reste : sans lui, ni processeur central ni lien vers le bus.
  *Choix du rédacteur* : les slugs `augure` et `askor` sont réutilisés côté projets — les routes
  diffèrent (`/projects/…` et `/experiences/…`) ; la fiche projet parle du produit, la fiche
  d'expérience du poste.
- **Augure** est le projet principal (processeur central). « Ce portfolio » devient secondaire.
- **Le projet principal se désigne par un champ dédié** du schéma de projet (décision de
  l'utilisateur) — par exemple `principal: true`, nom au choix du constructeur. **Au plus un**
  projet le porte **par locale**, et c'est **le même** dans toutes les locales où sa fiche existe
  (une locale qui n'a pas traduit la fiche n'est pas jugée, R-07) ; les deux règles sont vérifiées
  par le contrôle d'intégrité (erreur de build). Si aucun ne le
  porte, la carte place le projet le plus récent au centre. `featured` garde son sens actuel et
  n'est pas touché : la fiche du portfolio le conserve.
- Le schéma de projet gagne un champ optionnel de **rattachement à une expérience** (un `slug`
  d'expérience), vérifié par le contrôle d'intégrité comme les `technologies` le sont aujourd'hui.
  Askor → EVEA Conseil (`askor`), Augure → Augure (`augure`), le portfolio : aucun.

## 7. Où vit le code

- Un module **pur** de plan de carte (à côté de `layout.ts`, même garde : hors du chemin de
  première visite, aucun import de three) : entrées §6 → sorties §5. ⭐ C'est lui qui porte les
  bancs : placement sans recouvrement, nombre de voies, lacet au-delà de 8 années, une piste par
  couple compétence–projet, budgets recomptés depuis les données.
- `layout.ts` garde ce qui ne dépend pas du contenu (palette, durées, orbite, `ViewId`) ; ce qui
  décrivait NEXUS (univers, noyau, gros plans calculés autour du noyau) est retiré avec les composants
  `nexus/`, comme `desk.tsx` l'avait été en D11.
- `getCameraTarget` reste le seul endroit où route et vue se rencontrent.

## 8. Les interactions

- **Survol d'une puce** : la puce, ses pistes et les processeurs qu'elle alimente s'allument ; le
  reste s'atténue. **Survol d'un processeur** : ses compétences, ses pistes et son tronçon de bus.
  **Survol d'une année** : les employeurs de l'année, et les projets qui y sont rattachés.
- **Étiquettes HTML, par vue** (décision de l'utilisateur) — jamais un texte peint :
  - **vue d'ensemble** : les trois sections, comme les étiquettes d'univers aujourd'hui ;
  - **vue d'une section** : en permanence, les noms de ce qu'elle cadre — les cinq familles
    (Compétences), les employeurs (Expériences), les projets (Projets) ;
  - partout, **l'élément survolé** en plus.
  Elles passent par `LabelProjector` : placement dans la zone libre, masquées sous le panneau et
  l'en-tête, et désormais **N étiquettes simultanées** dont les collisions se règlent (en cas de
  chevauchement, la moins prioritaire se cache). Au mobile, les noms permanents d'une vue sont ce
  qui nomme la carte, puisqu'il n'y a pas de survol.
- **Clic** : un processeur mène à la fiche du projet (`/projects/[slug]`) ; un tronçon du bus à la
  fiche de l'expérience (`/experiences/[slug]`) ; une puce à la page des compétences (il n'existe pas
  de fiche par compétence). Toujours par `router.push`, jamais en modifiant la caméra directement.
- Au tactile, pas de survol : le premier toucher allume les relations, le second navigue — ou bien
  le toucher navigue directement ; au choix du constructeur, à condition que les deux gestes
  restent distincts du défilement (le doigt fait défiler la page, comme aujourd'hui).

## 9. Texte, accessibilité, contrastes, budgets

**Texte dans la scène.** Le rendu jetable peint des noms sur les puces et la carte : c'est
**interdit** par ADR-0004 pour tout ce qui porte du contenu (non traduisible, illisible pour les
technologies d'assistance). Règle retenue :

- les noms (compétences, familles, employeurs, projets) passent par des **étiquettes HTML** ;
- la sérigraphie peinte se limite à de la **décoration sans langue** : années, repères de
  composants (`U1`, `R12`), référence de la carte. Elle double une information présente dans le DOM
  ou n'en porte aucune.

C'est un amendement d'ADR-0004 à consigner dans son journal.

**Accessibilité.** Rien ne change sur le fond : la scène est `aria-hidden`, toute l'information
qu'elle montre est déjà dans le panneau. Sous `prefers-reduced-motion`, les impulsions s'arrêtent
(elles restent visibles, immobiles) et la boucle passe en `demand`.

**Contrastes (P8-08).** À juger sur ce rendu final : étiquettes HTML sur la scène, dans le pire cas
(une impulsion ou une diode derrière) ; les deux teintes ajoutées à la palette ; le panneau ne change
pas.

**Budgets.**

- Appels de dessin : cible **60** sur ordinateur (P8-10). Le rendu jetable en fait environ 200 :
  il faudra **instancier** puces, broches et composants (un `InstancedMesh` par forme, taille par
  instance), **fusionner** toutes les pistes en une géométrie (la mise en relief au survol passe par
  un attribut ou une texture d'état par piste, pas par un matériau par piste), et réunir la
  sérigraphie dans une seule texture.
- Chunk 3D : ≤ 300 Ko, seuil 350 (`performance-budget.md` §4.3) ; aucune dépendance ajoutée.
- Densité par palier, comme aujourd'hui (`DENSITY`) : `lite` sans petits composants et avec moins
  d'impulsions ; la composition reste la même partout.
- Mesure `Avant / Après / Gain` après l'ajout (P8-07) : `make perf-baseline` **et** `?debug=scene`
  sur GPU réel.

## 10. Conséquences sur le programme

- **D14** au journal de `phase-0-questions.md` : la composition NEXUS de D11 est remplacée par la
  carte mère ; D11 reste lisible, et ce qu'elle garantissait (§3) est conservé.
- **P8-05** (éclairage et ambiance) se refait sur la carte. **P8-08** (contrastes) se juge ensuite.
  **P8-10** (60 appels) devient une contrainte de conception, plus une tâche après coup.
- Les tâches d'implémentation recevront de nouveaux identifiants (jamais réutilisés), au moment du
  plan.
- La Phase 9 (CV, GitHub, LinkedIn, « à propos ») reste à décider ; la carte offre des emplacements
  naturels (connecteurs de bord), sans que rien soit tranché ici.

## 11. Laissé au constructeur

- Les dimensions exactes, la répartition des zones, le nombre d'emplacements de processeurs et le
  seuil de bascule vers les bus de famille — mesurés, et tenus par les bancs du module pur.
- Les shaders et matériaux, dans l'esprit de NEXUS (lueur dans la géométrie, mélange additif).
- Le geste tactile (§8), dans les limites posées.
- Le découpage en lots et l'ordre de livraison.

### Mesuré par le constructeur (P8-14, 2026-10-30)

Module `src/scene/state/board/`, tenu par les bancs de `tests/unit/scene/board/` ; les constantes
sont des valeurs de départ, les bancs portent les invariants. ⚠️ Deux sortes de chiffres, à ne pas
confondre : ceux des **bancs** (contenus fabriqués, épinglés par un test) et ceux du **contenu
réel** (mesurés une fois, à date — aucun test ne lit `content/`).

**Contenu réel** — `planBoard(toBoardContent(…))` sur le dépôt de contenu, `fr` et `en` (mêmes
chiffres), mesuré le **2026-10-30, dans le conteneur, sans bridage** CPU, par un script jetable non
versionné. 40 compétences, 3 projets, 2 expériences :

| `chipSizing` | `currentYear` | mode         | liaisons | au bus | ponts | à chaud (médiane) | 1er appel du processus |
| ------------ | ------------- | ------------ | -------- | ------ | ----- | ----------------- | ---------------------- |
| `level`      | 2026          | bus de fam.  | 48/48    | 2/2    | 16    | ≈ 145–175 ms      | ≈ 275–325 ms           |
| `uniform`    | 2026          | bus de fam.  | 48/48    | 2/2    | 19    | ≈ 130–200 ms      | —                      |
| les deux     | 2027          | bus de fam.  | 48/48    | 2/2    | 12    | ≈ 75–115 ms       | —                      |

- ⚠️ **La carte change de forme au 1er janvier** : `currentYear` allonge la frise d'une case, la
  géométrie du bus bouge, et le nombre de ponts avec (16 → 12 en `level`). Ce n'est pas un défaut,
  mais deux visites à cheval sur l'an ne voient pas la même carte.
- Les extrêmes à chaud vont de ≈ 115 à ≈ 255 ms en 2026 (deux passes de sept appels par cas).

**Bancs** (`tests/fixtures/builders/board.ts`, contenus **fabriqués** : `makeRealSizeBoard` copie
les dimensions du contenu réel, pas ses correspondances technologie → compétence, d'où des ponts
bien moins nombreux) :

- `makeRealSizeBoard` : bus de famille, 48/48, 2/2, **5 ponts** (épinglé, `plan.test.ts`) ;
  ≈ 16–28 ms à chaud. Avec un projet de plus (`realPlusOne`, `traces.test.ts`) : 51/51, 3/3.
- `makeLargeBoard` (80 compétences, 20 projets, 20 ans) : 80/80, 20/20, **170 ponts** en `level`
  (épinglé, `plan.test.ts`) ; ≈ 0,8–1 s à chaud.
- **Capacité du mode direct** (banc `fan` de `traces.test.ts` : une seule zone, à l'ouest, de puces
  de taille `uniform`, un seul processeur, aucun rattachement au bus) : 9 puces passent en direct,
  la 10e bascule en bus de famille. C'est la capacité **de ce banc**, pas un seuil général : le
  routeur bascule dès qu'une liaison échoue (§5, « quand les canaux ne tiennent plus »).

**Décisions et lectures :**

- ⭐ **Décision prise en cours d'exécution** : « aucun croisement » était un invariant **du plan**
  (`plans/2026-10-30-carte-mere-2-plan-de-carte.md`), plus strict que §2 — qui ne rejette les
  croisements qu'« au point de ne plus rien dire » — et impossible sur une seule couche (K3,3). Le
  routeur admet des **ponts** : une piste n'en croise une autre qu'à 90°, en ligne droite sur une
  cellule, déclarée dans `Traces.vias` — la seconde couche d'un vrai circuit imprimé. Zéro perte sur
  le grand banc dépend des coûts réglés (`BRIDGE_COST` 4, `HUG_COST` 1).
- **« Une piste par couple compétence–projet »** (§5) est tenue comme un lien **logique** : chaque
  `Link` est porté par au moins une `Route`. En bus de famille, plusieurs liens partagent un tronc.
- **Prise au bus** : une liaison au bus perce la voie de son poste **dans la case de son année**
  (§5), quelle que soit la voie — tenu sur chaque liaison au bus des bancs de taille réelle et du
  grand banc.
- **Coût** : sur le contenu réel, `planBoard` est une **tâche longue** dès le conteneur non bridé
  (tableau ci-dessus ; le banc de taille réelle, dix fois plus rapide, ne le laissait pas voir).
  Une tâche longue compte au TBT pour ce qui dépasse 50 ms : non bridée, elle en coûte déjà près de
  la moitié du budget TBT ≤ 200 ms ; sous un bridage CPU ×4, elle le dépasserait seule. ⇒ **P8-15
  calcule le plan hors du fil principal (worker) ou au build** — le choix entre les deux est à
  trancher dans P8-15 ; le calcul sur le fil principal est exclu.
- **Reporté à P8-15** : l'affinité des emplacements (placer un projet du côté de sa zone dominante
  réduirait les ponts) ; D2 tranche `ChipSizing` (`'level'` ou `'uniform'`, sans défaut) ; le
  **décrochement d'employeur** : un changement d'employeur sur une même voie (la voie 0 du contenu
  réel) n'émet qu'un marqueur (`Timeline.jogs`), alors que §5 demande une marche à 45° **dessinée**
  — P8-15 doit la tracer ; les jetons `globals.css` pour ambre et sarcelle, et leurs contrastes (P8-08).

## 12. Génération et montage (décisions du 2026-10-30)

> Décidé avec l'utilisateur le 2026-10-30, après P8-14. Tranche le choix « worker ou build » laissé
> ouvert au §11, et fixe ce que P8-15 livre.

**Le besoin, dans les mots de l'utilisateur.** « Quand on met à jour les compétences, on est obligé
de recoder la carte mère » : il veut que la carte suive **ses fichiers MDX** sans écrire une ligne de
scène, et pouvoir le **vérifier en localhost**. Et que la carte mère **soit montée à la place de
NEXUS**.

### 12.1 La commande de génération

- `make board` lit le contenu (le dépôt de contenu, comme `generate-route-manifest.mts`), applique
  `toBoardContent` puis `planBoard`, et **écrit un fichier engendré, versionné** dans
  `src/scene/state/board/` (nom au choix du constructeur). Décision de l'utilisateur : la carte est
  produite **par une commande**, pas recodée.
- La commande **affiche un résumé** : puces, processeurs, années de la frise, liaisons routées et
  perdues, liaisons au bus routées et perdues, ponts, mode de routage, temps de calcul. Une liaison
  perdue est **dite**, nommément — jamais seulement comptée.
- ⛔ **Une liaison perdue fait échouer la commande** (sortie non nulle) — décision de l'utilisateur
  le 2026-10-30. Comme `pnpm build` relance la génération, elle bloque aussi le build et donc le
  déploiement : une carte qui tait une relation réelle ne part jamais en ligne. Le message nomme
  chaque couple compétence–projet ou projet–expérience perdu.
- *Choix du rédacteur* — **le fichier est versionné**, comme `src/routing/route-manifest.ts` : le
  diff d'une PR montre ce que la mise à jour du contenu change sur la carte. Un test de fraîcheur,
  sur le modèle de `route-manifest-is-fresh.test.ts` (générateur lancé en sous-processus, jamais
  importé), **refuse un fichier qui ne correspond plus au contenu** : oublier `make board` fait
  rougir la CI au lieu de publier une carte périmée. La forme écrite est déjà passée par Prettier.
- `pnpm build` relance la génération avant `next build`, comme pour le manifeste : la production
  lit toujours un plan frais.
- **Puces de taille égale** (`chipSizing: 'uniform'`) — décision de l'utilisateur le 2026-10-30,
  **D2 reste ouverte** : les niveaux ne sont pas relus, donc rien ne les rend visibles. Le jour où
  D2 est tranchée, c'est un paramètre de la commande à changer, pas du code de scène.

### 12.2 Ce que cela change à la conception

- **Le plan n'est plus calculé dans le navigateur.** La tâche longue mesurée au §11 (≈ 130–200 ms à
  chaud) disparaît du fil principal : la scène **lit** un plan, elle ne le calcule plus. Le module
  pur ne sert plus qu'à la génération et aux bancs ; il ne doit **pas** entrer dans le chunk 3D (le
  garde d'isolation l'y interdit déjà pour le chemin de première visite — à étendre au chunk 3D,
  sauf le fichier engendré).
- ⚠️ **L'année est figée à la génération**, ce qui amende §5 (« l'année du navigateur, lue au
  montage ») : la frise ne s'allonge plus seule au 1er janvier. Conséquence assumée, et rattrapée
  par le garde de fraîcheur : le 1er janvier, le plan versionné ne correspond plus à ce que produit
  la commande avec l'année courante, la CI rougit, et `make board` suivi d'un déploiement allonge la
  frise. ⚠️ *Choix du rédacteur* — l'année de génération est un argument de la commande (par défaut
  l'année courante), pour que le test de fraîcheur compare à l'année **écrite dans le fichier** et
  ne rougisse pas un 1er janvier sans que le contenu ait changé ; un second garde, distinct, signale
  qu'une année a passé. Le constructeur peut proposer mieux.
- Le contenu est **par locale** (R-07 : une fiche non traduite n'existe que dans une locale). Le
  constructeur mesure si les plans `fr` et `en` diffèrent ; s'ils sont identiques, un seul plan
  suffit, sinon un par locale — et la scène charge celui de sa locale sans embarquer l'autre. Poids
  à mesurer contre le budget du chunk 3D (≤ 300 Ko, seuil 350).

### 12.3 Le montage à la place de NEXUS (P8-15)

- La carte mère **remplace NEXUS en production** : composants `nexus/`, univers, noyau, gros plans
  calculés autour du noyau et `nexus-geometry.ts` sont retirés, comme `desk.tsx` l'a été en D11
  (§7). `getCameraTarget` prend les cadrages de `boardCameras` sur le plan engendré.
- Tout le reste est déjà écrit et **ne change pas** : rendu (§4, §9 : instanciation, pistes
  fusionnées, ≤ 60 appels de dessin, densité par palier), interactions (§8 : étiquettes HTML par
  vue, survol des relations, clic par `router.push`), accessibilité et budgets (§9), ce que D11
  garantissait (§3).
- Les **ponts** (`Traces.vias`) sont dessinés comme les vias d'un circuit — c'est un élément visuel
  nouveau, que l'utilisateur jugera en localhost avant la fusion.
- La **marche à 45°** d'un changement d'employeur sur une voie (§11, reporté) est dessinée.
- **Vérification en localhost** par l'utilisateur, avant toute fusion : `make board`, `make up`,
  puis la carte dans le navigateur, sur les quatre vues.

### 12.4 Précisions arrêtées après relecture (choix du rédacteur, sauf mention)

- **Un seul fichier de plan par locale, toujours** : `fr` et `en` peuvent diverger (R-07), et un
  plan unique casserait en silence le jour où une fiche n'existe que dans une langue. La scène charge
  **par import dynamique** le plan de sa locale seulement. Format **JSON** (données, pas de code),
  indenté pour que le diff d'une mise à jour reste lisible ; poids mesuré contre le chunk 3D.
- **Le fichier porte tout ce que la scène dessine, déjà calculé** : le plan au palier `full`
  (petits composants dans un ordre stable), **les quatre cadrages** (`boardCameras`), et l'**année
  de génération**. Les paliers plus légers prennent les N premiers petits composants et moins
  d'impulsions — la composition ne change pas (§9). La scène n'importe **aucune valeur** du module
  pur : les types communs passent dans un fichier de types seul (imports de type, effacés), et le
  garde d'isolation s'étend au chunk 3D.
- **La marche à 45° d'un changement d'employeur** est calculée par le module pur (une géométrie
  dans le plan, testée par les bancs), pas déduite par la scène.
- **L'année** : `pnpm build` génère avec l'année courante, donc la production est toujours à
  l'année du déploiement. Le fichier versionné porte son année ; le test de fraîcheur régénère
  **avec cette année-là**, et ne rougit donc que si le **contenu** a changé. Le passage d'une année
  est **dit** par le résumé de `make board`, pas imposé par un test qui rougirait une PR sans
  rapport chaque 1er janvier.
- **Ce que P8-15 retire avec NEXUS** : les bancs, parcours et repères qui nomment NEXUS sont
  réécrits sur la carte, ou retirés s'ils n'ont plus d'objet — jamais affaiblis pour verdir.
  La mesure `Avant / Après / Gain` (§9) fait partie de P8-15.
- Le lot de contenu (§6) est livré (#84) : fiches Augure et Askor, dates fournies par l'utilisateur.
