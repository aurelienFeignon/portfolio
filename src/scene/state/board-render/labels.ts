/**
 * Les **étiquettes HTML** de la carte mère, par vue (P8-15g, `carte-mere.md` §8) :
 *
 * - **vue d'ensemble** : les trois sections ;
 * - **vue d'une section** : en permanence les noms de ce qu'elle cadre — les familles
 *   (compétences), les employeurs (expériences), les projets (projets) ;
 * - **partout** : l'élément survolé en plus, en priorité maximale.
 *
 * ⭐ Les **noms** ne sont pas ici (§6) : le plan ne porte que des slugs et des ancres. Ce module
 * dit QUELLES étiquettes montrer et OÙ ; leur texte vient du DOM, que `SceneMount` remplit avec
 * ce que le layout serveur lui donne (`BoardLabels`). Aucun texte de contenu n'est peint (§9,
 * ADR-0004).
 *
 * ⛔ N'importe que des TYPES : `SceneMount` (chemin de première visite) lit `boardLabelId` et
 * `BoardLabels`, et ne doit tirer ni `layout.ts` ni `board/` (`scene-state-stays-off-layout`).
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random`.
 */
import type { Section } from '../../../routing/sections.ts'
import type { Rect as ScreenRect } from '../camera-motion.ts'
import type { Vec3 } from '../layout.ts'
import type { SkillFamily } from '../board/content.ts'
import type { Rect } from '../board/rect.ts'
import type { SceneFocus } from '../scene-state.ts'
import type { BoardFile } from './file-format.ts'
import type { BoardTarget } from './targets.ts'

/** Les noms que le layout serveur donne à la scène — le seul endroit où elle en reçoit. */
export interface BoardLabels {
  readonly sections: Readonly<Record<Section, { readonly name: string; readonly tagline: string }>>
  readonly families: Readonly<Record<SkillFamily, string>>
  /** Slug d'expérience → nom de l'employeur. */
  readonly experiences: Readonly<Record<string, string>>
  /** Slug de projet → titre. */
  readonly projects: Readonly<Record<string, string>>
  /** Slug de compétence → nom : l'étiquette d'une puce survolée. */
  readonly skills: Readonly<Record<string, string>>
}

export type BoardLabelKind = 'section' | 'family' | 'experience' | 'project' | 'skill'

/** L'identifiant d'une étiquette : son genre et sa clé (`project:<slug>`). */
export const boardLabelId = (kind: BoardLabelKind, key: string): string => `${kind}:${key}`

/** Une étiquette que la vue demande : où l'ancrer dans la scène, et son rang en cas de collision. */
export interface BoardLabel {
  readonly id: string
  readonly anchor: Vec3
  readonly priority: number
}

/** La hauteur, au-dessus de la plaque, où s'ancrent les étiquettes : posées sur la carte. */
export const LABEL_LIFT = 0.25
/** La priorité de l'élément survolé : il passe devant toute étiquette permanente. */
export const HOVERED_PRIORITY = 100
/** La priorité d'une étiquette permanente ; le projet principal passe devant les autres. */
const BASE_PRIORITY = 10

const lift = (x: number, z: number): Vec3 => [x, LABEL_LIFT, z]
const centerOf = (r: Rect): Vec3 => lift((r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2)

/** L'union de rectangles, `null` sans rectangle (recopiée de `board/rect.ts`, qu'on ne tire pas). */
function union(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null
  return {
    minX: Math.min(...rects.map((r) => r.minX)),
    maxX: Math.max(...rects.map((r) => r.maxX)),
    minZ: Math.min(...rects.map((r) => r.minZ)),
    maxZ: Math.max(...rects.map((r) => r.maxZ)),
  }
}

/**
 * Les trois sections, chacune au centre de ce que cadre sa vue : l'union des zones, la frise, le
 * quartier (comme `viewRects`, à ceci près que la frise est prise seule : la bande cadrée en est
 * étendue vers l'arrière, l'étiquette se pose sur le bus lui-même).
 */
function sectionLabels(file: BoardFile): BoardLabel[] {
  const { plan } = file
  const skills = union(plan.zones.map((z) => z.bounds)) ?? plan.district.bounds
  const anchors: Record<Section, Vec3> = {
    experiences: centerOf(plan.timeline.bounds),
    projects: centerOf(plan.district.bounds),
    skills: centerOf(skills),
  }
  return (Object.keys(anchors) as Section[]).map((section) => ({
    id: boardLabelId('section', section),
    anchor: anchors[section],
    priority: BASE_PRIORITY,
  }))
}

/** Ce que nomme en permanence la vue d'une section. */
function permanentLabels(file: BoardFile, section: Section): BoardLabel[] {
  const { plan } = file
  switch (section) {
    case 'skills':
      return plan.zones.map((z) => ({
        id: boardLabelId('family', z.family),
        anchor: lift(...z.labelAnchor),
        priority: BASE_PRIORITY,
      }))
    case 'experiences':
      return plan.timeline.segments.map((s) => ({
        id: boardLabelId('experience', s.experience),
        anchor: lift(...s.labelAnchor),
        priority: BASE_PRIORITY,
      }))
    case 'projects':
      return plan.district.processors.map((p) => ({
        id: boardLabelId('project', p.slug),
        anchor: lift(...p.labelAnchor),
        priority: p.primary ? BASE_PRIORITY + 1 : BASE_PRIORITY,
      }))
  }
}

/**
 * L'identifiant de l'étiquette qui nomme `target` : une puce par sa compétence, un processeur par
 * son projet, un tronçon par son employeur. `null` pour une année — la sérigraphie la porte déjà.
 */
export function targetLabelId(target: BoardTarget): string | null {
  switch (target.kind) {
    case 'chip':
      return boardLabelId('skill', target.slug)
    case 'processor':
      return boardLabelId('project', target.slug)
    case 'segment':
      return boardLabelId('experience', target.experience)
    case 'year':
      return null
  }
}

/** L'ancre de la cible survolée, `undefined` pour une année ou une cible que le plan ignore. */
function targetAnchor(file: BoardFile, target: BoardTarget): readonly [number, number] | undefined {
  const { plan } = file
  switch (target.kind) {
    case 'chip':
      return plan.zones.flatMap((z) => z.chips).find((c) => c.slug === target.slug)?.center
    case 'processor':
      return plan.district.processors.find((p) => p.slug === target.slug)?.labelAnchor
    case 'segment':
      return plan.timeline.segments.find((s) => s.experience === target.experience)?.labelAnchor
    case 'year':
      return undefined
  }
}

function hoveredLabel(file: BoardFile, target: BoardTarget): BoardLabel | null {
  const id = targetLabelId(target)
  const anchor = targetAnchor(file, target)
  return id === null || anchor === undefined
    ? null
    : { id, anchor: lift(...anchor), priority: HOVERED_PRIORITY }
}

/**
 * Les étiquettes que demande la vue `focus`, l'élément survolé compris. ⭐ Déjà nommé par la vue,
 * le survolé n'est pas doublé : c'est sa priorité qui monte.
 */
export function labelsForView(
  file: BoardFile,
  focus: SceneFocus,
  hovered: BoardTarget | null,
): readonly BoardLabel[] {
  const labels = focus === 'overview' ? sectionLabels(file) : permanentLabels(file, focus)
  const extra = hovered === null ? null : hoveredLabel(file, hovered)
  if (extra === null) return labels
  const i = labels.findIndex((l) => l.id === extra.id)
  if (i === -1) return [...labels, extra]
  return labels.map((l, j) => (j === i ? { ...l, priority: HOVERED_PRIORITY } : l))
}

/* ---------------------------------------------------------------- collisions */

/** L'écart minimal, en pixels, entre deux étiquettes visibles. */
export const LABEL_GAP_PX = 4

/**
 * Une étiquette projetée : `(x, y)` est le milieu de son bord BAS (comme `labelPlacement`), la
 * boîte s'étend de `width / 2` de part et d'autre et de `height` au-dessus.
 */
export interface PlacedCandidate {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly priority: number
}

const left = (c: PlacedCandidate) => c.x - c.width / 2
const right = (c: PlacedCandidate) => c.x + c.width / 2

function inside(c: PlacedCandidate, zone: ScreenRect): boolean {
  return (
    left(c) >= zone.x &&
    right(c) <= zone.x + zone.width &&
    c.y - c.height >= zone.y &&
    c.y <= zone.y + zone.height
  )
}

function collide(a: PlacedCandidate, b: PlacedCandidate): boolean {
  return (
    left(a) < right(b) + LABEL_GAP_PX &&
    left(b) < right(a) + LABEL_GAP_PX &&
    a.y - a.height < b.y + LABEL_GAP_PX &&
    b.y - b.height < a.y + LABEL_GAP_PX
  )
}

/** Plus prioritaire d'abord ; à égalité, par identifiant — un départage stable. */
const byRank = (a: PlacedCandidate, b: PlacedCandidate): number =>
  b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Les étiquettes visibles (Review Focus 5) : dans la zone, et **jamais deux superposées** — en
 * cas de chevauchement, la moins prioritaire se cache. Glouton par rang, donc indépendant de
 * l'ordre d'entrée ; une étiquette hors zone est écartée avant, et ne cache personne.
 */
export function placeLabels(
  candidates: readonly PlacedCandidate[],
  zone: ScreenRect,
): ReadonlySet<string> {
  const kept: PlacedCandidate[] = []
  for (const c of candidates.filter((c) => inside(c, zone)).sort(byRank)) {
    if (!kept.some((k) => collide(k, c))) kept.push(c)
  }
  return new Set(kept.map((k) => k.id))
}
