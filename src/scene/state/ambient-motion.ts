/**
 * Une image du mouvement ambiant de la scène, en nombres purs : le temps que
 * voient les shaders, la durée qu'avancent les animations, et la mise en valeur
 * de chaque section (sa route ou son survol). Né avec NEXUS (P8-12) ; la carte
 * mère (`board-scene.tsx`) le lit tel quel — le grossissement au survol des
 * univers est parti avec eux (P8-15h).
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

import { approachFactor, boundedStepS, mix } from './camera-motion.ts'
import type { SceneFocus } from './scene-state.ts'

/** L'heure des shaders sous `prefers-reduced-motion` : impulsions visibles à l'arrêt. */
export const FROZEN_TIME_S = 2.4

/** Le taux de rattrapage de la surbrillance, par seconde. */
const HIGHLIGHT_EASE_PER_S = 4

export interface AmbientState {
  /** Le temps de scène accumulé, en secondes ; il ne court que si l'on anime. */
  readonly timeS: number
  /** La mise en valeur de chaque section, de 0 à 1. */
  readonly highlight: Readonly<Record<Section, number>>
}

interface AmbientFrame {
  readonly state: AmbientState
  /** Le temps que voient les shaders : accumulé, ou figé sous `reduced-motion`. */
  readonly shaderTimeS: number
  /** La durée qu'avancent les animations à cette image, bornée. */
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
  },
): AmbientFrame {
  const stepS = boundedStepS(input.deltaS)
  const kHighlight = approachFactor(HIGHLIGHT_EASE_PER_S, stepS, input.animated)
  const highlight = { ...state.highlight }
  for (const section of SECTIONS) {
    const goal = input.hovered === section || input.focus === section ? 1 : 0
    highlight[section] = mix(highlight[section], goal, kHighlight)
  }
  const timeS = input.animated ? state.timeS + stepS : state.timeS
  return {
    state: { timeS, highlight },
    shaderTimeS: input.animated ? timeS : FROZEN_TIME_S,
    stepS,
  }
}
