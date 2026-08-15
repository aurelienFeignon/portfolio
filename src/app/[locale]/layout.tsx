/**
 * Layout **racine** du site (P3-02).
 *
 * Il n'y a plus de `src/app/layout.tsx` : ce fichier-ci est le layout racine, et
 * c'est ce qui permet à `<html lang>` de porter la langue réelle de la page.
 * Un layout au-dessus du segment `[locale]` ne pourrait pas la connaître — il
 * coderait donc une langue en dur, ce que faisait la Phase 1 en le disant
 * (`phase-1-log.md` §7.4, dette 1). Cette dette est levée ici.
 *
 * `/` n'est donc plus une page mais une **redirection**, faite par
 * `src/middleware.ts` (P3-03) — ce que `architecture.md` §4.2 prévoyait déjà.
 */
import type { ReactNode } from 'react'

import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { sectionPath } from '@/routing/paths'
import { SECTIONS } from '@/routing/sections'
import { SiteNav } from '@/ui/site-nav'

import { readLocale, type LocaleParams } from './locale-param'
import '../globals.css'

/**
 * Aucune locale hors de cette liste n'est servie : `/de` est un 404, il n'est pas
 * rendu à la demande.
 *
 * Ce n'est pas qu'une question de propreté d'index. `content/` **n'est pas dans
 * l'image de production** (`phase-2-log.md` §9.4) : une route rendue à la demande
 * chercherait un dossier absent et échouerait en production, jamais au build.
 * C'est la dette de la Phase 2 qui devient réelle ici, et cette ligne est sa
 * moitié — l'autre est le gate de `scripts/check-static-rendering.mts`.
 */
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { readonly children: ReactNode }) {
  const locale = await readLocale(params)
  const messages = getMessages(locale)

  return (
    <html lang={locale}>
      <body>
        {/* Premier élément focusable de la page : il permet de sauter la
            navigation. Visible dès qu'il reçoit le focus (globals.css). */}
        <a className="skip-link" href="#main">
          {messages.skipToContent}
        </a>
        <SiteNav
          locale={locale}
          links={SECTIONS.map((section) => ({ section, href: sectionPath(locale, section) }))}
        />
        {children}
      </body>
    </html>
  )
}
