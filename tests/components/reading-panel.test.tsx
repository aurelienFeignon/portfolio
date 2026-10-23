/**
 * Le panneau de lecture (D11) — le seul contenant du contenu, sur sa propre
 * surface.
 *
 * ⭐ Ce que la scène lit dans le DOM est ici : `data-reading-panel` porte la
 * disposition, et `SceneMount` mesure l'élément qui le porte pour cadrer la
 * caméra dans l'espace restant. Le perdre décentrerait la scène sans erreur.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ReadingPanel } from '@/ui/reading-panel'

describe('le panneau de lecture', () => {
  it('est le `main` de la page, cible du lien d’évitement, et annonce sa disposition', () => {
    render(
      <ReadingPanel variant="aside">
        <h1>Expériences</h1>
      </ReadingPanel>,
    )

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main')
    expect(main).toHaveAttribute('data-reading-panel', 'aside')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Expériences')
  })

  it('n’a pas de lien de retour sur l’accueil', () => {
    render(<ReadingPanel variant="aside">contenu</ReadingPanel>)

    expect(screen.queryByRole('link')).toBeNull()
  })

  it('porte le retour demandé, flèche décorative exclue du nom accessible', () => {
    render(
      <ReadingPanel variant="reading" back={{ href: '/fr/projects', label: 'Projets' }}>
        contenu
      </ReadingPanel>,
    )

    expect(screen.getByRole('main')).toHaveAttribute('data-reading-panel', 'reading')
    const lien = screen.getByRole('link', { name: 'Projets' })
    expect(lien).toHaveAttribute('href', '/fr/projects')
  })
})
