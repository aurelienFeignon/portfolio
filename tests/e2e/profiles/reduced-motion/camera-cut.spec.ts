import { expect, test } from '../../support/test'

/**
 * @covers E2E-14 — reduced-motion : navigation instantanée, aucune animation de caméra
 *
 * P6-10. Sous `prefers-reduced-motion`, une navigation est une **coupe** :
 * `transitionMs(true) = 0` (P6-08, éprouvé en unitaire). Ce parcours tient ce que
 * l'unitaire ne voit pas — que le rig, dans un vrai navigateur, ne bouge jamais.
 *
 * ⭐ Sans pixel : le rig écrit `data-camera-moving` sur le canvas à chaque
 * changement d'état. Un `MutationObserver`, posé AVANT la navigation, relève
 * toutes les valeurs écrites : aucune ne doit être `true`.
 * ⛔ « Aucun `true` » ne vaut que si l'attribut est vraiment écrit quand la caméra
 * bouge : c'est le témoin de `scene-mounted/scene-state.spec.ts`, joué sans
 * mouvement réduit.
 */
const RACINE = '[data-scene-root]'
const CANVAS = `${RACINE} canvas`

test.describe('mouvement réduit', () => {
  test('une navigation coupe : la caméra ne bouge jamais', async ({ page }) => {
    await page.goto('/fr')
    const canvas = page.locator(CANVAS)
    await expect(canvas).toHaveAttribute('data-camera-moving', 'false', { timeout: 10_000 })

    await canvas.evaluate((element) => {
      const vus: string[] = []
      Object.assign(window, { __mouvements: vus })
      new MutationObserver(() => vus.push(element.dataset['cameraMoving'] ?? '')).observe(element, {
        attributes: true,
        attributeFilter: ['data-camera-moving'],
      })
    })

    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    for (const [lien, chemin, focus] of [
      ['Projets', /\/fr\/projects$/, 'projects'],
      ['Compétences', /\/fr\/skills$/, 'skills'],
    ] as const) {
      await nav.getByRole('link', { name: lien }).click()
      await expect(page).toHaveURL(chemin)
      await expect(page.locator(RACINE)).toHaveAttribute('data-scene-focus', focus)
      /*
       * ⛔ Une ABSENCE ne s'attend pas, elle se laisse le temps d'arriver : une
       * transition animée écrirait `true` dès l'image qui suit le changement
       * d'état, soit en quelques dizaines de millisecondes. 500 ms couvrent
       * largement ce délai, et restent loin des 1,6 s qu'elle durerait.
       */
      await page.waitForTimeout(500)
    }

    const vus = await page.evaluate(
      () => (window as unknown as { __mouvements: string[] }).__mouvements,
    )
    expect(vus, 'la caméra n’a jamais été en mouvement').not.toContain('true')
    await expect(canvas).toHaveAttribute('data-camera-moving', 'false')
  })
})
