import { ORIGIN, detailPath } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * Gabarit de titre, OpenGraph et image de partage (P4-08).
 *
 * **Pourquoi en E2E et pas seulement en unitaire.** `buildPageMetadata` est
 * couvert à 100 %, mais il ne décide pas de tout : le **gabarit** vit dans le
 * layout et n'est appliqué que par Next, à l'assemblage ; et l'`og:image` ne vaut
 * que si l'adresse qu'elle annonce **répond réellement une image**. Les deux ne
 * s'observent qu'à l'exécution.
 *
 * ⚠️ Cette dernière assertion est le point de la tâche. Une vignette de partage
 * ne casse jamais bruyamment : elle manque, et personne ne regarde une carte
 * Twitter à chaque déploiement. Le premier build de P4-08 servait d'ailleurs une
 * image que **rien ne référençait** — générée, prégénérée, invisible.
 *
 * Profil `desktop-chromium` seul : ce sont des assertions sur un document servi,
 * identiques sur les quatre profils.
 */
async function metaContent(page: import('@playwright/test').Page, selector: string) {
  return page.locator(selector).getAttribute('content')
}

test.describe('métadonnées de partage', () => {
  test('le gabarit complète le titre d’une section, sans toucher à l’accueil', async ({ page }) => {
    await page.goto('/fr/projects')
    await expect(page).toHaveTitle('Projets — Aurélien Feignon')

    // L'accueil **est** le nom du site : le gabarit le ferait bégayer.
    await page.goto('/fr')
    await expect(page).toHaveTitle('Aurélien Feignon')
  })

  test('chaque langue porte son propre séparateur', async ({ page }) => {
    // La barre verticale est le séparateur usuel en anglais, le tiret cadratin
    // en français : la formulation idiomatique, cherchée avant l'exception.
    await page.goto('/en/skills')
    await expect(page).toHaveTitle('Skills | Aurélien Feignon')
  })

  test('le titre partagé porte le suffixe, que `og:title` n’hérite d’aucun layout', async ({
    page,
  }) => {
    await page.goto('/fr/projects')

    // « Projets » seul, hors du site, ne dit pas de qui.
    expect(await metaContent(page, 'meta[property="og:title"]')).toBe('Projets — Aurélien Feignon')
  })

  test('`og:url` et le `canonical` désignent la même page', async ({ page }) => {
    await page.goto(await detailPath(page.request, 'fr', 'projects'))

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')

    expect(await metaContent(page, 'meta[property="og:url"]')).toBe(canonical)
  })

  test('déclare la langue de la page et celles où elle existe', async ({ page }) => {
    await page.goto('/fr/projects')

    expect(await metaContent(page, 'meta[property="og:locale"]')).toBe('fr_FR')
    expect(await metaContent(page, 'meta[property="og:locale:alternate"]')).toBe('en_US')
  })

  test('l’image de partage est annoncée, dimensionnée — et répond', async ({ page, request }) => {
    await page.goto('/fr/projects')

    const url = (await metaContent(page, 'meta[property="og:image"]')) ?? ''
    expect(await metaContent(page, 'meta[property="og:image:width"]')).toBe('1200')
    expect(await metaContent(page, 'meta[property="og:image:height"]')).toBe('630')

    // OpenGraph exige une URL **absolue** : un chemin relatif n'est résolu par
    // aucun consommateur, puisqu'aucun ne lit la page depuis le site.
    expect(url.startsWith(`${ORIGIN}/`)).toBe(true)

    // ⚠️ La moitié qui compte : une `og:image` vers une adresse réécrite en 404
    // est un partage sans vignette, et rien ne le dirait. La requête part sur le
    // **chemin** — l'origine de construction n'est pas joignable depuis le
    // conteneur de test, c'est la même raison qui fait exister `ORIGIN`.
    const image = await request.get(url.slice(ORIGIN.length))

    expect(image.status()).toBe(200)
    expect(image.headers()['content-type']).toContain('image/png')
    expect((await image.body()).length).toBeGreaterThan(1000)
  })

  test('chaque langue a la sienne', async ({ page }) => {
    await page.goto('/en/skills')

    expect(await metaContent(page, 'meta[property="og:image"]')).toContain('/en/opengraph-image')
  })

  test('l’icône du site est déclarée et répond', async ({ page, request }) => {
    // Sans elle, la requête d'icône que fait tout navigateur recevait la page
    // 404 complète — 14,5 Ko de HTML pour une image de 32 px.
    await page.goto('/fr')

    const href = await page.locator('link[rel="icon"]').first().getAttribute('href')
    expect(href).not.toBeNull()

    const icon = await request.get(href as string)

    expect(icon.status()).toBe(200)
    expect(icon.headers()['content-type']).toContain('image')
  })
})
