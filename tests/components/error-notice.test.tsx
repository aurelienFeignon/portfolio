/**
 * Ce que voit un visiteur après une erreur (P4-07) — `testing-strategy.md` §4.5.
 *
 * **Pourquoi ici et pas en E2E.** Toutes les pages du site sont prérendues et
 * n'embarquent aucune logique applicative : il n'existe aucun moyen honnête de
 * provoquer une erreur de rendu contre l'image de production. Un parcours qui
 * prétendrait le faire fabriquerait la panne au lieu de l'observer — et c'est
 * exactement ce que ce dépôt refuse (`phase-4-log.md` §12.5). Le composant, lui,
 * est vérifiable pour de bon.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n/messages'
import { ErrorNotice } from '@/ui/error-notice'

describe('avis d’erreur', () => {
  it('annonce l’erreur dans la langue qu’on lui donne', () => {
    render(<ErrorNotice messages={getMessages('en')} homeHref="/en" onRetry={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute(
      'href',
      '/en',
    )
  })

  it('ramène à l’accueil de la locale, jamais à la racine', () => {
    render(<ErrorNotice messages={getMessages('fr')} homeHref="/fr" onRetry={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/fr')
  })

  it('offre de réessayer par un bouton, et non par un lien', () => {
    // La distinction n'est pas cosmétique : un lecteur d'écran annonce « bouton »
    // ou « lien », et un lien déguisé ne s'active pas à la barre d'espace.
    render(<ErrorNotice messages={getMessages('fr')} homeHref="/fr" onRetry={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Réessayer' })).not.toBeInTheDocument()
  })

  it('rejoue le rendu quand on l’active', () => {
    // `fireEvent` et non `user-event` : ce dernier est une dépendance de plus
    // (CT-08) pour un seul clic sur un bouton qui n'a ni focus à gérer ni
    // saisie à simuler.
    const retry = vi.fn()
    render(<ErrorNotice messages={getMessages('fr')} homeHref="/fr" onRetry={retry} />)

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('porte le repère principal, comme toute page du site', () => {
    // Le lien d'évitement du layout racine vise `#main` : une frontière d'erreur
    // qui ne le porterait pas ferait pointer ce lien dans le vide, au moment
    // précis où le visiteur en a le plus besoin.
    render(<ErrorNotice messages={getMessages('fr')} homeHref="/fr" onRetry={vi.fn()} />)

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('n’affiche aucun détail technique', () => {
    // `vision.md` §5.4 : messages neutres. Le composant ne reçoit même pas
    // l'erreur — c'est le contrat qui ferme la fuite, pas la vigilance de sa
    // mise en forme.
    render(<ErrorNotice messages={getMessages('fr')} homeHref="/fr" onRetry={vi.fn()} />)

    const text = screen.getByRole('main').textContent ?? ''
    for (const forbidden of ['Error', 'stack', 'digest', '/app/', 'undefined']) {
      expect(text).not.toContain(forbidden)
    }
  })
})
