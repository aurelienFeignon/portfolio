import type { Page } from '@playwright/test'

import { CANVAS, monterLaScene, navigationPrincipale, PREMIERE_IMAGE_MS } from '../../support/scene'
import { expect, test } from '../../support/test'

/**
 * @covers E2E-17
 *
 * P7-06 — pendant une transition de caméra, le panneau de lecture **ne bouge pas** :
 * il porte déjà la page d'arrivée, seul, entièrement lisible et utilisable.
 *
 * ⭐ Décision de l'utilisateur, le 2026-10-28 (journal de l'ADR-0004). Le masquage
 * que l'ADR prévoyait cachait le décalage d'un panneau PROJETÉ sur un écran 3D ;
 * depuis D11 le panneau est fixe, et le cacher 1,6 s ne ferait que retarder le
 * contenu — au moment même où le focus revient au début du document (P7-05).
 *
 * ⛔⛔ **Lu PENDANT la transition, et prouvé tel.** Chaque relevé est pris dans le
 * même `evaluate` que `data-camera-transition`, et n'est retenu que si celui-ci
 * vaut `true` : sans ce témoin, un relevé pris après l'arrivée passerait au vert
 * sur un panneau masqué tout le temps du mouvement.
 */

/** Le panneau tel qu'un visiteur le trouve à cet instant, et l'état de la caméra. */
function releve(page: Page) {
  return page.evaluate(() => {
    const panneaux = document.querySelectorAll('[data-reading-panel]')
    const panneau = panneaux[0] as HTMLElement | undefined
    // Lisible = rien, du panneau à la racine, ne l'efface, ne le cache ni ne le
    // retire aux technologies d'assistance ou au clavier.
    let opacite = 1
    let cache = false
    for (let noeud = panneau ?? null; noeud !== null; noeud = noeud.parentElement) {
      const style = getComputedStyle(noeud)
      opacite *= Number(style.opacity)
      cache ||=
        style.display === 'none' ||
        style.visibility !== 'visible' ||
        noeud.inert ||
        noeud.getAttribute('aria-hidden') === 'true'
    }
    return {
      transition: document
        .querySelector('[data-scene-root] canvas')
        ?.getAttribute('data-camera-transition'),
      panneaux: panneaux.length,
      titre: panneau?.querySelector('h1')?.textContent?.trim() ?? null,
      opacite,
      cache,
    }
  })
}

/** Le premier relevé pris pendant que la caméra se déplace. */
async function releveEnTransition(page: Page) {
  let lu: Awaited<ReturnType<typeof releve>> | undefined
  await expect
    .poll(
      async () => {
        lu = await releve(page)
        return lu.transition
      },
      { intervals: [16], message: 'aucune transition de caméra observée' },
    )
    .toBe('true')
  return lu!
}

test.describe('le panneau pendant une transition de caméra', () => {
  test('il porte la page d’arrivée, seul, lisible', async ({ page }) => {
    await monterLaScene(page, '/fr')
    const canvas = page.locator(CANVAS)

    // Accueil → section, section → section, puis Échap → accueil : les trois sortes
    // de mouvement que la route commande.
    const etapes: Array<{ aller: () => Promise<void>; titre: string }> = [
      {
        aller: () => navigationPrincipale(page).getByRole('link', { name: 'Projets' }).click(),
        titre: 'Projets',
      },
      {
        aller: () => navigationPrincipale(page).getByRole('link', { name: 'Compétences' }).click(),
        titre: 'Compétences',
      },
      { aller: () => page.keyboard.press('Escape'), titre: 'Aurélien Feignon' },
    ]

    for (const { aller, titre } of etapes) {
      // Partir d'une caméra immobile : une transition déjà en cours prouverait le
      // relevé sur le mouvement PRÉCÉDENT.
      await expect(canvas).toHaveAttribute('data-camera-transition', 'false', {
        timeout: PREMIERE_IMAGE_MS,
      })
      await aller()
      expect(await releveEnTransition(page)).toEqual({
        transition: 'true',
        panneaux: 1,
        titre,
        opacite: 1,
        cache: false,
      })
    }
  })
})
