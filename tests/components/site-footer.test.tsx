/**
 * Pied de page (P4-02) — `testing-strategy.md` §4.5.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SiteFooter } from '@/ui/site-footer'

describe('pied de page', () => {
  it('est le point de repère d’informations complémentaires', () => {
    render(<SiteFooter locale="fr" year={2026} />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('porte la mention de droits, avec l’année qu’on lui donne', () => {
    // L'année est une **prop** et non un `new Date()` interne : un composant qui
    // lit l'horloge n'est pas testable sans la figer, et la valeur est de toute
    // façon gravée au build puisque tout est prérendu.
    render(<SiteFooter locale="fr" year={2026} />)

    expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2026 Aurélien Feignon')
  })

  it('ne porte pas de navigation, qui appartient à l’en-tête', () => {
    render(<SiteFooter locale="fr" year={2026} />)

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
