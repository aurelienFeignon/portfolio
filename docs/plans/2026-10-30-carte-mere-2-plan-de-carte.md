# Carte mère, plan 2/3 — le module pur du plan de carte — plan d'implémentation

> **Pour les agents qui exécutent :** SOUS-SKILL REQUIS : superpowers:subagent-driven-development
> (recommandé) ou superpowers:executing-plans, tâche par tâche. Les étapes se suivent par cases à
> cocher (`- [ ]`).

**But :** calculer, depuis un extrait minimal du contenu, tout ce que la carte mère dessinera —
positions, tailles, pistes, bus du temps, cadrages — dans un module **pur**, sans three ni JSX.

**Architecture :** un dossier `src/scene/state/board/`, un fichier par responsabilité (entrées,
frise, processeurs, zones, routeur, pistes, petits composants, cadrages) et un assembleur
`planBoard`. Le plan est **calculé, jamais placé à la main** : les bancs tiennent des invariants
(aucun recouvrement, aucun croisement, tout dans le champ), pas des coordonnées. Rien n'est branché
sur la scène : c'est P8-15.

**Pile :** TypeScript, Vitest ; tout passe par Docker (`make …`), Node n'est pas installé sur
l'hôte. Aucune dépendance ajoutée.

**Conception :** [`docs/carte-mere.md`](../carte-mere.md), §5, §6 et §7 (et §4 pour la palette).

**Plans voisins :** 1/3 le contenu (P8-13, livré par #84) ; 3/3 le rendu et les interactions
(P8-15), qui consomme ce plan.

## Contraintes globales

- Documentation, commentaires et messages **en français** ; identifiants **en anglais**.
- `src/scene/state/**` : **aucun import Three.js** (lint), couverture **≥ 95 %** sur les quatre
  axes (`vitest.config.mts`).
- **Pur et déterministe** : jamais `new Date()`, jamais `Math.random()` — l'année courante et la
  graine sont des **paramètres** (`carte-mere.md` §5, « fin du bus »).
- ⛔ **Un test ne nomme jamais une entité de `content/`** : les bancs passent par un constructeur de
  fixtures (`tests/fixtures/builders/board.ts`), slugs inventés.
- Le module **n'impose pas le gate** : `primary` et `experience` ne sont garantis qu'au build
  (revue de #84) — le module applique ses propres replis.
- **NEXUS reste en production** : `layout.ts`, `nexus/`, `CAMERAS` ne perdent rien dans ce plan.
- Une seule copie de chaque chiffre ; les constantes de ce plan sont des **valeurs de départ**,
  ajustables tant que les bancs restent verts — les bancs portent les invariants, pas les valeurs.
- Pas de `make perf-baseline` ni de mesure lourde en local.
- Commits locaux pendant 9 h-12 h 30 et 14 h-17 h 30 (heure de Paris), **demander avant de
  pousser** ; hors de ces heures, pousser et ouvrir la PR sans demander. La fusion se demande
  toujours. Avant la PR : /code-review → /security-review → /simplify.

## Repère et vocabulaire

- La carte est **à plat dans le plan XZ** : X vers la droite, Z vers le visiteur, Y vers le haut.
  Le module travaille en 2D : `Vec2 = readonly [x, z]`, `Rect = { minX, minZ, maxX, maxZ }`.
- Le quartier des processeurs est centré sur l'origine ; les zones de compétences l'entourent
  (côtés et arrière) ; le bus court **devant** (Z positifs), au plus près du visiteur.
- **Routage sur grille** : pas de `GRID = 0.25`. Une piste est une suite de cellules, rendue en
  polyligne dont chaque segment est **horizontal, vertical ou à 45°**.

## Points de vigilance (Review Focus)

1. **Horloge du navigateur en retard** (`currentYear` < année de début d'une expérience) : le bus
   doit quand même couvrir toutes les expériences. → Tâche 2, test « horloge en retard ».
2. **Rattachement à une expérience absente de l'extrait** (fiche non traduite dans la locale, R-07,
   ou gate non joué) : pas de liaison au bus, pas d'exception. → Tâche 6.
3. **Technologie inconnue ou répétée** dans `technologies` : ignorée, et une seule piste par couple.
   → Tâche 6.
4. **Contenu creux** — aucun projet, aucune expérience, une famille vide : un plan valide, sans
   zone vide ni division par zéro. → Tâches 2, 3, 4 et 7.
5. **Ordre d'entrée permuté** (le dépôt de contenu peut changer d'ordre) : plan **identique**. →
   Tâche 7, test de déterminisme.

---

### Tâche 1 : les entrées, la palette, la graine (P8-14a)

**Fichiers :**
- Créer : `src/scene/state/board/content.ts`
- Créer : `src/scene/state/board/rect.ts`
- Créer : `src/scene/state/seeded-random.ts` (déplacé de `nexus-geometry.ts`)
- Modifier : `src/scene/state/nexus-geometry.ts` (importe `seededRandom` au lieu de le définir)
- Modifier : `src/scene/state/layout.ts` (`PALETTE` : `amber`, `teal`)
- Créer : `tests/fixtures/builders/board.ts`
- Test : `tests/unit/scene/board/content.test.ts` ; déplacer les deux tests de `seededRandom` de
  `nexus-geometry.test.ts` vers `tests/unit/scene/seeded-random.test.ts`

**Interfaces :**
- Produit (`board/content.ts`) :
  ```ts
  export const SKILL_FAMILIES = ['language', 'framework', 'tooling', 'infrastructure', 'practice'] as const
  export type SkillFamily = (typeof SKILL_FAMILIES)[number]
  export interface BoardSkill { readonly slug: string; readonly family: SkillFamily; readonly level: 1 | 2 | 3 | 4 | 5 }
  export interface BoardExperience { readonly slug: string; readonly startYear: number; readonly endYear: number | null }
  export interface BoardProject {
    readonly slug: string; readonly startedAt: string; readonly technologies: readonly string[]
    readonly primary: boolean; readonly experience: string | null
  }
  export interface BoardContent {
    readonly skills: readonly BoardSkill[]; readonly experiences: readonly BoardExperience[]
    readonly projects: readonly BoardProject[]
  }
  export function toBoardContent(source: {
    skills: readonly { slug: string; category: SkillFamily; level: 1 | 2 | 3 | 4 | 5 }[]
    experiences: readonly { slug: string; startedAt: string; endedAt?: string | undefined }[]
    projects: readonly { slug: string; startedAt: string; technologies: readonly string[]; primary: boolean; experience?: string | undefined }[]
  }): BoardContent
  export const yearOf: (isoDate: string) => number
  ```
  ⭐ Les types source sont **structurels** : `Skill`, `Experience`, `Project` du dépôt y entrent
  tels quels, sans que `scene/state` importe `content` (cloisonnement). `toBoardContent` **copie
  champ par champ** — l'extrait est ce qui sera sérialisé vers la scène différée en P8-15 ; un
  `title` ou un `body` qui s'y glisserait alourdirait la charge utile.
- Produit (`board/rect.ts`) : `type Vec2 = readonly [x: number, z: number]`,
  `interface Rect { minX; minZ; maxX; maxZ }` (nombres, `readonly`), `rectOf(center: Vec2, w: number, d: number): Rect`,
  `rectUnion(rects: readonly Rect[]): Rect | null`, `inflate(rect: Rect, by: number): Rect`,
  `rectsOverlap(a: Rect, b: Rect, gap = 0): boolean` (vrai si l'écart est **strictement** inférieur à
  `gap`), `rectCenter(rect: Rect): Vec2`. Testés dans `content.test.ts` (union vide → `null`,
  contact exact à `gap` → pas de recouvrement).
- Produit (`seeded-random.ts`) : `seededRandom(seed: number): () => number` (mulberry32, code
  inchangé).
- Produit (`layout.ts`) : `PALETTE.amber = '#F5B342'`, `PALETTE.teal = '#2DD4BF'`, et
  `export type Tone = 'cyan' | 'violet' | 'sky' | 'amber' | 'teal'`, `export const TONES: readonly Tone[]`
  dans cet ordre. ⚠️ Les tokens de `globals.css` et la vérification de contraste viennent avec
  P8-15/P8-08 : le dire dans le commentaire de `PALETTE`.
- Produit (`tests/fixtures/builders/board.ts`) :
  `makeBoardSkill(over?)`, `makeBoardExperience(over?)`, `makeBoardProject(over?)`,
  `makeBoardContent(over?)` (petit contenu : 6 compétences sur 3 familles, 2 expériences, 2 projets),
  et `makeRealSizeBoard()` — **aux dimensions du contenu réel, slugs inventés** : 40 compétences
  (familles 2/13/3/11/11, niveaux 3 à 5), 2 expériences (`2021`→en cours, `2025`→en cours),
  3 projets dont un principal, avec 31, 10 et 7 technologies tirées des 40 ;
  `makeLargeBoard()` — 20 années (3 voies simultanées au plus), 20 projets, 80 compétences ;
  `makeSaturatedBoard()` — un seul projet qui cite 200 compétences d'une même famille.

- [ ] **Étape 1 : tests rouges** (`content.test.ts`)

```ts
it('lit l’année d’une date à toute précision', () => {
  expect([yearOf('2021'), yearOf('2021-03'), yearOf('2021-03-14')]).toEqual([2021, 2021, 2021])
})
it('ne copie que les champs que la carte lit', () => {
  const board = toBoardContent({
    skills: [{ slug: 'ts', category: 'language', level: 4, name: 'TypeScript' } as never],
    experiences: [{ slug: 'x', startedAt: '2021', company: 'X' } as never],
    projects: [{ slug: 'p', startedAt: '2025-01-02', technologies: ['ts'], primary: true, title: 'P', body: '…' } as never],
  })
  expect(board).toEqual({
    skills: [{ slug: 'ts', family: 'language', level: 4 }],
    experiences: [{ slug: 'x', startYear: 2021, endYear: null }],
    projects: [{ slug: 'p', startedAt: '2025-01-02', technologies: ['ts'], primary: true, experience: null }],
  })
})
it('suit l’ordre des familles du schéma de compétence', () => {
  expect(SKILL_FAMILIES).toEqual(skillFrontmatterSchema.shape.category.options)
})
```

- [ ] **Étape 2 : vérifier l'échec** — `docker compose run --rm web pnpm vitest run tests/unit/scene` ;
  attendu : module `board/content` introuvable.
- [ ] **Étape 3 : implémenter** `content.ts`, déplacer `seededRandom`, étendre `PALETTE`, écrire le
  constructeur de fixtures.
- [ ] **Étape 4 : vérifier** — même commande verte, puis `make typecheck` et `make lint`.
- [ ] **Étape 5 : commit** — `feat(scene) : l'extrait de contenu de la carte mère (P8-14a)`

### Tâche 2 : le bus du temps (P8-14b)

**Fichiers :**
- Créer : `src/scene/state/board/timeline.ts`
- Test : `tests/unit/scene/board/timeline.test.ts`

**Interfaces :**
- Consomme : `BoardExperience`, `TONES`.
- Produit :
  ```ts
  export const BUS_LENGTH = 20, YEARS_PER_ROW = 8, LANE_PITCH = 0.9, ROW_GAP = 1.4, BUS_WIRES = 8
  export interface BusSegment {
    readonly experience: string; readonly lane: number; readonly tone: Tone
    readonly startYear: number; readonly endYear: number; readonly ongoing: boolean
    readonly points: readonly Vec2[]; readonly labelAnchor: Vec2
  }
  export interface BusJog { readonly lane: number; readonly year: number; readonly at: Vec2 }
  export interface Timeline {
    readonly firstYear: number; readonly lastYear: number; readonly step: number; readonly rows: number
    readonly lanes: number; readonly segments: readonly BusSegment[]; readonly idleYears: readonly number[]
    readonly jogs: readonly BusJog[]; readonly milestones: readonly { year: number; at: Vec2 }[]
    readonly spine: readonly Vec2[]   // la voie 0 de bout en bout, lacets compris
    readonly bounds: Rect
  }
  export function planTimeline(experiences: readonly BoardExperience[], currentYear: number, originZ: number): Timeline
  export function yearPoint(timeline: Timeline, year: number, lane: number): Vec2
  ```

Règles (`carte-mere.md` §5, « Expériences ») :
- `firstYear` = plus petite année de début (ou `currentYear` sans expérience) ; `lastYear` =
  `max(currentYear, toutes les années de début et de fin)`.
- `step = BUS_LENGTH / min(nombre d'années, YEARS_PER_ROW)` ; l'année d'indice `i` est sur la rangée
  `floor(i / 8)` ; les rangées paires vont de gauche à droite, les impaires de droite à gauche
  (**lacet**), chaque demi-tour fait de deux segments à 45°. La rangée `r` est à
  `originZ + r × (lanes × LANE_PITCH + ROW_GAP)`.
- **Voies** : expériences triées par (début, slug) ; chacune prend la plus petite voie libre à son
  année de début (une voie se libère l'année qui suit la fin). Une voie > 0 part de la voie 0 et la
  rejoint par des segments à 45° ; un poste en cours ne rejoint pas.
- `idleYears` : années qu'aucune expérience ne couvre. `jogs` : un par changement d'employeur sur une
  même voie. `tone` : `TONES` en cycle dans l'ordre des débuts.

- [ ] **Étape 1 : tests rouges**

```ts
const exp = makeBoardExperience
it('un pas par année, la frise garde sa longueur', () => {
  const t = planTimeline([exp({ startYear: 2021, endYear: null })], 2026, 6)
  expect([t.firstYear, t.lastYear, t.rows]).toEqual([2021, 2026, 1])
  expect(t.step * 6).toBeCloseTo(BUS_LENGTH)
})
it('fait un lacet au-delà de 8 années, et un second au-delà de 16', () => {
  expect(planTimeline([exp({ startYear: 2015, endYear: null })], 2026, 6).rows).toBe(2)
  expect(planTimeline([exp({ startYear: 2005, endYear: null })], 2026, 6).rows).toBe(3)
})
it('dédouble le bus pour deux postes simultanés, et réutilise une voie libérée', () => {
  const t = planTimeline([
    exp({ slug: 'a', startYear: 2018, endYear: 2026 }), exp({ slug: 'b', startYear: 2020, endYear: 2021 }),
    exp({ slug: 'c', startYear: 2023, endYear: null }),
  ], 2026, 6)
  expect(t.lanes).toBe(2)
  expect(t.segments.map((s) => [s.experience, s.lane])).toEqual([['a', 0], ['b', 1], ['c', 1]])
})
it('éteint les années sans poste', () => {
  const t = planTimeline([exp({ slug: 'a', startYear: 2018, endYear: 2019 }), exp({ slug: 'b', startYear: 2022, endYear: null })], 2026, 6)
  expect(t.idleYears).toEqual([2020, 2021])
})
it('marque d’un décrochement le changement d’employeur sur une même voie', () => {
  const t = planTimeline([exp({ slug: 'a', startYear: 2018, endYear: 2020 }), exp({ slug: 'b', startYear: 2021, endYear: null })], 2026, 6)
  expect(t.jogs).toEqual([expect.objectContaining({ lane: 0, year: 2021 })])
})
it('horloge en retard : le bus couvre quand même toutes les expériences', () => {
  expect(planTimeline([exp({ startYear: 2027, endYear: null })], 2026, 6).lastYear).toBe(2027)
})
it('sans expérience : une seule année, éteinte', () => {
  const t = planTimeline([], 2026, 6)
  expect([t.firstYear, t.lastYear, t.idleYears, t.segments]).toEqual([2026, 2026, [2026], []])
})
it('tous les segments sont horizontaux, verticaux ou à 45°, lacets et dédoublements compris', () => {
  for (const s of planTimeline(makeLargeBoard().experiences, 2026, 6).segments) expectOctilinear(s.points)
})
it('un jalon par année, dans l’ordre de la frise', () => { /* milestones.length === lastYear - firstYear + 1 */ })
```

`expectOctilinear(points)` (helper de test partagé, `tests/unit/scene/board/geometry-asserts.ts`) :
pour chaque segment, `dx === 0 || dz === 0 || |dx| === |dz|` à 1e-9 près, et aucun segment nul.

- [ ] **Étape 2 : vérifier l'échec** — `docker compose run --rm web pnpm vitest run tests/unit/scene/board`.
- [ ] **Étape 3 : implémenter** `planTimeline` et `yearPoint` (centre de la cellule de l'année, sur
  la ligne de la voie, rangée et sens pris en compte).
- [ ] **Étape 4 : vérifier** — vert.
- [ ] **Étape 5 : commit** — `feat(scene) : le bus du temps de la carte mère (P8-14b)`

### Tâche 3 : le quartier des processeurs (P8-14c)

**Fichiers :**
- Créer : `src/scene/state/board/processors.ts`
- Test : `tests/unit/scene/board/processors.test.ts`

**Interfaces :**
- Consomme : `BoardProject`.
- Produit :
  ```ts
  export const PRIMARY_SIZE = 3.2, SECONDARY_SIZE = 1.8, SLOT_PITCH = 3.8, DISTRICT_MARGIN = 1
  export interface Processor {
    readonly slug: string; readonly primary: boolean; readonly ref: string   // 'U1', 'U2'…
    readonly center: Vec2; readonly size: number; readonly height: number; readonly labelAnchor: Vec2
  }
  export interface District { readonly processors: readonly Processor[]; readonly bounds: Rect }
  export function choosePrimary(projects: readonly BoardProject[]): BoardProject | null
  export function planDistrict(projects: readonly BoardProject[]): District
  ```

Règles :
- `choosePrimary` : le projet `primary` ; **plusieurs** (gate non joué) → le premier par slug ;
  **aucun** → le plus récent par `startedAt`, puis par slug. Liste vide → `null`.
- Le principal au centre (`[0, 0]`, `ref: 'U1'`). Les secondaires, triés par `startedAt`
  décroissant puis slug, occupent les emplacements de l'anneau 1 dans l'ordre
  **O, E, N, NO, NE, SO, SE, S** (centre à `SLOT_PITCH × (dx, dz)`), puis l'anneau 2 (les 16 cases du
  pourtour 5 × 5, même principe, à `2 × SLOT_PITCH`), etc. Le sud passe en dernier : c'est le côté
  du bus.
- `bounds` = boîte des processeurs + `DISTRICT_MARGIN` ; sans projet, un carré de 4 centré.

- [ ] **Étape 1 : tests rouges** — `choosePrimary` : principal désigné ; deux principaux → premier
  par slug ; aucun → le plus récent (`'2025-01-02'` contre `'2024'`) ; vide → `null`. `planDistrict` :
  principal au centre et plus grand que tout secondaire ; **aucun recouvrement** entre deux
  processeurs (écart ≥ 0,5) pour 1, 3, 9 et 20 projets ; le 9ᵉ secondaire ouvre l'anneau 2 ; les
  `ref` sont `U1…Un` sans trou ; sans projet, `bounds` est un carré de côté 4 centré et
  `processors` est vide.
- [ ] **Étape 2 : vérifier l'échec.**
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : vérifier** — vert.
- [ ] **Étape 5 : commit** — `feat(scene) : le quartier des processeurs (P8-14c)`

### Tâche 4 : les zones de compétences (P8-14d)

**Fichiers :**
- Créer : `src/scene/state/board/zones.ts`
- Test : `tests/unit/scene/board/zones.test.ts`

**Interfaces :**
- Consomme : `BoardSkill`, `SKILL_FAMILIES`, `TONES`, `District['bounds']`.
- Produit :
  ```ts
  export type ChipSizing = 'level' | 'uniform'
  export const ZONE_WIDTH = 5.2, ZONE_PADDING = 0.4, CHIP_GAP = 0.5, ZONE_GAP = 2
  export interface Chip {
    readonly slug: string; readonly family: SkillFamily; readonly ref: string   // 'IC1'…
    readonly center: Vec2; readonly size: number; readonly height: number; readonly tone: Tone
  }
  export interface Zone {
    readonly family: SkillFamily; readonly tone: Tone; readonly bounds: Rect
    readonly chips: readonly Chip[]; readonly exit: Vec2; readonly labelAnchor: Vec2
  }
  export function chipDimensions(level: 1 | 2 | 3 | 4 | 5, sizing: ChipSizing): { size: number; height: number }
  export function planZones(skills: readonly BoardSkill[], district: Rect, sizing: ChipSizing): readonly Zone[]
  ```

⭐ **`ChipSizing` est un paramètre sans défaut, et c'est voulu** : faire croître les puces avec
`level` **publie visuellement** les niveaux que D2 retient (`next-session-prompt.md`, D2). Le module
sait faire les deux ; c'est P8-15 qui tranchera, avec l'utilisateur. `uniform` : côté 0,9, hauteur
0,2. `level` : côté `0.55 + 0.12 × level`, hauteur `0.12 + 0.04 × level`.

Règles :
- Une zone par famille **qui a au moins une compétence** — une famille vide n'a pas de zone.
- Dans une zone, les puces se rangent **en étagères** de largeur `ZONE_WIDTH − 2 × ZONE_PADDING`,
  de la plus grande à la plus petite, puis par slug ; `CHIP_GAP` entre deux puces et entre deux
  étagères (≥ 2 cellules de grille : c'est par là que passeront les pistes).
- Directions : la zone la plus peuplée prend **O**, puis **E**, **N**, **NO**, **NE** (égalité :
  ordre de `SKILL_FAMILIES`). Une zone se pose contre `district` à `ZONE_GAP`, centrée sur son axe ;
  si elle recouvre (à `ZONE_GAP` près) le quartier ou une zone déjà posée, elle **recule** d'une
  cellule de grille dans sa direction, jusqu'à ne plus rien recouvrir — c'est « repoussées vers
  l'extérieur » de §5.
- `exit` : milieu du bord de la zone tourné vers le quartier. `ref` : `IC1…` dans l'ordre des zones
  puis des étagères.

- [ ] **Étape 1 : tests rouges** — une puce par compétence, chacune dans **sa** zone ; aucune puce
  ne déborde de sa zone ni n'en recouvre une autre (écart ≥ `CHIP_GAP`) ; étagères triées par taille
  décroissante en mode `level` ; deux zones, ou une zone et le quartier, sont séparées d'au moins
  `ZONE_GAP` — **avec `makeRealSizeBoard()` et avec un quartier de 20 processeurs** (repoussées) ;
  aucune zone n'avance devant le quartier (côté du bus : `zone.bounds.maxZ ≤ district.maxZ`) ;
  famille vide → pas de zone ; `chipDimensions` croît strictement avec `level` en mode `level`,
  constant en mode `uniform`.
- [ ] **Étape 2 : vérifier l'échec.**
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : vérifier** — vert.
- [ ] **Étape 5 : commit** — `feat(scene) : les zones de compétences, rangées en étagères (P8-14d)`

### Tâche 5 : le routeur sur grille (P8-14e)

**Fichiers :**
- Créer : `src/scene/state/board/grid.ts`
- Test : `tests/unit/scene/board/grid.test.ts`

**Interfaces :**
- Produit :
  ```ts
  export const GRID = 0.25
  export type Cell = readonly [col: number, row: number]
  export class RoutingGrid {
    constructor(bounds: Rect)
    block(rect: Rect): void                   // cellules interdites à toute piste
    cellsAround(rect: Rect): readonly Cell[]  // les cellules libres qui bordent un rectangle (pastilles possibles)
    route(net: string, from: readonly Cell[], to: readonly Cell[]): readonly Cell[] | null
    occupant(cell: Cell): string | null
    toPoint(cell: Cell): Vec2
  }
  export function simplify(points: readonly Vec2[]): readonly Vec2[]  // fusionne les colinéaires
  ```

Algorithme — **A\* multi-sources, multi-cibles, huit directions** :
- Une cellule est franchissable si elle n'est pas bloquée et si son occupant est `null` ou **le même
  `net`** (les pistes d'un même réseau peuvent se rejoindre — c'est un éventail ou un bus).
- Une diagonale est refusée si l'une des deux cellules orthogonales qu'elle enjambe appartient à un
  **autre** réseau : c'est ce qui interdit les croisements en X.
- Coût : 1 par pas orthogonal, √2 par diagonale, **+0,5 par changement de direction** (des pistes
  droites, pas des escaliers). Heuristique octile. Égalités départagées par (coût, ligne, colonne)
  pour rester déterministe.
- Un chemin trouvé est **occupé** par `net` ; `null` si aucun chemin.

- [ ] **Étape 1 : tests rouges** — chemin droit sur grille vide (aucun virage) ; contourne un
  rectangle bloqué ; refuse de traverser une piste d'un autre réseau (rend `null` quand le mur est
  complet) mais **emprunte** celle de son propre réseau ; **refuse la diagonale qui croiserait** une
  piste d'un autre réseau ; deux appels identiques sur deux grilles identiques rendent le même chemin ;
  `simplify` ne garde que les sommets et chaque segment de la sortie est octilinéaire
  (`expectOctilinear`).
- [ ] **Étape 2 : vérifier l'échec.**
- [ ] **Étape 3 : implémenter** (tas binaire maison, pas de dépendance).
- [ ] **Étape 4 : vérifier** — vert.
- [ ] **Étape 5 : commit** — `feat(scene) : le routeur sur grille, sans croisement (P8-14e)`

### Tâche 6 : les pistes de liaison (P8-14f)

**Fichiers :**
- Créer : `src/scene/state/board/traces.ts`
- Test : `tests/unit/scene/board/traces.test.ts`

**Interfaces :**
- Consomme : `RoutingGrid`, `Zone`, `District`, `Timeline`, `yearPoint`, `BoardContent`.
- Produit :
  ```ts
  export type RoutingMode = 'direct' | 'family-bus'
  export interface Link { readonly skill: string; readonly project: string }
  export interface BusLink { readonly project: string; readonly experience: string; readonly year: number }
  export interface Route {
    readonly net: string; readonly kind: 'link' | 'trunk' | 'bus-link'
    readonly links: readonly Link[]          // ce que la piste porte, pour le survol de P8-15
    readonly points: readonly Vec2[]
  }
  export interface Traces {
    readonly mode: RoutingMode; readonly links: readonly Link[]; readonly busLinks: readonly BusLink[]
    readonly routes: readonly Route[]; readonly unrouted: readonly Link[]
  }
  export function listLinks(content: BoardContent): readonly Link[]
  export function planTraces(content: BoardContent, zones: readonly Zone[], district: District, timeline: Timeline, board: Rect): Traces
  ```

Règles (`carte-mere.md` §5, « Projets ») :
- `listLinks` : un `Link` par couple (compétence connue, projet qui la cite), **dédoublonné** ;
  une technologie absente des compétences est ignorée. Ordre : principal d'abord, puis projets par
  slug, compétences par slug.
- `busLinks` : un par projet dont `experience` désigne une expérience **présente dans la frise** ;
  `year` = année de début du projet bornée à la période du segment. Absente → rien.
- Grille : bloquer puces, processeurs et bus (voies + `ROW_GAP` compris) ; chaque piste part des
  `cellsAround` de sa puce (ou processeur) et arrive aux `cellsAround` de sa cible — la cellule du
  bus visée par un `BusLink` est la seule du bus ouverte, pour lui seul.
- Ordre de routage : `busLinks` d'abord (réseau `experience:<slug>`), puis les liaisons.
- **Mode `direct`** : réseau `chip:<slug>` (les pistes d'une même puce peuvent partir en éventail).
  **Si une seule liaison échoue**, tout recommence en **mode `family-bus`** : par zone, un tronc
  (réseau `zone:<family>`, `kind: 'trunk'`) de `zone.exit` jusqu'au bord du quartier, puis de courtes
  pistes du même réseau vers chaque processeur concerné, et de chaque puce vers `zone.exit`. C'est
  le seuil de §5 — « quand les canaux ne tiennent plus » —, **mesuré par le routeur** au lieu d'un
  nombre écrit d'avance.
- Ce qui échoue encore va dans `unrouted` : P8-15 ne le dessine pas, la scène ne tombe pas.
- ⭐ Le constructeur **consigne** dans le journal de phase quel mode prend `makeRealSizeBoard()` :
  c'est la mesure que §11 demande.

- [ ] **Étape 1 : tests rouges**

```ts
it('une liaison par couple compétence–projet, technologies inconnues et doublons écartés', () => {
  const content = makeBoardContent({ /* p cite ['a', 'a', 'inconnue'] ; a existe */ })
  expect(listLinks(content).filter((l) => l.project === 'p')).toEqual([{ skill: 'a', project: 'p' }])
})
it('une compétence qu’aucun projet n’utilise reste sans piste', () => { /* aucune Route ne la porte */ })
it('rattache au bus le projet né chez un employeur, à son année bornée au poste', () => { /* year */ })
it('ignore un rattachement vers une expérience absente, sans exception', () => { /* busLinks: [] */ })
it('route TOUTES les liaisons du contenu réel, sans croisement entre réseaux', () => {
  const plan = /* zones, district, timeline, traces depuis makeRealSizeBoard() */
  expect(plan.traces.unrouted).toEqual([])
  expectNoCrossing(plan.traces.routes)       // aucun segment de deux réseaux différents ne se coupe
})
it('chaque liaison est portée par au moins une route, qui touche sa puce et son processeur', () => { … })
it('bascule en bus de famille quand les canaux ne tiennent plus', () => {
  // 1 projet citant 200 compétences : le mode direct échoue
  expect(planFrom(makeSaturatedBoard()).traces.mode).toBe('family-bus')
})
it('aucune piste ne traverse une puce ou un processeur qui n’est pas le sien', () => { … })
```

`planFrom(content)` est un helper local du banc : `planDistrict` → `planZones` (`'uniform'`) →
`planTimeline` → `planTraces`, sans passer par `planBoard` (tâche 7).
`expectNoCrossing` rejoint `geometry-asserts.ts` : intersection propre de segments, en excluant les
paires du même réseau.

- [ ] **Étape 2 : vérifier l'échec.**
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : vérifier** — vert ; noter le mode pris par le contenu réel.
- [ ] **Étape 5 : commit** — `feat(scene) : les pistes de liaison et leur repli en bus de famille (P8-14f)`

### Tâche 7 : l'assembleur, les petits composants, le déterminisme (P8-14g)

**Fichiers :**
- Créer : `src/scene/state/board/passives.ts`
- Créer : `src/scene/state/board/plan.ts`
- Test : `tests/unit/scene/board/passives.test.ts`, `tests/unit/scene/board/plan.test.ts`

**Interfaces :**
- Consomme : tout ce qui précède, `seededRandom`, `DensityTier` (`layout.ts`).
- Produit :
  ```ts
  // passives.ts
  export const BOARD_DENSITY: Readonly<Record<DensityTier, { passives: number; pulses: number }>> =
    { full: { passives: 120, pulses: 48 }, reduced: { passives: 70, pulses: 32 }, lite: { passives: 0, pulses: 16 } }
  export interface Passive { readonly kind: 'resistor' | 'capacitor'; readonly ref: string; readonly center: Vec2; readonly rotated: boolean }
  export function scatterPassives(grid: RoutingGrid, count: number, seed: number): readonly Passive[]
  // plan.ts
  export const BOARD_MARGIN = 1.5, BOARD_SEED = 0x0b0a12d
  export interface BoardOptions { readonly currentYear: number; readonly chipSizing: ChipSizing; readonly tier: DensityTier }
  export interface BoardPlan {
    readonly bounds: Rect; readonly district: District; readonly zones: readonly Zone[]
    readonly timeline: Timeline; readonly traces: Traces; readonly passives: readonly Passive[]
    readonly pulses: number
  }
  export function planBoard(content: BoardContent, options: BoardOptions): BoardPlan
  ```

Ordre de `planBoard` : trier les entrées par slug (le dépôt peut changer d'ordre) → quartier →
zones → frise (`originZ` = bord avant du plus avancé des deux, + 2) → bornes de la carte (union +
`BOARD_MARGIN`) → pistes → petits composants sur les cellules **restées libres** (avec une cellule de
dégagement), `ref` `R1…`/`C1…`.

- [ ] **Étape 1 : tests rouges** — `scatterPassives` : jamais sur une cellule bloquée ou occupée,
  au plus `count`, même graine → même sortie ; palier `lite` → aucun petit composant, et moins
  d'impulsions que `full` (la composition, elle, ne change pas : mêmes zones, mêmes processeurs, mêmes
  routes entre paliers). `planBoard` :
  - **déterminisme** : `planBoard(c)` et `planBoard(c mélangé)` sont `toEqual` (Review Focus 5) ;
  - **contenu creux** : `{ skills: [], experiences: [], projects: [] }` rend un plan sans exception,
    sans zone, sans processeur, une frise d'une année éteinte (Review Focus 4) ;
  - tout tient dans `bounds` : puces, processeurs, frise, routes, petits composants ;
  - le bus est **devant** : `timeline.bounds.minZ` > `maxZ` de toute zone et du quartier ;
  - **budgets recomptés depuis les données** (§7) : puces = compétences, processeurs = projets,
    petits composants ≤ `BOARD_DENSITY[tier].passives` ; ce que P8-15 instanciera se compte ici, pas
    ailleurs.
- [ ] **Étape 2 : vérifier l'échec.**
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : vérifier** — vert.
- [ ] **Étape 5 : commit** — `feat(scene) : le plan de carte assemblé (P8-14g)`

### Tâche 8 : les cadrages calculés (P8-14h)

**Fichiers :**
- Créer : `src/scene/state/board/cameras.ts`
- Test : `tests/unit/scene/board/cameras.test.ts`

**Interfaces :**
- Consomme : `BoardPlan`, `CameraSpec`, `ViewId` (`layout.ts`), `REFERENCE_ASPECT` (`framing.ts`).
- Produit :
  ```ts
  export const BOARD_FOV = 40, ELEVATION_DEG = 58, FRAME_MARGIN = 1.15
  export function frameRect(rect: Rect, focus?: Section): CameraSpec
  export function boardCameras(plan: BoardPlan): Readonly<Record<ViewId, CameraSpec>>
  ```

Règles (`carte-mere.md` §5, « Cadrages ») : `accueil` cadre `plan.bounds` ; `competences` l'union des
zones ; `experiences` la frise ; `projets` le quartier. La caméra vise le centre du rectangle (Y = 0),
se tient devant (+Z) à `ELEVATION_DEG` au-dessus de la carte, à la distance minimale qui fait tenir
le rectangle dans un champ vertical de `BOARD_FOV` **à 16:9**, multipliée par `FRAME_MARGIN`. Le
`fov` rendu est celui de 16:9 : `fovForAspect` et `setViewOffset` restent au rendu (P6-04,
inchangés). Même forme que `CAMERAS`, donc `getCameraTarget` pourra basculer en P8-15 sans changer
de type. Une vue sans rien à montrer (aucune zone) cadre le quartier.

- [ ] **Étape 1 : tests rouges** — pour `makeRealSizeBoard()` **et** pour un contenu de 20 ans,
  20 projets, 80 compétences : les quatre coins du rectangle de chaque vue sont **dans le tronc de
  pyramide** de sa caméra (projection en repère caméra, `|x/z| ≤ tan(hfov/2)` et
  `|y/z| ≤ tan(fov/2)` à 16:9) ; `focusNodeId` vaut la section de la vue, absent pour `accueil` ; la
  caméra recule quand le contenu grandit (la caméra suit l'expansion d'elle-même) ; vue sans zone →
  cadre le quartier.
- [ ] **Étape 2 : vérifier l'échec.**
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : vérifier** — vert.
- [ ] **Étape 5 : commit** — `feat(scene) : les cadrages de la carte, calculés depuis ses boîtes (P8-14h)`

### Tâche 9 : le garde d'isolation, la couverture, la documentation (P8-14i)

**Fichiers :**
- Modifier : `tests/integration/scene-state-stays-off-layout.test.ts`
- Modifier : `src/scene/state/README.md` (tableau : `seeded-random.ts` et le dossier `board/`)
- Modifier : `docs/roadmap.md` (P8-13 **DONE** — #84 ; P8-14 **DONE** à la fusion, IN_PROGRESS d'ici là)
- Modifier : `docs/next-session-prompt.md` (État, mission : P8-15 ensuite)
- Modifier : `docs/carte-mere.md` §11 (ce que le constructeur a mesuré : mode de routage du contenu
  réel, constantes retenues)

- [ ] **Étape 1 : garde** — étendre le banc : le chemin de première visite (`RACINES`) n'importe
  **aucune valeur** de `src/scene/state/board/` ; témoin : le parcours trouve `board/timeline.ts`
  depuis `board/plan.ts`. Le voir **rouge** en ajoutant temporairement
  `import { planBoard } from '@/scene/state/board/plan'` (utilisé) dans `scene-mount.tsx`, puis
  retirer la mutation.
- [ ] **Étape 2 : couverture** — `make coverage` ; seuils de `src/scene/state/**` tenus (≥ 95 %).
  Une branche inatteignable se **nomme** dans le journal, elle ne s'exclut pas en silence.
- [ ] **Étape 3 : portes** — `make lint`, `make typecheck`, `make test`, `make check-content` verts.
- [ ] **Étape 4 : documentation** — après chaque édition, `grep -n "P8-14" docs/*.md` : chaque
  statut une seule fois, sans contradiction.
- [ ] **Étape 5 : commit** — `docs : P8-14, le plan de carte (P8-14i)`
- [ ] **Étape 6 : PR** — /code-review → /security-review → /simplify, puis push et PR selon les
  heures de publication ; la fusion se demande.
