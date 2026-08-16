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
  test.describe('quand l’URL porte une locale, elle décide', () => {
    for (const [label, path] of [
      ['un slug inconnu', '/fr/projects/inconnu'],
      ['une section inconnue', '/fr/rien'],
    ] as const) {
      test(`${label} répond 404 avec une page française complète`, async ({ page }) => {
        // Le navigateur de ce profil annonce `en-US` : c'est donc bien l'URL qui
        // décide, et l'assertion sur le français le prouve au lieu de le
        // supposer.
        const response = await page.goto(path)

        // ⚠️ Le statut compte autant que le contenu. Une réécriture rend 200 par
        // défaut : servir la bonne page avec le mauvais statut dirait à un
        // moteur de recherche que l'adresse existe.
        expect(response?.status()).toBe(404)
        await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page introuvable')
      })
    }
  })

  test.describe('quand l’URL n’en porte pas, la langue est négociée', () => {
    // ⚠️ Ces deux cas ont d'abord été écrits en attendant du français, et ils
    // ont échoué : le profil `desktop-chromium` annonce `en-US`, et le proxy
    // avait raison de servir l'anglais. Un test qui n'énonce pas la langue du
    // visiteur ne teste pas la négociation — il teste le hasard du profil.
    for (const [label, path] of [
      ['une locale inconnue', '/de/projects'],
      ['un chemin sans locale', '/rien'],
    ] as const) {
      for (const [locale, lang, title] of [
        ['fr-FR', 'fr', 'Page introuvable'],
        ['en-US', 'en', 'Page not found'],
      ] as const) {
        test(`${label}, pour un visiteur ${locale}, répond 404 en ${lang}`, async ({ browser }) => {
          const context = await browser.newContext({ locale })
          const page = await context.newPage()

          const response = await page.goto(path)

          expect(response?.status()).toBe(404)
          await expect(page.locator('html')).toHaveAttribute('lang', lang)
          await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)

          await context.close()
        })
      }
    }
  })

  test('l’URL demandée est conservée, la page n’est pas une redirection', async ({ page }) => {
    // Une redirection vers `/fr/404` ferait perdre l'adresse fautive : le
    // visiteur ne pourrait plus corriger sa faute de frappe, et un journal
    // d'accès ne dirait plus quelle URL est morte.
    await page.goto('/fr/projects/inconnu')

    await expect(page).toHaveURL(/\/fr\/projects\/inconnu$/)
  })

  test('l’URL l’emporte sur la langue du navigateur', async ({ browser }) => {
    // `/en/rien` demandé par un navigateur francophone : le visiteur a
    // explicitement demandé l'anglais en tapant l'URL.
    const context = await browser.newContext({ locale: 'fr-FR' })
    const page = await context.newPage()

    const response = await page.goto('/en/rien')

    expect(response?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found')

    await context.close()
  })

  test('offre des liens de secours qui mènent réellement quelque part', async ({ page }) => {
    await page.goto('/fr/rien')

    const main = page.getByRole('main')
    await expect(main.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute(
      'href',
      '/fr',
    )

    // Les trois sections, et pas seulement leur présence : un `href` juste vers
    // une route absente donnerait le même test vert.
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
