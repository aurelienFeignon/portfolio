/**
 * Les zones de compétences de la carte mère — une zone par famille, des puces
 * rangées en étagères (`carte-mere.md` §4 et §5, « Compétences »).
 *
 * Repère : X vers la droite (E = +X), Z vers le visiteur (S = +Z, N = −Z). Le
 * bus court devant (Z positifs) : aucune zone n'avance devant le quartier.
 *
 * Module pur : ni `Date`, ni `Math.random`, ni Three.js.
 */
import { SKILL_FAMILIES, type BoardSkill, type SkillFamily } from './content'
import { type Rect, rectsOverlap, type Vec2 } from './rect'
import { type Tone, TONES } from '../layout'

/** Largeur (X) d'une zone, remplissage compris. */
export const ZONE_WIDTH = 5.2
/** Marge intérieure entre le bord de la zone et les puces. */
export const ZONE_PADDING = 0.4
/** Écart entre deux puces et entre deux étagères (≥ 2 cellules de grille : les pistes y passent). */
export const CHIP_GAP = 0.5
/** Écart minimal entre deux zones, ou entre une zone et le quartier. */
export const ZONE_GAP = 2

/** Pas de la grille du routeur (tâche 5) : une zone recule par cellules de cette taille. */
const GRID_STEP = 0.25
/** Distance entre le bord arrière d'une zone et son étiquette. */
const LABEL_MARGIN = 0.3
/** Tolérance flottante : deux rectangles à `ZONE_GAP` exactement ne se recouvrent pas. */
const EPSILON = 1e-9

/**
 * `level` : la taille d'une puce croît avec le niveau (publie visuellement les
 * niveaux) ; `uniform` : toutes égales. Sans défaut, volontairement : c'est
 * P8-15 qui tranche, avec l'utilisateur.
 */
export type ChipSizing = 'level' | 'uniform'

export interface Chip {
  readonly slug: string
  readonly family: SkillFamily
  /** Repère `IC1…`, dans l'ordre des zones puis des étagères. */
  readonly ref: string
  readonly center: Vec2
  readonly size: number
  readonly height: number
  readonly tone: Tone
}

export interface Zone {
  readonly family: SkillFamily
  /** Fixe par famille (`TONES[indice dans SKILL_FAMILIES]`) : ne bouge pas quand une famille est vide. */
  readonly tone: Tone
  readonly bounds: Rect
  readonly chips: readonly Chip[]
  /** Milieu du bord tourné vers le quartier (côté pour O/E, avant pour N/NO/NE). */
  readonly exit: Vec2
  /** Un point juste derrière (−Z) le bord arrière de la zone, centré en X. */
  readonly labelAnchor: Vec2
}

/** Côté et hauteur d'une puce selon son niveau et le mode de taille. */
export function chipDimensions(
  level: 1 | 2 | 3 | 4 | 5,
  sizing: ChipSizing,
): { size: number; height: number } {
  if (sizing === 'uniform') return { size: 0.9, height: 0.2 }
  return { size: 0.55 + 0.12 * level, height: 0.12 + 0.04 * level }
}

type Direction = 'W' | 'E' | 'N' | 'NW' | 'NE'
/** Ordre d'attribution : la zone la plus peuplée prend O, puis E, N, NO, NE. */
const DIRECTIONS: readonly Direction[] = ['W', 'E', 'N', 'NW', 'NE']

/** Sens de recul d'une zone, vers l'extérieur du quartier. */
const OUTWARD: Record<Direction, Vec2> = {
  W: [-1, 0],
  E: [1, 0],
  N: [0, -1],
  NW: [-1, -1],
  NE: [1, -1],
}

interface Shelved {
  readonly slug: string
  readonly size: number
  readonly height: number
  /** Position du coin avant-gauche de la puce dans le repère local de la zone (origine = coin minX/minZ). */
  readonly x: number
  readonly z: number
}

/**
 * Range les puces en étagères de largeur `ZONE_WIDTH − 2 × ZONE_PADDING`, de la
 * plus grande à la plus petite puis par slug. Retourne les puces en repère local
 * et la profondeur (Z) de la zone.
 */
function shelve(
  skills: readonly BoardSkill[],
  sizing: ChipSizing,
): { placed: readonly Shelved[]; depth: number } {
  const inner = ZONE_WIDTH - 2 * ZONE_PADDING
  const sorted = skills
    .map((s) => ({ slug: s.slug, ...chipDimensions(s.level, sizing) }))
    .sort((a, b) => b.size - a.size || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))

  const placed: Shelved[] = []
  let x = 0
  let z = ZONE_PADDING
  let shelfDepth = 0
  for (const chip of sorted) {
    // Une puce plus large que l'étagère y entre quand même seule (pas de boucle).
    if (x > 0 && x + chip.size > inner + EPSILON) {
      z += shelfDepth + CHIP_GAP
      x = 0
      shelfDepth = 0
    }
    placed.push({ ...chip, x: ZONE_PADDING + x, z })
    x += chip.size + CHIP_GAP
    // Triées par taille décroissante : la première puce d'une étagère la définit.
    shelfDepth = Math.max(shelfDepth, chip.size)
  }
  return { placed, depth: z + shelfDepth + ZONE_PADDING }
}

/** Le rectangle d'ancrage `k` cellules vers l'extérieur de la position de départ. */
function anchored(dir: Direction, district: Rect, depth: number, k: number): Rect {
  const [ox, oz] = OUTWARD[dir]
  const dx = ox * GRID_STEP * k
  const dz = oz * GRID_STEP * k
  // O/E : bord avant aligné sur `district.maxZ` (jamais devant le bus), la zone
  // s'étend vers l'arrière. N/NO/NE : derrière le quartier.
  const front = dir === 'W' || dir === 'E' ? district.maxZ : district.minZ - ZONE_GAP
  let minX: number
  if (dir === 'W' || dir === 'NW') minX = district.minX - ZONE_GAP - ZONE_WIDTH
  else if (dir === 'E' || dir === 'NE') minX = district.maxX + ZONE_GAP
  else minX = (district.minX + district.maxX) / 2 - ZONE_WIDTH / 2
  return {
    minX: minX + dx,
    maxX: minX + ZONE_WIDTH + dx,
    minZ: front - depth + dz,
    maxZ: front + dz,
  }
}

/**
 * Pose les zones : une par famille non vide, la plus peuplée d'abord (égalité :
 * ordre de `SKILL_FAMILIES`), chacune contre le quartier à `ZONE_GAP`. Une zone
 * qui en recouvre une autre (ou le quartier) à `ZONE_GAP` près recule d'une
 * cellule vers l'extérieur jusqu'à ne plus rien recouvrir.
 */
export function planZones(
  skills: readonly BoardSkill[],
  district: Rect,
  sizing: ChipSizing,
): readonly Zone[] {
  const families = SKILL_FAMILIES.map((family) => ({
    family,
    members: skills.filter((s) => s.family === family),
  }))
    .filter((f) => f.members.length > 0)
    // `sort` est stable : l'égalité garde l'ordre de SKILL_FAMILIES.
    .sort((a, b) => b.members.length - a.members.length)

  const taken: Rect[] = [district]
  let refIndex = 0
  return families.map(({ family, members }, i) => {
    const dir = DIRECTIONS[i]!
    const tone = TONES[SKILL_FAMILIES.indexOf(family)]!
    const { placed, depth } = shelve(members, sizing)

    let k = 0
    let bounds = anchored(dir, district, depth, k)
    while (taken.some((r) => rectsOverlap(bounds, r, ZONE_GAP - EPSILON))) {
      k += 1
      bounds = anchored(dir, district, depth, k)
    }
    taken.push(bounds)

    const chips: Chip[] = placed.map((p) => {
      refIndex += 1
      return {
        slug: p.slug,
        family,
        ref: `IC${refIndex}`,
        center: [bounds.minX + p.x + p.size / 2, bounds.minZ + p.z + p.size / 2],
        size: p.size,
        height: p.height,
        tone,
      }
    })

    const midX = (bounds.minX + bounds.maxX) / 2
    const midZ = (bounds.minZ + bounds.maxZ) / 2
    const exit: Vec2 =
      dir === 'W' ? [bounds.maxX, midZ] : dir === 'E' ? [bounds.minX, midZ] : [midX, bounds.maxZ]
    return {
      family,
      tone,
      bounds,
      chips,
      exit,
      labelAnchor: [midX, bounds.minZ - LABEL_MARGIN],
    }
  })
}
