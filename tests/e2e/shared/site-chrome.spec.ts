import { detailPath } from '../support/sitemap'
import { expect, test } from '../support/test'

/**
 * Le chrome documentaire du site (P4-02) : bannière, navigation marquée, pied de
 * page, et le lien d'évitement qui mène **réellement** au contenu.
 *
 * Pourquoi en E2E et pas seulement en composants : les composants prouvent que
 * `SiteHeader` sait marquer une section, pas que la bonne valeur lui parvient.
 * C'est le câblage des layouts qui le décide, et il n'existe qu'à l'exécution —
 * l'App Router ne donne pas l'URL à un layout, chaque section déclare la sienne.
 * Un composant vert et un layout muet passeraient inaperçus sans ce parcours.
 *
 * Aucune entité de `content/` n'est nommée ici : les sections, elles, sont des
 * constantes de routage et non du contenu.
 */
test.describe('chrome du site', () => {
  test('porte bannière, pied de page, et marque la section affichée', async ({ page }) => {
    // Trois assertions sur le même DOM initial, donc une seule navigation : ce
    // fichier est dans `shared/`, il est rejoué par quatre profils Playwright et
    // chaque test y coûte un contexte de navigateur.
    await page.goto('/fr/projects')

    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()

    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    await expect(nav.getByRole('link', { name: 'Projets' })).toHaveAttribute('aria-current', 'true')
    await expect(nav.locator('a[aria-current]')).toHaveCount(1)
  })

  test('marque la section depuis une page de détail, sans prétendre en être la page', async ({
    page,
  }) => {
    // Le même layout couvre la liste d'une section et ses pages de détail. Sur
    // celles-ci, `aria-current="page"` annoncerait « page courante » sur un lien
    // qui mène ailleurs : c'est `true` — « élément courant du groupe » — qui est
    // vrai dans les deux cas.
    //
    // L'entité n'est pas nommée en dur : elle est déduite du sitemap, comme le
    // veut la règle du dépôt (le contenu change, les tests ne doivent pas).
    // L'extraction est celle de `support/sitemap.ts`, partagée — une quatrième
    // copie maison est exactement ce que ce module a été créé pour éviter.
    await page.goto(await detailPath(page.request, 'fr', 'projects'))

    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    await expect(nav.getByRole('link', { name: 'Projets' })).toHaveAttribute('aria-current', 'true')
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(0)
  })

  test('suit la section affichée d’une page à l’autre', async ({ page }) => {
    // Le vrai risque de cette tâche : un layout de section qui déclare la
    // mauvaise valeur, ou l'oublie. Une seule page ne peut pas le montrer.
    await page.goto('/fr/skills')

    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    await expect(nav.getByRole('link', { name: 'Compétences' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(nav.getByRole('link', { name: 'Projets' })).not.toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  test('marque la marque elle-même à l’accueil, qui n’est pas une section', async ({ page }) => {
    await page.goto('/fr')

    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Aurélien Feignon' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('la marque ramène à l’accueil de la langue affichée', async ({ page }) => {
    await page.goto('/en/projects')

    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Aurélien Feignon' }),
    ).toHaveAttribute('href', '/en')
  })

  test('le lien d’évitement mène au point de repère principal', async ({ page }) => {
    await page.goto('/fr/projects')

    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    // Deux moitiés d'une même preuve : la cible est atteinte, et elle est bien
    // le `main`. Vérifier l'`href` seul — ce que faisait le test de fumée —
    // n'exclut pas un `#main` posé sur autre chose, ou sur rien.
    await expect(page).toHaveURL(/#main$/)
    await expect(page.getByRole('main')).toHaveAttribute('id', 'main')
  })
})
