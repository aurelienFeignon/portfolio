import { expect, test } from '../../support/test'

/**
 * P5-04 — au palier `none`, **rien** n'est monté.
 *
 * @covers E2E-09 — Sans WebGL : tout le contenu est présent et navigable
 *
 * ⛔ La distinction que ce fichier garde n'est pas cosmétique : « une scène
 * vide » et « aucune scène » se ressemblent à l'écran et n'ont pas le même coût.
 * Au palier `none`, aucun canvas n'est créé et **aucun octet de three n'est
 * téléchargé** — c'est tout le sens du palier (ADR-0003), et un appareil qui a
 * demandé `save-data` ne doit pas payer un chunk pour ne rien voir.
 */
test.describe('sans WebGL, la scène ne se monte pas', () => {
  test('aucun canvas décoratif n’apparaît, et le site reste entier', async ({ page }) => {
    const requetes: string[] = []
    page.on('request', (requete) => requetes.push(requete.url()))

    await page.goto('/fr')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Laisser passer l'`idle` : c'est après lui que le montage aurait lieu.
    await page.waitForTimeout(2_500)

    /*
     * ⭐ Ancré sur `[data-scene-root]`, le même repère que le banc de présence.
     * Écrit d'abord avec `div[aria-hidden="true"]` — le sélecteur que cette tâche
     * a justement remplacé pour son imprécision : si l'enveloppe cessait de
     * porter `aria-hidden`, ce contrôle passerait au vert **avec un canvas monté**.
     */
    await expect(page.locator('[data-scene-root] canvas')).toHaveCount(0)
    await expect(page.locator('[data-scene-root]')).toHaveCount(0)

    // ⭐ Et la preuve qui compte vraiment : le chunk n'a même pas été demandé.
    const chunksJs = requetes.filter((url) => url.includes('/_next/static/chunks/'))
    expect(chunksJs.length).toBeGreaterThan(0)
    for (const url of chunksJs) {
      const reponse = await page.request.get(url)
      expect(await reponse.text()).not.toContain('WebGLRenderer')
    }
  })
})
