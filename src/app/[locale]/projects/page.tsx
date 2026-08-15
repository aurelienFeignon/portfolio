/**
 * Liste des projets (P3-02). Mise en forme réelle : P4-05.
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

const LOCATION: PageLocation = { kind: 'section', section: 'projects' }

type Params = { readonly params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await readLocale(params)
  const { name, description } = getMessages(locale).sections.projects

  return pageMetadata({ locale, location: LOCATION, title: name, description })
}

export default async function ProjectsPage({ params }: Params) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const projects = await contentRepository.getAllProjects(locale)

  return (
    <main id="main">
      <h1>{messages.sections.projects.name}</h1>
      <LanguageSwitcher current={locale} options={languageOptions(LOCATION)} />
      <EntityList
        locale={locale}
        items={projects.map((project) => ({
          href: entityPath(locale, 'projects', project.slug),
          label: project.title,
          note: project.summary,
        }))}
      />
    </main>
  )
}
