/**
 * Le mouvement de caméra, en nombres purs — P6-04, sans three.
 *
 * ⭐ Le rig (`components/nexus/camera-rig.tsx`) ne fait qu'appliquer ces
 * fonctions image par image. Tout ce qui peut se tromper — l'interpolation,
 * l'interruption, les bornes de l'orbite, le décentrage du cadrage — est ici, où
 * un banc l'éprouve sans navigateur.
 */
import type { CameraSpec, Vec3 } from './layout.ts'

/** Une pose de caméra : ce que l'interpolation fait varier. */
export interface Pose {
  readonly position: Vec3
  readonly target: Vec3
  readonly fov: number
}

export const poseOf = (spec: CameraSpec): Pose => ({
  position: spec.position,
  target: spec.target,
  fov: spec.fov,
})

/** Lente au départ et à l'arrivée : le mouvement d'une grue, pas d'un projectile. */
export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

/**
 * L'avancement d'une transition, de 0 à 1.
 *
 * ⛔ Une durée nulle — `prefers-reduced-motion` — rend **1** tout de suite : une
 * coupe, pas une division par zéro qui laisserait la caméra au point de départ.
 */
export function transitionProgress(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1
  return Math.min(1, Math.max(0, elapsedMs / durationMs))
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * t
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
]

/**
 * La pose à l'instant `t` (déjà adouci) entre deux poses.
 *
 * ⭐ **L'interruption tient dans cette signature** : une transition qui en
 * remplace une autre part de la pose COURANTE, pas de la pose de départ de la
 * précédente. Le rig n'a qu'à passer ce qu'il affiche.
 */
export function interpolatePose(from: Pose, to: Pose, t: number): Pose {
  return {
    position: mix3(from.position, to.position, t),
    target: mix3(from.target, to.target, t),
    fov: mix(from.fov, to.fov, t),
  }
}

/** Ramène un angle dans `[-limite, +limite]`. */
export function clampOrbit(
  yawDeg: number,
  pitchDeg: number,
  limits: { readonly yawDeg: number; readonly pitchDeg: number },
): { readonly yawDeg: number; readonly pitchDeg: number } {
  const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value))
  return { yawDeg: clamp(yawDeg, limits.yawDeg), pitchDeg: clamp(pitchDeg, limits.pitchDeg) }
}

/**
 * La position de caméra tournée autour de sa cible : lacet autour de l'axe Y du
 * monde, tangage autour de l'axe horizontal de la caméra.
 *
 * ⭐ La distance à la cible est **conservée** : l'orbite fait tourner le point de
 * vue, elle ne zoome pas.
 */
export function orbitAround(position: Vec3, target: Vec3, yawDeg: number, pitchDeg: number): Vec3 {
  const offset: Vec3 = [position[0] - target[0], position[1] - target[1], position[2] - target[2]]
  const radius = Math.hypot(...offset)
  if (radius === 0) return position

  const yaw0 = Math.atan2(offset[0], offset[2])
  const pitch0 = Math.asin(offset[1] / radius)
  const yaw = yaw0 + (yawDeg * Math.PI) / 180
  // ⛔ Jamais au zénith : la caméra y perdrait son « haut » et basculerait.
  const pitch = Math.min(1.45, Math.max(-1.45, pitch0 + (pitchDeg * Math.PI) / 180))

  return [
    target[0] + radius * Math.cos(pitch) * Math.sin(yaw),
    target[1] + radius * Math.sin(pitch),
    target[2] + radius * Math.cos(pitch) * Math.cos(yaw),
  ]
}

/** Un rectangle de l'écran, en pixels CSS. */
export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Le décalage de projection qui centre la scène dans la zone que le panneau de
 * lecture laisse libre, et le format de cette zone.
 *
 * ⭐ Le canvas reste plein écran — pas de redimensionnement, pas de second
 * contexte. Seul le **point principal** de la projection se déplace
 * (`PerspectiveCamera.setViewOffset`) : le sujet glisse au centre de l'espace
 * libre, et le champ se calcule sur le format de cet espace.
 */
export function framingFor(
  free: Rect | null,
  width: number,
  height: number,
): { readonly offsetX: number; readonly offsetY: number; readonly aspect: number } {
  if (free === null || free.width <= 0 || free.height <= 0) {
    return { offsetX: 0, offsetY: 0, aspect: height === 0 ? 1 : width / height }
  }
  return {
    offsetX: width / 2 - (free.x + free.width / 2),
    offsetY: height / 2 - (free.y + free.height / 2),
    aspect: free.width / free.height,
  }
}

/**
 * La consigne de parallaxe pour un pointeur, en coordonnées normalisées de la
 * fenêtre (−1 à gauche et en bas, +1 à droite et en haut).
 *
 * ⭐ La caméra va **vers** le pointeur : à droite de la fenêtre, elle tourne vers
 * la droite autour de sa cible, et la scène pivote en sens inverse — la
 * profondeur se lit dans ce décalage. Une entrée hors de `[-1, 1]` (pointeur
 * hors de la fenêtre) est ramenée au bord.
 */
export function parallaxFor(
  pointerX: number,
  pointerY: number,
  limits: { readonly yawDeg: number; readonly pitchDeg: number },
): { readonly yawDeg: number; readonly pitchDeg: number } {
  const clamp = (value: number) => Math.min(1, Math.max(-1, value))
  return { yawDeg: clamp(pointerX) * limits.yawDeg, pitchDeg: clamp(pointerY) * limits.pitchDeg }
}

/** La marge, en pixels, entre l'accroche d'une étiquette et le bas de la zone libre. */
const LABEL_MARGIN_BOTTOM_PX = 16

/** Ce que voit l'écran au moment de placer les étiquettes. */
export interface LabelViewport {
  readonly width: number
  readonly height: number
  /** La zone hors du panneau de lecture, `null` sans panneau. */
  readonly free: Rect | null
  /** La hauteur de l'en-tête, qui passe au-dessus des étiquettes. */
  readonly header: number
}

/**
 * Où poser l'étiquette d'un univers, à partir de la projection de son ancre
 * (coordonnées normalisées de l'appareil, celles de `Vector3.project`).
 *
 * ⛔ **Visible seulement dans la zone libre** : une étiquette qui passerait sous
 * le panneau de lecture ou sous l'en-tête, ou derrière la caméra (`z` hors de
 * `[-1, 1]`), est cachée — jamais posée sur le contenu. Sans panneau, la zone
 * libre est l'écran sous l'en-tête.
 *
 * ⭐ Le dégagement se mesure depuis l'ACCROCHE — le milieu du bord bas de
 * l'étiquette — avec la taille RENDUE de l'étiquette (`label`) : la demi-largeur
 * sur les côtés, toute la hauteur au-dessus. Une taille supposée se trompait
 * dans les deux sens — une accroche longue débordait, une étiquette réduite au
 * nom (mobile) se cachait sans raison.
 */
export function labelPlacement(
  ndc: Vec3,
  viewport: LabelViewport,
  label: { readonly width: number; readonly height: number },
): { readonly x: number; readonly y: number; readonly visible: boolean } {
  const { width, height, free, header } = viewport
  const x = ((ndc[0] + 1) / 2) * width
  const y = ((1 - ndc[1]) / 2) * height
  const zone =
    free !== null && free.width > 0 && free.height > 0
      ? free
      : { x: 0, y: header, width, height: height - header }
  const visible =
    ndc[2] > -1 &&
    ndc[2] < 1 &&
    x >= zone.x + label.width / 2 &&
    x <= zone.x + zone.width - label.width / 2 &&
    y >= zone.y + label.height &&
    y <= zone.y + zone.height - LABEL_MARGIN_BOTTOM_PX
  return { x, y, visible }
}
