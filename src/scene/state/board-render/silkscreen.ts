/**
 * La sérigraphie de la carte mère (P8-15d) : **ce qu'elle écrit, et où** — la scène la peint en
 * UNE texture (un `<canvas>` 2D hors écran, `CanvasTexture`), sur un plan posé sur la carte.
 *
 * ⛔⛔ **Aucun texte de contenu** (ADR-0004, `carte-mere.md` §9) : la sérigraphie ne porte que
 * des années, des repères de composants (`U1`, `IC12`, `R3`, `C7`) et la référence de la carte.
 * Les noms — compétences, familles, employeurs, projets — sont des étiquettes HTML. Un banc
 * vérifie qu'aucun texte n'est un slug et que tous suivent ce motif.
 *
 * Elle porte aussi le décor qu'un circuit imprimé doit à sa sérigraphie et à son cuivre de fond :
 * cadres des zones et des boîtiers, liseré de la carte, pistes fines de fond — sans un appel de
 * dessin de plus.
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random` (la graine est un paramètre). ⛔ Aucune
 * **valeur** de `board/` — seulement ses types.
 */
import type { BoardFile } from './file-format.ts'
import type { BoardPlan } from '../board/plan.ts'
import type { Rect, Vec2 } from '../board/rect.ts'
import type { Tone } from '../layout.ts'
import { seededRandom } from '../seeded-random.ts'
import { yearSides } from './geometry.ts'

/** La référence de la carte, gravée dans un coin : sans langue, comme un numéro de pièce. */
export const BOARD_REFERENCE = 'AUG-MB-01'

export interface SilkscreenItem {
  readonly text: string
  /** Centre du texte, dans le plan de la carte. */
  readonly at: Vec2
  /** Hauteur des capitales, en unités de scène. */
  readonly size: number
}

/** Tailles et retraits des textes, en unités de scène. */
const TEXT = {
  year: { offset: 0.8, size: 0.3 },
  cpu: { gap: 0.42, size: 0.26 },
  chip: { gap: 0.2, size: 0.13 },
  /** Derrière le composant (−Z) : sa cellule de dégagement garde le texte sur la carte. */
  passive: { gap: 0.25, rotatedGap: 0.38, size: 0.09 },
  board: { inset: [2.4, 0.6] as const, size: 0.34 },
} as const

/**
 * Les textes de la sérigraphie : l'année de chaque jalon (du côté de la voie 0 qui regarde hors
 * du bus), le repère de chaque processeur et de chaque puce (devant le boîtier, comme sur une
 * vraie carte), celui des `passives` premiers petits composants (ceux que le palier dessine), et
 * la référence de la carte.
 */
export function silkscreenItems(
  file: BoardFile,
  passives: number = file.plan.passives.length,
): readonly SilkscreenItem[] {
  const { plan } = file
  const items: SilkscreenItem[] = []
  const sides = yearSides(plan.timeline)
  plan.timeline.milestones.forEach((m, i) => {
    items.push({
      text: String(m.year),
      at: [m.at[0], m.at[1] + sides[i]! * TEXT.year.offset],
      size: TEXT.year.size,
    })
  })
  for (const cpu of plan.district.processors) {
    items.push({
      text: cpu.ref,
      at: [cpu.center[0], cpu.center[1] + cpu.size / 2 + TEXT.cpu.gap],
      size: TEXT.cpu.size,
    })
  }
  for (const chip of plan.zones.flatMap((z) => z.chips)) {
    items.push({
      text: chip.ref,
      at: [chip.center[0], chip.center[1] + chip.size / 2 + TEXT.chip.gap],
      size: TEXT.chip.size,
    })
  }
  for (const passive of plan.passives.slice(0, passives)) {
    const [x, z] = passive.center
    items.push({
      text: passive.ref,
      at: [x, z - (passive.rotated ? TEXT.passive.rotatedGap : TEXT.passive.gap)],
      size: TEXT.passive.size,
    })
  }
  const b = plan.bounds
  items.push({
    text: BOARD_REFERENCE,
    at: [b.maxX - TEXT.board.inset[0], b.maxZ - TEXT.board.inset[1]],
    size: TEXT.board.size,
  })
  return items
}

export interface SilkscreenFrame {
  readonly kind: 'board' | 'zone' | 'processor' | 'chip'
  readonly rect: Rect
  /** La teinte d'une zone : son cadre se lit comme sa famille. */
  readonly tone?: Tone
}

const grow = (r: Rect, by: number): Rect => ({
  minX: r.minX - by,
  minZ: r.minZ - by,
  maxX: r.maxX + by,
  maxZ: r.maxZ + by,
})

const square = (center: Vec2, size: number): Rect => ({
  minX: center[0] - size / 2,
  minZ: center[1] - size / 2,
  maxX: center[0] + size / 2,
  maxZ: center[1] + size / 2,
})

/** Les cadres : liseré de la carte, zones (à leur teinte), empreintes des processeurs et des puces. */
export function silkscreenFrames(plan: BoardPlan): readonly SilkscreenFrame[] {
  return [
    { kind: 'board', rect: grow(plan.bounds, -0.3) },
    ...plan.zones.map((z) => ({ kind: 'zone' as const, rect: z.bounds, tone: z.tone })),
    ...plan.district.processors.map((p) => ({
      kind: 'processor' as const,
      rect: grow(square(p.center, p.size), 0.32),
    })),
    ...plan.zones.flatMap((z) =>
      z.chips.map((c) => ({ kind: 'chip' as const, rect: grow(square(c.center, c.size), 0.15) })),
    ),
  ]
}

/** Les huit directions octilinéaires. */
const DIRECTIONS: readonly Vec2[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

/** Pas de la grille des pistes fines, et marge gardée autour de ce qui est occupé. */
const FINE_STEP = 0.25
const FINE_CLEARANCE = 0.3

const inside = (r: Rect, [x, z]: Vec2): boolean =>
  x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ

/**
 * Les pistes fines de fond : au plus `count` courtes marches octilinéaires (deux à quatre
 * tronçons), sur la grille, **hors** des zones, du quartier et du bus (marge comprise) et dans la
 * carte. C'est le cuivre d'une carte réelle — la scène les peint à peine visibles, sous tout le
 * reste. Même graine, même plan → mêmes tracés.
 */
export function fineTraces(plan: BoardPlan, count: number, seed: number): readonly Vec2[][] {
  if (count <= 0) return []
  const random = seededRandom(seed)
  const busy = [...plan.zones.map((z) => z.bounds), plan.district.bounds, plan.timeline.bounds].map(
    (r) => grow(r, FINE_CLEARANCE),
  )
  const board = grow(plan.bounds, -0.5)
  const free = (p: Vec2): boolean => inside(board, p) && !busy.some((r) => inside(r, p))
  const snap = (v: number): number => Math.round(v / FINE_STEP) * FINE_STEP
  const out: Vec2[][] = []
  for (let attempt = 0; attempt < count * 8 && out.length < count; attempt++) {
    const start: Vec2 = [
      snap(board.minX + random() * (board.maxX - board.minX)),
      snap(board.minZ + random() * (board.maxZ - board.minZ)),
    ]
    if (!free(start)) continue
    const line: Vec2[] = [start]
    const legs = 2 + Math.floor(random() * 3)
    for (let leg = 0; leg < legs; leg++) {
      const [dx, dz] = DIRECTIONS[Math.floor(random() * DIRECTIONS.length)]!
      const steps = 2 + Math.floor(random() * 7)
      const from = line.at(-1)!
      let end: Vec2 | null = null
      // Chaque pas est vérifié : un tracé ne traverse jamais ce qu'il contourne.
      for (let s = 1; s <= steps; s++) {
        const p: Vec2 = [from[0] + dx * s * FINE_STEP, from[1] + dz * s * FINE_STEP]
        if (!free(p)) break
        end = p
      }
      if (end === null) break
      line.push(end)
    }
    if (line.length >= 2) out.push(line)
  }
  return out
}

export interface CanvasMapping {
  readonly width: number
  readonly height: number
  /** Pixels par unité de scène. */
  readonly scale: number
  /** Un point de la carte → pixels du canvas (`minX, minZ` au coin haut gauche). */
  readonly toPx: (at: Vec2) => readonly [number, number]
}

/**
 * Le canvas de la sérigraphie couvre exactement `bounds`, à `pxPerUnit` — la plus grande
 * dimension bornée à `maxSize` (la taille de texture du GPU, et la mémoire d'un téléphone).
 */
export function canvasMapping(bounds: Rect, pxPerUnit: number, maxSize: number): CanvasMapping {
  const w = bounds.maxX - bounds.minX
  const d = bounds.maxZ - bounds.minZ
  const scale = Math.min(pxPerUnit, maxSize / Math.max(w, d))
  return {
    width: Math.round(w * scale),
    height: Math.round(d * scale),
    scale,
    toPx: ([x, z]) => [(x - bounds.minX) * scale, (z - bounds.minZ) * scale],
  }
}
