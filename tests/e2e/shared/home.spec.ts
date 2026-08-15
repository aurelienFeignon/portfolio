import { expect, test } from '../support/test'

/**
 * L'accueil (P4-03).
 *
 * Ce que ces parcours gardent et que les tests de composants ne peuvent pas :
 * `SectionGuide` sait rendre trois entrées, mais que la page lui passe **les
 * trois sections du site**, dans la bonne langue, se décide dans la page — et
 * l'unicité du `h1` comme l'alignement sont des propriétés du document
 * assemblé, pas d'un composant.
 *
 * Ce fichier est dans `shared/` : chaque `test` y coûte un contexte de
 * navigateur sur quatre profils. Les assertions qui portent sur le même DOM
 * initial tiennent donc dans un seul test.
 *
 * Aucune section n'est déduite du contenu : ce sont des constantes de routage.
 */
test.describe('accueil', () => {
  test('porte un seul h1, donne accès aux trois sections, et aligne son contenu', async ({
    page,
  }) => {
    await page.goto('/fr')

    // Un second `h1` passerait inaperçu à l'œil et casserait le plan du document
    // pour qui le parcourt par titres. Les entrées de section sont des `h2`.
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

    const main = page.getByRole('main')
    for (const [name, href] of [
      ['Expériences', '/fr/experiences'],
      ['Projets', '/fr/projects'],
      ['Compétences', '/fr/skills'],
    ] as const) {
      await expect(main.getByRole('link', { name })).toHaveAttribute('href', href)
    }

    // `container` borne la mesure au même endroit pour l'en-tête, le pied de
    // page et les gabarits — c'est tout l'intérêt de l'avoir écrit une fois.
    // Rien ne le vérifiait : un `main` qui se réduit à son contenu au lieu de
    // remplir sa largeur maximale donne exactement les mêmes tests verts et un
    // titre décalé de plusieurs centaines de pixels sous la marque.
    const brand = await page
      .getByRole('banner')
      .getByRole('link', { name: 'Aurélien Feignon' })
      .boundingBox()
    const heading = await page.getByRole('heading', { level: 1 }).boundingBox()

    expect(brand).not.toBeNull()
    expect(heading).not.toBeNull()
    expect(Math.abs((heading?.x ?? 0) - (brand?.x ?? 0))).toBeLessThanOrEqual(1)

    // La même page dans l'autre langue : les cibles suivent la locale.
    await page.goto('/en')
    await expect(page.getByRole('main').getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/en/projects',
    )
  })

  test('ces accès mènent réellement à la section', async ({ page }) => {
    // Un `href` juste et une route absente donnent la même page verte au test
    // précédent : celui-ci traverse.
    await page.goto('/fr')
    await page.getByRole('main').getByRole('link', { name: 'Compétences' }).click()

    await expect(page).toHaveURL(/\/fr\/skills$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Compétences')
  })
})
