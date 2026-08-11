import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '../support/test'

test.describe('page d’accueil', () => {
  test('se charge, porte le bon titre, et ne produit aucune erreur console', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    const response = await page.goto('/')

    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/Portfolio/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portfolio')
    expect(consoleErrors).toEqual([])
  })

  test('le lien d’évitement est le premier élément focusable et mène au contenu', async ({
    page,
  }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')

    const focused = page.locator(':focus')
    await expect(focused).toHaveText('Aller au contenu principal')
    await expect(focused).toHaveAttribute('href', '#main')
  })

  test('ne présente aucune violation axe de niveau serious ou critical', async ({ page }) => {
    await page.goto('/')

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    const blocking = violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    )
    expect(blocking.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([])
  })
})
