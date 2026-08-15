/**
 * Accueil d'une locale (P3-02).
 *
 * Structurelle, comme toutes les pages de cette phase : elle prouve que la route
 * résout, porte les bonnes métadonnées et se laisse traverser au clavier. La page
 * d'accueil réelle est P4-03.
 */
import type { Metadata } from 'next'

import { getMessages } from '@/i18n/messages'
import type { PageLocation } from '@/routing/paths'
import { pageMetadata } from '@/seo/metadata'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from './language-options'
import { readLocale } from './locale-param'

const LOCATION: PageLocation = { kind: 'home' }

type Params = { readonly params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await readLocale(params)
  const messages = getMessages(locale)

  return pageMetadata({
    locale,
    location: LOCATION,
    title: messages.site.name,
    description: messages.site.description,
  })
}

export default async function HomePage({ params }: Params) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)

  return (
    <main id="main">
      <h1>{messages.site.name}</h1>
      <p>{messages.site.description}</p>
      <LanguageSwitcher current={locale} options={languageOptions(LOCATION)} />
    </main>
  )
}
