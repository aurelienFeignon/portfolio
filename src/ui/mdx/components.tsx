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
import type { ReactNode } from 'react'

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
    <aside className="callout" data-tone={tone}>
      {children}
    </aside>
  )
}

/** Le contrat passé à `evaluate` : rien d'autre n'est appelable depuis un MDX. */
export const MDX_COMPONENTS = { Callout } as const
