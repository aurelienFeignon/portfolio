/**
 * Liste des projets (P3-02). Mise en forme réelle : P4-05.
 */
import { contentRepository } from '@/content/repository'
import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { entityPath, type PageLocation } from '@/routing/paths'
import { EntityList } from '@/ui/entity-list'
import { LanguageSwitcher } from '@/ui/language-switcher'
import page from '@/ui/page.module.css'

import { languageOptions } from '../language-options'
import { readLocale, type LocaleParams } from '../locale-param'
import { sectionMetadata } from '../page-metadata'

const LOCATION: PageLocation = { kind: 'section', section: 'projects' }

export const generateMetadata = sectionMetadata('projects')

export default async function ProjectsPage({ params }: LocaleParams) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const projects = await contentRepository.getAllProjects(locale)

  return (
    <main id="main" className={page.page}>
      <h1 className={page.title}>{messages.sections.projects.name}</h1>
      <EntityList
        locale={locale}
        items={projects.map((project) => ({
          href: entityPath(locale, 'projects', project.slug),
          label: project.title,
          note: project.summary,
        }))}
      />
      <LanguageSwitcher current={locale} options={languageOptions(LOCATION, LOCALES)} />
    </main>
  )
}
