/**
 * Liste des projets (P3-02). Mise en forme réelle : P4-05.
 */
import { contentRepository } from '@/content/repository'
import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { entityPath, type PageLocation } from '@/routing/paths'
import type { Section } from '@/routing/sections'
import { EntityList } from '@/ui/entity-list'
import { JsonLd } from '@/ui/json-ld'
import { LanguageSwitcher } from '@/ui/language-switcher'
import page from '@/ui/page.module.css'

import { languageOptions } from '../language-options'
import { readLocale, type LocaleParams } from '../locale-param'
import { sectionMetadata } from '../page-metadata'
import { breadcrumbStructuredData } from '../structured-data'

/*
 * ⭐ La section est nommée **une fois** par route. Elle l'était trois fois —
 * emplacement, métadonnées, données structurées — sans que rien ne relie les
 * trois : coller la valeur d'une autre section sur l'une d'elles compilait et
 * passait tous les gates. C'est la classe d'erreur que `page-metadata.ts` dit
 * exister pour fermer, et le câblage de P4-09 l'avait rouverte. Relevé en revue.
 */
const SECTION = 'projects' satisfies Section
const LOCATION: PageLocation = { kind: 'section', section: SECTION }

export const generateMetadata = sectionMetadata(SECTION)

export default async function ProjectsPage({ params }: LocaleParams) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const projects = await contentRepository.getAllProjects(locale)

  return (
    <main id="main" className={page.page}>
      <JsonLd data={breadcrumbStructuredData(locale, SECTION)} />
      <h1 className={page.title}>{messages.sections[SECTION].name}</h1>
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
