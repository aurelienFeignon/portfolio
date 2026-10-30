# Carte mère, plan 3/3 — génération et rendu à la place de NEXUS — plan d'implémentation

> **Pour les agents qui exécutent :** SOUS-SKILL REQUIS : superpowers:subagent-driven-development
> (recommandé) ou superpowers:executing-plans, tâche par tâche. Les étapes se suivent par cases à
> cocher (`- [ ]`).

**But :** `make board` régénère depuis les MDX un plan de carte versionné, et la scène dessine la
carte mère à partir de ce plan, **à la place de NEXUS**, vérifiable en localhost.

**Architecture :** un générateur (`scripts/generate-board-plan.mts`) appelle le module pur de P8-14
et écrit un JSON par locale dans `src/scene/generated/`. La scène charge celui de sa locale par
`import()` dynamique dans l'arbre du canvas, et ne calcule plus rien du plan. Tout ce qui se calcule
sans three (rubans de pistes, relations de survol, impulsions, placement des étiquettes) vit dans
`src/scene/state/board-render/`, pur et testé ; les composants R3F de `src/scene/components/board/`
ne font qu'envelopper ces tableaux dans des objets three. NEXUS est retiré en dernier.

**Pile :** TypeScript, React Three Fiber 9, three, Vitest, Playwright ; tout par Docker (`make …`).
Aucune dépendance ajoutée, aucun module drei supplémentaire.

**Conception :** [`docs/carte-mere.md`](../carte-mere.md) — §3 (ce qui ne change pas), §4, §8, §9,
et surtout **§12** (génération, décisions de l'utilisateur du 2026-10-30).

## Contraintes globales

- Documentation, commentaires, messages **en français** ; identifiants **en anglais**.
- `src/scene/state/**` : aucun import three, couverture ≥ 95 % sur les quatre axes.
  `src/scene/components/**` : aucun `next`/`next/*` hors `scene-mount.tsx` et `scene-boundary.tsx`
  (React #438) — tout `import()` paresseux dans l'arbre du canvas passe par un effet, jamais
  `next/dynamic`.
- Couches ESLint : `scene` n'importe que `routing` et `i18n`, jamais `content` ; `scripts` n'importe
  pas `scene` — **une seule exception**, ciblée sur `scripts/generate-board-plan.mts` (tâche 2).
- ⛔ Un test ne nomme jamais une entité de `content/` et un test unitaire ne lit pas `content/`.
- **Puces de taille égale** : `chipSizing: 'uniform'` (D2 ouverte, §12.1).
- **Une liaison perdue fait échouer `make board`** (sortie non nulle, couples nommés) — donc le build.
- Budgets (§9) : **≤ 60 appels de dessin** sur ordinateur, chunk 3D ≤ 300 Ko (seuil 350), densité par
  palier (`lite` sans petits composants, moins d'impulsions ; la composition ne change pas).
- Ce que D11 garantissait est conservé (§3) : la route seule source de vérité, `aria-hidden`,
  montage après `idle`, rien au palier `none`, transitions 1,6 s interruptibles, coupe sous
  `prefers-reduced-motion`, orbite bornée, parallaxe, cadrage dans la zone libre, temps de scène
  accumulé. Les attributs DOM que lisent les E2E (`data-scene-root`, `data-scene-focus`,
  `data-scene-visible`, `data-camera-focus`, `data-camera-transition`, `[data-scene-labels]
  [data-section]`) **restent**.
- Aucun texte de contenu peint (ADR-0004) : la sérigraphie ne porte que des années et des repères
  (`U1`, `IC12`, `R3`).
- Pas de `make perf-baseline` en local (plantages d'hôte) : la mesure GPU réelle est faite par
  l'utilisateur (tâche 9).
- Commits locaux pendant 9 h-12 h 30 et 14 h-17 h 30 (Paris), demander avant de pousser ; la fusion
  se demande toujours ; avant la PR : /code-review → /security-review → /simplify. ⛔ La PR ne se
  fusionne qu'après **vérification visuelle en localhost par l'utilisateur**.

## Points de vigilance (Review Focus)

1. **Locale sans fiche traduite** (R-07) : `fr` et `en` peuvent produire deux plans différents ;
   la scène doit charger **le sien**, jamais l'autre. → Tâche 2 (deux fichiers) et tâche 3 (test du
   chargeur par locale).
2. **Navigation pendant le chargement du plan** : une route change avant que le JSON n'arrive ; la
   caméra doit viser l'état **courant** à l'arrivée, pas celui du montage. → Tâche 3.
3. **Contexte WebGL perdu / chunk manquant** : la frontière d'erreur doit toujours rendre la page
   sans scène (`scene-failure.spec.ts` reste vert, le JSON manquant compte comme chunk). → Tâche 3.
4. **Survol puis navigation** : un survol resté allumé ne doit pas survivre à un changement de
   route (règle actuelle de `survolAt`). → Tâche 6.
5. **Étiquettes qui se chevauchent** sur petit écran : la moins prioritaire se cache, jamais deux
   superposées ; l'élément survolé passe devant. → Tâche 7.

---

### Tâche 1 : la marche à 45° d'un changement d'employeur (P8-15a)

**Fichiers :** modifier `src/scene/state/board/timeline.ts` ; test
`tests/unit/scene/board/timeline.test.ts`.

**Interfaces :**
- Produit : `BusJog` gagne `points: readonly Vec2[]` — la marche dessinée : la voie quitte sa ligne
  à 45° d'un **demi-pas de voie** (`LANE_PITCH / 2`) vers l'extérieur de la rangée, puis y revient à
  45°, centrée sur la frontière entre les deux années. `at` reste le milieu de la marche.

- [ ] **Étape 1 : tests rouges** — pour un changement d'employeur sur la voie 0
  (`exp({ slug: 'a', startYear: 2018, endYear: 2020 })`, `exp({ slug: 'b', startYear: 2021 })`) :
  `jogs[0].points` octilinéaire (`expectOctilinear`), commence et finit **sur** la ligne de la voie
  (`onPolyline` contre l'épine), et son point le plus éloigné est à `LANE_PITCH / 2` de la ligne ;
  la marche ne coupe aucun segment (`expectNoCrossing` avec les segments) ; idem sur une voie > 0 et
  à travers un lacet (`makeLargeBoard()`).
- [ ] **Étape 2 : vérifier l'échec** — `docker compose run --rm web pnpm vitest run tests/unit/scene/board/timeline.test.ts`.
- [ ] **Étape 3 : implémenter.** Si la marche tombe sur un lacet, la placer au début de la case
  suivante de la rangée (documenter).
- [ ] **Étape 4 : vérifier** — vert, `make coverage` tient 95 %.
- [ ] **Étape 5 : commit** — `feat(scene) : la marche à 45° d'un changement d'employeur (P8-15a)`

### Tâche 2 : `make board`, le plan versionné et son garde de fraîcheur (P8-15b)

**Fichiers :**
- Créer : `src/scene/state/board/file.ts` (le format du fichier), `scripts/generate-board-plan.mts`
- Créer (engendrés) : `src/scene/generated/board-plan.fr.json`, `src/scene/generated/board-plan.en.json`
- Modifier : `package.json` (`build`), `Makefile` (cible `board`), `eslint.config.mjs` (exception)
- Test : `tests/unit/scene/board/file.test.ts`, `tests/integration/board-plan-is-fresh.test.ts`

**Interfaces :**
- Produit (`file.ts`, pur) :
  ```ts
  export const BOARD_FILE_VERSION = 1
  export interface BoardFile {
    readonly version: typeof BOARD_FILE_VERSION
    readonly locale: string
    readonly year: number
    readonly chipSizing: ChipSizing
    readonly plan: BoardPlan            // palier 'full'
    readonly cameras: Readonly<Record<ViewId, CameraSpec>>
  }
  export interface BoardLoss { readonly kind: 'link' | 'bus-link'; readonly from: string; readonly to: string }
  export function buildBoardFile(content: BoardContent, options: { locale: string; year: number; chipSizing: ChipSizing }): BoardFile
  export function boardLosses(file: BoardFile): readonly BoardLoss[]   // unrouted + unroutedBusLinks
  export function summarize(file: BoardFile, ms: number): string        // résumé humain, français
  ```
- Le générateur : `node scripts/generate-board-plan.mts [--year AAAA] [--out <dossier>]`. Par
  défaut l'année courante et `src/scene/generated/`. Pour chaque locale de `LOCALES` : dépôt de
  contenu → `toBoardContent` → `buildBoardFile` → écriture **formatée par l'API Prettier** (parser
  `json`, la config du dépôt) pour que `prettier --check` passe et que le diff reste lisible. Imprime
  `summarize` par locale. **Sortie 1** si `boardLosses` n'est pas vide, en listant chaque couple ;
  dans ce cas **n'écrit rien**. Si le fichier versionné porte une année antérieure à l'année
  courante, le dit dans le résumé (« une année a passé : la frise s'allongera au prochain
  `make board` »).
- `make board` : `$(RUN) node scripts/generate-board-plan.mts`. `package.json` `build` : le
  générateur s'insère **après** `generate-route-manifest.mts`, avant `next build`.
- `eslint.config.mjs` : exception de couche **pour ce seul fichier** (`scripts` → `scene/state/board`),
  commentée (pourquoi : le générateur est le seul pont contenu → scène, et il tourne hors du site).

- [ ] **Étape 1 : tests rouges** — `file.test.ts` (fixtures uniquement) : `buildBoardFile` porte
  `version`, `year`, `chipSizing: 'uniform'`, les quatre cadrages égaux à `boardCameras(plan)` ;
  `JSON.parse(JSON.stringify(file))` est `toEqual` à `file` (sérialisable) ; `boardLosses` nomme
  chaque perte (fabriquer une perte avec un contenu qui en produit — un banc de `traces.test.ts`
  sait le faire, sinon construire le `BoardFile` à la main) ; `summarize` contient les compteurs.
  `board-plan-is-fresh.test.ts` : sur le modèle exact de `route-manifest-is-fresh.test.ts`
  (sous-processus, jamais d'import) — lit l'année écrite dans chaque fichier versionné, relance le
  générateur avec `--year <cette année> --out <tmp>`, compare **octet à octet**.
- [ ] **Étape 2 : vérifier l'échec.**
- [ ] **Étape 3 : implémenter** `file.ts`, le générateur, l'exception ESLint, `make board`, le
  branchement dans `build`. Lancer `make board` et **commiter les deux JSON**.
- [ ] **Étape 4 : vérifier par mutation** — retirer temporairement une compétence citée d'un projet
  dans une copie de travail : le test de fraîcheur rougit ; forcer une perte (p. ex. en bornant
  temporairement le routeur) : `make board` sort en 1 et nomme le couple, rien n'est écrit. Annuler
  les mutations (`git status` propre).
- [ ] **Étape 5 : vérifier** — `make lint`, `make typecheck`, `make test`, `make check-content` ;
  noter dans le rapport le poids des deux JSON (brut et `gzip -9`) et le temps du générateur.
- [ ] **Étape 6 : commit** — `feat(scene) : make board, le plan de carte versionné (P8-15b)`

### Tâche 3 : la scène charge son plan, la caméra vise ses cadrages (P8-15c)

**Fichiers :**
- Modifier : `src/scene/state/camera-target.ts`, `src/scene/components/scene-canvas.tsx`,
  `src/scene/components/nexus/camera-rig.tsx` (déplacé en tâche 8), `src/scene/components/scene-mount.tsx`
- Créer : `src/scene/state/board-render/load.ts` (choix du fichier par locale, pur),
  `src/scene/components/board/use-board-file.ts`
- Test : `tests/unit/scene/camera-target.test.ts`, `tests/unit/scene/board-render/load.test.ts`

**Interfaces :**
- `getCameraTarget(state: SceneState, cameras: Readonly<Record<ViewId, CameraSpec>>): CameraSpec` —
  le `Record<SceneFocus, ViewId>` reste le seul lieu où route et vue se rencontrent ; les cadrages
  viennent du fichier (identité conservée : rend l'instance du fichier).
- `load.ts` : `boardFileLoader(locale: Locale): () => Promise<BoardFile>` — un `switch` exhaustif sur
  `Locale` qui rend `() => import('@/scene/generated/board-plan.fr.json')` etc. (un chunk par locale,
  le bundler voit chaque chemin littéral) ; `isBoardFile(value: unknown): value is BoardFile` (version
  et forme minimale vérifiées : un JSON périmé d'une autre version lève une erreur nommée, que la
  frontière range en `'chunk'`).
- `useBoardFile(locale): BoardFile | null` — effet + `import()` (jamais `next/dynamic`) ; `null` tant
  que le fichier n'est pas arrivé ; erreur relancée au rendu pour que `SceneBoundary` la voie.
- La locale vient de `localeFromPathname` (routing) dans `scene-mount.tsx`, passée en prop au canvas.
- Tant que le fichier n'est pas là, le canvas reste en `frameloop="never"` (comme avant le
  préchauffage) ; à son arrivée, la caméra part de `getCameraTarget(étatCourant, file.cameras)`
  (Review Focus 2).

- [ ] **Étape 1 : tests rouges** — `getCameraTarget` rend l'instance de `cameras` pour chaque
  `SceneFocus` (les quatre) ; `detail` ne change rien ; `boardFileLoader('fr')` et `('en')` chargent
  des fichiers dont `locale` vaut la leur (Review Focus 1) ; `isBoardFile` refuse une autre version.
- [ ] **Étape 2 : vérifier l'échec.**
- [ ] **Étape 3 : implémenter.** NEXUS reste affiché à ce stade, mais sa caméra lit déjà les
  cadrages du fichier — c'est attendu et transitoire (la tâche 4 monte la carte).
- [ ] **Étape 4 : vérifier** — `make test`, `make typecheck`, `make lint` ; `make e2e` sur
  `scene-mounted` et `desktop-chromium` (surcharge de port hors dépôt si 3000/3001 sont pris,
  `next-session-prompt.md` P7-05).
- [ ] **Étape 5 : commit** — `feat(scene) : la scène charge le plan de sa locale (P8-15c)`

### Tâche 4 : le rendu statique de la carte (P8-15d)

**Fichiers :**
- Créer (purs, testés) : `src/scene/state/board-render/geometry.ts` (rubans, instances),
  `src/scene/state/board-render/silkscreen.ts` (ce que la sérigraphie écrit, et où)
- Créer (R3F) : `src/scene/components/board/board-scene.tsx`, `board-materials.ts`, `board-meshes.tsx`
- Modifier : `src/scene/components/scene-canvas.tsx` (monte `BoardScene` à la place de `NexusScene`),
  `src/scene/state/layout.ts` (`BOARD_TIER_DENSITY` si besoin), `src/app/globals.css` (jetons
  `--amber`, `--teal` = `PALETTE`)
- Test : `tests/unit/scene/board-render/geometry.test.ts`, `silkscreen.test.ts`

**Interfaces (purs) :**
- `traceRibbons(routes: readonly Route[], width: number): { positions: Float32Array; indices: Uint32Array; routeIndex: Float32Array }`
  — **toutes** les pistes en **une** géométrie (rubans plats posés sur la carte, joints biseautés
  aux coudes), `routeIndex` par sommet pour le survol (tâche 6).
- `busRibbons(timeline: Timeline): …` même forme, `segmentIndex` par sommet ; voies éteintes
  (`idleYears`) marquées par un attribut `idle`.
- `instances(plan: BoardPlan, tier: DensityTier): BoardInstances` avec, par forme, des tableaux
  `Float32Array` de matrices 4×4 (ou position/échelle) et de teintes : puces, broches de puces,
  processeurs, capots, broches de processeurs, résistances, condensateurs, vias, trous de fixation.
  `lite` : zéro petit composant ; `reduced` / `full` : les N premiers de `plan.passives`
  (`BOARD_DENSITY`).
- `drawCallBudget(instances): number` — le nombre de maillages que la scène créera (une forme = un
  `InstancedMesh`, + rubans, + plaque, + sérigraphie) : **≤ 60**, épinglé par un test sur le plan
  versionné du contenu de bancs **et** sur `makeLargeBoard()`. (`renderer.info` compte toutes les
  passes — le panneau `?debug=scene` reste la mesure de vérité, tâche 9.)
- `silkscreenItems(file: BoardFile): readonly { text: string; at: Vec2; size: number }[]` — années de
  la frise (`milestones`), repères `ref` des processeurs et puces, référence de la carte. Test :
  aucun `text` n'est un slug ni un nom (que des chiffres et des repères `U\d+|IC\d+|R\d+|C\d+`).
- Composants : une texture de sérigraphie unique dessinée dans un `<canvas>` 2D hors écran au
  montage (`CanvasTexture`), plaque + liseré + trous ; matériaux dans l'esprit de NEXUS (lueur dans
  la géométrie, mélange additif, `PALETTE`), aucun post-traitement. Les teintes de familles et
  d'employeurs viennent des `tone` du plan.

- [ ] **Étape 1 : tests rouges** des fonctions pures (rubans : nombre de sommets = 2 × points, aucun
  ruban de longueur nulle ; `routeIndex` couvre chaque route ; instances : un nombre par forme égal
  aux données ; `drawCallBudget ≤ 60` ; sérigraphie sans texte de contenu).
- [ ] **Étape 2 : vérifier l'échec.**
- [ ] **Étape 3 : implémenter** le pur, puis les composants ; `BoardScene` remplace `NexusScene`
  dans `scene-canvas.tsx` (NEXUS n'est plus monté ; ses fichiers partent en tâche 8).
- [ ] **Étape 4 : regarder** — `make up`, capture desktop des quatre vues avec Playwright
  (`tests/e2e/support` sait monter la scène), jointe au rapport. Un rendu grossier (primitives nues,
  tubes uniformes) est un anti-objectif (§2) : le dire si c'est le cas.
- [ ] **Étape 5 : vérifier** — `make test`, `make lint`, `make typecheck`, `make bundle` (isolation
  verte, poids du chunk 3D noté).
- [ ] **Étape 6 : commit** — `feat(scene) : la carte mère rendue à la place de NEXUS (P8-15d)`

### Tâche 5 : les impulsions et le mouvement ambiant (P8-15e)

**Fichiers :** créer `src/scene/state/board-render/pulses.ts` ; modifier `ambient-motion.ts`,
`board-scene.tsx` ; test `tests/unit/scene/board-render/pulses.test.ts`.

**Interfaces :**
- `pulsePaths(file: BoardFile): readonly { kind: 'bus' | 'link'; points: readonly Vec2[]; length: number }[]`
  — le bus dans le sens du temps, les pistes **vers** les processeurs (orientées).
- `pulseFrame(paths, count: number, timeS: number): Float32Array` — positions `[x, z]` de `count`
  impulsions réparties de façon déterministe, avançant à vitesse constante (unités/s), bouclant.
- Le temps est celui de `ambientFrame` (accumulé, borné, P8-12) — jamais `clock.elapsedTime`.
  Sous `prefers-reduced-motion` : impulsions **visibles et immobiles** (`timeS` figé), boucle en
  `demand` (§9). `count = BOARD_DENSITY[tier].pulses`.

- [ ] **Étape 1 : tests rouges** — chaque impulsion est sur son chemin ; avance dans le bon sens ;
  `pulseFrame(t) === pulseFrame(t + période)` ; `timeS` constant ⇒ positions constantes.
- [ ] **Étapes 2-4 : échec, implémenter (un `InstancedMesh` de points lumineux), vérifier.**
- [ ] **Étape 5 : commit** — `feat(scene) : les impulsions de la carte mère (P8-15e)`

### Tâche 6 : survol des relations et clic (P8-15f)

**Fichiers :** créer `src/scene/state/board-render/relations.ts` ; modifier `board-scene.tsx`,
`scene-mount.tsx` ; test `tests/unit/scene/board-render/relations.test.ts`.

**Interfaces :**
- `type BoardTarget = { kind: 'chip'; slug: string } | { kind: 'processor'; slug: string } | { kind: 'year'; year: number } | { kind: 'segment'; experience: string }`
- `relationsOf(file: BoardFile, target: BoardTarget): { chips: ReadonlySet<string>; processors: ReadonlySet<string>; routes: ReadonlySet<number>; segments: ReadonlySet<string> }`
  — §8 : puce → elle, ses pistes, les processeurs qu'elle alimente ; processeur → ses compétences, ses
  pistes, son tronçon de bus ; année → les employeurs de l'année et les projets qui y sont rattachés ;
  tronçon → son employeur et ses projets.
- `hrefOf(target: BoardTarget, locale: Locale): string | null` — processeur → `entityPath(locale,
  'projects', slug)` ; tronçon → `entityPath(locale, 'experiences', slug)` ; puce →
  `sectionPath(locale, 'skills')` ; année → `null`.
- Rendu : l'état de survol passe par un attribut d'instance / une texture d'état par piste, **jamais**
  un matériau par piste ; le reste s'atténue. Lancer de rayon sur les `InstancedMesh` (`instanceId`)
  et sur des boîtes de sélection invisibles pour les tronçons ; tolérance de clic
  `CLICK_TOLERANCE_PX` reprise de NEXUS.
- Clic : `scene-mount.tsx` reçoit `onSelect(href)` et fait `router.push(href)` — jamais la caméra.
  Tactile (choix du constructeur, §8) : **le premier toucher allume, le second navigue** ; le
  défilement reste au doigt.
- Survol effacé à tout changement de route (Review Focus 4).

- [ ] **Étape 1 : tests rouges** sur `makeRealSizeBoard()` (fichier construit par `buildBoardFile`) :
  pour une puce, `processors` = les projets qui la citent ; pour un processeur, `chips` = ses
  technologies connues et `segments` = son rattachement ; année → employeurs actifs cette année-là ;
  `hrefOf` pour chaque genre.
- [ ] **Étapes 2-4 : échec, implémenter, vérifier** (+ `make e2e` desktop : un clic sur un processeur
  mène à une fiche projet — l'E2E déduit la cible du DOM/sitemap, jamais un slug en dur).
- [ ] **Étape 5 : commit** — `feat(scene) : survol des relations et navigation depuis la carte (P8-15f)`

### Tâche 7 : les étiquettes HTML par vue (P8-15g)

**Fichiers :** créer `src/scene/state/board-render/labels.ts` ; remplacer
`nexus/label-projector.tsx` par `board/label-projector.tsx` ; modifier `scene-mount.tsx`,
`src/app/[locale]/layout.tsx`, `scene-mount.module.css` ; test
`tests/unit/scene/board-render/labels.test.ts`.

**Interfaces :**
- Les **noms** ne viennent pas du plan (§6) : `layout.tsx` (serveur, qui peut lire `content`) passe
  à `SceneMount` une prop `boardLabels: { sections: Record<Section, {name, tagline}>; families:
  Record<SkillFamily, string>; experiences: Record<string, string>; projects: Record<string, string> }`
  (familles : `messages.skills.categories` ; employeurs : `company` ; projets : `title`), et
  `scene-mount` n'importe toujours aucun dictionnaire.
- `labelsForView(file, focus: SceneFocus, hovered: BoardTarget | null): readonly { id: string; anchor: Vec3; priority: number }[]`
  — vue d'ensemble : les trois sections (ancres : centres des boîtes que cadrent `competences`,
  `experiences`, `projets`) ; vue d'une section : en permanence les familles / employeurs /
  projets ; partout l'élément survolé, priorité maximale.
- `placeLabels(candidates: readonly { id; x; y; width; height; priority }[], zone): ReadonlySet<string>`
  — les visibles ; en cas de chevauchement, la moins prioritaire se cache (départage stable par
  `id`).
- DOM : les trois étiquettes de section gardent `[data-scene-labels] [data-section]` (E2E-16/18) ;
  les autres portent `data-board-label="<id>"`. Toutes hors de la racine de scène, `aria-hidden`.

- [ ] **Étape 1 : tests rouges** — `labelsForView` par vue ; `placeLabels` : deux qui se recouvrent
  → la plus prioritaire reste, l'autre se cache ; jamais deux visibles superposées ; survolé gagne
  (Review Focus 5) ; ordre d'entrée sans effet.
- [ ] **Étapes 2-4 : échec, implémenter, vérifier** (+ `make e2e` : `language-switch` et
  `content-once` verts — les nouveaux libellés ne dupliquent aucun texte du panneau ? Si
  `content-once` voit les noms de projets en double, c'est le comportement attendu des étiquettes
  `aria-hidden` : étendre son exclusion à `[data-scene-labels]`, déjà exclu par nom — vérifier).
- [ ] **Étape 5 : commit** — `feat(scene) : les étiquettes de la carte, par vue (P8-15g)`

### Tâche 8 : le retrait de NEXUS (P8-15h)

**Fichiers :** supprimer `src/scene/components/nexus/` (déplacer `camera-rig.tsx` et
`shader-warmup.tsx` dans `components/board/` ou `components/`), `src/scene/state/nexus-geometry.ts`,
`tests/unit/scene/nexus-geometry.test.ts` ; modifier `layout.ts` (retirer `UNIVERSES`, `HOVER_SCALE`,
`labelAnchor`, `CORE_RADIUS`, `closeUp`, `CAMERAS`, `DENSITY` des particules ; garder `PALETTE`,
`TONES`, `ViewId`, `CameraSpec`, `transitionMs`, `ORBIT_LIMITS`, `PARALLAX`, `DensityTier`),
`ambient-motion.ts` (ce qui était indexé par univers), leurs tests, `src/scene/state/README.md`,
`docs/adr/0004-*.md` (amendement : sérigraphie sans langue autorisée, journal des révisions),
`docs/nexus-prototype.md` (bandeau « historique, remplacé par la carte mère »).

- [ ] **Étape 1 : inventaire** — `grep -rn "UNIVERSES\|closeUp\|labelAnchor\|CORE_RADIUS\|nexus" src tests scripts`
  ; chaque banc qui nomme NEXUS est **réécrit** sur la carte s'il garde un objet, **retiré** sinon —
  jamais affaibli pour verdir (le rapport liste chaque fichier et la décision).
- [ ] **Étape 2 : retirer**, puis `make lint`, `make typecheck`, `make test`, `make coverage`,
  `make bundle`, `make e2e` (tous profils) verts.
- [ ] **Étape 3 : commit** — `refactor(scene) : retrait de NEXUS (P8-15h)`

### Tâche 9 : mesures, garde d'isolation, documentation (P8-15i)

**Fichiers :** modifier `scripts/check-scene-isolation.mts` (et son test), `docs/carte-mere.md`
(§11/§12 : ce qui a été mesuré), `docs/performance-budget.md` (chunk 3D, appels de dessin),
`docs/roadmap.md` (P8-14 DONE #85, P8-15, P8-05/P8-10 selon l'état), `docs/next-session-prompt.md`,
`docs/phase-0-questions.md` (D2 toujours ouverte, rappel).

- [ ] **Étape 1 : garde** — le chunk de première visite ne contient ni `src/scene/generated/` ni
  `src/scene/state/board/` (hors types), et le chunk 3D ne contient **aucune valeur** de
  `src/scene/state/board/*.ts` (le module pur ne sert qu'au générateur) — avec témoin (le JSON doit
  être trouvé dans un chunk). Vu rouge par mutation.
- [ ] **Étape 2 : mesures** — `make bundle` (chunk 3D, ≤ 300 Ko) ; `drawCallBudget` du plan versionné ;
  ⚠️ la mesure GPU réelle (`?debug=scene`, appels toutes passes, triangles) et `Avant / Après / Gain`
  sont **demandées à l'utilisateur** avec la procédure exacte, pas lancées en local.
- [ ] **Étape 3 : documentation** — après chaque édition, `grep -n "P8-15" docs/*.md` : un statut,
  une fois.
- [ ] **Étape 4 : commit** — `docs : P8-15, la carte mère montée (P8-15i)`
- [ ] **Étape 5 : vérification en localhost par l'utilisateur** — `make board`, `make up`, les quatre
  vues, survol, clic, mobile si possible ; ses retours sont traités avant la PR.
