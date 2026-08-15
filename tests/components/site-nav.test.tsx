/**
 * Navigation principale (P3-02) — `testing-strategy.md` §4.5.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SiteNav, type SectionLink } from '@/ui/site-nav'

const LINKS: SectionLink[] = [
  { section: 'experiences', href: '/fr/experiences' },
  { section: 'projects', href: '/fr/projects' },
  { section: 'skills', href: '/fr/skills' },
]

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
