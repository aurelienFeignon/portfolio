/**
 * Liste des compétences (P3-02). Mise en forme réelle, groupée par catégorie : P4-06.
 *
 * Les compétences n'ont **pas** de page de détail en v1 (`architecture.md` §4.1) :
 * elles ne figurent donc ni dans le sitemap comme entités, ni dans aucun
 * `hreflang` autre que celui de cette liste.
 */
import type { Metadata } from 'next'

import { contentRepository } from '@/content/repository'
import { getMessages } from '@/i18n/messages'
import type { PageLocation } from '@/routing/paths'
import { pageMetadata } from '@/seo/metadata'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../language-options'
import { readLocale } from '../locale-param'

const LOCATION: PageLocation = { kind: 'section', section: 'skills' }

type Params = { readonly params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await readLocale(params)
  const { name, description } = getMessages(locale).sections.skills

  return pageMetadata({ locale, location: LOCATION, title: name, description })
}

export default async function SkillsPage({ params }: Params) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const skills = await contentRepository.getAllSkills(locale)

  return (
    <main id="main">
      <h1>{messages.sections.skills.name}</h1>
      <LanguageSwitcher current={locale} options={languageOptions(LOCATION)} />
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
