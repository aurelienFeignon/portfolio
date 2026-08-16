/**
 * Le **plancher** sous le mécanisme de 404 (P4-10 — constat écarté de P4-07 §13.10).
 *
 * ⭐⭐ **Ce fichier n'est pas la 404 du site.** Celle-ci est
 * `[locale]/404/page.tsx`, une vraie page prérendue et localisée, vers laquelle
 * le proxy réécrit toute URL inconnue (P4-07). Ce qui est ici ne sert que
 * lorsque **le proxy n'a pas eu la main** : une adresse que son matcher exclut
 * (`_next/…`), ou un manifeste de routes qui aurait laissé passer un chemin
 * qu'aucune page ne sert.
 *
 * ⛔ Sans ce fichier, ces cas-là reçoivent la 404 **interne** de Next, servie
 * hors de tout layout — le nôtre vivant sous `[locale]` depuis P3-02 — donc
 * **sans `<html lang>`**. C'est une violation WCAG 3.1.1, et c'est exactement le
 * défaut que P4-07 a supprimé par la porte principale sans pouvoir fermer
 * celle-ci.
 *
 * ⚠️ **Il rend sa propre enveloppe `<html>`**, comme `global-error.tsx` : Next
 * ne l'entoure d'aucun layout, c'est la contrepartie de sa position. Le garde
 * structurel des enveloppes racines (`every-root-envelope-declares-its-language`)
 * en compte donc **trois** désormais, et exige `lang` sur chacune.
 *
 * ⚠️ **La langue est la locale par défaut, et ne peut pas être autre chose** :
 * ce composant ne reçoit ni `params` ni en-tête de requête. Ce n'est pas une
 * régression — la 404 *localisée* reste le chemin nominal, et celui-ci ne se
 * voit que là où aucune locale n'a jamais été déterminée.
 *
 * ⚠️ Il suppose `experimental.globalNotFound` dans `next.config.ts` : la
 * convention est expérimentale sur Next 16.3, **vérifiée acceptée par le build**
 * plutôt que crue sur documentation.
 */
import { DEFAULT_LOCALE } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { homePath } from '@/routing/paths'
import lead from '@/ui/lead.module.css'
import page from '@/ui/page.module.css'

import './globals.css'
import accentLink from '@/ui/accent-link.module.css'

const messages = getMessages(DEFAULT_LOCALE)

export const metadata = {
  title: messages.notFound.title,
  robots: { index: false, follow: true },
}

export default function GlobalNotFound() {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
        <main id="main" className={page.page}>
          <h1 className={page.title}>{messages.notFound.title}</h1>
          <p className={lead.lead}>{messages.notFound.message}</p>
          <p>
            <a className={accentLink.textLink} href={homePath(DEFAULT_LOCALE)}>
              {messages.backHome}
            </a>
          </p>
        </main>
      </body>
    </html>
  )
}
