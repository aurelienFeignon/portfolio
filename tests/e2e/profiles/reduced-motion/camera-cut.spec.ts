import { CANVAS, navigationPrincipale, PREMIERE_IMAGE_MS } from '../../support/scene'
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

    for (const [lien, focus] of [
      ['Projets', 'projects'],
      ['Compétences', 'skills'],
    ] as const) {
      await navigationPrincipale(page).getByRole('link', { name: lien }).click()
      await expect(canvas).toHaveAttribute('data-camera-focus', focus)
    }

    const quittees = await page.evaluate(
      () => (window as unknown as { __transitions: Array<string | null> }).__transitions,
    )
    expect(quittees, 'aucune transition de caméra n’a été ouverte').not.toContain('true')
    // Et un `true` resté en place, que l'observateur ne verrait pas quitter.
    await expect(canvas).toHaveAttribute('data-camera-transition', 'false')
  })
})
