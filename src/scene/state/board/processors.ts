/**
 * Le quartier des processeurs de la carte mère — un processeur par projet.
 *
 * Le projet principal occupe le centre (origine) ; les autres l'entourent en
 * anneaux concentriques sur une grille de pas `SLOT_PITCH`. Repère : X vers la
 * droite (E = +X), Z vers le visiteur (S = +Z, N = −Z). Le sud est le côté du
 * bus : il est donc rempli en dernier dans chaque anneau.
 *
 * Module pur : ni `Date`, ni `Math.random`, ni Three.js. Il n'impose pas le
 * gate de contenu : zéro, un ou plusieurs projets `primary` sont tous admis.
 */
import { type BoardProject, bySlug, compareAtCommonPrecision } from './content.ts'
import { EMPTY_RECT, LABEL_MARGIN, rectUnion } from './rect.ts'
import { inflate, type Rect, rectOf, type Vec2 } from '../plane.ts'

/** Côté du processeur principal (carré). */
export const PRIMARY_SIZE = 3.2
/** Côté d'un processeur secondaire (carré). */
export const SECONDARY_SIZE = 1.8
/** Pas de la grille d'emplacements, centre à centre. */
export const SLOT_PITCH = 3.8
/** Marge ajoutée autour de la boîte des processeurs pour former `bounds`. */
export const DISTRICT_MARGIN = 1
/** Hauteur (Y) du boîtier principal et des boîtiers secondaires. */
export const PRIMARY_HEIGHT = 0.5
export const SECONDARY_HEIGHT = 0.35

export interface Processor {
  readonly slug: string
  readonly primary: boolean
  /** Désignateur de carte : 'U1' pour le principal, puis 'U2'… */
  readonly ref: string
  readonly center: Vec2
  /** Côté du boîtier carré. */
  readonly size: number
  readonly height: number
  /**
   * Point 2D pour l'étiquette : sur l'axe X du boîtier, juste derrière lui
   * (vers −Z), à `LABEL_MARGIN` de son bord arrière.
   */
  readonly labelAnchor: Vec2
}

export interface District {
  readonly processors: readonly Processor[]
  readonly bounds: Rect
}

/**
 * Plus récent d'abord, puis par slug. Les `startedAt` sont des ISO de précision
 * variable ('2024', '2024-03', '2025-01-02') : ils se comparent **à la précision
 * commune** — '2024' et '2024-03' sont égaux, et le slug départage. C'est la
 * règle de la couche Content (`byMostRecent`) : la comparaison brute lisait
 * '2024' comme janvier, et le repli du principal pouvait désigner un autre
 * projet que celui que l'ordre publié met en tête.
 */
const newestFirst = (a: BoardProject, b: BoardProject): number =>
  compareAtCommonPrecision(b.startedAt, a.startedAt) || bySlug(a, b)

/**
 * Le projet principal : le projet `primary` (le premier par slug s'il y en a
 * plusieurs — gate non joué), sinon le plus récent (puis par slug). `null` si
 * la liste est vide.
 */
export function choosePrimary(projects: readonly BoardProject[]): BoardProject | null {
  const designated = projects.filter((p) => p.primary).sort(bySlug)
  if (designated.length > 0) return designated[0]!
  return [...projects].sort(newestFirst)[0] ?? null
}

/**
 * Les cases de l'anneau `k` (Tchebychev = k), en unités de pas, dans l'ordre de
 * remplissage : d'abord le milieu des côtés O et E (dz = 0), puis la moitié
 * nord (dz < 0) du milieu vers les coins, enfin la moitié sud (dz > 0) des
 * coins vers le milieu — la case S (0, k) est donc la dernière. Pour k = 1 :
 * O, E, N, NO, NE, SO, SE, S.
 */
function ringCells(k: number): (readonly [number, number])[] {
  const cells: [number, number][] = []
  for (let dx = -k; dx <= k; dx += 1) {
    for (let dz = -k; dz <= k; dz += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) === k) cells.push([dx, dz])
    }
  }
  const group = ([, dz]: readonly [number, number]) => (dz === 0 ? 0 : dz < 0 ? 1 : 2)
  return cells.sort((a, b) => {
    const g = group(a) - group(b)
    if (g !== 0) return g
    const ax = Math.abs(a[0])
    const bx = Math.abs(b[0])
    // Nord : du milieu vers les coins ; sud : des coins vers le milieu.
    const byX = group(a) === 2 ? bx - ax : ax - bx
    return byX || a[0] - b[0] || a[1] - b[1]
  })
}

/**
 * Les `count` premiers emplacements secondaires, en pas : les anneaux 1, 2…
 * mis bout à bout, chacun dans son ordre de remplissage, jusqu'à en avoir assez.
 */
function slotCells(count: number): (readonly [number, number])[] {
  const cells: (readonly [number, number])[] = []
  for (let k = 1; cells.length < count; k += 1) cells.push(...ringCells(k))
  return cells
}

/**
 * Dispose le quartier : le principal en `[0, 0]`, les secondaires par date
 * décroissante puis slug dans les anneaux successifs. `bounds` englobe les
 * boîtiers plus `DISTRICT_MARGIN` ; sans projet, c'est un carré de côté 4 centré.
 */
export function planDistrict(projects: readonly BoardProject[]): District {
  const primary = choosePrimary(projects)
  if (primary === null) {
    return { processors: [], bounds: EMPTY_RECT }
  }
  const secondaries = projects.filter((p) => p !== primary).sort(newestFirst)

  const make = (project: BoardProject, n: number, center: Vec2, isPrimary: boolean): Processor => {
    const size = isPrimary ? PRIMARY_SIZE : SECONDARY_SIZE
    return {
      slug: project.slug,
      primary: isPrimary,
      ref: `U${n}`,
      center,
      size,
      height: isPrimary ? PRIMARY_HEIGHT : SECONDARY_HEIGHT,
      labelAnchor: [center[0], center[1] - size / 2 - LABEL_MARGIN],
    }
  }

  const processors: Processor[] = [make(primary, 1, [0, 0], true)]
  const slots = slotCells(secondaries.length)
  secondaries.forEach((project, i) => {
    const [dx, dz] = slots[i]!
    processors.push(make(project, i + 2, [dx * SLOT_PITCH, dz * SLOT_PITCH], false))
  })

  const box = rectUnion(processors.map((p) => rectOf(p.center, p.size, p.size)))!
  return { processors, bounds: inflate(box, DISTRICT_MARGIN) }
}
