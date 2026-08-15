/**
 * Accueil d'une locale (P3-02).
 *
 * Structurelle, comme toutes les pages de cette phase : elle prouve que la route
 * résout, porte les bonnes métadonnées et se laisse traverser au clavier. La page
 * d'accueil réelle est P4-03.
 */
import type { Metadata } from 'next'

import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import type { PageLocation } from '@/routing/paths'
import { pageMetadata } from '@/seo/metadata'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../language-options'
import { readLocale, type LocaleParams } from '../locale-param'

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
    <main id="main">
      <h1>{messages.site.name}</h1>
      <p>{messages.site.description}</p>
      <LanguageSwitcher current={locale} options={languageOptions(LOCATION, LOCALES)} />
    </main>
  )
}
