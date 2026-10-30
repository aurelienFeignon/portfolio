/**
 * Le mouvement de caméra, en nombres purs — P6-04, sans three.
 *
 * ⭐ Le rig (`components/nexus/camera-rig.tsx`) ne fait qu'appliquer ces
 * fonctions image par image. Tout ce qui peut se tromper — l'interpolation,
 * l'interruption, les bornes de l'orbite, le décentrage du cadrage — est ici, où
 * un banc l'éprouve sans navigateur.
 */
import { DEG, FOV_MAX_DEG, fovForAspect } from './framing.ts'
import { type CameraSpec, transitionMs, type Vec3 } from './layout.ts'

/** Une pose de caméra : ce que l'interpolation fait varier. */
export interface Pose {
  readonly position: Vec3
  readonly target: Vec3
  readonly fov: number
}

/** Lacet et tangage, en degrés : la forme de l'orbite et de la parallaxe. */
export interface OrbitAngles {
  readonly yawDeg: number
  readonly pitchDeg: number
}

/** L'orbite au repos : ni glisser, ni parallaxe. */
export const ORBIT_REST: OrbitAngles = Object.freeze({ yawDeg: 0, pitchDeg: 0 })

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

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t
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
export function clampOrbit(yawDeg: number, pitchDeg: number, limits: OrbitAngles): OrbitAngles {
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
 * lecture laisse libre, et ce que cette zone voit du champ.
 *
 * ⭐ Le canvas reste plein écran — pas de redimensionnement, pas de second
 * contexte. Seul le **point principal** de la projection se déplace
 * (`PerspectiveCamera.setViewOffset`) : le sujet glisse au centre de l'espace
 * libre.
 *
 * ⛔⛔ **Le champ vertical couvre toujours TOUT le canvas** : le décalage ne le
 * resserre pas sur la zone. Celle-ci en voit donc, en largeur, `free.width /
 * height` (`aspect`) — et non `free.width / free.height`, qui surestimait sa
 * largeur et laissait la carte déborder de part et d'autre (P8-15d) — et, en
 * hauteur, la fraction `free.height / height` (`heightFraction`).
 */
export function framingFor(
  free: Rect | null,
  width: number,
  height: number,
): {
  readonly offsetX: number
  readonly offsetY: number
  readonly aspect: number
  readonly heightFraction: number
} {
  if (free === null || free.width <= 0 || free.height <= 0 || height <= 0) {
    return { offsetX: 0, offsetY: 0, aspect: height === 0 ? 1 : width / height, heightFraction: 1 }
  }
  return {
    offsetX: width / 2 - (free.x + free.width / 2),
    offsetY: height / 2 - (free.y + free.height / 2),
    aspect: free.width / height,
    heightFraction: Math.min(1, free.height / height),
  }
}

/**
 * Le brouillard, tiré de la distance de cadrage : il commence un peu au-delà de la
 * cible et s'achève loin derrière. ⭐ Proportionnel : une caméra reculée (champ au
 * plafond) ne plonge pas la carte dans la bande de brouillard.
 */
export function fogRange(distance: number): { readonly near: number; readonly far: number } {
  return { near: distance * 1.05, far: distance * 2.4 }
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
export function parallaxFor(pointerX: number, pointerY: number, limits: OrbitAngles): OrbitAngles {
  return clampOrbit(pointerX * limits.yawDeg, pointerY * limits.pitchDeg, limits)
}

/* ------------------------------------------------------------ une image du rig */

/** Degrés d'orbite par pixel glissé : lacet à l'horizontale, tangage à la verticale. */
const DRAG_DEG_PER_PX = { yaw: 0.18, pitch: 0.12 } as const

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
 * La durée qu'une image fait avancer — temps de transition comme rattrapage de
 * l'orbite.
 *
 * ⛔ **Au réveil, une image courte.** En `frameloop='demand'`, la première image
 * après un repos porte une durée égale à TOUT ce repos : l'orbite sautait à sa
 * consigne d'un coup. Une image qui suit un repos compte donc pour `REVEIL_S`.
 * ⛔ **En mouvement, une image figée ne saute pas.** Un onglet en arrière-plan,
 * une compilation : au-delà de `IMAGE_MAX_S`, l'image ne compte que pour lui.
 * ⭐ Entre les deux, la durée réelle : un appareil à 20 i/s n'est pas ralenti.
 */
export const REVEIL_S = 1 / 60
export const IMAGE_MAX_S = 0.1

/** Une image, bornée à `IMAGE_MAX_S` — sans le réveil, pour une boucle qui ne dort pas. */
export function boundedStepS(deltaS: number): number {
  return Math.min(deltaS, IMAGE_MAX_S)
}

export function frameStepS(deltaS: number, wasMoving: boolean): number {
  return wasMoving ? boundedStepS(deltaS) : REVEIL_S
}

/**
 * La part de l'écart qu'une image comble : `1 − e^(−rδ)`, donc indépendante de
 * la cadence — deux demi-images valent une image. Sans mouvement (`animated`
 * faux), 1 : on saute, c'est voulu sous `reduced-motion`.
 */
export function approachFactor(ratePerS: number, stepS: number, animated: boolean): number {
  return animated ? 1 - Math.exp(-ratePerS * stepS) : 1
}

/** L'orbite affichée qui rattrape sa consigne, à `ORBIT_EASE_PER_S`. */
export function approachOrbit(
  now: OrbitAngles,
  consigne: OrbitAngles,
  stepS: number,
  animated: boolean,
): OrbitAngles {
  const k = approachFactor(ORBIT_EASE_PER_S, stepS, animated)
  return {
    yawDeg: mix(now.yawDeg, consigne.yawDeg, k),
    pitchDeg: mix(now.pitchDeg, consigne.pitchDeg, k),
  }
}

/** L'écart d'orbite, en degrés, en deçà duquel l'orbite est arrivée. */
const ORBIT_SETTLED_DEG = 0.01

/** Ce que le rig applique à la caméra pour une image. */
export interface RigFrame {
  /** La pose interpolée, avant orbite : la prochaine transition repart d'ELLE. */
  readonly shown: Pose
  /** La position, orbite comprise ; la caméra vise `shown.target`. */
  readonly position: Vec3
  /** Le champ vertical, corrigé pour le format À PARTIR de la valeur interpolée, borné. */
  readonly fov: number
  /** La distance caméra–cible, recul compris : celle que lit le brouillard (`fogRange`). */
  readonly distance: number
  readonly orbit: OrbitAngles
  /** Le temps de transition écoulé APRÈS cette image, à rendre à l'image suivante. */
  readonly elapsedMs: number
  /** Une transition de route en cours (`t < 1`), orbite exclue. */
  readonly transitioning: boolean
  /** Une image de plus est nécessaire : transition, ou orbite pas encore arrivée. */
  readonly moving: boolean
}

/**
 * Une image du rig, en nombres purs : tout ce que `camera-rig.tsx` faisait de tête
 * dans `useFrame`, et qu'aucun banc ne voyait (ADR-0012, exigences 2 et 3).
 *
 * ⛔⛔ **Le temps de transition s'ACCUMULE, image par image** — il ne se lit pas
 * sur l'horloge de R3F. `setFrameloop` remet `clock.elapsedTime` à zéro à chaque
 * changement de boucle, et une fiche fait passer la boucle par `never` : lu sur
 * l'horloge, le temps écoulé devenait NÉGATIF au retour, `t` retombait à 0, et la
 * caméra rejouait une transition déjà finie depuis son ancien départ (P6-11).
 */
export function rigFrame(input: {
  readonly from: Pose
  readonly goal: Pose
  /** Le temps de transition accumulé avant cette image ; 0 à chaque nouvel état. */
  readonly elapsedMs: number
  readonly orbitNow: OrbitAngles
  readonly drag: OrbitAngles
  readonly parallax: OrbitAngles
  readonly limits: OrbitAngles
  readonly deltaS: number
  /** L'image précédente bougeait-elle ? Sinon, celle-ci est un réveil. */
  readonly wasMoving: boolean
  /** Faux sous `reduced-motion` : la transition coupe, l'orbite saute. */
  readonly animated: boolean
  /** La largeur de la zone libre sur la hauteur du canvas (`framingFor`). */
  readonly aspect: number
  /** La part de la hauteur du canvas que la zone libre occupe ; 1 par défaut. */
  readonly heightFraction?: number
}): RigFrame {
  const step = frameStepS(input.deltaS, input.wasMoving)
  const elapsedMs = input.elapsedMs + step * 1000
  const t = easeInOutCubic(transitionProgress(elapsedMs, transitionMs(!input.animated)))
  const shown = interpolatePose(input.from, input.goal, t)
  // La consigne est la somme du glisser et de la parallaxe, bornée ensemble.
  const consigne = clampOrbit(
    input.drag.yawDeg + input.parallax.yawDeg,
    input.drag.pitchDeg + input.parallax.pitchDeg,
    input.limits,
  )
  const orbit = approachOrbit(input.orbitNow, consigne, step, input.animated)
  const transitioning = t < 1
  /*
   * Le champ que le cadrage demande dans la zone libre : assez large (format) ET
   * assez haut (part de la hauteur). Au-delà du plafond (`FOV_MAX_DEG`, contre
   * l'œil de poisson), la caméra RECULE de ce qui manque : le rapport des
   * tangentes rend la même emprise. ⭐ Le recul s'applique à l'image, jamais à
   * `shown` : la prochaine transition repart du cadrage, pas d'un recul cumulé.
   */
  const half = (deg: number): number => Math.tan((deg * DEG) / 2)
  const tall = 2 * Math.atan(half(shown.fov) / (input.heightFraction ?? 1))
  const wanted = Math.max(fovForAspect(shown.fov, input.aspect, Infinity), tall / DEG)
  const fov = Math.min(wanted, Math.max(FOV_MAX_DEG, shown.fov))
  const k = half(wanted) / half(fov)
  const [px, py, pz] = shown.position
  const [tx, ty, tz] = shown.target
  const backed: Vec3 = [tx + (px - tx) * k, ty + (py - ty) * k, tz + (pz - tz) * k]
  return {
    shown,
    position: orbitAround(backed, shown.target, orbit.yawDeg, orbit.pitchDeg),
    fov,
    distance: Math.hypot(backed[0] - tx, backed[1] - ty, backed[2] - tz),
    orbit,
    elapsedMs,
    transitioning,
    moving:
      transitioning ||
      Math.abs(consigne.yawDeg - orbit.yawDeg) > ORBIT_SETTLED_DEG ||
      Math.abs(consigne.pitchDeg - orbit.pitchDeg) > ORBIT_SETTLED_DEG,
  }
}
