/**
 * P2-06 — normalisations et dérivations.
 *
 * Ce sont des fonctions pures : elles se testent sur des objets littéraux, sans
 * fichier ni dépôt.
 */
import { describe, expect, it } from 'vitest'

import { byMostRecent, bySkillOrder, sorted, withOngoing } from '@/content/normalise'
import type { SkillCategory } from '@/content/types'

const period = (slug: string, startedAt: string, endedAt?: string) =>
  endedAt === undefined ? { slug, startedAt } : { slug, startedAt, endedAt }

const skill = (name: string, category: SkillCategory, level: number) => ({
  name,
  category,
  level,
})

describe('dérivation « en cours »', () => {
  it('marque en cours ce qui n’a pas de date de fin', () => {
    expect(withOngoing(period('portfolio', '2026-08-11')).isOngoing).toBe(true)
  })

  it('ne marque pas en cours ce qui est terminé', () => {
    expect(withOngoing(period('augure', '2024-01-15', '2025-06-30')).isOngoing).toBe(false)
  })

  it('conserve les champs d’origine', () => {
    expect(withOngoing(period('augure', '2024-01-15', '2025-06-30'))).toMatchObject({
      slug: 'augure',
      startedAt: '2024-01-15',
      endedAt: '2025-06-30',
    })
  })
})

describe('tri du plus récent au plus ancien', () => {
  it('place un élément en cours devant tous les éléments terminés', () => {
    const entries = [period('ancien', '2020-01-01', '2021-01-01'), period('en-cours', '2019-01-01')]

    expect(sorted(entries, byMostRecent).map((entry) => entry.slug)).toEqual(['en-cours', 'ancien'])
  })

  it('classe les éléments terminés par date de fin décroissante', () => {
    const entries = [
      period('a', '2020-01-01', '2021-01-01'),
      period('c', '2018-01-01', '2023-01-01'),
      period('b', '2019-01-01', '2022-01-01'),
    ]

    expect(sorted(entries, byMostRecent).map((entry) => entry.slug)).toEqual(['c', 'b', 'a'])
  })

  it('départage deux éléments en cours par leur date de début', () => {
    const entries = [period('ancien', '2020-01-01'), period('recent', '2024-01-01')]

    expect(sorted(entries, byMostRecent).map((entry) => entry.slug)).toEqual(['recent', 'ancien'])
  })

  it('départage deux périodes identiques par le slug, pour un ordre stable', () => {
    const entries = [
      period('zebre', '2020-01-01', '2021-01-01'),
      period('alpha', '2020-01-01', '2021-01-01'),
    ]

    expect(sorted(entries, byMostRecent).map((entry) => entry.slug)).toEqual(['alpha', 'zebre'])
  })

  it('ne modifie pas la liste reçue', () => {
    const entries = [period('a', '2020-01-01'), period('b', '2024-01-01')]
    sorted(entries, byMostRecent)

    expect(entries.map((entry) => entry.slug)).toEqual(['a', 'b'])
  })
})

describe('tri des compétences', () => {
  it('range les catégories du plus concret au plus transversal', () => {
    const entries = [
      skill('Revue de code', 'practice', 5),
      skill('Docker', 'infrastructure', 5),
      skill('TypeScript', 'language', 5),
      skill('Vitest', 'tooling', 5),
      skill('Next.js', 'framework', 5),
    ]

    expect(sorted(entries, bySkillOrder('fr')).map((entry) => entry.category)).toEqual([
      'language',
      'framework',
      'tooling',
      'infrastructure',
      'practice',
    ])
  })

  it('classe une même catégorie par niveau décroissant', () => {
    const entries = [skill('Go', 'language', 2), skill('TypeScript', 'language', 5)]

    expect(sorted(entries, bySkillOrder('fr')).map((entry) => entry.name)).toEqual([
      'TypeScript',
      'Go',
    ])
  })

  it('classe à niveau égal par nom, en tenant compte des accents', () => {
    const entries = [
      skill('Zsh', 'tooling', 3),
      skill('Élasticsearch', 'tooling', 3),
      skill('Ansible', 'tooling', 3),
    ]

    // Une comparaison par code de caractère rejetterait « Élasticsearch »
    // après « Zsh ». Le collateur de la locale le range à sa place.
    expect(sorted(entries, bySkillOrder('fr')).map((entry) => entry.name)).toEqual([
      'Ansible',
      'Élasticsearch',
      'Zsh',
    ])
  })
})
