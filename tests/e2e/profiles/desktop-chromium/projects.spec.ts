import { expectNoBlockingAxeViolations } from '../../support/axe'
import { detailPath } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * Les projets, et le **premier corps MDX rendu du site** (P4-05).
 *
 * Joué sur un seul profil : ces assertions portent sur la structure du document
 * servi, qui ne dépend d'aucun profil.
 *
 * Aucune entité de `content/` n'est nommée : la fiche visitée est déduite du
 * sitemap.
 */
test.describe('projets', () => {
  test('la fiche rend le corps MDX, et pas sa source', async ({ page }) => {
    await page.goto(await detailPath(page.request, 'fr', 'projects'))

    // ⚠️ Le corps est visé par son **rôle**, pas la page : `main p` était
    // satisfait par le seul résumé, et ne prouvait donc rien de la compilation.
    const body = page.getByRole('main').getByRole('article')

    // Un corps non compilé s'afficherait tel quel : le Markdown deviendrait du
    // texte, `**gras**` resterait `**gras**`, et la page paraîtrait « presque
    // bonne ». Ce qui prouve la compilation est l'existence, **dans le corps**,
    // d'éléments que la source ne contient pas.
    await expect(body.locator('p')).not.toHaveCount(0)
    await expect(body.locator('strong')).not.toHaveCount(0)
    await expect(body.getByText(/\*\*/)).toHaveCount(0)

    // La résolution des slugs est prouvée ailleurs — au dépôt (ordre et levée)
    // et au composant. Ce qui reste propre à **cette** page est que le bloc y
    // soit bien rendu, sur la même navigation.
    await expect(
      page.getByRole('main').getByRole('list', { name: 'Technologies' }).getByRole('listitem'),
    ).not.toHaveCount(0)
  })

  test('le corps respire : deux blocs consécutifs ne se touchent pas', async ({ page }) => {
    // ⚠️ Ce parcours existe parce que le défaut est **invisible aux autres
    // gardes** : une règle de spécificité 0,1,1 l'emportait sur celle du rythme
    // (0,1,0), et aucun paragraphe ni aucune liste n'avait d'espacement. La page
    // rendait un mur de texte, avec tous les tests verts et un axe propre.
    await page.goto(await detailPath(page.request, 'fr', 'projects'))

    const blocks = page.getByRole('main').getByRole('article').locator('> *')
    const count = await blocks.count()
    expect(count).toBeGreaterThan(1)

    for (let index = 1; index < count; index += 1) {
      const previous = await blocks.nth(index - 1).boundingBox()
      const current = await blocks.nth(index).boundingBox()
      const gap = (current?.y ?? 0) - ((previous?.y ?? 0) + (previous?.height ?? 0))

      expect(gap, `les blocs ${index - 1} et ${index} du corps se touchent`).toBeGreaterThan(4)
    }
  })

  test('ni la liste ni la fiche ne présentent de violation axe', async ({ page }) => {
    for (const url of ['/fr/projects', await detailPath(page.request, 'fr', 'projects')]) {
      await page.goto(url)
      await expectNoBlockingAxeViolations(page, url)
    }
  })
})
