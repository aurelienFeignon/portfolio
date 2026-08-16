/**
 * Accueil d'une locale (P4-03).
 *
 * **Ce qu'elle dit, et d'où ça vient.** Elle porte l'identité, une accroche, et
 * l'accès aux trois sections.
 *
 * ⭐⭐ **L'accroche est le profil du CV, mot pour mot** — décision **D7**,
 * tranchée le 2026-08-16. P4-03 avait refusé d'en écrire une, et c'était juste :
 * une prose sur le parcours d'Aurélien rédigée par une session aurait été une
 * affirmation sur quelqu'un que personne ne tient de lui. La page affichait donc
 * `site.description`, une méta-description — exact, et insuffisant. Ce texte-ci
 * ne vient pas d'une session : il est déjà publié par le PDF que ce site
 * distribue depuis la Phase 2.
 *
 * `site.description` reste ce qu'elle est — la description **de page**, lue par
 * `generateMetadata` et par l'image de partage. Les deux ne disent plus la même
 * chose, et c'est précisément ce que D7 corrigeait.
 *
 * Le sélecteur de langue reste rendu par la page : ses options dépendent de
 * l'endroit affiché, qu'un layout ne connaît pas.
 */
import type { Metadata } from 'next'

import { contentRepository } from '@/content/repository'
import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import type { PageLocation } from '@/routing/paths'
import { pageMetadata } from '@/seo/metadata'
import { JsonLd } from '@/ui/json-ld'
import { LanguageSwitcher } from '@/ui/language-switcher'
import { SectionGuide } from '@/ui/section-guide'

import { languageOptions } from '../language-options'
import { readLocale, type LocaleParams } from '../locale-param'
import { sectionLinks } from '../section-links'
import { homeStructuredData } from '../structured-data'

import lead from '@/ui/lead.module.css'
import page from '@/ui/page.module.css'

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
    site: messages.site,
  })
}

export default async function HomePage({ params }: LocaleParams) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)
  const structuredData = await homeStructuredData(contentRepository, locale)

  return (
    <main id="main" className={page.page}>
      {/* `Person` et `WebSite` (P4-09). Dans le `main` et non dans le layout :
          seule la page sait qu'elle est l'accueil, et c'est le seul endroit qui
          les porte. */}
      <JsonLd data={structuredData} />
      <h1 className={page.title}>{messages.site.name}</h1>
      <p className={lead.lead}>{messages.site.intro}</p>

      <SectionGuide locale={locale} links={sectionLinks(locale)} />

      <LanguageSwitcher current={locale} options={languageOptions(LOCATION, LOCALES)} />
    </main>
  )
}
