/**
 * Une image du mouvement ambiant de NEXUS, en nombres purs : le temps que voient
 * les shaders, la durée qu'avancent les rotations, la surbrillance et le
 * grossissement au survol des univers. Ce que `nexus-scene.tsx` faisait de tête
 * dans `useFrame`, et qu'aucun banc ne voyait.
 *
 * ⛔⛔ **Le temps des shaders s'ACCUMULE, image par image** — il ne se lit pas sur
 * l'horloge de R3F. `setFrameloop` remet `clock.elapsedTime` à zéro à chaque
 * changement de boucle, et une fiche fait passer la boucle par `never` : lue sur
 * l'horloge, l'animation ambiante repartait de 0 au retour. Même cause que le
 * défaut de P6-11 sur le rig (`camera-motion.ts`, `rigFrame`).
 * ⛔ **Et une image figée ne compte que pour `IMAGE_MAX_S`** : un onglet masqué
 * en boucle `always` rendait au retour une durée égale à toute l'absence, et
 * chaque rotation sautait d'autant.
 */
import { SECTIONS, type Section } from '@/routing/sections'

import { approachFactor, IMAGE_MAX_S } from './camera-motion'
import type { SceneFocus } from './scene-state'

/** L'heure des shaders sous `prefers-reduced-motion` : impulsions visibles à l'arrêt. */
export const FROZEN_TIME_S = 2.4

/** Les taux de rattrapage, par seconde, de la surbrillance et du grossissement. */
const HIGHLIGHT_EASE_PER_S = 4
const SCALE_EASE_PER_S = 6

export interface AmbientState {
  /** Le temps de scène accumulé, en secondes ; il ne court que si l'on anime. */
  readonly timeS: number
  readonly highlight: Readonly<Record<Section, number>>
  readonly scale: Readonly<Record<Section, number>>
}

export interface AmbientFrame {
  readonly state: AmbientState
  /** Le temps que voient les shaders : accumulé, ou figé sous `reduced-motion`. */
  readonly shaderTimeS: number
  /** La durée qu'avancent les rotations à cette image, bornée. */
  readonly stepS: number
}

export function ambientFrame(
  state: AmbientState,
  input: {
    readonly deltaS: number
    /** Faux sous `reduced-motion` : tout saute à son but, le temps s'arrête. */
    readonly animated: boolean
    readonly hovered: SceneFocus | null
    readonly focus: SceneFocus
    readonly hoverScale: number
  },
): AmbientFrame {
  const stepS = Math.min(input.deltaS, IMAGE_MAX_S)
  const kHighlight = approachFactor(HIGHLIGHT_EASE_PER_S, stepS, input.animated)
  const kScale = approachFactor(SCALE_EASE_PER_S, stepS, input.animated)
  const highlight = { ...state.highlight }
  const scale = { ...state.scale }
  for (const section of SECTIONS) {
    const goal = input.hovered === section || input.focus === section ? 1 : 0
    highlight[section] += (goal - highlight[section]) * kHighlight
    // ⭐ Le survol grandit l'univers — doucement, jamais d'un coup.
    const scaleGoal = input.hovered === section ? input.hoverScale : 1
    scale[section] += (scaleGoal - scale[section]) * kScale
  }
  const timeS = input.animated ? state.timeS + stepS : state.timeS
  return {
    state: { timeS, highlight, scale },
    shaderTimeS: input.animated ? timeS : FROZEN_TIME_S,
    stepS,
  }
}
