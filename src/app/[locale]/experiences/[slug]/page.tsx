/**
 * Détail d'une expérience (P3-02, P3-07). Mise en forme réelle : P4-04.
 *
 * Même structure que le détail d'un projet, et pour les mêmes raisons — le corps
 * MDX arrive en Phase 4, et `getContentLocales` gouverne le `hreflang` (R-07).
 */
import { notFound } from 'next/navigation'

import { contentRepository } from '@/content/repository'
import type { PageLocation } from '@/routing/paths'
import { DateRange } from '@/ui/date-range'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../../language-options'
import { readEntityParams, staticSlugParams, type EntityParams } from '../../locale-param'
import { entityMetadata } from '../../page-metadata'

export function generateStaticParams({ params }: { params: { locale: string } }) {
  return staticSlugParams(params, (locale) => contentRepository.getAllExperiences(locale))
}

function locationOf(slug: string): PageLocation {
  return { kind: 'entity', section: 'experiences', slug }
}

export async function generateMetadata({ params }: EntityParams) {
  const { locale, slug } = await readEntityParams(params)
  const experience = await contentRepository.getExperienceBySlug(locale, slug)

  if (experience === null) return {}

  return entityMetadata(contentRepository, {
    locale,
    section: 'experiences',
    slug,
    title: `${experience.role} — ${experience.company}`,
    // Une expérience n'a pas de `summary` : la première réalisation en tient
    // lieu, plutôt qu'une description fabriquée à partir des champs.
    description: experience.highlights[0] ?? experience.company,
  })
}

export default async function ExperiencePage({ params }: EntityParams) {
  const { locale, slug } = await readEntityParams(params)
  const experience = await contentRepository.getExperienceBySlug(locale, slug)

  if (experience === null) notFound()

  const available = await contentRepository.getContentLocales('experiences', slug)

  return (
    <main id="main">
      <h1>{experience.role}</h1>
      <p>{experience.company}</p>
      <LanguageSwitcher current={locale} options={languageOptions(locationOf(slug), available)} />
      <DateRange
        locale={locale}
        startedAt={experience.startedAt}
        endedAt={experience.endedAt}
        isOngoing={experience.isOngoing}
      />
      <ul>
        {experience.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>
    </main>
  )
}
