/**
 * Liste des expériences (P4-04).
 *
 * Composition pure : le dépôt trie (P2-06), `ExperienceList` met en forme, et
 * cette route ne fait qu'aplatir l'entité en ce que la vue peut consommer —
 * `src/ui` n'ayant pas le droit de connaître `src/content` (`architecture.md`
 * §1.2). Aucun tri, aucun filtre ici : une vue qui trie elle-même est un défaut.
 */
import { contentRepository } from '@/content/repository'
import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { entityPath, type PageLocation } from '@/routing/paths'
import { ExperienceList } from '@/ui/experience-list'
import { JsonLd } from '@/ui/json-ld'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../language-options'
import { readLocale, type LocaleParams } from '../locale-param'
import { sectionMetadata } from '../page-metadata'
import { sectionStructuredData } from '../structured-data'

import styles from '@/ui/page.module.css'

const LOCATION: PageLocation = { kind: 'section', section: 'experiences' }

export const generateMetadata = sectionMetadata('experiences')

export default async function ExperiencesPage({ params }: LocaleParams) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const experiences = await contentRepository.getAllExperiences(locale)

  return (
    <main id="main" className={styles.page}>
      <JsonLd data={sectionStructuredData(locale, 'experiences')} />
      <h1 className={styles.title}>{messages.sections.experiences.name}</h1>
      <ExperienceList
        locale={locale}
        items={experiences.map((experience) => ({
          href: entityPath(locale, 'experiences', experience.slug),
          role: experience.role,
          company: experience.company,
          location: experience.location,
          startedAt: experience.startedAt,
          endedAt: experience.endedAt,
        }))}
      />
      <LanguageSwitcher current={locale} options={languageOptions(LOCATION, LOCALES)} />
    </main>
  )
}
