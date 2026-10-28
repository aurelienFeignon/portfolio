import type { Page } from '@playwright/test'

import { disableWebGL } from '../../support/disable-webgl'
import { monterLaScene, RACINE, TEMOIN } from '../../support/scene'
import { sitemapPaths } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * @covers E2E-16
 *
 * P7-04 — le contenu n'est lu qu'une fois, scène montée (R-01).
 *
 * ⭐ **Un différentiel, pas un comptage.** La même page est lue deux fois, dans le
 * même contexte : scène montée, puis WebGL neutralisé. Ce qu'un lecteur d'écran
 * reçoit — l'arbre d'accessibilité — doit être **identique**. Aucun seuil, aucune
 * entité nommée : une entrée de `content/` dupliquée par le mode immersif ferait
 * diverger les deux arbres, quel que soit le contenu du jour.
 *
 * ⛔ Un comptage du texte brut aurait rougi à tort : les étiquettes des univers
 * répètent le nom de la section, que porte aussi le `h1`. Elles sont `aria-hidden`
 * — doublons de la navigation, à dessein (`scene-mount.tsx`) —, donc absentes de
 * l'arbre, et c'est l'arbre que R-01 protège : « double lecture par lecteur
 * d'écran » (`vision.md`). L'index, lui, ne voit que le HTML servi, identique dans
 * les deux modes puisque la scène n'est rendue que par le client.
 *
 * ⚠️ **Une exclusion, nommée** : l'annonceur de route de Next. Après une
 * navigation client, il dit le titre de la page d'arrivée — c'est voulu (P7-05,
 * `navigation-focus.spec.ts`) —, alors qu'un chargement le laisse vide. L'inclure
 * ferait de chaque navigation une « duplication ».
 */

/** Ce qu'un lecteur d'écran reçoit de la page, annonceur de route excepté. */
async function arbreLu(page: Page): Promise<string> {
  const parties: string[] = []
  for (const enfant of await page.locator('body > *:not(next-route-announcer)').all()) {
    // Une enveloppe `aria-hidden` rend un instantané vide : elle n'est pas dans
    // l'arbre, et ne doit pas y entrer par la jointure.
    const partie = await enfant.ariaSnapshot()
    if (partie !== '') parties.push(partie)
  }
  return parties.join('\n')
}

/**
 * Une page de chaque FORME servie, déduite du sitemap : l'accueil, chaque section,
 * une fiche par section qui en a. L'accueil d'abord : c'est là que la scène se monte.
 */
async function unePageParForme(page: Page): Promise<string[]> {
  const formes = new Map<string, string>()
  for (const chemin of await sitemapPaths(page.request)) {
    const segments = chemin.split('/').filter(Boolean)
    if (segments[0] !== 'fr') continue
    const forme = segments.length === 3 ? `fiche:${segments[1]}` : (segments[1] ?? 'accueil')
    if (!formes.has(forme)) formes.set(forme, chemin)
  }
  const chemins = [...formes.values()].sort((a, b) => a.split('/').length - b.split('/').length)
  // Sans fiche, le cas où la scène est cachée ne serait pas joué.
  expect(chemins.some((chemin) => chemin.split('/').length === 4)).toBe(true)
  expect(chemins[0]).toBe('/fr')
  return chemins
}

/**
 * La référence : la page chargée sans WebGL. ⛔ L'absence de scène est PROUVÉE,
 * pas supposée — le palier `none` est annoncé, et aucune racine n'est montée. Sans
 * cela, une référence qui aurait monté sa scène se comparerait à elle-même.
 */
async function lireSansScene(page: Page, chemin: string) {
  await page.goto(chemin)
  await expect
    .poll(() =>
      page.evaluate(() =>
        performance
          .getEntriesByType('mark')
          .map((repere) => repere.name)
          .filter((nom) => nom.startsWith('scene:tier:')),
      ),
    )
    .toEqual(['scene:tier:none'])
  await expect(page.locator(RACINE)).toHaveCount(0)
  return { titre: await page.title(), arbre: await arbreLu(page) }
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

test.describe('contenu lu une seule fois, scène montée', () => {
  test('le mode immersif ne change rien de ce qu’un lecteur d’écran reçoit', async ({
    page,
    context,
  }) => {
    // Six chargements sans scène, une scène montée et cinq navigations.
    test.slow()
    const chemins = await unePageParForme(page)

    const sansScene = await context.newPage()
    await sansScene.addInitScript(disableWebGL)
    const references = new Map<string, Awaited<ReturnType<typeof lireSansScene>>>()
    for (const chemin of chemins) references.set(chemin, await lireSansScene(sansScene, chemin))
    await sansScene.close()

    for (const [rang, chemin] of chemins.entries()) {
      const reference = references.get(chemin)!
      if (rang === 0) await monterLaScene(page, chemin)
      else await naviguerVers(page, chemin)

      await expect(page).toHaveTitle(reference.titre)
      // ⛔ Le témoin prouve une navigation CLIENT : un rechargement remettrait la
      // page à neuf, et ne dirait rien de ce que le mode immersif y laisse.
      await expect(page.locator(TEMOIN)).toBeAttached()
      await expect(page.locator(RACINE)).toHaveAttribute('data-scene-focus', /.+/)
      await expect(page.locator('main')).toHaveCount(1)

      // Un arbre vide serait identique à un autre arbre vide.
      expect(reference.arbre).toContain('- main')
      // ⚠️ Attendu, et non lu une fois : juste après la navigation, le panneau peut
      // encore se peindre. Une duplication qui DURE rougit ; une duplication
      // passagère, pendant la transition, relève de P7-06.
      await expect.poll(() => arbreLu(page), { message: chemin }).toBe(reference.arbre)
    }
  })
})
