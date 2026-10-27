import { expect, test } from '../../support/test'

/**
 * @covers E2E-14 — reduced-motion : navigation instantanée, aucune animation de caméra
 *
 * P6-10. Sous `prefers-reduced-motion`, une navigation est une **coupe** :
 * `transitionMs(true) = 0` (P6-08, éprouvé en unitaire). Ce parcours tient ce que
 * l'unitaire ne voit pas — que le rig, dans un vrai navigateur, ne lance jamais de
 * transition.
 *
 * ⭐ Sans pixel ni délai : le rig écrit sur le canvas, **dans l'image même** qui
 * les produit, l'état reçu (`data-camera-focus`) et la transition en cours
 * (`data-camera-transition`). On attend que la caméra ait reçu le nouvel état —
 * preuve qu'une image l'a rendu —, puis on relit tout ce qui a été écrit : une
 * coupe n'a jamais écrit `true`. Un `MutationObserver` posé AVANT la navigation
 * garde chaque changement **avec son ancienne valeur**, pour qu'un `true` aussitôt
 * remplacé ne se perde pas.
 * ⛔ « Aucun `true` » ne vaut que si l'attribut est vraiment écrit quand une
 * transition a lieu : c'est le témoin de `scene-mounted/scene-state.spec.ts`,
 * joué sans mouvement réduit.
 */
const RACINE = '[data-scene-root]'
const CANVAS = `${RACINE} canvas`

test.describe('mouvement réduit', () => {
  test('une navigation coupe : aucune transition de caméra', async ({ page }) => {
    await page.goto('/fr')
    const canvas = page.locator(CANVAS)
    // Le délai couvre la première image, compilation des shaders comprise.
    await expect(canvas).toHaveAttribute('data-camera-focus', 'overview', { timeout: 20_000 })
    await expect(canvas).toHaveAttribute('data-camera-transition', 'false')

    await canvas.evaluate((element) => {
      const ecrits: Array<string | null> = []
      Object.assign(window, { __transitions: ecrits })
      new MutationObserver((changements) => {
        for (const changement of changements) {
          ecrits.push(changement.oldValue, element.dataset['cameraTransition'] ?? null)
        }
      }).observe(element, {
        attributes: true,
        attributeFilter: ['data-camera-transition'],
        attributeOldValue: true,
      })
    })

    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    for (const [lien, focus] of [
      ['Projets', 'projects'],
      ['Compétences', 'skills'],
    ] as const) {
      await nav.getByRole('link', { name: lien }).click()
      // L'image qui a reçu le nouvel état est rendue : c'est elle qui aurait
      // ouvert une transition.
      await expect(canvas).toHaveAttribute('data-camera-focus', focus)
    }

    const ecrits = await page.evaluate(
      () => (window as unknown as { __transitions: Array<string | null> }).__transitions,
    )
    expect(ecrits, 'aucune transition de caméra n’a été ouverte').not.toContain('true')
    await expect(canvas).toHaveAttribute('data-camera-transition', 'false')
  })
})
