/**
 * Liste des expériences (P3-02). Mise en forme réelle : P4-04.
 */
import type { Metadata } from 'next'

import { contentRepository } from '@/content/repository'
import { getMessages } from '@/i18n/messages'
import { entityPath, type PageLocation } from '@/routing/paths'
import { pageMetadata } from '@/seo/metadata'
import { EntityList } from '@/ui/entity-list'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../language-options'
import { readLocale } from '../locale-param'

const LOCATION: PageLocation = { kind: 'section', section: 'experiences' }

type Params = { readonly params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await readLocale(params)
  const { name, description } = getMessages(locale).sections.experiences

  return pageMetadata({ locale, location: LOCATION, title: name, description })
}

export default async function ExperiencesPage({ params }: Params) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const experiences = await contentRepository.getAllExperiences(locale)

  return (
    <main id="main">
      <h1>{messages.sections.experiences.name}</h1>
      <LanguageSwitcher current={locale} options={languageOptions(LOCATION)} />
      <EntityList
        locale={locale}
        items={experiences.map((experience) => ({
          href: entityPath(locale, 'experiences', experience.slug),
          label: experience.company,
          note: experience.role,
        }))}
      />
    </main>
  )
}
