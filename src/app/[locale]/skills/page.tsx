/**
 * Compétences, groupées par catégorie (P4-06).
 *
 * Les compétences n'ont **pas** de page de détail en v1 (`architecture.md` §4.1) :
 * elles ne figurent donc ni dans le sitemap comme entités, ni dans aucun
 * `hreflang` autre que celui de cette liste.
 *
 * Composition pure : le dépôt trie **et** regroupe (`getSkillsByCategory`),
 * `SkillList` met en forme. La route ne touche pas à `normalise.ts` — le dépôt
 * est la seule surface que les couches au-dessus connaissent, et une route qui
 * appelle une dérivation directement finirait par la refaire autrement.
 *
 * ⛔ **La projection vers `{ slug, name }` n'est pas une formalité de couches** —
 * le type de `SkillGroup` y suffirait, `Skill` lui étant structurellement
 * assignable. Elle retire physiquement `level` de ce que la vue reçoit, et c'est
 * la décision **D2** rendue structurelle : tant que l'auteur n'a pas relu ses
 * quarante niveaux, aucune vue ne peut les afficher, fût-ce par accident. Le
 * garde E2E dit la même chose du dehors ; celui-ci la rend impossible.
 */
import { contentRepository } from '@/content/repository'
import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import type { PageLocation } from '@/routing/paths'
import { LanguageSwitcher } from '@/ui/language-switcher'
import page from '@/ui/page.module.css'
import { SkillList } from '@/ui/skill-list'

import { languageOptions } from '../language-options'
import { readLocale, type LocaleParams } from '../locale-param'
import { sectionMetadata } from '../page-metadata'

const LOCATION: PageLocation = { kind: 'section', section: 'skills' }

export const generateMetadata = sectionMetadata('skills')

export default async function SkillsPage({ params }: LocaleParams) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const groups = await contentRepository.getSkillsByCategory(locale)

  return (
    <main id="main" className={page.page}>
      <h1 className={page.title}>{messages.sections.skills.name}</h1>
      <SkillList
        locale={locale}
        groups={groups.map(({ category, skills }) => ({
          category,
          skills: skills.map(({ slug, name }) => ({ slug, name })),
        }))}
      />
      <LanguageSwitcher current={locale} options={languageOptions(LOCATION, LOCALES)} />
    </main>
  )
}
