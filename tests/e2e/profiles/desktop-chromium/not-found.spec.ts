import { expectNoBlockingAxeViolations } from '../../support/axe'
import { sitemapPaths } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * La page introuvable, localisée (P4-07).
 *
 * **Pourquoi ce parcours ne peut pas être remplacé par des tests unitaires.**
 * Ce qui est en cause n'est ni le proxy seul — couvert par
 * `tests/unit/proxy.test.ts` — ni la page seule, mais leur **composition à
 * l'exécution** : la réécriture doit atteindre une page prérendue, en portant un
 * statut 404 que Next ne donne pas par défaut à une réécriture. Rien de tout
 * cela n'existe avant que l'image ne serve.
 *
 * ⚠️ **Ce parcours est le premier à faire passer un audit axe sur une 404.** Le
 * défaut que P4-07 corrige — une page servie hors du layout racine, donc sans
 * `lang` — est une violation WCAG 3.1.1 que le gate d'accessibilité n'avait
 * jamais pu voir, faute d'un parcours qui visite cette page.
 *
 * Profil `desktop-chromium` seul : ce sont des assertions sur une réponse HTTP et
 * sur un document servi, identiques sur les quatre profils. Les rejouer quatre
 * fois donnerait quatre fois le même résultat (playwright.config.ts).
 *
 * Aucune entité de `content/` n'est nommée : les URL inconnues le sont par
 * construction, et l'unique URL réelle est déduite du sitemap.
 */
test.describe('page introuvable', () => {
  test.describe('les manières de ne pas exister', () => {
    // ⚠️ La langue attendue est **déclarée**, jamais supposée. Deux cas ont
    // d'abord été écrits en attendant du français : le profil annonce `en-US`,
    // et le proxy avait raison de servir l'anglais. Un test qui n'énonce pas la
    // langue du visiteur teste le hasard du profil, pas la négociation.
    const cases = [
      // L'URL porte la locale : elle décide, quel que soit le navigateur.
      ['un slug inconnu', '/fr/projects/inconnu', 'en-US', 'fr', 'Page introuvable'],
      ['une section inconnue', '/fr/rien', 'en-US', 'fr', 'Page introuvable'],
      ['une locale explicite', '/en/rien', 'fr-FR', 'en', 'Page not found'],
      // L'URL n'en porte pas : la langue est négociée.
      ['une locale inconnue', '/de/projects', 'fr-FR', 'fr', 'Page introuvable'],
      ['une locale inconnue', '/de/projects', 'en-US', 'en', 'Page not found'],
      ['un chemin sans locale', '/rien', 'fr-FR', 'fr', 'Page introuvable'],
      ['un chemin sans locale', '/rien', 'en-US', 'en', 'Page not found'],
      // ⛔ Le cas que la revue a trouvé, et que la mesure a confirmé : une
      // adresse **pointée** qui n'existe pas échappait à la réécriture et
      // recevait la 404 interne de Next, sans `lang`. Il est ici pour que la
      // mesure soit rejouable, et non seulement racontée.
      ['une adresse pointée inexistante', '/wp-login.php', 'fr-FR', 'fr', 'Page introuvable'],
      ['un fichier inexistant', '/cv.pdf', 'fr-FR', 'fr', 'Page introuvable'],
    ] as const

    for (const [label, path, browserLocale, lang, title] of cases) {
      test(`${label} (${path}, navigateur ${browserLocale}) répond 404 en ${lang}`, async ({
        browser,
      }) => {
        const context = await browser.newContext({ locale: browserLocale })
        const page = await context.newPage()

        const response = await page.goto(path)

        // ⚠️ Le statut compte autant que le contenu. Une réécriture rend 200 par
        // défaut : servir la bonne page avec le mauvais statut dirait à un
        // moteur de recherche que l'adresse existe.
        expect(response?.status()).toBe(404)
        await expect(page.locator('html')).toHaveAttribute('lang', lang)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)

        await context.close()
      })
    }
  })

  test('l’URL demandée est conservée, la page n’est pas une redirection', async ({ page }) => {
    // Une redirection vers `/fr/404` ferait perdre l'adresse fautive : le
    // visiteur ne pourrait plus corriger sa faute de frappe, et un journal
    // d'accès ne dirait plus quelle URL est morte.
    await page.goto('/fr/projects/inconnu')

    await expect(page).toHaveURL(/\/fr\/projects\/inconnu$/)
  })

  test('offre des liens de secours qui mènent réellement quelque part', async ({ page }) => {
    await page.goto('/fr/rien')

    const main = page.getByRole('main')
    await expect(main.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute(
      'href',
      '/fr',
    )

    // Les trois sections viennent de `SectionGuide`, le composant de l'accueil :
    // ce parcours vérifie qu'elles mènent réellement quelque part, et pas
    // seulement qu'elles sont là — un `href` juste vers une route absente
    // donnerait le même test vert.
    for (const [name, href] of [
      ['Expériences', '/fr/experiences'],
      ['Projets', '/fr/projects'],
      ['Compétences', '/fr/skills'],
    ] as const) {
      await expect(main.getByRole('link', { name })).toHaveAttribute('href', href)
    }

    await main.getByRole('link', { name: 'Projets' }).click()
    await expect(page).toHaveURL(/\/fr\/projects$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Projets')
  })

  test('porte le chrome du site, contrairement à la 404 interne de Next', async ({ page }) => {
    // C'est la différence que la tâche paie : la page interne de Next est servie
    // hors de tout layout — sans bannière, sans pied de page et sans `lang`.
    await page.goto('/fr/rien')

    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })

  test('demande à ne pas être indexée, et ne figure pas au sitemap', async ({ page, request }) => {
    await page.goto('/fr/rien')

    // Une page qui répond 404 n'a rien à faire dans un index. Les deux moitiés
    // comptent : `noindex` le dit au robot qui y arrive, l'absence du sitemap
    // évite de l'y envoyer.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    expect(await sitemapPaths(request)).not.toContain('/fr/404')
  })

  test('la page servie n’est pas atteignable en 200 par son adresse interne', async ({
    request,
  }) => {
    // `/fr/404` est une **destination de réécriture**, pas une page du site :
    // elle est prérendue, mais le manifeste du proxy ne l'annonce pas servie —
    // le gate de rendu statique porte cette exception, et ceci l'observe.
    expect((await request.get('/fr/404')).status()).toBe(404)
  })

  test('ne présente aucune violation axe de niveau serious ou critical', async ({ page }) => {
    await page.goto('/fr/rien')
    await expectNoBlockingAxeViolations(page, '/fr/rien')
  })
})
