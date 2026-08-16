/**
 * P2-05 — l'API de lecture du contenu.
 *
 * Le dépôt testé est construit sur les fixtures, jamais sur `content/`.
 */
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createContentLoader } from '@/content/loader'
import { createContentRepository } from '@/content/repository'
import { createContentSource } from '@/content/source'

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'content', 'valid')

const repository = () => createContentRepository(createContentLoader(createContentSource(FIXTURES)))

describe('lecture par type', () => {
  it('rend les projets d’une locale, du plus récent au plus ancien', async () => {
    const projects = await repository().getAllProjects('fr')

    // `portfolio` est en cours, `augure` est terminé : l'ordre vient de P2-06.
    expect(projects.map((project) => project.slug)).toEqual(['portfolio', 'augure'])
  })

  it('rend les expériences d’une locale', async () => {
    const experiences = await repository().getAllExperiences('fr')

    expect(experiences.map((experience) => experience.company)).toEqual(['Evea'])
  })

  it('rend les compétences d’une locale', async () => {
    const skills = await repository().getAllSkills('fr')

    // Ordre de P2-06 : `language` avant `infrastructure`.
    expect(skills.map((skill) => skill.slug)).toEqual(['typescript', 'postgresql'])
  })

  it('rend une liste vide là où la locale n’a pas ce type de contenu', async () => {
    await expect(repository().getAllExperiences('en')).resolves.toEqual([])
  })

  it('ne laisse pas fuir le contenu d’une locale vers l’autre', async () => {
    const french = await repository().getProjectBySlug('fr', 'augure')
    const english = await repository().getProjectBySlug('en', 'augure')

    expect(french?.summary).toContain('gestion documentaire')
    expect(english?.summary).toContain('document management')
  })
})

describe('lecture par slug', () => {
  it('trouve un projet par son slug', async () => {
    const project = await repository().getProjectBySlug('fr', 'augure')

    expect(project?.title).toBe('Augure')
  })

  it('trouve une expérience et une compétence par leur slug', async () => {
    expect((await repository().getExperienceBySlug('fr', 'evea'))?.role).toBe(
      'Développeur Full-Stack',
    )
    expect((await repository().getSkillBySlug('fr', 'typescript'))?.name).toBe('TypeScript')
  })

  it.each([
    ['un projet', 'getProjectBySlug'],
    ['une expérience', 'getExperienceBySlug'],
    ['une compétence', 'getSkillBySlug'],
  ] as const)('rend `null` pour %s inconnue plutôt que de lever', async (_label, method) => {
    await expect(repository()[method]('fr', 'inexistant')).resolves.toBeNull()
  })

  it('rend `null` quand l’entité n’existe que dans l’autre locale', async () => {
    await expect(repository().getProjectBySlug('en', 'portfolio')).resolves.toBeNull()
  })
})

describe('locales d’une entité', () => {
  it('rend les deux locales quand l’entité est traduite', async () => {
    await expect(repository().getContentLocales('projects', 'augure')).resolves.toEqual([
      'fr',
      'en',
    ])
  })

  it('ne rend que la locale existante quand la traduction manque', async () => {
    await expect(repository().getContentLocales('projects', 'portfolio')).resolves.toEqual(['fr'])
  })

  it('rend une liste vide pour une entité inconnue', async () => {
    await expect(repository().getContentLocales('projects', 'inexistant')).resolves.toEqual([])
  })

  it('rend les locales dans un ordre stable', async () => {
    const first = await repository().getContentLocales('skills', 'typescript')
    const second = await repository().getContentLocales('skills', 'typescript')

    expect(first).toEqual(['fr', 'en'])
    expect(second).toEqual(first)
  })
})

describe('dérivations exposées par le dépôt', () => {
  it('marque en cours un projet sans date de fin', async () => {
    const ongoing = await repository().getProjectBySlug('fr', 'portfolio')
    const finished = await repository().getProjectBySlug('fr', 'augure')

    expect(ongoing?.isOngoing).toBe(true)
    expect(finished?.isOngoing).toBe(false)
  })

  it('marque en cours une expérience sans date de fin', async () => {
    const experience = await repository().getExperienceBySlug('fr', 'evea')

    expect(experience?.isOngoing).toBe(true)
  })

  it('ne rend que les projets mis en avant', async () => {
    const featured = await repository().getFeaturedProjects('fr')

    expect(featured.map((project) => project.slug)).toEqual(['augure'])
  })

  it('ne rend que les compétences mises en avant', async () => {
    const featured = await repository().getFeaturedSkills('fr')

    expect(featured.map((skill) => skill.slug)).toEqual(['typescript'])
  })

  it('rend les compétences groupées par catégorie, sans catégorie vide', async () => {
    // Le dépôt est la **seule** surface que connaissent les couches au-dessus :
    // le groupement passe par lui, et non par un appel direct à `normalise.ts`
    // depuis une route. Sans cette méthode, la clause d'exclusivité écrite en
    // tête de `repository.ts` aurait été fausse dès le premier contournement.
    const groups = await repository().getSkillsByCategory('fr')

    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      expect(group.skills.length).toBeGreaterThan(0)
      for (const skill of group.skills) {
        expect(skill.category).toBe(group.category)
      }
    }
  })
})
