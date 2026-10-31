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
 * ⛔ N'importe que des TYPES, plus le module neutre `plane.ts` (qui n'importe rien) : `SceneMount`
 * (chemin de première visite) lit `boardLabelId` et `BoardLabels`, et ne doit tirer ni
 * `layout.ts` ni `board/` (`scene-state-stays-off-layout`).
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random`.
 */
import type { Section } from '../../../routing/sections.ts'
import type { Rect as ScreenRect } from '../camera-motion.ts'
import type { Vec3 } from '../layout.ts'
import type { SkillFamily } from '../board/content.ts'
import { type Rect, rectCenter } from '../plane.ts'
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
const centerOf = (r: Rect): Vec3 => lift(...rectCenter(r))

const area = (r: Rect): number => (r.maxX - r.minX) * (r.maxZ - r.minZ)

/**
 * Les trois sections, chacune sur un repère DISTINCT de la carte :
 * - **Projets** : l'ancre du processeur principal (au-dessus de U1) ;
 * - **Expériences** : le centre de la frise, sur le bus ;
 * - **Compétences** : l'ancre de la plus grande zone (aire, puis famille : déterministe).
 *
 * ⛔ Pas le centre de ce que cadre chaque vue : les zones entourent le quartier, et le centre de
 * leur union tombait sur U1 — COMPÉTENCES s'empilait sur PROJETS, et l'une des deux se cachait.
 * Une carte sans processeur ou sans zone retombe sur le centre du quartier.
 */
function sectionLabels(file: BoardFile): BoardLabel[] {
  const { plan } = file
  const { processors } = plan.district
  const primary = processors.find((p) => p.primary) ?? processors[0]
  const largest = [...plan.zones].sort(
    (a, b) => area(b.bounds) - area(a.bounds) || (a.family < b.family ? -1 : 1),
  )[0]
  const fallback = centerOf(plan.district.bounds)
  const anchors: Record<Section, Vec3> = {
    experiences: centerOf(plan.timeline.bounds),
    projects: primary === undefined ? fallback : lift(...primary.labelAnchor),
    skills: largest === undefined ? fallback : lift(...largest.labelAnchor),
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

/** L'écart minimal, en pixels, entre deux étiquettes qui s'affichent. */
export const LABEL_GAP_PX = 4
/** La marge, en pixels, entre le bas d'une étiquette et le bas de sa zone. */
export const LABEL_MARGIN_BOTTOM_PX = 16
/**
 * L'hystérésis, en pixels : une étiquette DÉJÀ visible le reste tant que son ancre ne sort pas de
 * la zone de plus de ce jeu, et qu'aucune plus prioritaire ne l'approche à moins de
 * `LABEL_GAP_PX - LABEL_HYSTERESIS_PX` (donc jamais en recouvrement réel). Sans elle, la
 * parallaxe faisait clignoter une étiquette posée juste au seuil.
 */
export const LABEL_HYSTERESIS_PX = 4

/**
 * Une étiquette projetée : `(x, y)` est le milieu de son bord BAS — l'ancre projetée en entrée,
 * la position ramenée dans la zone en sortie (`placeLabels` l'écrit). La boîte s'étend de
 * `width / 2` de part et d'autre et de `height` au-dessus.
 */
export interface PlacedCandidate {
  readonly id: string
  x: number
  y: number
  /** La taille rendue, en pixels — mutable : le projecteur réutilise ses cases d'une image à l'autre. */
  width: number
  height: number
  readonly priority: number
}

const EMPTY: ReadonlySet<string> = new Set()

/**
 * Pose en `c.x`, `c.y` (pixels du canvas) l'ancre projetée `ndc` — coordonnées normalisées de
 * l'appareil, celles de `Vector3.project`. `false` si elle est derrière la caméra ou au-delà du
 * plan lointain (`z` hors de `]-1, 1[`) : l'étiquette se cache.
 */
export function toScreen(
  c: PlacedCandidate,
  ndcX: number,
  ndcY: number,
  ndcZ: number,
  width: number,
  height: number,
): boolean {
  if (!(ndcZ > -1 && ndcZ < 1)) return false
  c.x = ((ndcX + 1) / 2) * width
  c.y = ((1 - ndcY) / 2) * height
  return true
}

/**
 * Ramène la boîte de `c` dans la zone, si son ANCRE y est (au jeu `slack` près) : une étiquette
 * dont l'ancre est visible reste lisible au lieu de disparaître — une famille posée sur le bord de
 * la carte, au mobile, est ce qui nomme la carte (§8). Ancre hors zone, ou boîte plus grande que
 * la zone : `false`, l'étiquette se cache.
 * ⭐ La seule règle de zone des étiquettes : rien d'autre ne la vérifie.
 */
function fitToZone(c: PlacedCandidate, zone: ScreenRect, slack = 0): boolean {
  const minX = zone.x + c.width / 2
  const maxX = zone.x + zone.width - c.width / 2
  const minY = zone.y + c.height
  const maxY = zone.y + zone.height - LABEL_MARGIN_BOTTOM_PX
  if (minX > maxX || minY > maxY) return false
  const anchored =
    c.x >= zone.x - slack &&
    c.x <= zone.x + zone.width + slack &&
    c.y >= zone.y - slack &&
    c.y <= zone.y + zone.height + slack
  if (!anchored) return false
  c.x = Math.min(maxX, Math.max(minX, c.x))
  c.y = Math.min(maxY, Math.max(minY, c.y))
  return true
}

/** Deux boîtes plus proches que `gap` (négatif : qui se recouvrent de plus de `-gap`). */
function collide(a: PlacedCandidate, b: PlacedCandidate, gap: number): boolean {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 + gap &&
    b.x - b.width / 2 < a.x + a.width / 2 + gap &&
    a.y - a.height < b.y + gap &&
    b.y - b.height < a.y + gap
  )
}

/** Plus prioritaire d'abord ; à égalité, par identifiant — un départage stable. */
const byRank = (a: PlacedCandidate, b: PlacedCandidate): number =>
  b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Les étiquettes visibles (Review Focus 5) : ramenées dans la zone (`fitToZone`), et **jamais
 * deux superposées** — en cas de chevauchement, la moins prioritaire se cache. Glouton par rang,
 * donc indépendant de l'ordre d'entrée ; une étiquette hors zone ne cache personne. `previous`
 * (les visibles de l'image d'avant) donne l'hystérésis.
 *
 * ⭐ Sans allocation à l'image : `candidates` est TRIÉ sur place et ses positions sont écrites
 * (ramenées dans la zone) ; le résultat va dans `into`, vidé d'abord.
 */
export function placeLabels(
  candidates: PlacedCandidate[],
  zone: ScreenRect,
  previous: ReadonlySet<string> = EMPTY,
  into: Set<string> = new Set(),
): ReadonlySet<string> {
  into.clear()
  candidates.sort(byRank)
  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i]!
    const incumbent = previous.has(c.id)
    if (!fitToZone(c, zone, incumbent ? LABEL_HYSTERESIS_PX : 0)) continue
    const gap = incumbent ? LABEL_GAP_PX - LABEL_HYSTERESIS_PX : LABEL_GAP_PX
    let free = true
    for (let j = 0; j < i && free; j += 1) {
      const k = candidates[j]!
      if (into.has(k.id) && collide(k, c, gap)) free = false
    }
    if (free) into.add(c.id)
  }
  return into
}
