/**
 * Les constantes de la scène, en données pures — palette, vocabulaire des vues,
 * mouvement de caméra et densité par palier. Nées avec NEXUS (D11) ; depuis la
 * carte mère (D14, P8-15), les cadrages ne sont plus ici mais **calculés** par
 * `make board` dans le plan versionné (`BoardFile.cameras`).
 *
 * Aucun import de three, aucun JSX : ce module doit rester testable sans contexte
 * WebGL, et il reste **hors du chemin de première visite** (garde
 * `scene-state-stays-off-layout.test.ts`).
 *
 * Repère : la carte à plat dans Y = 0, Y vers le haut, Z vers le visiteur.
 */
import type { Section } from '../../routing/sections.ts'

export type Vec3 = readonly [number, number, number]

/**
 * La palette de la scène — la même que les tokens de `globals.css`.
 *
 * `amber` et `teal` sont les teintes de la carte mère (P8-15d) ; le jugement de
 * contraste sur la scène finale reste celui de P8-08.
 */
export const PALETTE = {
  background: '#080D18',
  surface: '#111C30',
  cyan: '#28D9F5',
  violet: '#8973F5',
  /** Bleu ciel : entre le cyan et le violet. */
  sky: '#38BDF8',
  amber: '#F5B342',
  teal: '#2DD4BF',
  text: '#F1F5FB',
} as const

/** Les teintes d'accent, dans l'ordre où la carte les attribue. */
export const TONES = [
  'cyan',
  'violet',
  'sky',
  'amber',
  'teal',
] as const satisfies readonly (keyof typeof PALETTE)[]
export type Tone = (typeof TONES)[number]

/* -------------------------------------------------------------------- caméras */

export type ViewId = 'accueil' | 'experiences' | 'projets' | 'competences'

export interface CameraSpec {
  readonly position: Vec3
  readonly target: Vec3
  /** Champ vertical en degrés, pour un rapport 16:9. */
  readonly fov: number
  /** La section cadrée, absente pour la vue d'ensemble. */
  readonly focusNodeId?: Section
}

/**
 * Durée d'une transition, en millisecondes. Passer `true` pour
 * `prefers-reduced-motion` : la coupe est **instantanée**, jamais accélérée.
 *
 * ⭐ 1,6 s et non plus 0,7 : un grand déplacement de caméra lu en 0,7 s se
 * perçoit comme un saut, pas comme un mouvement (mesuré sur NEXUS, D11).
 */
export const transitionMs = (reducedMotion: boolean): number => (reducedMotion ? 0 : 1600)

/* ----------------------------------------------------------------- orbite */

/**
 * L'orbite bornée — un état de **présentation**, jamais de navigation (ADR-0002) :
 * elle n'entre pas dans l'URL et revient à zéro à chaque changement de route.
 */
export const ORBIT_LIMITS = { yawDeg: 28, pitchDeg: 12 } as const

/**
 * La parallaxe : la caméra suit le pointeur, sans glisser, de quelques degrés au
 * plus — aux bords de la fenêtre. Ajoutée à l'orbite, le tout reste dans
 * `ORBIT_LIMITS`.
 *
 * ⭐ Assez pour que la scène réponde au moindre geste, trop peu pour qu'elle
 * bouge sous le pointeur de qui lit le panneau.
 */
export const PARALLAX = { yawDeg: 5, pitchDeg: 3 } as const

/* ---------------------------------------------------------------- densité */

export type DensityTier = 'full' | 'reduced' | 'lite'

/**
 * Le budget de la carte mère par palier : petits composants semés, impulsions
 * animées sur les pistes. `lite` ne sème rien ; la composition (zones,
 * processeurs, routes) ne change jamais d'un palier à l'autre, seulement ces
 * deux nombres.
 *
 * ⭐ Ici et non dans `board/` : le plan s'en sert pour semer, la scène pour
 * prendre les N premiers petits composants du plan versionné — et la scène
 * n'importe aucune valeur de `board/` (`carte-mere.md` §12.4).
 */
export const BOARD_DENSITY: Readonly<Record<DensityTier, { passives: number; pulses: number }>> = {
  full: { passives: 120, pulses: 48 },
  reduced: { passives: 70, pulses: 32 },
  lite: { passives: 0, pulses: 16 },
}

/** Nombre de fils d'une voie du bus principal (§4 : « huit pistes parallèles »). */
export const BUS_WIRES = 8
