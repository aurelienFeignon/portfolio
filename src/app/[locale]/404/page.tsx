/**
 * Page introuvable, **localisée** (P4-07).
 *
 * ⚠️ **C'est une vraie route prérendue, et c'est le seul moyen d'y arriver.**
 * Trois sondes l'ont établi (`phase-4-log.md` §13.1) : tant que le layout racine
 * vit sous `[locale]`, la 404 interne de Next est servie **hors de tout layout**
 * — sans `<html lang>`, ce qui est une violation WCAG 3.1.1 —, elle ne reçoit
 * aucun paramètre, et lui faire rendre sa propre enveloppe produit deux `<html>`.
 * `src/app/[locale]/not-found.tsx` n'est jamais atteint non plus :
 * `dynamicParams = false` fait du slug inconnu un échec de **routage**, pas un
 * `notFound()`.
 *
 * Le proxy réécrit donc toute URL inconnue vers cette page, dans la langue
 * déduite de l'URL ou négociée. Elle est prérendue comme les autres, porte le
 * chrome du site, et sa langue est réelle.
 *
 * ⛔ Elle est **`noindex`** : c'est une page servie en 404, elle n'a rien à faire
 * dans un index. Et elle est exclue du sitemap — le gate de rendu statique porte
 * l'exception, avec sa raison.
 *
 * ⭐ Les trois issues sont rendues par **`SectionGuide`**, le composant de
 * l'accueil. La première version projetait `sectionLinks` dans un `EntityList`
 * en allant chercher elle-même `sections[x].name` et `sections[x].description` :
 * c'était réécrire ce que ce composant fait déjà, et donner un **troisième**
 * lecteur à des clés dont la double vie est déjà une décision ouverte (D7).
 * Relevé en revue.
 */
import type { Metadata } from 'next'

import { getMessages } from '@/i18n/messages'
import { homePath } from '@/routing/paths'
import lead from '@/ui/lead.module.css'
import page from '@/ui/page.module.css'
import { SectionGuide } from '@/ui/section-guide'

import { readLocale, type LocaleParams } from '../locale-param'
import { sectionLinks } from '../section-links'
import accentLink from '@/ui/accent-link.module.css'

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const messages = getMessages(await readLocale(params))

  return {
    title: messages.notFound.title,
    // Aucun `canonical`, aucun `hreflang` : cette page n'est pas une destination.
    robots: { index: false, follow: true },
  }
}

export default async function NotFoundPage({ params }: LocaleParams) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)

  return (
    <main id="main" className={page.page}>
      <h1 className={page.title}>{messages.notFound.title}</h1>
      <p className={lead.lead}>{messages.notFound.message}</p>

      <p>
        <a className={accentLink.accentLink} href={homePath(locale)}>
          {messages.backHome}
        </a>
      </p>

      {/* Une phrase, et non un titre : `SectionGuide` porte le plan du document
          par les `h2` de ses cartes, et un `h2` de plus au-dessus les
          rangerait sous une rubrique au lieu de les introduire. */}
      <p>{messages.notFound.elsewhere}</p>
      <SectionGuide locale={locale} links={sectionLinks(locale)} />
    </main>
  )
}
