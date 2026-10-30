/**
 * L'assembleur de la carte mère : du contenu (compétences, expériences,
 * projets) au plan complet — bornes, quartier, zones, frise, pistes, petits
 * composants — en données pures.
 *
 * Repère : X vers la droite, Z vers le visiteur, Y vers le haut ; le module
 * travaille dans le plan XZ. Le bus court **devant** (Z positifs).
 *
 * ⭐ Les entrées sont triées par slug avant tout : le dépôt de contenu peut
 * changer d'ordre, le plan ne doit pas.
 *
 * Module pur : ni `Date` (l'année courante est un paramètre), ni
 * `Math.random` (la graine est fixe), ni Three.js.
 */
import { BOARD_DENSITY, type DensityTier } from '../layout.ts'
import { boardBounds, timelineOriginZ } from './bounds.ts'
import { type BoardContent, bySlug } from './content.ts'
import { type Passive, scatterPassives } from './passives.ts'
import { type District, planDistrict } from './processors.ts'
import type { Rect } from './rect.ts'
import { planTimeline, type Timeline } from './timeline.ts'
import { planTracesWithGrid, type Traces } from './traces.ts'
import { type ChipSizing, planZones, type Zone } from './zones.ts'

/** La graine des petits composants : fixe, pour que deux visites voient la même carte. */
export const BOARD_SEED = 0x0b0a12d

export interface BoardOptions {
  readonly currentYear: number
  readonly chipSizing: ChipSizing
  readonly tier: DensityTier
}

export interface BoardPlan {
  readonly bounds: Rect
  readonly district: District
  readonly zones: readonly Zone[]
  readonly timeline: Timeline
  readonly traces: Traces
  readonly passives: readonly Passive[]
  /** Les impulsions animées sur les pistes (`BOARD_DENSITY[tier].pulses`). */
  readonly pulses: number
}

/**
 * Assemble le plan : tri par slug → quartier → zones → frise (`originZ` devant
 * le plus avancé des deux) → bornes (union + marge) → pistes → petits
 * composants sur les cellules restées libres.
 */
export function planBoard(content: BoardContent, options: BoardOptions): BoardPlan {
  const skills = [...content.skills].sort(bySlug)
  const experiences = [...content.experiences].sort(bySlug)
  const projects = [...content.projects].sort(bySlug)
  const sorted: BoardContent = { skills, experiences, projects }

  const district = planDistrict(projects)
  const zones = planZones(skills, district.bounds, options.chipSizing)
  const timeline = planTimeline(
    experiences,
    options.currentYear,
    timelineOriginZ(district.bounds, zones),
  )
  const bounds = boardBounds([district.bounds, ...zones.map((z) => z.bounds), timeline.bounds])
  const { traces, grid } = planTracesWithGrid(sorted, zones, district, timeline, bounds)
  const { passives, pulses } = BOARD_DENSITY[options.tier]
  // Les ancres d'étiquettes (processeurs, zones, tronçons du bus) : aucun petit
  // composant n'y passe sous le texte.
  const labels = [
    ...district.processors.map((p) => p.labelAnchor),
    ...zones.map((z) => z.labelAnchor),
    ...timeline.segments.map((s) => s.labelAnchor),
  ]

  return {
    bounds,
    district,
    zones,
    timeline,
    traces,
    passives: scatterPassives(grid, passives, BOARD_SEED, labels),
    pulses,
  }
}
