/**
 * Détail d'une expérience (P3-02, P3-07). Mise en forme réelle : P4-04.
 *
 * Même structure que le détail d'un projet, et pour les mêmes raisons — le corps
 * MDX arrive en Phase 4, et `getContentLocales` gouverne le `hreflang` (R-07).
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { contentRepository } from '@/content/repository'
import { isLocale } from '@/i18n/locales'
import type { PageLocation } from '@/routing/paths'
import { pageMetadata } from '@/seo/metadata'
import { DateRange } from '@/ui/date-range'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../../language-options'
import { readLocale } from '../../locale-param'

export const dynamicParams = false

/** Signature imposée par le validateur de routes de Next : voir le détail projet. */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return []
  const experiences = await contentRepository.getAllExperiences(params.locale)
  return experiences.map((experience) => ({ slug: experience.slug }))
}

type Params = { readonly params: Promise<{ locale: string; slug: string }> }

function locationOf(slug: string): PageLocation {
  return { kind: 'entity', section: 'experiences', slug }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await readLocale(params)
  const { slug } = await params
  const experience = await contentRepository.getExperienceBySlug(locale, slug)

  if (experience === null) return {}

  return pageMetadata({
    locale,
    location: locationOf(slug),
    title: `${experience.role} — ${experience.company}`,
    // Une expérience n'a pas de `summary` : la première réalisation en tient
    // lieu, plutôt qu'une description fabriquée à partir des champs.
    description: experience.highlights[0] ?? experience.company,
    availableLocales: await contentRepository.getContentLocales('experiences', slug),
  })
}

export default async function ExperiencePage({ params }: Params) {
  const locale = await readLocale(params)
  const { slug } = await params
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
