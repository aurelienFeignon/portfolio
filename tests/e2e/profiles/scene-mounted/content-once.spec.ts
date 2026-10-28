import type { Browser, Page, TestInfo } from '@playwright/test'

import { disableWebGL } from '../../support/disable-webgl'
import { ETIQUETTES, monterLaScene, paliersAnnonces, RACINE, TEMOIN } from '../../support/scene'
import { unePageParForme } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * @covers E2E-16
 *
 * P7-04 — le contenu n'est présent qu'une fois, scène montée (R-01).
 *
 * ⭐ **Un différentiel, pas un comptage.** La même page est lue scène montée, puis
 * par un second visiteur dont WebGL est neutralisé. Deux lectures doivent être
 * **identiques** : l'arbre d'accessibilité — ce qu'un lecteur d'écran reçoit — et
 * le texte du DOM, éléments cachés compris. Aucun seuil, aucune entité nommée : un
 * bloc de `content/` dupliqué par le mode immersif ferait diverger l'une ou
 * l'autre, quel que soit le contenu du jour.
 *
 * ⛔ **Pourquoi deux lectures.** L'arbre seul ne voit pas une copie posée sous
 * `aria-hidden` ou en `display: none` ; le texte seul rougirait sur ce qui est voulu.
 *
 * ⚠️ **Deux exclusions, nommées :**
 * - **les étiquettes des univers** (`data-scene-labels`), du texte seulement : elles
 *   répètent le nom de la section, que porte aussi le `h1`. Ce sont des doublons de
 *   la navigation, `aria-hidden` à dessein (`scene-mount.tsx`) — l'arbre, lui, les
 *   lit, et c'est ce qui y garde leur `aria-hidden`.
 * - **l'annonceur de route de Next**, des deux : après une navigation client, il dit
 *   le titre de la page d'arrivée — c'est voulu (P7-05) —, là où un chargement le
 *   laisse vide.
 *
 * L'index ne voit que le HTML servi, identique dans les deux modes : la scène n'est
 * rendue que par le client.
 */

/** Ce qu'un lecteur d'écran reçoit de la page, annonceur de route excepté. */
async function arbreLu(page: Page): Promise<string> {
  const enfants = await page.locator('body > *:not(next-route-announcer)').all()
  const parties = await Promise.all(enfants.map((enfant) => enfant.ariaSnapshot()))
  // Une enveloppe `aria-hidden` rend un instantané vide : elle n'est pas dans
  // l'arbre, et ne doit pas y entrer par la jointure.
  return parties.filter((partie) => partie !== '').join('\n')
}

/** Le texte du DOM, caché compris, sans ce qui n'est pas du contenu. */
function texteDuDom(page: Page): Promise<string> {
  return page.evaluate((etiquettes) => {
    const copie = document.body.cloneNode(true) as HTMLElement
    copie
      .querySelectorAll(
        `script, style, template, next-route-announcer, nextjs-portal, ${etiquettes}`,
      )
      .forEach((element) => element.remove())
    return (copie.textContent ?? '').replace(/\s+/g, ' ').trim()
  }, ETIQUETTES)
}

async function lire(page: Page) {
  const [arbre, texte] = await Promise.all([arbreLu(page), texteDuDom(page)])
  return { arbre, texte }
}

/**
 * Le second visiteur : même appareil, **autre contexte** — rien de ce que l'un
 * stocke ne fausse la première visite de l'autre — et WebGL neutralisé.
 */
async function visiteurSansWebGL(browser: Browser, testInfo: TestInfo) {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL } =
    testInfo.project.use
  const contexte = await browser.newContext({
    ...(viewport !== undefined ? { viewport } : {}),
    ...(userAgent !== undefined ? { userAgent } : {}),
    ...(deviceScaleFactor !== undefined ? { deviceScaleFactor } : {}),
    ...(isMobile !== undefined ? { isMobile } : {}),
    ...(hasTouch !== undefined ? { hasTouch } : {}),
    ...(baseURL !== undefined ? { baseURL } : {}),
  })
  await contexte.addInitScript(disableWebGL)
  return contexte
}

/**
 * La référence : la page chargée sans WebGL. ⛔ L'absence de scène est PROUVÉE,
 * pas supposée — le palier `none` est annoncé, et aucune racine n'est montée. Sans
 * cela, une référence qui aurait monté sa scène se comparerait à elle-même.
 * ⭐ Lue quand deux lectures successives concordent : le palier est posé au repos,
 * et la page peut encore se rendre juste après. Et non vide : deux lectures vides
 * seraient identiques.
 */
async function lireSansScene(page: Page, chemin: string) {
  await page.goto(chemin)
  await expect.poll(() => paliersAnnonces(page)).toEqual(['scene:tier:none'])
  await expect(page.locator(RACINE)).toHaveCount(0)
  let precedente: Awaited<ReturnType<typeof lire>> | undefined
  await expect
    .poll(
      async () => {
        const lue = await lire(page)
        const stable = precedente?.arbre === lue.arbre && precedente.texte === lue.texte
        precedente = lue
        return stable
      },
      { intervals: [100] },
    )
    .toBe(true)
  const { arbre, texte } = precedente!
  expect(arbre).toContain('- main')
  expect(texte).not.toBe('')
  return { titre: await page.title(), arbre, texte }
}

/**
 * Une navigation **client** vers `chemin`, par un lien que le banc pose puis
 * retire aussitôt : `SceneMount` intercepte les clics sur les liens du site, d'où
 * qu'ils viennent. Aucune page ne porte un lien vers toutes les autres.
 */
async function naviguerVers(page: Page, chemin: string) {
  await page.evaluate((href) => {
    const lien = Object.assign(document.createElement('a'), { href })
    document.body.append(lien)
    lien.click()
    lien.remove()
  }, chemin)
  await expect(page).toHaveURL((url) => url.pathname === chemin)
}

test.describe('contenu présent une seule fois, scène montée', () => {
  for (const locale of ['fr', 'en']) {
    test(`le mode immersif ne duplique rien (${locale})`, async ({ page, browser }, testInfo) => {
      // Un chargement sans scène par forme de page, puis autant de navigations
      // client : au-delà des 30 s par défaut sous WebKit.
      test.slow()
      const formes = await unePageParForme(page.request, locale)

      const contexte = await visiteurSansWebGL(browser, testInfo)
      const sansScene = await contexte.newPage()
      const references = new Map<string, Awaited<ReturnType<typeof lireSansScene>>>()
      for (const chemin of formes) references.set(chemin, await lireSansScene(sansScene, chemin))
      await contexte.close()

      // ⭐ Le retour à l'accueil, après une fiche : les étiquettes y reviennent après
      // avoir été cachées (P6-12), et c'est une navigation client de plus.
      for (const [rang, chemin] of [...formes, formes[0] as string].entries()) {
        const reference = references.get(chemin)!
        if (rang === 0) await monterLaScene(page, chemin)
        else await naviguerVers(page, chemin)

        await expect(page).toHaveTitle(reference.titre)
        // ⛔ Le témoin prouve une navigation CLIENT : un rechargement remettrait la
        // page à neuf, et ne dirait rien de ce que le mode immersif y laisse.
        await expect(page.locator(TEMOIN)).toBeAttached()
        await expect(page.locator(RACINE)).toHaveAttribute('data-scene-focus', /.+/)
        await expect(page.locator('main')).toHaveCount(1)

        // ⚠️ Attendu, et non lu une fois : juste après la navigation, le panneau peut
        // encore se peindre. Une duplication qui DURE rougit ; une duplication
        // passagère, pendant la transition, relève de P7-06.
        await expect
          .poll(() => arbreLu(page), { message: `arbre de ${chemin}` })
          .toBe(reference.arbre)
        await expect
          .poll(() => texteDuDom(page), { message: `texte de ${chemin}` })
          .toBe(reference.texte)
      }
    })
  }
})
