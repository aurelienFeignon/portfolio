import { expectNoBlockingAxeViolations } from '../support/axe'
import { expect, test } from '../support/test'

test.describe('page d’accueil', () => {
  test('se charge, porte le bon titre, et ne produit aucune erreur console', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    const response = await page.goto('/fr')

    expect(response?.status()).toBe(200)
    // « Aurélien Feignon » et non « Portfolio » depuis P4-02 : l'identité de
    // marque est tranchée (`phase-4-log.md` §3.1), et c'est elle que porte
    // `site.name`. Le gabarit de titre qui en fera un suffixe est P4-08.
    await expect(page).toHaveTitle(/Aurélien Feignon/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aurélien Feignon')
    expect(consoleErrors).toEqual([])
  })

  test('déclare la langue de la page', async ({ page }) => {
    // Le layout racine est `app/[locale]/layout.tsx` : c'est ce qui permet à
    // `lang` de porter la langue réelle plutôt qu'une valeur en dur (P3-02).
    await page.goto('/fr')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')

    await page.goto('/en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('le lien d’évitement est le premier élément focusable et mène au contenu', async ({
    page,
  }) => {
    await page.goto('/fr')
    await page.keyboard.press('Tab')

    const focused = page.locator(':focus')
    await expect(focused).toHaveText('Aller au contenu principal')
    await expect(focused).toHaveAttribute('href', '#main')
  })

  test('traduit le lien d’évitement', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    )
  })

  test('ne présente aucune violation axe de niveau serious ou critical', async ({ page }) => {
    await page.goto('/fr')
    await expectNoBlockingAxeViolations(page, '/fr')
  })
})
