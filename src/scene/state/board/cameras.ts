/**
 * Les cadrages de la carte mère : quatre vues **calculées depuis les boîtes
 * englobantes** de ce qu'elles montrent — la caméra suit l'expansion de la
 * carte d'elle-même (`carte-mere.md` §5, « Cadrages »).
 *
 * Repère : la carte est à plat dans Y = 0 (`[x, z]` → `[x, 0, z]`), Z vers le
 * visiteur. La caméra se tient **devant** (+Z) et au-dessus, et vise le centre
 * du rectangle.
 *
 * ⭐ Le `fov` rendu est celui du 16:9 ; `fovForAspect` et `setViewOffset`
 * restent au rendu (P6-04), inchangés. Même forme que `CAMERAS`, pour que
 * `getCameraTarget` puisse basculer sans changer de type.
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random`.
 */
import type { Section } from '../../../routing/sections.ts'
import { DEG, REFERENCE_ASPECT } from '../framing.ts'
import type { CameraSpec, ViewId } from '../layout.ts'
import type { BoardPlan } from './plan.ts'
import { type Rect, rectCenter, rectUnion } from './rect.ts'

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

/**
 * Les quatre vues : `accueil` cadre les bornes, `competences` l'union des
 * zones, `experiences` la frise, `projets` le quartier. Une vue sans rien à
 * montrer (aucune zone) cadre le quartier.
 */
export function boardCameras(plan: BoardPlan): Readonly<Record<ViewId, CameraSpec>> {
  const zones = rectUnion(plan.zones.map((z) => z.bounds)) ?? plan.district.bounds
  return {
    accueil: frameRect(plan.bounds),
    experiences: frameRect(plan.timeline.bounds, 'experiences'),
    projets: frameRect(plan.district.bounds, 'projects'),
    competences: frameRect(zones, 'skills'),
  }
}
