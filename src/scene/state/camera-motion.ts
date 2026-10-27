/**
 * Le mouvement de caméra, en nombres purs — P6-04, sans three.
 *
 * ⭐ Le rig (`components/nexus/camera-rig.tsx`) ne fait qu'appliquer ces
 * fonctions image par image. Tout ce qui peut se tromper — l'interpolation,
 * l'interruption, les bornes de l'orbite, le décentrage du cadrage — est ici, où
 * un banc l'éprouve sans navigateur.
 */
import { fovForAspect } from './framing.ts'
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
  return clampOrbit(pointerX * limits.yawDeg, pointerY * limits.pitchDeg, limits)
}

/** La marge, en pixels, entre l'accroche d'une étiquette et le bas de sa zone. */
const LABEL_MARGIN_BOTTOM_PX = 16

/**
 * Où poser l'étiquette d'un univers, à partir de la projection de son ancre
 * (coordonnées normalisées de l'appareil, celles de `Vector3.project`).
 *
 * ⛔ **Visible seulement dans sa zone** (`zone` : hors du panneau de lecture et
 * de l'en-tête, mesurée par `SceneMount`) et devant la caméra (`z` dans
 * `[-1, 1]`) — jamais posée sur le contenu.
 *
 * ⭐ Le dégagement se mesure depuis l'ACCROCHE — le milieu du bord bas de
 * l'étiquette — avec la taille RENDUE de l'étiquette (`label`) : la demi-largeur
 * sur les côtés, toute la hauteur au-dessus. Une taille supposée se trompait
 * dans les deux sens — une accroche longue débordait, une étiquette réduite au
 * nom (mobile) se cachait sans raison.
 */
export function labelPlacement(
  ndc: Vec3,
  width: number,
  height: number,
  zone: Rect,
  label: { readonly width: number; readonly height: number },
): { readonly x: number; readonly y: number; readonly visible: boolean } {
  const x = ((ndc[0] + 1) / 2) * width
  const y = ((1 - ndc[1]) / 2) * height
  const visible =
    ndc[2] > -1 &&
    ndc[2] < 1 &&
    x >= zone.x + label.width / 2 &&
    x <= zone.x + zone.width - label.width / 2 &&
    y >= zone.y + label.height &&
    y <= zone.y + zone.height - LABEL_MARGIN_BOTTOM_PX
  return { x, y, visible }
}

/* ------------------------------------------------------------ une image du rig */

/** Lacet et tangage, en degrés : la forme de l'orbite et de la parallaxe. */
export interface OrbitAngles {
  readonly yawDeg: number
  readonly pitchDeg: number
}

/** Degrés d'orbite par pixel glissé : lacet à l'horizontale, tangage à la verticale. */
export const DRAG_DEG_PER_PX = { yaw: 0.18, pitch: 0.12 } as const

/**
 * La consigne d'orbite après un glisser de `dx`, `dy` pixels, bornée. Glisser vers
 * la droite tourne la vue vers la gauche : le lacet DÉCROÎT.
 */
export function dragOrbit(
  goal: OrbitAngles,
  dx: number,
  dy: number,
  limits: OrbitAngles,
): OrbitAngles {
  return clampOrbit(
    goal.yawDeg - dx * DRAG_DEG_PER_PX.yaw,
    goal.pitchDeg + dy * DRAG_DEG_PER_PX.pitch,
    limits,
  )
}

/** Le taux de rattrapage de l'orbite, par seconde. */
const ORBIT_EASE_PER_S = 5

/**
 * ⛔ La durée d'image la plus longue qu'on accepte. En `frameloop='demand'`, la
 * première image après un repos porte une durée égale à TOUT ce repos : sans
 * plafond, l'orbite sautait à sa consigne en une image (ADR-0012, P6-11). Plafonnée,
 * cette image avance comme une image ordinaire, et les suivantes — demandées tant
 * que l'orbite bouge — arrivent à la cadence de l'écran.
 */
export const MAX_FRAME_S = 1 / 30

/**
 * L'orbite affichée qui rattrape sa consigne : une approche exponentielle,
 * `1 − e^(−5δ)` par image, donc indépendante de la cadence. Sans mouvement
 * (`animated` faux), elle saute : c'est voulu sous `reduced-motion`.
 */
export function approachOrbit(
  now: OrbitAngles,
  consigne: OrbitAngles,
  deltaS: number,
  animated: boolean,
): OrbitAngles {
  const k = animated ? 1 - Math.exp(-ORBIT_EASE_PER_S * Math.min(deltaS, MAX_FRAME_S)) : 1
  return {
    yawDeg: now.yawDeg + (consigne.yawDeg - now.yawDeg) * k,
    pitchDeg: now.pitchDeg + (consigne.pitchDeg - now.pitchDeg) * k,
  }
}

/** L'écart d'orbite, en degrés, en deçà duquel l'orbite est arrivée. */
export const ORBIT_SETTLED_DEG = 0.01

/** Ce que le rig applique à la caméra pour une image. */
export interface RigFrame {
  /** La pose interpolée, avant orbite : la prochaine transition repart d'ELLE. */
  readonly shown: Pose
  readonly position: Vec3
  readonly target: Vec3
  /** Le champ vertical, corrigé pour le format À PARTIR de la valeur interpolée. */
  readonly fov: number
  readonly orbit: OrbitAngles
  /** Une transition de route en cours (`t < 1`), orbite exclue. */
  readonly transitioning: boolean
  /** Une image de plus est nécessaire : transition, ou orbite pas encore arrivée. */
  readonly moving: boolean
}

/**
 * Une image du rig, en nombres purs : tout ce que `camera-rig.tsx` faisait de tête
 * dans `useFrame`, et qu'aucun banc ne voyait (ADR-0012, exigences 2 et 3).
 */
export function rigFrame(input: {
  readonly from: Pose
  readonly goal: Pose
  readonly elapsedMs: number
  readonly durationMs: number
  readonly orbitNow: OrbitAngles
  readonly drag: OrbitAngles
  readonly parallax: OrbitAngles
  readonly limits: OrbitAngles
  readonly deltaS: number
  readonly animated: boolean
  readonly aspect: number
}): RigFrame {
  const t = easeInOutCubic(transitionProgress(input.elapsedMs, input.durationMs))
  const shown = interpolatePose(input.from, input.goal, t)
  // La consigne est la somme du glisser et de la parallaxe, bornée ensemble.
  const consigne = clampOrbit(
    input.drag.yawDeg + input.parallax.yawDeg,
    input.drag.pitchDeg + input.parallax.pitchDeg,
    input.limits,
  )
  const orbit = approachOrbit(input.orbitNow, consigne, input.deltaS, input.animated)
  const transitioning = t < 1
  return {
    shown,
    position: orbitAround(shown.position, shown.target, orbit.yawDeg, orbit.pitchDeg),
    target: shown.target,
    fov: fovForAspect(shown.fov, input.aspect),
    orbit,
    transitioning,
    moving:
      transitioning ||
      Math.abs(consigne.yawDeg - orbit.yawDeg) > ORBIT_SETTLED_DEG ||
      Math.abs(consigne.pitchDeg - orbit.pitchDeg) > ORBIT_SETTLED_DEG,
  }
}
