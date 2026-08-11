import { expect, test } from '../../support/test'

/**
 * Le script de neutralisation est lui-même vérifié (P1-08).
 *
 * Profil `no-webgl` uniquement — filtré par `testMatch` dans playwright.config.ts.
 *
 * Sans ce test, le profil `no-webgl` pourrait passer au vert simplement parce
 * que WebGL est resté actif — c'est-à-dire prouver l'inverse de ce qu'il
 * prétend. C'est le cas d'école du test décoratif.
 */
test.describe('profil sans WebGL', () => {
  test('getContext("webgl2") et getContext("webgl") renvoient null', async ({ page }) => {
    await page.goto('/')

    const contexts = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      return {
        webgl: canvas.getContext('webgl'),
        webgl2: canvas.getContext('webgl2'),
        constructorPresent: typeof window.WebGL2RenderingContext !== 'undefined',
      }
    })

    expect(contexts.webgl).toBeNull()
    expect(contexts.webgl2).toBeNull()
    expect(contexts.constructorPresent).toBe(false)
  })

  test('le canvas 2D reste disponible : seul WebGL est neutralisé', async ({ page }) => {
    await page.goto('/')

    const has2d = await page.evaluate(
      () => document.createElement('canvas').getContext('2d') !== null,
    )
    expect(has2d).toBe(true)
  })

  test('le contenu documentaire reste entièrement présent (CF-12)', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portfolio')
    await expect(page.getByRole('main')).toBeVisible()
  })
})
