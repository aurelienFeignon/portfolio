/**
 * Navigation principale (P3-02) — `testing-strategy.md` §4.5.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeSectionLinks } from '../fixtures/builders/navigation'
import { SiteNav } from '@/ui/site-nav'

const LINKS = makeSectionLinks()

describe('navigation principale', () => {
  it('est un point de repère nommé', () => {
    render(<SiteNav locale="fr" links={LINKS} />)
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
  })

  it('porte un lien par section, avec sa cible', () => {
    render(<SiteNav locale="fr" links={LINKS} />)

    expect(screen.getByRole('link', { name: 'Expériences' })).toHaveAttribute(
      'href',
      '/fr/experiences',
    )
    expect(screen.getByRole('link', { name: 'Projets' })).toHaveAttribute('href', '/fr/projects')
    expect(screen.getByRole('link', { name: 'Compétences' })).toHaveAttribute('href', '/fr/skills')
  })

  it('traduit ses libellés, mais pas les cibles qu’on lui donne', () => {
    render(
      <SiteNav
        locale="en"
        links={[
          { section: 'experiences', href: '/en/experiences' },
          { section: 'projects', href: '/en/projects' },
          { section: 'skills', href: '/en/skills' },
        ]}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/en/projects')
  })

  it('n’affiche que les sections qu’on lui donne', () => {
    render(<SiteNav locale="fr" links={[{ section: 'projects', href: '/fr/projects' }]} />)

    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})

describe('section active', () => {
  it('marque le lien de la section courante, et lui seul', () => {
    render(<SiteNav locale="fr" links={LINKS} current="projects" />)

    // `true` et non `page` : la même navigation sert la liste d'une section ET
    // les pages de détail qu'elle contient. Sur `/fr/projects/portfolio`, un
    // `aria-current="page"` annoncerait « page courante » sur un lien qui mène
    // ailleurs — ce que la valeur `page` affirme précisément, et à tort.
    expect(screen.getByRole('link', { name: 'Projets' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'Expériences' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Compétences' })).not.toHaveAttribute('aria-current')
  })

  it('ne marque rien quand aucune section n’est courante', () => {
    // L'accueil est dans ce cas : il est atteignable par la marque, pas par un
    // lien de section. Un `aria-current` posé par défaut y désignerait une page
    // où le visiteur n'est pas.
    render(<SiteNav locale="fr" links={LINKS} />)

    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current')
    }
  })
})
