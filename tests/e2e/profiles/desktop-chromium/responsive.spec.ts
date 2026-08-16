/**
 * Le responsive documentaire (P4-11) — `roadmap.md`.
 *
 * ⭐⭐⭐ **C'est la première tâche de la phase qui n'a aucun garde derrière
 * elle.** Un débordement horizontal ne lève rien, ne casse aucun test, et
 * n'apparaît dans aucun rapport axe : la page s'affiche, elle se lit simplement
 * de travers, et le visiteur doit faire glisser l'écran pour lire la fin d'une
 * ligne. C'est le mode de panne que P4-05 a déjà rencontré sous une autre forme
 * — un mur de texte livré avec 496 tests verts, un axe propre et les budgets
 * tenus. **Une régression purement visuelle ne se prouve que par une mesure
 * géométrique.**
 *
 * D'où trois contrôles, et aucun jugement esthétique :
 *
 * 1. **aucun débordement horizontal**, sur chaque page servie et à chaque
 *    largeur — c'est ce qui rend un site illisible sur un téléphone ;
 * 2. **les cibles tactiles atteignent `--tap-target-min`**, la valeur que le
 *    dépôt s'est donnée et qui dépasse le minimum de WCAG 2.5.8 ;
 * 3. **rien n'est rogné** : aucun élément ne dépasse la boîte de son parent.
 *
 * ⚠️ **Les largeurs ne sont pas des appareils.** Émuler un iPhone particulier
 * mesurerait ce téléphone-là ; ce qui compte est le **domaine** — la plus
 * étroite qu'on rencontre encore (320), un téléphone courant (375), une
 * tablette en portrait (768), en paysage (1024), et le bureau (1440). Le profil
 * `mobile-safari` couvre, lui, un moteur réellement différent, et il porte ses
 * propres assertions dans les parcours partagés.
 */
import {
  clippedText,
  horizontalOverflow,
  shortTapTargets,
  tapTargetMinimum,
} from '../../support/responsive'
import { sitemapPaths } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * Les largeurs mesurées, et pourquoi celles-là.
 *
 * 320 est le plancher que le dépôt se donne : c'est un iPhone SE de première
 * génération, et surtout la largeur en dessous de laquelle plus personne ne
 * conçoit. Un site qui tient à 320 tient partout au-dessus.
 */
const WIDTHS = [
  { width: 320, label: 'téléphone étroit' },
  { width: 375, label: 'téléphone courant' },
  { width: 768, label: 'tablette portrait' },
  { width: 1024, label: 'tablette paysage' },
  { width: 1440, label: 'bureau' },
] as const

/** ⚠️ Voir `accessibility.spec.ts` : 30 s ne suffisent pas pour un balayage. */
const SWEEP_TIMEOUT_MS = 180_000

async function everyServedPage(request: import('@playwright/test').APIRequestContext) {
  return [...(await sitemapPaths(request)), '/fr/404', '/en/404']
}

test.describe('responsive documentaire', () => {
  test('aucune page ne déborde horizontalement, à aucune largeur', async ({ page, request }) => {
    test.setTimeout(SWEEP_TIMEOUT_MS)

    /*
     * ⚠️ **`scrollWidth` du document, et non une inspection élément par
     * élément.** Un débordement est une propriété de la page entière : le
     * coupable peut être n'importe quel descendant, et c'est justement ce qu'on
     * ne veut pas avoir à énumérer. La mesure est celle que fait le visiteur —
     * la page glisse-t-elle latéralement ?
     *
     * Une tolérance d'un pixel absorbe les arrondis de mise en page ; au-delà,
     * c'est une barre de défilement que quelqu'un verra.
     */
    const faults: string[] = []

    for (const path of await everyServedPage(request)) {
      for (const { width, label } of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)

        const overflow = await horizontalOverflow(page)

        if (overflow > 1) faults.push(`${path} @ ${width}px (${label}) — déborde de ${overflow}px`)
      }
    }

    expect(faults).toEqual([])
  })

  test('chaque cible tactile atteint la hauteur que le dépôt s’est donnée', async ({
    page,
    request,
  }) => {
    test.setTimeout(SWEEP_TIMEOUT_MS)

    /*
     * ⚠️ **Le seuil est lu dans le token, et par un seul lecteur** —
     * `support/responsive.ts`. Les deux parcours en avaient d'abord chacun le
     * sien, et ils avaient **déjà divergé** dans le commit qui les écrit.
     *
     * Mesuré sur les trois largeurs tactiles seulement : une cible de 24 px à la
     * souris n'est pas le même problème, et WCAG 2.5.8 vise le pointeur grossier.
     */
    const faults: string[] = []

    for (const path of await everyServedPage(request)) {
      for (const { width, label } of WIDTHS.filter(({ width }) => width <= 768)) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)

        const small = await shortTapTargets(page, await tapTargetMinimum(page))

        small.forEach((element) =>
          faults.push(`${path} @ ${width}px (${label}) — cible trop courte : ${element}`),
        )
      }
    }

    expect(faults).toEqual([])
  })

  test('aucun contenu n’est rogné par la boîte qui le porte', async ({ page, request }) => {
    test.setTimeout(SWEEP_TIMEOUT_MS)

    /*
     * ⚠️ **Ce que le débordement du document ne dit pas.** Un `overflow: hidden`
     * quelque part **absorbe** le dépassement : la page ne glisse plus, et le
     * texte est simplement coupé. C'est pire, et invisible à la première mesure.
     *
     * On compare donc, pour chaque bloc de texte, sa largeur de défilement à sa
     * largeur visible.
     */
    const faults: string[] = []

    for (const path of await everyServedPage(request)) {
      for (const { width, label } of WIDTHS.filter(({ width }) => width <= 375)) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)

        const clipped = await clippedText(page)

        clipped.forEach((element) =>
          faults.push(`${path} @ ${width}px (${label}) — rogné : ${element}`),
        )
      }
    }

    expect(faults).toEqual([])
  })
})
