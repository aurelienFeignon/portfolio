/**
 * Sélecteur de langue (P3-09) — `testing-strategy.md` §4.5.
 *
 * Testé par le rôle et le nom accessible : ce qui est vérifié ici est ce que
 * perçoit l'utilisateur, y compris au lecteur d'écran.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LanguageSwitcher, type LanguageOption } from '@/ui/language-switcher'

const BOTH: LanguageOption[] = [
  { locale: 'fr', href: '/fr/projects/augure', translated: true },
  { locale: 'en', href: '/en/projects/augure', translated: true },
]

const FRENCH_ONLY: LanguageOption[] = [
  { locale: 'fr', href: '/fr/projects/augure', translated: true },
  { locale: 'en', href: '/en/projects', translated: false },
]

describe('sélecteur de langue', () => {
  it('se présente comme un point de repère nommé', () => {
    render(<LanguageSwitcher current="fr" options={BOTH} />)
    expect(screen.getByRole('navigation', { name: 'Langue' })).toBeInTheDocument()
  })

  it('nomme sa propre étiquette dans la langue affichée', () => {
    render(<LanguageSwitcher current="en" options={BOTH} />)
    expect(screen.getByRole('navigation', { name: 'Language' })).toBeInTheDocument()
  })

  it('nomme chaque langue dans cette langue', () => {
    render(<LanguageSwitcher current="fr" options={BOTH} />)

    expect(screen.getByText('Français')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'English' })).toBeInTheDocument()
  })

  it('marque chaque libellé avec sa propre langue', () => {
    // Sans `lang`, une synthèse vocale française prononce « English » à la
    // française.
    render(<LanguageSwitcher current="fr" options={BOTH} />)

    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('lang', 'en')
    expect(screen.getByText('Français')).toHaveAttribute('lang', 'fr')
  })

  describe('langue courante', () => {
    it('n’est pas un lien vers la page où l’on est déjà', () => {
      render(<LanguageSwitcher current="fr" options={BOTH} />)
      expect(screen.queryByRole('link', { name: 'Français' })).not.toBeInTheDocument()
    })

    it('est signalée comme telle', () => {
      render(<LanguageSwitcher current="fr" options={BOTH} />)
      expect(screen.getByText('Français')).toHaveAttribute('aria-current', 'true')
    })
  })

  describe('vers une page traduite', () => {
    it('mène à la même entité dans l’autre langue', () => {
      render(<LanguageSwitcher current="fr" options={BOTH} />)

      expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute(
        'href',
        '/en/projects/augure',
      )
    })

    it('décrit la langue de la cible', () => {
      render(<LanguageSwitcher current="fr" options={BOTH} />)
      expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('hreflang', 'en')
    })

    it('n’affiche aucune mention d’indisponibilité', () => {
      render(<LanguageSwitcher current="fr" options={BOTH} />)
      expect(screen.queryByText(/n’est pas disponible|n’existe pas/)).not.toBeInTheDocument()
    })
  })

  describe('vers une page non traduite (R-07)', () => {
    it('propose quand même la langue, vers le repli', () => {
      // Retirer le lien priverait le visiteur du seul moyen de changer de langue
      // depuis cette page.
      render(<LanguageSwitcher current="fr" options={FRENCH_ONLY} />)

      expect(screen.getByRole('link', { name: /English/ })).toHaveAttribute('href', '/en/projects')
    })

    it('le dit, et l’associe au lien pour un lecteur d’écran', () => {
      render(<LanguageSwitcher current="fr" options={FRENCH_ONLY} />)

      const link = screen.getByRole('link', { name: /English/ })
      const noteId = link.getAttribute('aria-describedby')

      expect(noteId).not.toBeNull()
      expect(document.getElementById(noteId as string)).toHaveTextContent(
        'Cette page n’existe pas dans cette langue.',
      )
    })
  })
})
