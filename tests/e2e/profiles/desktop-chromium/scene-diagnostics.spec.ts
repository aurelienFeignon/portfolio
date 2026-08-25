import { expect, test } from '../../support/test'

/**
 * P5-08 — le panneau de diagnostic, et ce qu'il ne doit pas casser.
 *
 * ⛔⛔ **Le contrôle qui compte n'est pas que le panneau s'affiche, c'est que la
 * scène rende encore.** La sonde déclare un `useFrame` de priorité positive, ce
 * qui fait que **R3F cesse de rendre lui-même** : c'est elle qui appelle
 * `gl.render`. Une erreur là et le panneau afficherait fièrement ses compteurs
 * au-dessus d'un canvas noir. Les draw calls relevés sont la preuve que le rendu
 * a bien eu lieu — un compteur à zéro dirait exactement le contraire.
 */
const RACINE = '[data-scene-root]'
const PANNEAU = '[data-scene-diagnostics]'

/** Lit une ligne du panneau par son intitulé. */
async function releve(
  page: import('@playwright/test').Page,
  label: string,
): Promise<string | null> {
  return page.locator(`${PANNEAU} dt`, { hasText: label }).locator('+ dd').textContent()
}

test.describe('panneau de diagnostic', () => {
  test('n’existe pas sans le paramètre — et le décor reste muet', async ({ page }) => {
    await page.goto('/fr')
    await expect(page.locator(`${RACINE} canvas`)).toBeAttached({ timeout: 10_000 })
    await page.waitForTimeout(1_000)

    await expect(page.locator(PANNEAU)).toHaveCount(0)
    // La promesse d'ADR-0003 tient toujours : rien n'est écrit dans la scène.
    await expect(page.locator(RACINE)).toHaveText('')
  })

  test('sur `?debug=scene`, relève une scène qui REND vraiment', async ({ page }) => {
    await page.goto('/fr?debug=scene')
    await expect(page.locator(PANNEAU)).toBeVisible({ timeout: 10_000 })

    // ⭐ Attendre le premier relevé plutôt qu'un délai : tant qu'aucune image
    // n'est mesurée, le panneau le DIT — c'est son état d'attente, pas un vide.
    await expect(page.locator(`${PANNEAU} dl`)).toBeVisible({ timeout: 10_000 })

    /*
     * ⛔ La preuve que la sonde n'a pas cassé la boucle : des draw calls non nuls.
     * C'est `gl.info.render.calls`, remis à zéro à chaque image et rempli par le
     * rendu lui-même — s'il n'avait pas eu lieu, ce compteur vaudrait 0.
     */
    const drawCalls = Number(await releve(page, 'draw calls'))
    expect(drawCalls, 'la scène doit avoir été rendue par la sonde').toBeGreaterThan(0)

    const images = Number(await releve(page, 'images rendues'))
    expect(images, 'au moins une image doit avoir été rendue').toBeGreaterThan(0)

    // ⭐ Et le panneau reste HORS de la scène : la racine ne porte toujours aucun
    // texte, alors même que des nombres s'affichent à l'écran.
    await expect(page.locator(RACINE)).toHaveText('')
  })

  test('⛔ ne s’ouvre pas sur une valeur qui contient seulement « scene »', async ({ page }) => {
    // Le pendant navigateur du test unitaire : une comparaison relâchée ouvrirait
    // le panneau à toute URL portant le mot.
    await page.goto('/fr?debug=scenes-de-menage')
    await expect(page.locator(`${RACINE} canvas`)).toBeAttached({ timeout: 10_000 })
    await page.waitForTimeout(1_000)

    await expect(page.locator(PANNEAU)).toHaveCount(0)
  })
})
