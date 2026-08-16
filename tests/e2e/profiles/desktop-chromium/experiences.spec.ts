import { expectNoBlockingAxeViolations } from '../../support/axe'
import { detailPath } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * Les expériences, de la liste à la fiche (P4-04).
 *
 * Joué sur **un seul profil** : ces assertions portent sur la structure du
 * document servi, qui ne dépend d'aucun profil. Les répéter quatre fois
 * donnerait quatre fois le même résultat — c'est la convention que
 * `i18n-routing.spec.ts` documente au même endroit.
 *
 * Aucune entité de `content/` n'est nommée : la fiche visitée est déduite du
 * sitemap. Le contenu appartient à l'auteur du site et changera ; ce qui est
 * testé est la propriété qui doit rester vraie.
 *
 * ⚠️ Chaque assertion de ce fichier est précédée d'un **compte** ou vise un
 * élément **nommé**. La première version ne faisait ni l'un ni l'autre : elle
 * bouclait sur une collection qui pouvait être vide, et désignait une liste par
 * sa position — celle du sélecteur de langue, pas celle des technologies. Deux
 * gardes verts qui n'avaient rien inspecté.
 */
test.describe('expériences', () => {
  test('la liste titre chaque poste, date à l’année, et mène à sa fiche', async ({ page }) => {
    await page.goto('/fr/experiences')

    const main = page.getByRole('main')
    const entries = main.getByRole('heading', { level: 2 })
    await expect(entries).not.toHaveCount(0)

    // La période est affichée **à l'année** : c'est la précision tranchée en
    // P4-04, et la seule que le contenu connaisse réellement (décision D1). Un
    // `datetime` plus précis affirmerait à une machine un jour inventé.
    const stamps = await main
      .locator('time')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('datetime')))

    // Sans ce compte, la boucle qui suit passe sur une liste vide — c'est-à-dire
    // aussi le jour où les `<time>` disparaîtraient.
    expect(stamps.length).toBeGreaterThan(0)
    for (const value of stamps) {
      expect(value).toMatch(/^\d{4}$/)
    }

    await entries.first().getByRole('link').click()
    await expect(page).toHaveURL(/\/fr\/experiences\/[^/]+$/)
  })

  test('la fiche nomme ses réalisations et résout sa pile technique', async ({ page }) => {
    await page.goto(await detailPath(page.request, 'fr', 'experiences'))

    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(main.getByRole('heading', { level: 2, name: 'Réalisations' })).toBeVisible()

    // La liste est désignée par son **nom accessible**, que lui donne
    // `aria-labelledby`. La désigner par sa position visait le sélecteur de
    // langue, et le garde inspectait « Français ».
    const stack = main.getByRole('list', { name: 'Technologies' })
    const labels = await stack.getByRole('listitem').allTextContents()
    expect(labels.length).toBeGreaterThan(0)

    // Les `technologies` du frontmatter sont des **slugs** de compétence, que la
    // page résout en libellés via le référentiel. Un slug est minuscule par
    // schéma ; un libellé réel ne l'est pas tout entier. Si la résolution
    // tombait, **tous** les éléments seraient des slugs — donc aucune capitale
    // dans la liste entière. C'est la propriété testée, et elle ne nomme aucune
    // technologie en particulier.
    expect(labels.some((label) => /[A-Z]/.test(label))).toBe(true)
  })

  test('la fiche traduit ses titres de blocs', async ({ page }) => {
    await page.goto(await detailPath(page.request, 'en', 'experiences'))

    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { level: 2, name: 'Highlights' })).toBeVisible()
    await expect(main.getByRole('heading', { level: 2, name: 'Tech stack' })).toBeVisible()
  })

  test('ni la liste ni la fiche ne présentent de violation axe', async ({ page }) => {
    // La passe d'accessibilité complète est P4-10. Ce parcours-ci existe parce
    // que le seul audit axe du dépôt visait `/fr` : écrire « 0 violation » pour
    // des pages que rien n'analyse est exactement l'affirmation que ce projet
    // refuse.
    for (const url of ['/fr/experiences', await detailPath(page.request, 'fr', 'experiences')]) {
      await page.goto(url)
      await expectNoBlockingAxeViolations(page, url)
    }
  })
})
