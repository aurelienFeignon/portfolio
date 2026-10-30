import type { Page } from '@playwright/test'

import {
  ETIQUETTES,
  monterLaScene,
  PREMIERE_IMAGE_MS,
  RACINE,
  sceneAuRepos,
} from '../../support/scene'
import { getMessages } from '@/i18n/messages'
import { isLocale } from '@/i18n/locales'
import { SECTIONS } from '@/routing/sections'

import { translatedPair } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * @covers E2E-18
 *
 * P7-07 — la bascule de langue, scène montée : la page d'arrivée est **celle d'un
 * lien direct** vers la même adresse — langue du document, titre, `h1`, chrome,
 * étiquettes de la carte et état de scène.
 *
 * ⭐ **Un différentiel, comme E2E-16.** La référence est la page d'arrivée ouverte
 * directement, scène montée ; rien n'est écrit en dur de ce qu'elle doit contenir.
 *
 * ⚠️ **Constaté, et non affirmé : la bascule RECHARGE la page.** Le segment
 * `[locale]` porte le layout racine, et Next traite le changer comme une navigation
 * complète, interception de `SceneMount` comprise — le témoin du canvas disparaît
 * (relevé le 2026-10-28). Ce parcours ne l'assère pas : c'est un comportement de
 * Next, et une bascule devenue client devrait tenir les mêmes propriétés — `lang`
 * et étiquettes compris, que seul un rendu du layout racine met à jour.
 *
 * Les liens directs en mode immersif sont tenus par `scene-state.spec.ts` (E2E-02).
 */

/** Ce que la page dit d'elle-même, une fois la scène montée et cadrée. */
async function etat(page: Page) {
  await sceneAuRepos(page)
  return page.evaluate(
    ({ racine, etiquettes }) => ({
      chemin: location.pathname,
      langue: document.documentElement.lang,
      titre: document.title,
      h1: document.querySelector('main h1')?.textContent?.trim() ?? null,
      // Le texte de l'en-tête (marque et liens), de l'évitement et du pied, et le
      // nom des navigations : tout ce que le layout traduit autour du panneau.
      chrome: [
        ...[...document.querySelectorAll('header, .skip-link, footer')].map((element) =>
          element.textContent?.trim(),
        ),
        ...[...document.querySelectorAll('nav')].map((nav) => nav.getAttribute('aria-label')),
      ],
      etiquettes: [...document.querySelectorAll(`${etiquettes} [data-section]`)].map((element) =>
        element.textContent?.trim(),
      ),
      focus: document.querySelector(racine)?.getAttribute('data-scene-focus') ?? null,
    }),
    { racine: RACINE, etiquettes: ETIQUETTES },
  )
}

test.describe('bascule de langue, scène montée', () => {
  test('mène à la page d’un lien direct, sur chaque forme et dans les deux sens', async ({
    page,
    context,
  }) => {
    // Six bascules, chacune avec deux montages de scène.
    test.slow()
    const fiche = await translatedPair(page.request)
    const departs = ['/fr', '/fr/projects', fiche.fr, '/en', '/en/skills', fiche.en]

    // Fermée avec le contexte, à la fin du test : rien à libérer à la main.
    const reference = await context.newPage()
    for (const depart of departs) {
      await monterLaScene(page, depart)
      const avant = await etat(page)
      // Le sélecteur ne porte qu'un lien : l'autre langue.
      const lien = page.locator('main').getByRole('link', { name: /^(English|Français)$/ })
      const arrivee = new URL((await lien.getAttribute('href')) ?? '', page.url()).pathname
      await lien.click()
      // Le défaut se dit ici, contre la bascule, et non plus loin contre la référence.
      expect(arrivee.slice(0, 3), `${depart} → ${arrivee}`).not.toBe(depart.slice(0, 3))
      await expect(page).toHaveURL((url) => url.pathname === arrivee)

      await monterLaScene(reference, arrivee)
      const attendu = await etat(reference)
      // Une bascule qui ne changerait pas de langue serait « identique » à tort.
      expect(attendu.langue).not.toBe(avant.langue)
      /*
       * ⛔ Le différentiel ne voit pas un défaut COMMUN aux deux chargements — des
       * étiquettes tirées d'un dictionnaire figé, par exemple. Celles-ci se jugent
       * donc aussi dans l'absolu, contre le dictionnaire de la langue d'arrivée.
       */
      if (!isLocale(attendu.langue)) throw new Error(`langue servie : « ${attendu.langue} »`)
      const { sections } = getMessages(attendu.langue)
      expect(attendu.etiquettes).toEqual(
        SECTIONS.map((section) => sections[section].name + sections[section].tagline),
      )

      // `etat` attend lui-même la première image : la scène se remonte après le
      // rechargement, au-delà des 5 s par défaut sous WebKit chargé.
      await expect
        .poll(() => etat(page), { message: `${depart} → ${arrivee}`, timeout: PREMIERE_IMAGE_MS })
        .toEqual(attendu)
    }
  })
})
