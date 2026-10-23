/**
 * Plan de la scène NEXUS, en données pures — D11, qui remplace le bureau de D10.
 *
 * Aucun import de three, aucun JSX : ce module doit rester testable sans contexte
 * WebGL, et il reste **hors du chemin de première visite** (garde
 * `scene-state-stays-off-layout.test.ts`).
 *
 * Repère : le noyau à l'origine, Y vers le haut, Z vers le visiteur. Unités
 * arbitraires — la scène n'est plus un lieu mesuré mais une composition ; ce qui
 * compte est le rapport des distances, et il est tenu par les bancs.
 *
 * ⭐ **Les trois univers sont les trois sections**, dans le vocabulaire de
 * `routing` (`Section`). Un quatrième vocabulaire n'aurait rien ajouté : le
 * `Record` de `camera-target.ts` reste le seul endroit où route et vue se
 * rencontrent.
 */
import type { Section } from '../../routing/sections.ts'

export type Vec3 = readonly [number, number, number]

/** La palette NEXUS — la même que les tokens de `globals.css`. */
export const PALETTE = {
  background: '#080D18',
  surface: '#111C30',
  cyan: '#28D9F5',
  violet: '#8973F5',
  text: '#F1F5FB',
} as const

/* -------------------------------------------------------------------- univers */

export interface UniverseSpec {
  readonly position: Vec3
  /** Rayon de la sphère de sélection — ce que le pointeur doit toucher. */
  readonly hitRadius: number
  /** La couleur dominante ; l'autre teinte de la palette sert d'accent. */
  readonly tone: 'cyan' | 'violet'
}

/**
 * ⭐ Disposés en triangle autour du noyau, **pas sur un cercle régulier** : à
 * hauteurs égales et 120° pile, la vue d'ensemble se lit comme un schéma. Projets
 * est placé derrière et au-dessus du noyau — la caméra qui le cadre regarde
 * alors à travers lui vers le noyau, ce qui donne au gros plan sa profondeur.
 */
export const UNIVERSES: Readonly<Record<Section, UniverseSpec>> = {
  experiences: { position: [-5.6, 0, 1], hitRadius: 1.9, tone: 'violet' },
  projects: { position: [1.2, 3.6, -5.8], hitRadius: 1.9, tone: 'cyan' },
  skills: { position: [5.4, -0.6, 1.4], hitRadius: 1.9, tone: 'cyan' },
}

/** Le noyau : rayon du polyèdre central. Le reste de sa silhouette en dérive. */
export const CORE_RADIUS = 1

/* -------------------------------------------------------------------- caméras */

export type ViewId = 'accueil' | 'experiences' | 'projets' | 'competences'

export interface CameraSpec {
  readonly position: Vec3
  readonly target: Vec3
  /** Champ vertical en degrés, pour un rapport 16:9. */
  readonly fov: number
  /** L'univers cadré, absent pour la vue d'ensemble. */
  readonly focusNodeId?: Section
}

const round = (value: number): number => Math.round(value * 1000) / 1000

/**
 * Le gros plan d'un univers : **calculé**, jamais choisi coordonnée par
 * coordonnée.
 *
 * La caméra se tient du côté opposé au noyau, **décalée de côté** et un peu au-
 * dessus : vu ainsi, le noyau reste dans le champ, en retrait et à l'écart de
 * l'univers. Sans le décalage latéral, il serait exactement derrière l'univers,
 * et l'écraserait — mesuré sur la première capture du prototype.
 *
 * ⭐⭐ **Le côté est choisi pour que le noyau apparaisse à DROITE de l'univers** :
 * le panneau de lecture occupe la gauche de l'écran, et un noyau cadré à gauche
 * passait dessous (deuxième capture, gros plan Compétences). Des deux côtés
 * possibles, on garde celui où le noyau tombe du côté droit de la visée.
 */
export function closeUp(universe: Section, distance = 5.2, fov = 40): CameraSpec {
  const [x, y, z] = UNIVERSES[universe].position
  const radial = Math.hypot(x, z)
  const outward: Vec3 = [x / radial, 0, z / radial]

  const placer = (sign: 1 | -1): Vec3 => {
    const tangent: Vec3 = [-outward[2] * sign, 0, outward[0] * sign]
    const raw: Vec3 = [outward[0] + tangent[0] * 1.05, 0.38, outward[2] + tangent[2] * 1.05]
    const norm = Math.hypot(...raw)
    return [
      x + (raw[0] / norm) * distance,
      y + (raw[1] / norm) * distance,
      z + (raw[2] / norm) * distance,
    ]
  }
  // À droite de la visée = produit scalaire positif entre (−visée.z, 0, visée.x)
  // et la direction univers → noyau.
  const aDroite = (camera: Vec3): boolean => {
    const visee: Vec3 = [x - camera[0], y - camera[1], z - camera[2]]
    return -visee[2] * -x + visee[0] * -z > 0
  }
  const position = aDroite(placer(1)) ? placer(1) : placer(-1)

  return {
    position: [round(position[0]), round(position[1]), round(position[2])],
    target: [x, y, z],
    fov,
    focusNodeId: universe,
  }
}

export const CAMERAS: Readonly<Record<ViewId, CameraSpec>> = {
  accueil: { position: [0, 4.4, 19], target: [0, 0.7, 0], fov: 40 },
  experiences: closeUp('experiences'),
  projets: closeUp('projects'),
  competences: closeUp('skills'),
}

/**
 * Durée d'une transition, en millisecondes. Passer `true` pour
 * `prefers-reduced-motion` : la coupe est **instantanée**, jamais accélérée.
 *
 * ⭐ 1,6 s et non plus 0,7 : un déplacement de 13 unités autour du noyau lu en
 * 0,7 s se perçoit comme un saut, pas comme un mouvement de caméra.
 */
export const transitionMs = (reducedMotion: boolean): number => (reducedMotion ? 0 : 1600)

/* ----------------------------------------------------------------- orbite */

/**
 * L'orbite bornée — un état de **présentation**, jamais de navigation (ADR-0002) :
 * elle n'entre pas dans l'URL et revient à zéro à chaque changement de route.
 */
export const ORBIT_LIMITS = { yawDeg: 28, pitchDeg: 12 } as const

/* ---------------------------------------------------------------- densité */

export type DensityTier = 'full' | 'reduced' | 'lite'

export interface Density {
  /** Particules d'ambiance. */
  readonly particles: number
  /** Nœuds du réseau Projets. */
  readonly projectNodes: number
  /** Points par domaine de la constellation Compétences. */
  readonly skillPointsPerCluster: number
  /** Coques translucides autour du noyau. */
  readonly shells: number
}

/**
 * ⛔ La densité descend avec le palier, la composition non : un mobile voit les
 * mêmes formes, moins peuplées. Les retirer ferait d'un univers un autre objet.
 */
export const DENSITY: Readonly<Record<DensityTier, Density>> = {
  full: { particles: 1800, projectNodes: 14, skillPointsPerCluster: 26, shells: 2 },
  reduced: { particles: 1000, projectNodes: 12, skillPointsPerCluster: 20, shells: 2 },
  lite: { particles: 500, projectNodes: 10, skillPointsPerCluster: 14, shells: 1 },
}
