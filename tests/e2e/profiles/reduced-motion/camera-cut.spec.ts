import {
  CANVAS,
  ecouterLesTransitions,
  navigationPrincipale,
  PREMIERE_IMAGE_MS,
  transitionsQuittees,
} from '../../support/scene'
import { expect, test } from '../../support/test'

/**
 * @covers E2E-14 — reduced-motion : navigation instantanée, aucune animation de caméra
 *
 * P6-10. On attend l'image où la caméra a reçu le nouvel état, puis on relit
 * chaque valeur que `data-camera-transition` a quittée : aucune n'est `true`. Le
 * principe et son témoin : `testing-strategy.md` §4.
 */
test.describe('mouvement réduit', () => {
  test('une navigation coupe : aucune transition de caméra', async ({ page }) => {
    await page.goto('/fr')
    const canvas = page.locator(CANVAS)
    await expect(canvas).toHaveAttribute('data-camera-focus', 'overview', {
      timeout: PREMIERE_IMAGE_MS,
    })
    await expect(canvas).toHaveAttribute('data-camera-transition', 'false')

    // Chaque ANCIENNE valeur : un `true` aussitôt remplacé ne se perd pas.
    await ecouterLesTransitions(page)

    for (const [lien, focus] of [
      ['Projets', 'projects'],
      ['Compétences', 'skills'],
    ] as const) {
      await navigationPrincipale(page).getByRole('link', { name: lien }).click()
      await expect(canvas).toHaveAttribute('data-camera-focus', focus)
    }

    const quittees = await transitionsQuittees(page)
    expect(quittees, 'aucune transition de caméra n’a été ouverte').not.toContain('true')
    // Et un `true` resté en place, que l'observateur ne verrait pas quitter.
    await expect(canvas).toHaveAttribute('data-camera-transition', 'false')
  })
})
