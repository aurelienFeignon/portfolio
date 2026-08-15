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
 * **Il appelle `entityMetadata`, le code que les pages appellent.** La première
 * rédaction en réécrivait la composition, avec un commentaire disant « reproduit
 * ce que fait `projects/[slug]/page.tsx` » — donc un test qui serait resté vert
 * si la page avait cessé de passer `getContentLocales`, c'est-à-dire au moment
 * précis où R-07 se casse. Constaté en revue.
 *
 * L'E2E, lui, constate la même chose au niveau HTTP contre l'image de
 * production. Les deux sont nécessaires : celui-ci dit *pourquoi* c'est vrai,
 * l'autre dit *que* c'est vrai sur l'artefact livré.
 */
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { entityMetadata } from '@/app/[locale]/page-metadata'
import { createContentLoader } from '@/content/loader'
import { createContentRepository } from '@/content/repository'
import { createContentSource } from '@/content/source'
import type { Locale } from '@/i18n/locales'
import { entityPath } from '@/routing/paths'

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'content', 'valid')
const ORIGIN = 'https://exemple.test'

const repository = () => createContentRepository(createContentLoader(createContentSource(FIXTURES)))

// `entityMetadata` passe par `pageMetadata`, qui lit l'origine dans
// l'environnement — comme en production, où elle est gravée au build.
const previousSiteUrl = process.env['SITE_URL']
beforeAll(() => {
  process.env['SITE_URL'] = ORIGIN
})
afterAll(() => {
  if (previousSiteUrl === undefined) delete process.env['SITE_URL']
  else process.env['SITE_URL'] = previousSiteUrl
})

/** Exactement ce que fait `app/[locale]/projects/[slug]/page.tsx`, sans le rendu. */
async function resolveProject(locale: Locale, slug: string) {
  const repo = repository()
  const project = await repo.getProjectBySlug(locale, slug)
  if (project === null) return null

  return {
    project,
    metadata: await entityMetadata(repo, {
      locale,
      section: 'projects',
      slug,
      title: project.title,
      description: project.summary,
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

    expect(french?.metadata.alternates?.canonical).toBe(`${ORIGIN}/fr/projects/augure`)
    expect(english?.metadata.alternates?.canonical).toBe(`${ORIGIN}/en/projects/augure`)
  })

  it('se référencent mutuellement en `hreflang`', async () => {
    const french = await resolveProject('fr', 'augure')

    expect(french?.metadata.alternates?.languages).toEqual({
      fr: `${ORIGIN}/fr/projects/augure`,
      en: `${ORIGIN}/en/projects/augure`,
      'x-default': `${ORIGIN}/fr/projects/augure`,
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
      fr: `${ORIGIN}/fr/projects/portfolio`,
      'x-default': `${ORIGIN}/fr/projects/portfolio`,
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
