import type { Page } from '@playwright/test'

import {
  CANVAS,
  monterLaScene,
  navigationPrincipale,
  PREMIERE_IMAGE_MS,
  RACINE,
  TEMOIN,
} from '../../support/scene'
import { detailPath } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * @covers E2E-13 — Back/forward navigateur : URL et état de scène restaurés
 * @covers E2E-02 — Deep link sur une fiche : état de scène cohérent (la traversée et l'URL sont
 * tenues par `navigation-journey.spec.ts`)
 *
 * P6-10, sur les attributs de P6-07 (`testing-strategy.md` §4). Deux lectures,
 * parce qu'elles peuvent diverger : `data-scene-focus`, l'état que l'URL désigne,
 * et `data-camera-focus`, celui que le rig a reçu. Sans la seconde, un rig sourd à
 * Précédent passerait au vert.
 */

/**
 * L'état de scène exposé — et, scène montrée, celui que la caméra a reçu. Une
 * fiche arrête la boucle (`never`) : rien n'y est rendu côté caméra.
 */
async function etatDeScene(page: Page, focus: string, visible: boolean) {
  await expect(page.locator(RACINE)).toHaveAttribute('data-scene-focus', focus)
  await expect(page.locator(RACINE)).toHaveAttribute('data-scene-visible', String(visible))
  if (visible) {
    await expect(page.locator(CANVAS)).toHaveAttribute('data-camera-focus', focus, {
      timeout: PREMIERE_IMAGE_MS,
    })
  }
}

test.describe('état de scène', () => {
  test('Précédent et Suivant restaurent l’URL ET l’état de scène', async ({ page }) => {
    // Sept navigations d'affilée : sous une charge d'hôte élevée, le délai de
    // 30 s du test entier a été dépassé (1 sur 24, charge 84), jamais une assertion.
    test.slow()
    const fiche = await detailPath(page.request, 'fr', 'projects')

    await monterLaScene(page, '/fr')
    await etatDeScene(page, 'overview', true)

    await navigationPrincipale(page).getByRole('link', { name: 'Projets' }).click()
    await expect(page).toHaveURL(/\/fr\/projects$/)
    await etatDeScene(page, 'projects', true)

    // Une fiche se lit sans scène : le focus reste celui de sa section.
    await page.locator(`main a[href="${fiche}"]`).first().click()
    await expect(page).toHaveURL((url) => url.pathname === fiche)
    await etatDeScene(page, 'projects', false)

    await page.goBack()
    await expect(page).toHaveURL(/\/fr\/projects$/)
    await etatDeScene(page, 'projects', true)

    await page.goBack()
    await expect(page).toHaveURL(/\/fr$/)
    await etatDeScene(page, 'overview', true)

    await page.goForward()
    await expect(page).toHaveURL(/\/fr\/projects$/)
    await etatDeScene(page, 'projects', true)

    await page.goForward()
    await expect(page).toHaveURL((url) => url.pathname === fiche)
    await etatDeScene(page, 'projects', false)

    await expect(page.locator(TEMOIN)).toBeAttached()
  })

  test('un lien direct pose l’état de la page demandée', async ({ page }) => {
    // Trois chargements complets, chacun avec sa première image : 37 s une fois
    // sur 54 sous une charge d'hôte de 100, au-delà des 30 s du test entier.
    // L'accueil chargé directement est déjà tenu par le test précédent.
    test.slow()
    for (const [chemin, focus] of [
      ['/fr/experiences', 'experiences'],
      ['/en/skills', 'skills'],
    ] as const) {
      await monterLaScene(page, chemin)
      await etatDeScene(page, focus, true)
    }

    // Une fiche ouverte directement : la section de la fiche, scène cachée.
    await monterLaScene(page, await detailPath(page.request, 'fr', 'projects'))
    await etatDeScene(page, 'projects', false)
  })

  /*
   * ⛔⛔ Le défaut que P6-11 a trouvé : R3F remet son horloge à zéro à chaque
   * changement de boucle, et une fiche fait passer la boucle par `never`. Le rig
   * lisait ses transitions sur cette horloge : au retour, une transition finie
   * repartait de zéro et la caméra la rejouait.
   * ⚠️ La valeur se lit TOUT DE SUITE, sans l'attente de `toHaveAttribute` : elle
   * patienterait jusqu'à la fin de la transition rejouée, et passerait sur le défaut.
   */
  test('revenir d’une fiche ne rejoue pas une transition finie', async ({ page }) => {
    const fiche = await detailPath(page.request, 'fr', 'projects')
    await monterLaScene(page, '/fr/projects')
    const canvas = page.locator(CANVAS)
    await expect(canvas).toHaveAttribute('data-camera-transition', 'false', {
      timeout: PREMIERE_IMAGE_MS,
    })

    await page.locator(`main a[href="${fiche}"]`).first().click()
    await expect(page.locator(RACINE)).toHaveAttribute('data-scene-visible', 'false')
    await canvas.evaluate((element) => {
      const quittees: Array<string | null> = []
      Object.assign(window, { __transitions: quittees })
      new MutationObserver((changements) => {
        for (const changement of changements) quittees.push(changement.oldValue)
      }).observe(element, {
        attributes: true,
        attributeFilter: ['data-camera-transition'],
        attributeOldValue: true,
      })
    })

    await page.goBack()
    await expect(page.locator(RACINE)).toHaveAttribute('data-scene-visible', 'true')
    // Dix images rendues après le retour : de quoi lancer une transition rejouée.
    await page.evaluate(
      () =>
        new Promise<void>((fin) => {
          let images = 0
          const suivante = () => (++images >= 10 ? fin() : requestAnimationFrame(suivante))
          requestAnimationFrame(suivante)
        }),
    )

    expect(await canvas.getAttribute('data-camera-transition')).toBe('false')
    const quittees = await page.evaluate(
      () => (window as unknown as { __transitions: Array<string | null> }).__transitions,
    )
    expect(quittees, 'aucune transition rejouée').not.toContain('true')
  })

  // Le témoin de E2E-14 (`reduced-motion/camera-cut.spec.ts`) : sans mouvement
  // réduit, la même navigation DOIT ouvrir une transition.
  test('sans mouvement réduit, une navigation ouvre une transition', async ({ page }) => {
    await monterLaScene(page, '/fr')
    // La transition d'arrivée finie : on part d'une caméra immobile.
    await expect(page.locator(CANVAS)).toHaveAttribute('data-camera-transition', 'false', {
      timeout: PREMIERE_IMAGE_MS,
    })

    await navigationPrincipale(page).getByRole('link', { name: 'Compétences' }).click()
    await expect(page).toHaveURL(/\/fr\/skills$/)
    await expect(page.locator(CANVAS)).toHaveAttribute('data-camera-transition', 'true')
    await expect(page.locator(CANVAS)).toHaveAttribute('data-camera-focus', 'skills')
    await expect(page.locator(CANVAS)).toHaveAttribute('data-camera-transition', 'false', {
      timeout: 10_000,
    })
  })
})
