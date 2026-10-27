import type { Page } from '@playwright/test'

import { detailPath } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * @covers E2E-13 — Back/forward navigateur : URL et état de scène restaurés
 * @covers E2E-02 — Deep link sur une fiche : état de scène cohérent (la traversée et l'URL sont
 * tenues par `navigation-journey.spec.ts`)
 *
 * P6-10, sur l'attribut de P6-07 : l'état de scène se lit dans `data-scene-focus`,
 * tiré de la même `resolveSceneState` que la caméra, et jamais dans des pixels
 * (`testing-strategy.md` §4).
 *
 * ⛔ **Le témoin posé sur le canvas n'est pas décoratif** : un rechargement
 * restaurerait l'état par construction, et ce parcours passerait au vert sans
 * avoir rien prouvé de la navigation client. Il doit survivre à tout le trajet.
 */
const RACINE = '[data-scene-root]'
const CANVAS = `${RACINE} canvas`
const TEMOIN = `${CANVAS}[data-temoin="meme-canvas"]`

async function monterLaScene(page: Page, chemin: string) {
  await page.goto(chemin)
  await expect(page.locator(CANVAS)).toBeAttached({ timeout: 10_000 })
  await page
    .locator(CANVAS)
    .evaluate((element) => element.setAttribute('data-temoin', 'meme-canvas'))
}

/** L'état de scène que le DOM expose : le focus, et si la scène est montrée. */
async function etatDeScene(page: Page, focus: string, visible: boolean) {
  await expect(page.locator(RACINE)).toHaveAttribute('data-scene-focus', focus)
  await expect(page.locator(RACINE)).toHaveAttribute('data-scene-visible', String(visible))
}

function navigationPrincipale(page: Page) {
  return page.getByRole('navigation', { name: 'Navigation principale' })
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
    for (const [chemin, focus] of [
      ['/fr', 'overview'],
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
   * ⭐ Le TÉMOIN de E2E-14 (`profiles/reduced-motion/camera-cut.spec.ts`) : sans
   * préférence de mouvement réduit, la même navigation fait bouger la caméra, et
   * `data-camera-moving` le DIT. Sans ce cas, « aucun `true` vu » sous mouvement
   * réduit pourrait venir d'un attribut que rien n'écrit.
   */
  test('sans mouvement réduit, une navigation fait bouger la caméra', async ({ page }) => {
    await monterLaScene(page, '/fr')
    // La transition d'arrivée finie : on part d'une caméra immobile.
    await expect(page.locator(CANVAS)).toHaveAttribute('data-camera-moving', 'false', {
      timeout: 10_000,
    })

    await navigationPrincipale(page).getByRole('link', { name: 'Compétences' }).click()
    await expect(page).toHaveURL(/\/fr\/skills$/)
    await expect(page.locator(CANVAS)).toHaveAttribute('data-camera-moving', 'true')
    await expect(page.locator(CANVAS)).toHaveAttribute('data-camera-moving', 'false', {
      timeout: 10_000,
    })
  })
})
