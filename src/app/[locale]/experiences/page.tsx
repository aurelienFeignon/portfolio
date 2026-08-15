/**
 * Liste des expériences (P3-02). Mise en forme réelle : P4-04.
 */
import { contentRepository } from '@/content/repository'
import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { entityPath, type PageLocation } from '@/routing/paths'
import { EntityList } from '@/ui/entity-list'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../language-options'
import { readLocale, type LocaleParams } from '../locale-param'
import { sectionMetadata } from '../page-metadata'

const LOCATION: PageLocation = { kind: 'section', section: 'experiences' }

export const generateMetadata = sectionMetadata('experiences')

export default async function ExperiencesPage({ params }: LocaleParams) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const experiences = await contentRepository.getAllExperiences(locale)

  return (
    <main id="main">
      <h1>{messages.sections.experiences.name}</h1>
      <LanguageSwitcher current={locale} options={languageOptions(LOCATION, LOCALES)} />
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
