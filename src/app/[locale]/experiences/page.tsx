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
import type { Section } from '@/routing/sections'
import { ExperienceList } from '@/ui/experience-list'
import { JsonLd } from '@/ui/json-ld'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../language-options'
import { readLocale, type LocaleParams } from '../locale-param'
import { sectionMetadata } from '../page-metadata'
import { breadcrumbStructuredData } from '../structured-data'

import styles from '@/ui/page.module.css'

/*
 * ⭐ La section est nommée **une fois** par route. Elle l'était trois fois —
 * emplacement, métadonnées, données structurées — sans que rien ne relie les
 * trois : coller la valeur d'une autre section sur l'une d'elles compilait et
 * passait tous les gates. C'est la classe d'erreur que `page-metadata.ts` dit
 * exister pour fermer, et le câblage de P4-09 l'avait rouverte. Relevé en revue.
 */
const SECTION = 'experiences' satisfies Section
const LOCATION: PageLocation = { kind: 'section', section: SECTION }

export const generateMetadata = sectionMetadata(SECTION)

export default async function ExperiencesPage({ params }: LocaleParams) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const experiences = await contentRepository.getAllExperiences(locale)

  return (
    <main id="main" className={styles.page}>
      <JsonLd data={breadcrumbStructuredData(locale, SECTION)} />
      <h1 className={styles.title}>{messages.sections[SECTION].name}</h1>
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
