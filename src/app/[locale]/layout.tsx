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
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { SceneMount } from '@/scene/components/scene-mount'
import { getSiteUrl } from '@/seo/site-url'
import { SiteFooter } from '@/ui/site-footer'

import styles from './layout.module.css'
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

/**
 * Le **gabarit de titre** du site (P4-08).
 *
 * Il vit ici, et nulle part ailleurs : Next l'applique à toute page descendante
 * qui rend un titre sous forme de chaîne. Chaque page dit donc ce qu'elle est
 * — « Projets » —, et le suffixe est ajouté à un seul endroit. Le poser dans
 * chaque `generateMetadata` aurait été autant d'occasions de le voir diverger.
 *
 * ⚠️ `default` n'est pas décoratif : c'est le titre servi à une page descendante
 * qui n'en déclarerait aucun. Sans lui, Next rendrait le gabarit **avec son
 * `%s` littéral**.
 *
 * L'accueil échappe au gabarit — son titre **est** le nom du site —, et c'est
 * `buildPageMetadata` qui en décide d'après l'emplacement, pour que la page n'ait
 * pas à y penser.
 */
export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { site } = getMessages(await readLocale(params))

  return {
    /*
     * ⛔⛔ **Sans elle, Next grave `http://localhost:3000` dans le HTML
     * prérendu.** Toute URL de métadonnée que Next résout lui-même — l'image de
     * partage attachée par convention de fichier, par exemple — est relative à
     * cette base. Non déclarée, elle vaut l'hôte de développement, et la valeur
     * part **en production** dans une page statique.
     *
     * C'est arrivé : les deux pages introuvables sont les seules à ne pas
     * déclarer d'`openGraph`, Next leur a donc attaché l'image lui-même, et
     * elles annonçaient une adresse `localhost`. Next l'écrivait au build, en
     * toutes lettres — « metadataBase property in metadata export is not set » —
     * et personne ne lisait sa sortie. Relevé en revue.
     *
     * Elle vaut `SITE_URL`, la même origine que les `canonical` et le sitemap :
     * il n'y a qu'un point d'entrée pour cette valeur (P1-17).
     */
    metadataBase: getSiteUrl(),
    title: { template: site.titleTemplate, default: site.name },
  }
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
        {/* L'en-tête n'est pas ici mais dans les layouts d'endroit (P4-02) :
            marquer le lien actif demande de savoir où l'on est, et ce layout ne
            le sait pas. Voir `place-layout.tsx`.
            La boîte qui les enveloppe est ce que ce layout possède, donc ce
            qu'il a le droit de styler — c'est elle qui pousse le pied de page
            en bas d'une page courte. */}
        <div className={styles.grow}>{children}</div>
        {/* Le pied de page, lui, est identique partout : il n'a besoin de rien
            savoir de la page. L'année est lue au build — toutes les routes sont
            prérendues, elle est donc gravée à chaque déploiement. */}
        <SiteFooter locale={locale} year={new Date().getFullYear()} />
        {/* La scène (P5-04). Placée en DERNIER et hors du flux : elle est un
            décor, `aria-hidden`, sans rien de focusable, et elle ne se monte
            qu'après `idle` — jamais dans le chemin critique du LCP (ADR-0003).
            Au palier `none`, elle ne charge rien du tout. */}
        <SceneMount />
      </body>
    </html>
  )
}
