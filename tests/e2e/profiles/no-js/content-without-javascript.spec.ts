import { expect, test } from '../../support/test'

// Le contenu doit exister sans JavaScript : c'est ce que voit un crawler, et
// c'est la garantie structurelle du SEO (vision.md §5.3, ADR-0003).
// Profil `no-js` uniquement — filtré par `testMatch` dans playwright.config.ts.
test.describe('sans JavaScript', () => {
  test('le contenu et les repères sont présents dans le HTML servi', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portfolio')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Aller au contenu principal' })).toHaveAttribute(
      'href',
      '#main',
    )
  })
})
