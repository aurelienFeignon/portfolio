import type { Page } from '@playwright/test'

import { CANVAS, monterLaScene, navigationPrincipale, PREMIERE_IMAGE_MS } from '../../support/scene'
import { expect, test } from '../../support/test'

/**
 * @covers E2E-17
 *
 * P7-06 — pendant une transition de caméra, le panneau de lecture **ne bouge pas** :
 * il porte déjà la page d'arrivée, seul, entièrement lisible et utilisable.
 *
 * ⭐ Décision de l'utilisateur, le 2026-10-28 (ADR-0004, révision). Le masquage
 * que l'ADR prévoyait cachait le décalage d'un panneau PROJETÉ sur un écran 3D ;
 * depuis D11 le panneau est fixe, et le cacher 1,6 s ne ferait que retarder le
 * contenu — au moment même où le focus revient au début du document (P7-05).
 *
 * ⛔⛔ **Relevé à CHAQUE image du mouvement, dans la page.** Un échantillonneur
 * `requestAnimationFrame` relit le panneau tant que `data-camera-transition` vaut
 * `true`, et s'arrête quand il retombe. Un relevé pris de l'extérieur, par aller-
 * retour, ne verrait qu'un instant — un panneau qui s'effacerait 200 ms après le
 * départ passerait au vert.
 *
 * ⚠️ **Ce qu'il ne couvre pas** : les fiches ne déplacent pas la caméra (la scène y
 * est cachée, le cadrage reste celui de la section), donc aller vers une fiche ou en
 * revenir ne produit aucune transition à relever ; et l'anglais, que la bascule de
 * langue de P7-07 exercera.
 */

interface Releve {
  readonly panneaux: number
  readonly titre: string | null
  readonly opacite: number
  readonly cache: boolean
  readonly atteignable: boolean
}

/**
 * Pose l'échantillonneur AVANT la navigation. Chaque image où la caméra se déplace
 * ajoute un relevé du `h1` du panneau — le titre, et ce qu'un visiteur en perçoit :
 *
 * - l'opacité **effective**, du titre à la racine, et rien qui le cache, le rende
 *   `inert` ou le retire aux technologies d'assistance sur ce chemin ;
 * - **atteignable** : le point de son centre lui revient. C'est ce qui voit un
 *   panneau glissé hors de l'écran, découpé, ou recouvert par la scène.
 */
function echantillonner(page: Page) {
  return page.evaluate((selecteurCanvas) => {
    const releves: Releve[] = []
    const etat = { releves, fini: false }
    Object.assign(window, { __transition: etat })
    let vue = false

    const relever = (): Releve => {
      const panneaux = document.querySelectorAll('[data-reading-panel]')
      const titre = panneaux[0]?.querySelector('h1') ?? null
      let opacite = 1
      let cache = false
      for (let noeud: HTMLElement | null = titre; noeud !== null; noeud = noeud.parentElement) {
        const style = getComputedStyle(noeud)
        opacite *= Number(style.opacity)
        cache ||=
          style.display === 'none' ||
          style.visibility !== 'visible' ||
          noeud.inert ||
          noeud.getAttribute('aria-hidden') === 'true'
      }
      const cadre = titre?.getBoundingClientRect()
      const touche =
        cadre === undefined
          ? null
          : document.elementFromPoint(cadre.x + cadre.width / 2, cadre.y + cadre.height / 2)
      return {
        panneaux: panneaux.length,
        titre: titre?.textContent?.trim() ?? null,
        opacite,
        cache,
        atteignable: titre !== null && touche !== null && titre.contains(touche),
      }
    }

    const image = () => {
      const enTransition =
        document.querySelector(selecteurCanvas)?.getAttribute('data-camera-transition') === 'true'
      if (enTransition) {
        vue = true
        releves.push(relever())
      } else if (vue) {
        etat.fini = true
        return
      }
      requestAnimationFrame(image)
    }
    requestAnimationFrame(image)
  }, CANVAS)
}

/** Les relevés d'une transition entière, attendue jusqu'à son terme. */
async function relevesDeLaTransition(page: Page): Promise<Releve[]> {
  const lire = () =>
    page.evaluate(
      () =>
        (window as unknown as { __transition: { releves: Releve[]; fini: boolean } }).__transition,
    )
  await expect
    .poll(async () => (await lire()).fini, {
      timeout: PREMIERE_IMAGE_MS,
      message: 'aucune transition de caméra menée à son terme',
    })
    .toBe(true)
  return (await lire()).releves
}

test.describe('le panneau pendant une transition de caméra', () => {
  test('il porte la page d’arrivée, seul, lisible, à chaque image', async ({ page }) => {
    await monterLaScene(page, '/fr')
    const canvas = page.locator(CANVAS)

    // Les trois mouvements de caméra que la route commande : vers une section,
    // d'une section à l'autre, et retour à la vue d'ensemble par Échap.
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
      // Partir d'une caméra immobile : une transition déjà en cours ferait relever
      // le mouvement PRÉCÉDENT.
      await expect(canvas).toHaveAttribute('data-camera-transition', 'false', {
        timeout: PREMIERE_IMAGE_MS,
      })
      await echantillonner(page)
      await aller()

      const releves = await relevesDeLaTransition(page)
      // Une transition sans image relevée ne prouverait rien.
      expect(releves.length, titre).toBeGreaterThan(0)
      const attendu: Releve = { panneaux: 1, titre, opacite: 1, cache: false, atteignable: true }
      // ⭐ La première image fautive, et son rang : « à la 12e image » se lit mieux
      // qu'une liste de cent relevés.
      const fautive = releves.findIndex(
        (releve) => JSON.stringify(releve) !== JSON.stringify(attendu),
      )
      expect(
        fautive === -1 ? attendu : { image: fautive + 1, ...releves[fautive] },
        `${titre} : ${releves.length} images relevées`,
      ).toEqual(attendu)
    }
  })
})
