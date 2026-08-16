import { expect, test } from '../../support/test'

// Le contenu doit exister sans JavaScript : c'est ce que voit un crawler, et
// c'est la garantie structurelle du SEO (vision.md §5.3, ADR-0003).
// Profil `no-js` uniquement — filtré par `testMatch` dans playwright.config.ts.
test.describe('sans JavaScript', () => {
  test('le contenu et les repères sont présents dans le HTML servi', async ({ page }) => {
    await page.goto('/fr')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aurélien Feignon')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Aller au contenu principal' })).toHaveAttribute(
      'href',
      '#main',
    )
  })

  test('la navigation et le changement de langue fonctionnent sans JavaScript', async ({
    page,
  }) => {
    // Ce sont des balises `<a>`, pas des gestionnaires d'événements : rien à
    // hydrater, donc rien à perdre. C'est ce qui rend le profil `no-js` vrai par
    // construction plutôt que par vérification (P3-02).
    await page.goto('/fr')

    await page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByText('Projets')
      .click()
    await expect(page).toHaveURL(/\/fr\/projects$/)

    await page.getByRole('link', { name: 'English' }).click()
    await expect(page).toHaveURL(/\/en\/projects$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Projects')
  })

  test('la racine négocie la langue et redirige, sans JavaScript', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/(fr|en)$/)
  })

  test('une adresse inconnue rend la page introuvable localisée', async ({ page }) => {
    // La 404 de P4-07 est servie par une **réécriture du proxy** vers une page
    // prérendue : rien n'y dépend du navigateur. Ce parcours le prouve plutôt
    // que de le supposer — et c'est la page que voit un robot d'indexation, qui
    // n'exécute pas toujours de JavaScript.
    const response = await page.goto('/fr/rien')

    expect(response?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page introuvable')
    await expect(page.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute(
      'href',
      '/fr',
    )
  })
})
