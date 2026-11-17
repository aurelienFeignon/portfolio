/**
 * Les cadrages de la carte mère : quatre vues **calculées depuis les boîtes
 * englobantes** de ce qu'elles montrent — la caméra suit l'expansion de la
 * carte d'elle-même (`carte-mere.md` §5, « Cadrages »).
 *
 * Repère : la carte est à plat dans Y = 0 (`[x, z]` → `[x, 0, z]`), Z vers le
 * visiteur. La caméra se tient **devant** (+Z) et au-dessus, et vise le centre
 * du rectangle.
 *
 * ⭐⭐ **Chaque vue se cadre dans la zone que l'écran lui laisse** (`FrameZone`), pas dans
 * un 16:9 de référence. Jusqu'à P8-05, les cadrages étaient calculés pour 16:9 et le rendu
 * élargissait le champ pour garder le champ horizontal du 16:9 (`fitFov`) : sur un téléphone
 * en portrait, la vue gardait les marges latérales du 16:9 — la carte d'accueil n'occupait
 * que 65 % de la largeur, et la frise des expériences montrait la carte entière, petite, au-
 * dessus d'une bande vide (capture du 2026-11-17, Xiaomi 14T Pro). Le plan versionné garde
 * le cadrage de référence (`BoardFile.cameras`) ; le rig recadre pour la zone réelle.
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
/**
 * L'air autour du rectangle cadré, **dans l'image** : ses coins tiennent dans `1 / FRAME_MARGIN`
 * de la zone. ⛔ Elle multipliait la DISTANCE jusqu'à P8-05 : sur un rectangle profond, les
 * coins avant, proches de la caméra, gagnaient bien plus de 15 % d'air — la carte du grand banc
 * ne remplissait que ~76 % d'une zone d'ordinateur.
 */
export const FRAME_MARGIN = 1.15

/**
 * La zone où la vue doit tenir, mesurée sur le canvas : `aspect` = largeur de la zone sur
 * la HAUTEUR du canvas, `heightFraction` = hauteur de la zone sur celle du canvas
 * (`framingFor`). ⭐ Le champ vertical couvre toujours tout le canvas — `setViewOffset`
 * déplace le point principal sans resserrer le champ —, donc la zone voit
 * `tan(fov/2) × aspect` en demi-largeur et `tan(fov/2) × heightFraction` en demi-hauteur.
 */
export interface FrameZone {
  readonly aspect: number
  readonly heightFraction: number
}

/** La zone de référence du plan versionné : un canvas 16:9, entièrement libre. */
export const REFERENCE_ZONE: FrameZone = { aspect: REFERENCE_ASPECT, heightFraction: 1 }

/** Plancher de la distance : un rectangle réduit à un point ne pose pas la caméra sur sa cible. */
const MIN_DISTANCE = 1

/** Les itérations de la bisection du point visé : l'intervalle est divisé par 2⁴⁸. */
const AIM_STEPS = 48

/**
 * La distance minimale qui fait tenir les quatre coins de `rect` dans la zone réduite de la
 * marge (`FRAME_MARGIN`), la caméra visant `(ax, 0, az)`.
 *
 * ⭐ Calcul exact, pas une approximation. Avec la caméra à la distance `D` du point visé, le
 * long de `(0, sin e, cos e)`, un coin à `(dx, dz)` de ce point se projette ainsi : profondeur
 * `D - dz·cos e`, abscisse `dx`, ordonnée `-dz·sin e` (indépendante de `D`). Les deux
 * demi-angles donnent donc, par coin, `D ≥ dz·cos e + |dx|/tanH` et
 * `D ≥ dz·cos e + |dz|·sin e/tanV` ; on prend le plus grand. Les positions ne sont **pas
 * arrondies** : un arrondi pourrait sortir un coin.
 */
function distanceFor(
  rect: Rect,
  ax: number,
  az: number,
  zoneTanH: number,
  zoneTanV: number,
): number {
  const e = ELEVATION_DEG * DEG
  const tanH = zoneTanH / FRAME_MARGIN
  const tanV = zoneTanV / FRAME_MARGIN
  let need = MIN_DISTANCE
  for (const x of [rect.minX, rect.maxX]) {
    for (const z of [rect.minZ, rect.maxZ]) {
      const dx = x - ax
      const dz = z - az
      const base = dz * Math.cos(e)
      need = Math.max(need, base + Math.abs(dx) / tanH, base + (Math.abs(dz) * Math.sin(e)) / tanV)
    }
  }
  return need
}

/**
 * L'ordonnée projetée (tangente, vers le haut) du bord `z`, la caméra visant `az` à `distance`.
 */
function rise(z: number, az: number, distance: number): number {
  const e = ELEVATION_DEG * DEG
  const dz = z - az
  return (-dz * Math.sin(e)) / (distance - dz * Math.cos(e))
}

/**
 * Cadre `rect` dans la zone `zone` (champ vertical `BOARD_FOV`) : la caméra vise le point de
 * la carte dont l'image est **centrée verticalement**, à la distance minimale qui laisse la
 * marge de `FRAME_MARGIN` dans l'image.
 *
 * ⛔⛔ **Viser le centre du rectangle ne centre pas son image** (P8-05). En perspective, le
 * bord du fond monte moins que le bord avant ne descend : visée au centre, une carte profonde
 * laissait 150 px de vide en haut de la zone contre 62 en bas (grand banc, 1440 × 900), et la
 * frise d'un téléphone un bandeau vide au-dessus de la carte. Le point visé est donc celui où
 * les deux bords s'écartent également du centre de l'image, trouvé par bisection : la somme
 * de leurs ordonnées, négative visé au fond et positive visé à l'avant, s'annule entre les
 * deux. Un rectangle sans profondeur garde son centre.
 */
export function frameRect(
  rect: Rect,
  focus?: Section,
  zone: FrameZone = REFERENCE_ZONE,
): CameraSpec {
  const [cx] = rectCenter(rect)
  const e = ELEVATION_DEG * DEG
  const tan = Math.tan((BOARD_FOV / 2) * DEG)
  const tanV = tan * zone.heightFraction
  const tanH = tan * zone.aspect

  let lo = rect.minZ
  let hi = rect.maxZ
  for (let i = 0; i < AIM_STEPS; i += 1) {
    const az = (lo + hi) / 2
    const d = distanceFor(rect, cx, az, tanH, tanV)
    if (rise(rect.minZ, az, d) + rise(rect.maxZ, az, d) < 0) lo = az
    else hi = az
  }
  const az = (lo + hi) / 2
  const distance = distanceFor(rect, cx, az, tanH, tanV)

  const spec: CameraSpec = {
    position: [cx, distance * Math.sin(e), az + distance * Math.cos(e)],
    target: [cx, 0, az],
    fov: BOARD_FOV,
  }
  return focus === undefined ? spec : { ...spec, focusNodeId: focus }
}

/** Ce que la bande cadrée garde devant la voie la plus avancée : la demi-largeur d'un faisceau. */
const STRIP_FRONT = 0.3

/**
 * La bande de la frise **étendue vers −Z** jusqu'au format de la zone (projetée sous
 * l'élévation), et bornée à la carte. ⭐ Sur une zone presque carrée — la bande de scène
 * d'un téléphone —, l'extension remonte jusqu'au fond de la carte : la frise reste en bas,
 * pleine largeur, et la carte remplit la zone au-dessus d'elle.
 *
 * ⛔ Cadrer la frise seule — une bande large et basse au bord avant — centrait la vue sur elle :
 * la moitié basse de l'image tombait devant la carte, dans le vide (~40 % de l'écran, mesuré sur
 * la capture de P8-15d). Étendue vers l'arrière, la bande garde la frise en bas de l'image, sur la
 * carte, et montre au-dessus ce qui s'y rattache.
 */
function timelineView(plan: BoardPlan, zone: FrameZone): Rect {
  const strip = plan.timeline.bounds
  const maxZ = Math.min(strip.maxZ + STRIP_FRONT, plan.bounds.maxZ)
  const format = zone.aspect / zone.heightFraction
  const depth = (strip.maxX - strip.minX) / (format * Math.sin(ELEVATION_DEG * DEG))
  const minZ = Math.max(plan.bounds.minZ, Math.min(strip.minZ, maxZ - depth))
  return { minX: strip.minX, maxX: strip.maxX, minZ, maxZ }
}

/**
 * Le rectangle que chaque vue cadre : `accueil` les bornes, `competences` l'union des zones,
 * `experiences` la frise étendue (`timelineView`), `projets` le quartier. Une vue sans rien à
 * montrer (aucune zone) cadre le quartier.
 */
export function viewRects(
  plan: BoardPlan,
  zone: FrameZone = REFERENCE_ZONE,
): Readonly<Record<ViewId, Rect>> {
  return {
    accueil: plan.bounds,
    experiences: timelineView(plan, zone),
    projets: plan.district.bounds,
    competences: rectUnion(plan.zones.map((z) => z.bounds)) ?? plan.district.bounds,
  }
}

/**
 * La caméra reculée (vers −Z, cible comprise) juste assez pour que le bord **proche** de son
 * empreinte au sol — le rayon du bas de la zone, à `ELEVATION_DEG + atan(tan(fov/2) ×
 * heightFraction)` sous l'horizontale — ne dépasse pas `maxZ`. La marge de cadrage
 * (`FRAME_MARGIN`) d'une frise profonde suffisait à passer le bord avant de la carte.
 */
function keepNearEdgeWithin(spec: CameraSpec, maxZ: number, zone: FrameZone): CameraSpec {
  const steepest =
    ELEVATION_DEG * DEG + Math.atan(Math.tan((spec.fov / 2) * DEG) * zone.heightFraction)
  const near = spec.position[2] - spec.position[1] / Math.tan(steepest)
  const shift = Math.max(0, near - maxZ)
  if (shift === 0) return spec
  return {
    ...spec,
    position: [spec.position[0], spec.position[1], spec.position[2] - shift],
    target: [spec.target[0], spec.target[1], spec.target[2] - shift],
  }
}

/** Les quatre vues, chacune cadrant son rectangle (`viewRects`) dans la zone `zone`. */
export function boardCameras(
  plan: BoardPlan,
  zone: FrameZone = REFERENCE_ZONE,
): Readonly<Record<ViewId, CameraSpec>> {
  const rects = viewRects(plan, zone)
  return {
    accueil: frameRect(rects.accueil, undefined, zone),
    experiences: keepNearEdgeWithin(
      frameRect(rects.experiences, 'experiences', zone),
      plan.bounds.maxZ,
      zone,
    ),
    projets: frameRect(rects.projets, 'projects', zone),
    competences: frameRect(rects.competences, 'skills', zone),
  }
}
