/**
 * Liste blanche des composants utilisables depuis un corps MDX (P2-08).
 *
 * **Ce n'est pas une mesure de sécurité.** MDX exécute du JavaScript : un corps
 * peut évaluer une expression sans passer par le moindre composant — constaté en
 * P2-01 (`phase-2-log.md` §6.1). Ce que cette liste garantit est éditorial : un
 * contenu ne peut pas appeler un composant qui n'a pas été prévu, donc il ne peut
 * pas exister de page qui « marche presque ».
 *
 * Elle est **volontairement minuscule** en Phase 2. La stratégie de style
 * (ADR-0010) et les composants documentaires arrivent en Phase 4 : les ajouts se
 * font là-bas, en même temps que leur mise en forme et leurs tests
 * d'accessibilité.
 */
import type { ComponentType, ReactNode } from 'react'

import styles from './components.module.css'
import type { MdxComponentName } from './whitelist'

const TONES = ['info', 'warning'] as const

type Tone = (typeof TONES)[number]

interface CalloutProps {
  tone?: Tone
  children?: ReactNode
}

/**
 * Encadré éditorial. Rendu en `aside` : c'est un contenu complémentaire, et
 * c'est ce que doit annoncer la sémantique — pas un `div` que Phase 4 devra
 * corriger à l'audit d'accessibilité.
 */
export function Callout({ tone = 'info', children }: CalloutProps) {
  return (
    <aside className={styles.callout} data-tone={tone}>
      {children}
    </aside>
  )
}

/**
 * Le contrat passé à `evaluate` : rien d'autre n'est appelable depuis un MDX.
 *
 * `satisfies` amarre cette table à `whitelist.ts`, que le gate de contenu lit de
 * son côté. Ajouter un composant ici sans l'y déclarer — ou l'inverse — devient
 * une erreur de compilation, et non un écart que personne ne remarque jusqu'à ce
 * que le gate laisse passer un contenu fautif.
 */
export const MDX_COMPONENTS = { Callout } satisfies Record<MdxComponentName, ComponentType<never>>
