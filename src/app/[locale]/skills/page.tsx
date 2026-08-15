/**
 * Liste des compétences (P3-02). Mise en forme réelle, groupée par catégorie : P4-06.
 *
 * Les compétences n'ont **pas** de page de détail en v1 (`architecture.md` §4.1) :
 * elles ne figurent donc ni dans le sitemap comme entités, ni dans aucun
 * `hreflang` autre que celui de cette liste.
 */
import { contentRepository } from '@/content/repository'
import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import type { PageLocation } from '@/routing/paths'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../language-options'
import { readLocale, type LocaleParams } from '../locale-param'
import { sectionMetadata } from '../page-metadata'

const LOCATION: PageLocation = { kind: 'section', section: 'skills' }

export const generateMetadata = sectionMetadata('skills')

export default async function SkillsPage({ params }: LocaleParams) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const skills = await contentRepository.getAllSkills(locale)

  return (
    <main id="main">
      <h1>{messages.sections.skills.name}</h1>
      <LanguageSwitcher current={locale} options={languageOptions(LOCATION, LOCALES)} />
      {skills.length === 0 ? (
        <p>{messages.empty}</p>
      ) : (
        <ul>
          {skills.map((skill) => (
            <li key={skill.slug}>{skill.name}</li>
          ))}
        </ul>
      )}
    </main>
  )
}
