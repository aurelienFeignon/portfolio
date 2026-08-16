/**
 * Le plancher sous le mécanisme de 404 (P4-10).
 *
 * ⚠️ **Ce fichier existe parce qu'une exclusion de couverture avait été écrite
 * avec la mauvaise raison.** Elle recopiait celle de `global-error.tsx` — « les
 * couvrir demanderait de simuler `usePathname` » —, or ce composant n'a ni
 * `usePathname`, ni props, ni asynchronie : rien n'empêchait de l'exercer.
 * Une exclusion dont le motif ne s'applique pas n'est pas une exclusion
 * justifiée, et `testing-strategy.md` §6 est explicite — exclure un module pour
 * atteindre un seuil serait une fraude. Relevé en revue.
 *
 * ⭐ On **appelle** le composant plutôt que de le rendre : ce qu'il retourne est
 * un `<html>`, que Testing Library placerait dans un `<div>`. Lire l'élément
 * retourné mesure la même chose sans fabriquer un document invalide — c'est le
 * motif déjà employé par le garde des endroits.
 */
import { describe, expect, it } from 'vitest'

import GlobalNotFound, { metadata } from '@/app/global-not-found'
import { DEFAULT_LOCALE } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'

describe('plancher de la 404', () => {
  it('rend sa propre enveloppe, et elle déclare une langue', () => {
    /*
     * ⛔ C'est **toute** la raison d'être du fichier de production : sans lui,
     * les voies que le proxy n'atteint pas — `_next/…` — recevaient la 404
     * interne de Next, servie hors de tout layout, donc un `<html>` **sans
     * `lang`**. Violation WCAG 3.1.1, mesurée avant/après contre l'image de
     * production.
     */
    const element = GlobalNotFound() as { type: string; props: { lang?: string } }

    expect(element.type).toBe('html')
    expect(element.props.lang).toBe(DEFAULT_LOCALE)
  })

  it('parle la langue par défaut, faute de pouvoir en connaître une autre', () => {
    // Ce composant ne reçoit ni `params` ni en-tête de requête : la locale
    // négociée lui est inaccessible. Ce n'est pas une régression — la 404
    // *localisée* reste le chemin nominal, et celui-ci ne se voit que là où
    // aucune locale n'a jamais été déterminée.
    expect(metadata.title).toBe(getMessages(DEFAULT_LOCALE).notFound.title)
  })

  it('n’est pas indexable : une page servie en 404 n’a rien à faire dans un index', () => {
    expect(metadata.robots).toEqual({ index: false, follow: true })
  })
})
