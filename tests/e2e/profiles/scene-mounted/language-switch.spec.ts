import type { Page } from '@playwright/test'

import { CANVAS, ETIQUETTES, monterLaScene, PREMIERE_IMAGE_MS, RACINE } from '../../support/scene'
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
 * étiquettes des univers et état de scène.
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
  const racine = page.locator(RACINE)
  await expect(racine).toHaveAttribute('data-scene-focus', /.+/, { timeout: PREMIERE_IMAGE_MS })
  // ⛔ Sur une fiche, la boucle est arrêtée : le rig n'écrit rien sur le canvas.
  if ((await racine.getAttribute('data-scene-visible')) === 'true') {
    await expect(page.locator(CANVAS)).toHaveAttribute('data-camera-transition', 'false', {
      timeout: PREMIERE_IMAGE_MS,
    })
  }
  return page.evaluate(
    ({ racine, etiquettes }) => ({
      chemin: location.pathname,
      langue: document.documentElement.lang,
      titre: document.title,
      h1: document.querySelector('main h1')?.textContent?.trim() ?? null,
      chrome: [...document.querySelectorAll('header nav, .skip-link, footer')].map(
        (element) => element.getAttribute('aria-label') ?? element.textContent?.trim(),
      ),
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
    // Quatre bascules, chacune avec deux montages de scène.
    test.slow()
    const fiche = await translatedPair(page.request)
    const departs = ['/fr', '/fr/projects', fiche.fr, '/en/skills']

    const reference = await context.newPage()
    for (const depart of departs) {
      await monterLaScene(page, depart)
      const avant = await etat(page)
      // Le sélecteur ne porte qu'un lien : l'autre langue.
      const lien = page.locator('main').getByRole('link', { name: /^(English|Français)$/ })
      const arrivee = new URL((await lien.getAttribute('href')) as string, page.url()).pathname
      await lien.click()
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
      const langue = attendu.langue
      if (!isLocale(langue)) throw new Error(`langue servie inconnue : « ${langue} »`)
      const { sections } = getMessages(langue)
      expect(attendu.etiquettes).toEqual(
        SECTIONS.map((section) => sections[section].name + sections[section].tagline),
      )

      await expect.poll(() => etat(page), { message: `${depart} → ${arrivee}` }).toEqual(attendu)
    }
    await reference.close()
  })
})
