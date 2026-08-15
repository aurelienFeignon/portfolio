/**
 * **Critère de sortie de la Phase 3** : `/fr/projects/augure` et
 * `/en/projects/augure` résolvent chacune leur contenu, indépendamment, sans
 * fuite de l'une vers l'autre.
 *
 * Ce test assemble la chaîne complète telle que les pages l'assemblent — lecture
 * du contenu, construction d'URL, métadonnées — sur des **fixtures**, jamais sur
 * `content/` (P2-09). C'est ce qui le rend indépendant de ce que P2-11 écrira :
 * le jour où le portfolio est traduit en anglais, le cas « entité non traduite »
 * disparaîtrait du contenu réel, et un test adossé à lui cesserait de vérifier
 * quoi que ce soit.
 *
 * L'E2E, lui, constate la même chose au niveau HTTP contre l'image de production.
 * Les deux sont nécessaires : celui-ci dit *pourquoi* c'est vrai, l'autre dit
 * *que* c'est vrai sur l'artefact livré.
 */
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createContentLoader } from '@/content/loader'
import { createContentRepository } from '@/content/repository'
import { createContentSource } from '@/content/source'
import { entityPath } from '@/routing/paths'
import { buildPageMetadata } from '@/seo/metadata'

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'content', 'valid')
const SITE = new URL('https://exemple.test')

const repository = () => createContentRepository(createContentLoader(createContentSource(FIXTURES)))

/** Reproduit ce que fait `app/[locale]/projects/[slug]/page.tsx`. */
async function resolveProject(locale: 'fr' | 'en', slug: string) {
  const repo = repository()
  const project = await repo.getProjectBySlug(locale, slug)
  if (project === null) return null

  return {
    project,
    metadata: buildPageMetadata(SITE, {
      locale,
      location: { kind: 'entity', section: 'projects', slug },
      title: project.title,
      description: project.summary,
      availableLocales: await repo.getContentLocales('projects', slug),
    }),
  }
}

describe('une entité traduite dans les deux langues', () => {
  it('résout un contenu différent de chaque côté', async () => {
    const french = await resolveProject('fr', 'augure')
    const english = await resolveProject('en', 'augure')

    expect(french?.project.summary).toBe(
      'Une plateforme de gestion documentaire, écrite en TypeScript de bout en bout.',
    )
    expect(english?.project.summary).toBe(
      'A document management platform, written in TypeScript from end to end.',
    )
    expect(french?.project.summary).not.toBe(english?.project.summary)
  })

  it('donne deux URL distinctes, chacune canonique d’elle-même', async () => {
    const french = await resolveProject('fr', 'augure')
    const english = await resolveProject('en', 'augure')

    expect(french?.metadata.alternates?.canonical).toBe('https://exemple.test/fr/projects/augure')
    expect(english?.metadata.alternates?.canonical).toBe('https://exemple.test/en/projects/augure')
  })

  it('se référencent mutuellement en `hreflang`', async () => {
    const french = await resolveProject('fr', 'augure')

    expect(french?.metadata.alternates?.languages).toEqual({
      fr: 'https://exemple.test/fr/projects/augure',
      en: 'https://exemple.test/en/projects/augure',
      'x-default': 'https://exemple.test/fr/projects/augure',
    })
  })
})

describe('une entité absente d’une locale (R-07)', () => {
  it('n’existe pas dans cette locale, et ne fait pas repli sur l’autre', async () => {
    // Le repli silencieux serait la panne à éviter : une page anglaise servant
    // du français, indexée comme anglaise.
    await expect(resolveProject('en', 'portfolio')).resolves.toBeNull()
    await expect(resolveProject('fr', 'portfolio')).resolves.not.toBeNull()
  })

  it('n’annonce aucun `hreflang` vers la page inexistante', async () => {
    const french = await resolveProject('fr', 'portfolio')

    expect(french?.metadata.alternates?.languages).toEqual({
      fr: 'https://exemple.test/fr/projects/portfolio',
      'x-default': 'https://exemple.test/fr/projects/portfolio',
    })
  })

  it('a bien un chemin anglais **constructible**, mais aucune page derrière', async () => {
    // La distinction est celle que R-07 vise : savoir fabriquer l'URL ne veut pas
    // dire qu'on a le droit de l'annoncer.
    expect(entityPath('en', 'projects', 'portfolio')).toBe('/en/projects/portfolio')
    await expect(repository().getProjectBySlug('en', 'portfolio')).resolves.toBeNull()
  })
})

describe('un slug inconnu', () => {
  it('ne résout dans aucune locale', async () => {
    await expect(resolveProject('fr', 'inexistant')).resolves.toBeNull()
    await expect(resolveProject('en', 'inexistant')).resolves.toBeNull()
  })
})
