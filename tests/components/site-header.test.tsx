/**
 * En-tête du site (P4-02) — `testing-strategy.md` §4.5.
 *
 * Les assertions portent sur les **rôles** et les **noms accessibles**, jamais
 * sur les classes CSS : l'ADR-0010 §Conséquences le demande explicitement, une
 * classe mal orthographiée rendant `undefined` sans erreur. Un test qui assère
 * sur un nom de classe échouerait pour la mauvaise raison.
 *
 * Ce fichier ne rejoue pas ce que `site-nav.test.tsx` prouve déjà un niveau plus
 * bas (libellés traduits, marquage d'un lien de section). Ce que l'en-tête ajoute
 * et qu'il est seul à faire : porter la marque, et **traduire** `CurrentPlace` en
 * la prop de la navigation — `'home'` n'étant pas une section, il ne lui est pas
 * transmis.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeSectionLinks } from '../fixtures/builders/navigation'
import { SiteHeader } from '@/ui/site-header'

const LINKS = makeSectionLinks()

function renderHeader(props: Partial<Parameters<typeof SiteHeader>[0]> = {}) {
  return render(
    <SiteHeader locale="fr" homeHref="/fr" links={LINKS} current="projects" {...props} />,
  )
}

describe('en-tête du site', () => {
  it('est le point de repère de bannière, et contient la navigation', () => {
    renderHeader()

    const banner = screen.getByRole('banner')
    expect(banner).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBe(
      banner.querySelector('nav'),
    )
  })

  it('porte la marque, qui ramène à l’accueil de la locale', () => {
    renderHeader()

    // Le texte visible EST le nom accessible : pas d'`aria-label` qui le
    // remplacerait, ce que WCAG 2.5.3 (« label in name ») interdit.
    expect(screen.getByRole('link', { name: 'Aurélien Feignon' })).toHaveAttribute('href', '/fr')
  })

  it('suit la locale sans traduire la marque, qui est un nom propre', () => {
    render(<SiteHeader locale="en" homeHref="/en" links={makeSectionLinks('en')} current="home" />)

    expect(screen.getByRole('link', { name: 'Aurélien Feignon' })).toHaveAttribute('href', '/en')
  })

  it('ne transmet pas « home » à la navigation : c’est la marque qui est marquée', () => {
    // L'accueil n'est aucune des trois sections. Sans cette traduction, ou bien
    // aucun lien de l'en-tête ne dirait au visiteur où il se trouve, ou bien une
    // section serait marquée à tort.
    renderHeader({ current: 'home' })

    expect(screen.getByRole('link', { name: 'Aurélien Feignon' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    for (const section of ['Expériences', 'Projets', 'Compétences']) {
      expect(screen.getByRole('link', { name: section })).not.toHaveAttribute('aria-current')
    }
  })

  it('transmet une section à la navigation, sans marquer la marque', () => {
    renderHeader({ current: 'skills' })

    expect(screen.getByRole('link', { name: 'Compétences' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('link', { name: 'Aurélien Feignon' })).not.toHaveAttribute(
      'aria-current',
    )
  })
})
