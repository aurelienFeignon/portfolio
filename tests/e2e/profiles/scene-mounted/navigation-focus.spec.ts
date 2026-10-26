import type { Page } from '@playwright/test'

import { detailPath } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * @covers E2E-15
 *
 * P7-05 — le focus après une navigation **client**, quand la scène est montée.
 *
 * ⛔⛔ **Le défaut que ce parcours a vu rouge** : depuis NEXUS (#58), un lien ne
 * recharge plus la page (`router.push`), et le lien activé disparaît avec le
 * layout de son endroit. Le focus tombait sur `<body>` **sans point de départ** :
 * le Tab suivant allait au lien « accueil » après un lien d'en-tête — le lien
 * d'évitement sauté —, et au lien de retour après l'ouverture d'une fiche —
 * l'en-tête entier sauté. Chaque entrée posait son propre départ.
 *
 * ⭐ **La règle retenue : une navigation client se comporte comme un chargement**
 * (`src/routing/focus-reset.ts`). Le premier Tab rend le lien d'évitement, sans
 * anneau autour de la page, et le nom de la page est dit par l'annonceur de
 * route de Next — exactement ce que vit un visiteur sans WebGL ni JavaScript.
 *
 * ⭐ **Joué sous Chromium ET WebKit** (`scene-mounted/`) : l'assertion sur
 * l'anneau tient sous Chromium même sans `focusVisible: false` — mutation
 * survivante à bon droit —, et ne rougit que sous WebKit (2 cas sur 4, mesuré).
 *
 * ⛔ **Le témoin posé sur le canvas n'est pas décoratif** : sans lui, une
 * navigation qui rechargerait la page passerait ce parcours au vert — un
 * chargement remet le focus au début par construction. Il prouve que c'est bien
 * une navigation client qui a été jugée.
 */
const RACINE = '[data-scene-root]'
const TEMOIN = `${RACINE} canvas[data-temoin="meme-canvas"]`

async function monterLaScene(page: Page, chemin: string) {
  await page.goto(chemin)
  const canvas = page.locator(`${RACINE} canvas`)
  await expect(canvas).toBeAttached({ timeout: 10_000 })
  await canvas.evaluate((element) => element.setAttribute('data-temoin', 'meme-canvas'))
}

function navigationPrincipale(page: Page) {
  return page.getByRole('navigation', { name: 'Navigation principale' })
}

async function attendreLeDebutDuDocument(page: Page) {
  await expect(page.locator(TEMOIN)).toBeAttached()

  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true)
  // Le `tabindex` posé pour prendre le focus ne survit pas : `<body>` ne doit
  // pas devenir un arrêt de tabulation.
  await expect(page.locator('body')).not.toHaveAttribute('tabindex')
  expect(await page.evaluate(() => document.body.matches(':focus-visible'))).toBe(false)

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Aller au contenu principal' })).toBeFocused()
}

/**
 * L'annonce est celle de Next : on ne la produit pas, mais c'est elle qui rend
 * ce choix sûr — sans elle, un lecteur d'écran n'entendrait rien.
 *
 * ⛔ Elle doit nommer la page **d'arrivée** : le titre, ou le `h1` quand Next lit
 * avant que le titre soit posé (mesuré). Une simple inclusion dans le titre
 * passait sur l'annonce précédente, pas encore remplacée.
 */
async function attendreLAnnonce(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const annonce = document.querySelector('next-route-announcer')?.shadowRoot?.textContent
        const titre = document.querySelector('main h1')?.textContent?.trim()
        return annonce !== '' && (annonce === document.title || annonce === titre)
      }),
    )
    .toBe(true)
}

test.describe('focus après une navigation client', () => {
  test('un lien d’en-tête, activé au clavier', async ({ page }) => {
    await monterLaScene(page, '/fr')
    await navigationPrincipale(page).getByRole('link', { name: 'Projets' }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/fr\/projects$/)
    await attendreLAnnonce(page)
    await attendreLeDebutDuDocument(page)
  })

  test('un lien vers la page affichée, dont le chemin ne change pas', async ({ page }) => {
    await monterLaScene(page, '/fr/projects')
    await navigationPrincipale(page).getByRole('link', { name: 'Projets' }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/fr\/projects$/)
    await attendreLeDebutDuDocument(page)
  })

  test('un lien du panneau vers une fiche', async ({ page }) => {
    const fiche = await detailPath(page.request, 'fr', 'projects')
    await monterLaScene(page, '/fr/projects')
    await page.locator(`main a[href="${fiche}"]`).first().focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL((url) => url.pathname === fiche)
    await attendreLAnnonce(page)
    await attendreLeDebutDuDocument(page)
  })

  test('Échap, depuis une section', async ({ page }) => {
    await monterLaScene(page, '/fr/skills')
    // ⛔ Le focus est posé AVANT Échap : sans lui, il n'a jamais quitté le début du
    // document, et ce cas passait au vert sur le défaut même — mesuré.
    await page.locator('main a').first().focus()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/fr$/)
    await attendreLAnnonce(page)
    await attendreLeDebutDuDocument(page)
  })

  test('le bouton Précédent du navigateur', async ({ page }) => {
    await monterLaScene(page, '/fr')
    await navigationPrincipale(page).getByRole('link', { name: 'Expériences' }).click()
    await expect(page).toHaveURL(/\/fr\/experiences$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/fr$/)
    await attendreLAnnonce(page)
    await attendreLeDebutDuDocument(page)
  })
})
