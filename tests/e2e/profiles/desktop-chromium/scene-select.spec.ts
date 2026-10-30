import type { Page } from '@playwright/test'

import { monterLaScene, PANNEAU, RACINE, sceneAuRepos, TEMOIN } from '../../support/scene'
import { sitemapPaths } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * P8-15f — un clic sur un processeur de la carte mène à la fiche du projet (`carte-mere.md` §8),
 * par une navigation CLIENT : `router.push`, jamais la caméra (§3).
 *
 * ⛔ Aucune entité ni aucune position n'est écrite ici. Le processeur est TROUVÉ : le pointeur
 * balaie la zone libre jusqu'à ce que la racine annonce `data-scene-hover="processor"` ; la fiche
 * attendue est une de celles que le sitemap liste sous `/fr/projects/`.
 */

/**
 * Pas du balayage, en pixels : un processeur cadré par la vue des projets en couvre une centaine
 * sur l'écran du profil (1440 × 900) ; 48 px ne peut pas en sauter un.
 */
const PAS_PX = 48

/**
 * Le genre de cible survolée, lu après une tâche : le survol arrive d'un écouteur natif, et React
 * pose l'attribut dans une tâche suivante. ⛔ Pas d'attente d'image : sous SwiftShader, une image
 * de la boucle continue coûte assez pour que le balayage dépasse le délai du test.
 */
function survolee(page: Page): Promise<string | undefined> {
  return page.evaluate(
    (racine) =>
      new Promise<string | undefined>((resoudre) =>
        setTimeout(() =>
          resoudre(document.querySelector<HTMLElement>(racine)?.dataset['sceneHover']),
        ),
      ),
    RACINE,
  )
}

/**
 * Balaie la zone libre (à droite du panneau, sous l'en-tête) jusqu'à survoler un processeur —
 * **du centre vers les bords** : la vue des projets cadre le quartier des processeurs au centre
 * de la zone libre, et chaque point coûte cher sous SwiftShader (la boucle tourne en continu).
 */
async function trouverUnProcesseur(page: Page): Promise<{ x: number; y: number } | null> {
  const viewport = page.viewportSize()!
  const panneau = (await page.locator(PANNEAU).boundingBox())!
  const entete = (await page.locator('header').first().boundingBox())?.height ?? 0
  const gauche = panneau.x + panneau.width
  const centre = { x: (gauche + viewport.width) / 2, y: (entete + viewport.height) / 2 }
  const points: { x: number; y: number }[] = []
  for (let y = entete + PAS_PX / 2; y < viewport.height; y += PAS_PX) {
    for (let x = gauche + PAS_PX / 2; x < viewport.width; x += PAS_PX) points.push({ x, y })
  }
  points.sort(
    (a, b) =>
      Math.hypot(a.x - centre.x, a.y - centre.y) - Math.hypot(b.x - centre.x, b.y - centre.y),
  )
  for (const point of points) {
    await page.mouse.move(point.x, point.y)
    if ((await survolee(page)) === 'processor') return point
  }
  return null
}

test.describe('carte mère — survol et clic', () => {
  test('un clic sur un processeur mène à la fiche du projet, sans recharger', async ({ page }) => {
    // Première image (shaders compris) et balayage : au-delà des 30 s par défaut sous charge.
    test.setTimeout(90_000)
    const fiches = (await sitemapPaths(page.request)).filter((chemin) =>
      chemin.startsWith('/fr/projects/'),
    )
    expect(fiches.length).toBeGreaterThan(0)

    await monterLaScene(page, '/fr/projects')
    await sceneAuRepos(page)

    const point = await trouverUnProcesseur(page)
    expect(point, 'aucun processeur sous le pointeur dans la zone libre').not.toBeNull()
    // Le survol allume : le pointeur de lien le dit.
    await expect(page.locator(RACINE)).toHaveCSS('cursor', 'pointer')

    await page.mouse.click(point!.x, point!.y)

    await expect(page).toHaveURL((url) => fiches.includes(url.pathname))
    // ⭐ Le même canvas : la navigation est client, comme celle d'un lien du site.
    await expect(page.locator(TEMOIN)).toBeAttached()
    // ⭐ Review Focus 4 : le survol ne survit pas au changement de route.
    await expect(page.locator(RACINE)).not.toHaveAttribute('data-scene-hover', /.+/)
  })
})
