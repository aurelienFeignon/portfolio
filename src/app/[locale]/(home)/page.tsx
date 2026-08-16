/**
 * Accueil d'une locale (P4-03).
 *
 * **Ce qu'elle dit, et ce qu'elle ne dit pas.** Elle porte l'identité, une
 * phrase de situation, et l'accès aux trois sections. Elle ne porte **aucun
 * texte de présentation écrit ici** : une prose qui parlerait du parcours
 * d'Aurélien serait du contenu éditorial, dont la place est `content/` et
 * l'auteur son propriétaire (CF-09, ADR-0001). En inventer aurait produit des
 * affirmations sur quelqu'un, dans un dictionnaire d'interface, sans que rien ne
 * les distingue d'un libellé de bouton.
 *
 * La phrase affichée est donc `site.description`, qui existe, est traduite, et
 * sert déjà de description de page. Un vrai texte d'accroche est identifié comme
 * une **décision éditoriale** dans `phase-4-log.md` §8.
 *
 * Le sélecteur de langue reste rendu par la page : ses options dépendent de
 * l'endroit affiché, qu'un layout ne connaît pas.
 */
import type { Metadata } from 'next'

import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import type { PageLocation } from '@/routing/paths'
import { pageMetadata } from '@/seo/metadata'
import { LanguageSwitcher } from '@/ui/language-switcher'
import { SectionGuide } from '@/ui/section-guide'

import { languageOptions } from '../language-options'
import { readLocale, type LocaleParams } from '../locale-param'
import { sectionLinks } from '../section-links'

import styles from './page.module.css'

const LOCATION: PageLocation = { kind: 'home' }

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await readLocale(params)
  const messages = getMessages(locale)

  return pageMetadata({
    locale,
    location: LOCATION,
    title: messages.site.name,
    description: messages.site.description,
    // L'accueil existe dans toutes les langues : on le dit, plutôt que de
    // compter sur un défaut qui serait faux pour toute page de détail (R-07).
    availableLocales: LOCALES,
  })
}

export default async function HomePage({ params }: LocaleParams) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)

  return (
    <main id="main" className={styles.main}>
      <h1 className={styles.name}>{messages.site.name}</h1>
      <p className={styles.lede}>{messages.site.description}</p>

      <SectionGuide locale={locale} links={sectionLinks(locale)} />

      <LanguageSwitcher current={locale} options={languageOptions(LOCATION, LOCALES)} />
    </main>
  )
}
