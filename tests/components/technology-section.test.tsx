/**
 * Le bloc « pile technique » d'une fiche (P4-10 — dette de P4-05).
 *
 * ⚠️ **Ce que ce composant existe pour empêcher est un appariement muet.** Les
 * deux fiches écrivaient chacune un `<h2 id="technologies">` et un
 * `labelledBy="technologies"`, sans que rien ne relie les deux chaînes : une
 * faute de frappe d'un côté rendait la liste **anonyme** pour un lecteur
 * d'écran, et aucun test n'échouait. C'est donc l'appariement qu'il faut
 * mesurer, pas la présence des deux éléments.
 *
 * Extrait en revue de P4-05 sans test de composant — 0 % de couverture, nommé
 * en dette dans `phase-4-log.md` §13.8.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TechnologySection } from '@/ui/technology-section'

describe('bloc « pile technique »', () => {
  it('rattache sa liste à son titre, par le même identifiant', () => {
    render(<TechnologySection locale="fr" labels={['TypeScript', 'PostgreSQL']} />)

    const heading = screen.getByRole('heading', { level: 2, name: 'Technologies' })
    const list = screen.getByRole('list', { name: 'Technologies' })

    // L'appariement, et non les deux présences : c'est `aria-labelledby` qui
    // fait annoncer « Technologies, liste de 2 éléments » plutôt qu'une liste
    // sans nom, et c'est lui que la duplication cassait en silence.
    expect(list).toHaveAttribute('aria-labelledby', heading.id)
    expect(heading.id).not.toBe('')
  })

  it('rend un élément par libellé, tel qu’on le lui donne', () => {
    render(<TechnologySection locale="fr" labels={['TypeScript', 'PostgreSQL']} />)

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'TypeScript',
      'PostgreSQL',
    ])
  })

  it('titre le bloc dans la langue de la fiche', () => {
    render(<TechnologySection locale="en" labels={['TypeScript']} />)

    // La fiche d'un **projet** lisait `messages.experience.technologies`, une
    // clé du dictionnaire « expérience » : le libellé est désormais commun.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Tech stack')
  })
})
