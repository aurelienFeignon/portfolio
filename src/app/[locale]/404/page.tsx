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
 */
import type { Metadata } from 'next'

import { getMessages } from '@/i18n/messages'
import { homePath } from '@/routing/paths'
import { EntityList } from '@/ui/entity-list'
import lead from '@/ui/lead.module.css'
import page from '@/ui/page.module.css'

import { readLocale, type LocaleParams } from '../locale-param'
import { sectionLinks } from '../section-links'

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
        <a href={homePath(locale)}>{messages.backHome}</a>
      </p>

      <h2 className={page.sectionHeading}>{messages.notFound.elsewhere}</h2>
      <EntityList
        locale={locale}
        items={sectionLinks(locale).map(({ section, href }) => ({
          href,
          label: messages.sections[section].name,
          note: messages.sections[section].description,
        }))}
      />
    </main>
  )
}
