/**
 * Les cadrages de la carte mère : quatre vues **calculées depuis les boîtes
 * englobantes** de ce qu'elles montrent — la caméra suit l'expansion de la
 * carte d'elle-même (`carte-mere.md` §5, « Cadrages »).
 *
 * Repère : la carte est à plat dans Y = 0 (`[x, z]` → `[x, 0, z]`), Z vers le
 * visiteur. La caméra se tient **devant** (+Z) et au-dessus, et vise le centre
 * du rectangle.
 *
 * ⭐ Le `fov` rendu est celui du 16:9 ; `fitFov` et `setViewOffset`
 * restent au rendu (P6-04), inchangés. Même forme que `CAMERAS`, pour que
 * `getCameraTarget` puisse basculer sans changer de type.
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random`.
 */
import type { Section } from '../../../routing/sections.ts'
import { DEG, REFERENCE_ASPECT } from '../framing.ts'
import type { CameraSpec, ViewId } from '../layout.ts'
import type { BoardPlan } from './plan.ts'
import { rectUnion } from './rect.ts'
import { type Rect, rectCenter } from '../plane.ts'

/** Champ vertical, en degrés, pour un rapport 16:9. */
export const BOARD_FOV = 40
/** Hauteur de la caméra au-dessus du plan de la carte, en degrés. */
export const ELEVATION_DEG = 58
/** Le recul supplémentaire, en facteur : de l'air autour du rectangle cadré. */
export const FRAME_MARGIN = 1.15

/** Plancher de la distance : un rectangle réduit à un point ne pose pas la caméra sur sa cible. */
const MIN_DISTANCE = 1

/**
 * Cadre `rect` : la distance minimale qui fait tenir ses quatre coins dans le
 * champ (vertical `BOARD_FOV`, horizontal à 16:9), multipliée par `FRAME_MARGIN`.
 *
 * ⭐ Calcul exact, pas une approximation. Avec la caméra à la distance `D` du
 * centre, le long de `(0, sin e, cos e)`, un coin à `(dx, dz)` du centre se
 * projette ainsi : profondeur `D - dz·cos e`, abscisse `dx`, ordonnée
 * `-dz·sin e` (indépendante de `D`). Les deux demi-angles donnent donc, par
 * coin, `D ≥ dz·cos e + |dx|/tanH` et `D ≥ dz·cos e + |dz|·sin e/tanV` ; on
 * prend le plus grand. La marge ne peut qu'éloigner la caméra, jamais sortir un
 * coin ; les positions ne sont donc **pas arrondies** (un arrondi le pourrait).
 */
export function frameRect(rect: Rect, focus?: Section): CameraSpec {
  const [cx, cz] = rectCenter(rect)
  const e = ELEVATION_DEG * DEG
  const tanV = Math.tan((BOARD_FOV / 2) * DEG)
  const tanH = tanV * REFERENCE_ASPECT

  let need = MIN_DISTANCE
  for (const x of [rect.minX, rect.maxX]) {
    for (const z of [rect.minZ, rect.maxZ]) {
      const dx = x - cx
      const dz = z - cz
      const base = dz * Math.cos(e)
      need = Math.max(need, base + Math.abs(dx) / tanH, base + (Math.abs(dz) * Math.sin(e)) / tanV)
    }
  }
  const distance = need * FRAME_MARGIN

  const spec: CameraSpec = {
    position: [cx, distance * Math.sin(e), cz + distance * Math.cos(e)],
    target: [cx, 0, cz],
    fov: BOARD_FOV,
  }
  return focus === undefined ? spec : { ...spec, focusNodeId: focus }
}

/** Ce que la bande cadrée garde devant la voie la plus avancée : la demi-largeur d'un faisceau. */
const STRIP_FRONT = 0.3

/**
 * La bande de la frise **étendue vers −Z** jusqu'au format de référence (projetée sous
 * l'élévation), et bornée à la carte.
 *
 * ⛔ Cadrer la frise seule — une bande large et basse au bord avant — centrait la vue sur elle :
 * la moitié basse de l'image tombait devant la carte, dans le vide (~40 % de l'écran, mesuré sur
 * la capture de P8-15d). Étendue vers l'arrière, la bande garde la frise en bas de l'image, sur la
 * carte, et montre au-dessus ce qui s'y rattache.
 */
function timelineView(plan: BoardPlan): Rect {
  const strip = plan.timeline.bounds
  const maxZ = Math.min(strip.maxZ + STRIP_FRONT, plan.bounds.maxZ)
  const depth = (strip.maxX - strip.minX) / (REFERENCE_ASPECT * Math.sin(ELEVATION_DEG * DEG))
  const minZ = Math.max(plan.bounds.minZ, Math.min(strip.minZ, maxZ - depth))
  return { minX: strip.minX, maxX: strip.maxX, minZ, maxZ }
}

/**
 * Le rectangle que chaque vue cadre : `accueil` les bornes, `competences` l'union des zones,
 * `experiences` la frise étendue (`timelineView`), `projets` le quartier. Une vue sans rien à
 * montrer (aucune zone) cadre le quartier.
 */
export function viewRects(plan: BoardPlan): Readonly<Record<ViewId, Rect>> {
  return {
    accueil: plan.bounds,
    experiences: timelineView(plan),
    projets: plan.district.bounds,
    competences: rectUnion(plan.zones.map((z) => z.bounds)) ?? plan.district.bounds,
  }
}

/**
 * La caméra reculée (vers −Z, cible comprise) juste assez pour que le bord **proche** de son
 * empreinte au sol — le rayon du bas de l'image, à `ELEVATION_DEG + fov/2` sous l'horizontale —
 * ne dépasse pas `maxZ`. La marge de cadrage (`FRAME_MARGIN`) d'une frise profonde suffisait à
 * passer le bord avant de la carte.
 */
function keepNearEdgeWithin(spec: CameraSpec, maxZ: number): CameraSpec {
  const steepest = (ELEVATION_DEG + spec.fov / 2) * DEG
  const near = spec.position[2] - spec.position[1] / Math.tan(steepest)
  const shift = Math.max(0, near - maxZ)
  if (shift === 0) return spec
  return {
    ...spec,
    position: [spec.position[0], spec.position[1], spec.position[2] - shift],
    target: [spec.target[0], spec.target[1], spec.target[2] - shift],
  }
}

/** Les quatre vues, chacune cadrant son rectangle (`viewRects`). */
export function boardCameras(plan: BoardPlan): Readonly<Record<ViewId, CameraSpec>> {
  const rects = viewRects(plan)
  return {
    accueil: frameRect(rects.accueil),
    experiences: keepNearEdgeWithin(frameRect(rects.experiences, 'experiences'), plan.bounds.maxZ),
    projets: frameRect(rects.projets, 'projects'),
    competences: frameRect(rects.competences, 'skills'),
  }
}
