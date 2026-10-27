import type { Page } from '@playwright/test'

import { detailPath } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * @covers E2E-13 — Back/forward navigateur : URL et état de scène restaurés
 * @covers E2E-02 — Deep link sur une fiche : état de scène cohérent (la traversée et l'URL sont
 * tenues par `navigation-journey.spec.ts`)
 *
 * P6-10, sur les attributs de P6-07, jamais sur des pixels (`testing-strategy.md`
 * §4). Deux lectures, parce qu'elles peuvent diverger :
 * - `data-scene-focus` : l'état que l'URL désigne ;
 * - `data-camera-focus`, sur le canvas : l'état que le rig a **reçu et rendu**.
 *   Sans elle, « état restauré » serait déduit de l'URL déjà vérifiée, et un rig
 *   sourd à Précédent passerait au vert.
 *
 * ⛔ **Le témoin posé sur le canvas n'est pas décoratif** : un rechargement
 * restaurerait l'état par construction, et ce parcours passerait au vert sans
 * avoir rien prouvé de la navigation client. Il doit survivre à tout le trajet.
 */
const RACINE = '[data-scene-root]'
const CANVAS = `${RACINE} canvas`
const TEMOIN = `${CANVAS}[data-temoin="meme-canvas"]`
const PREMIERE_IMAGE_MS = 20_000

async function monterLaScene(page: Page, chemin: string) {
  await page.goto(chemin)
  await expect(page.locator(CANVAS)).toBeAttached({ timeout: 10_000 })
  await page
    .locator(CANVAS)
    .evaluate((element) => element.setAttribute('data-temoin', 'meme-canvas'))
}

/**
 * L'état de scène que le DOM expose — et, quand la scène est montrée, celui que
 * la caméra a reçu. Une fiche arrête la boucle (`never`) : rien n'y est rendu,
 * donc rien à lire côté caméra.
 */
async function etatDeScene(page: Page, focus: string, visible: boolean) {
  await expect(page.locator(RACINE)).toHaveAttribute('data-scene-focus', focus)
  await expect(page.locator(RACINE)).toHaveAttribute('data-scene-visible', String(visible))
  // ⛔ Le délai couvre la PREMIÈRE image, compilation des shaders comprise : sous
  // WebKit et une charge d'hôte élevée, elle a dépassé les 5 s par défaut (mesuré).
  if (visible) {
    await expect(page.locator(CANVAS)).toHaveAttribute('data-camera-focus', focus, {
      timeout: PREMIERE_IMAGE_MS,
    })
  }
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
    // Quatre chargements complets, chacun avec sa première image : 37 s une fois
    // sur 54 sous une charge d'hôte de 100, au-delà des 30 s du test entier.
    test.slow()
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
   * préférence de mouvement réduit, la même navigation ouvre une transition, et
   * `data-camera-transition` le DIT. Sans ce cas, « aucun `true` » sous mouvement
   * réduit pourrait venir d'un attribut que rien n'écrit.
   * ⛔ L'attribut ne porte que la transition de route : la parallaxe, que le
   * clic déclenche en déplaçant la souris, ne peut pas le faire passer à `true`.
   */
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
