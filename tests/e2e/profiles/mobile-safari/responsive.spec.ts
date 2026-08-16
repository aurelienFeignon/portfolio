/**
 * Le responsive sur un **moteur** mobile réel (P4-11).
 *
 * ⭐⭐ **Pourquoi ce fichier existe alors que `desktop-chromium` balaie déjà cinq
 * largeurs.** Une largeur émulée par `setViewportSize` n'est pas un téléphone :
 * elle ne dit rien du `devicePixelRatio`, ni de la barre d'outils qui rogne la
 * hauteur visible, ni de la façon dont WebKit calcule les métriques de police.
 * Un site qui tient à 375 px sous Chromium peut déborder sous WebKit — et c'est
 * l'un des deux moteurs que 100 % des visiteurs d'iPhone emploient.
 *
 * ⚠️ Ce profil n'avait **aucun dossier propre** jusqu'ici, seul des cinq ; il
 * ne jouait que les parcours partagés. C'est ce qui rendait l'exigence de P4-11
 * — « E2E `mobile-safari` : aucun débordement horizontal, cibles tactiles » —
 * impossible à satisfaire au bon endroit.
 *
 * Les seuils et le périmètre ne sont pas redits ici : le balayage complet vit
 * dans `profiles/desktop-chromium/responsive.spec.ts`. Ce fichier vérifie que le
 * **moteur** ne dément pas ce que la géométrie annonce.
 */
import { sitemapPaths } from '../../support/sitemap'
import { expect, test } from '../../support/test'

test.describe('responsive — moteur mobile réel', () => {
  test('aucune page servie ne déborde horizontalement', async ({ page, request }) => {
    test.setTimeout(120_000)

    const faults: string[] = []

    for (const path of [...(await sitemapPaths(request)), '/fr/404']) {
      await page.goto(path)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )

      if (overflow > 1) faults.push(`${path} — déborde de ${overflow}px`)
    }

    expect(faults).toEqual([])
  })

  test('les cibles tactiles tiennent le seuil, mesurées par ce moteur', async ({ page }) => {
    /*
     * ⛔ **Deux défauts réels ont été trouvés ici par la mesure**, tous deux en
     * production : le sélecteur de langue n'avait aucun module CSS et rendait un
     * lien de la hauteur d'une ligne sur les 16 pages ; et le lien « retour à
     * l'accueil » était nu dans **trois** fichiers. Ni l'un ni l'autre ne levait
     * quoi que ce soit — ni erreur, ni violation axe, ni dépassement de budget.
     */
    await page.goto('/fr')

    const minimum = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const raw = root.getPropertyValue('--tap-target-min').trim()
      return Number.parseFloat(raw) * Number.parseFloat(root.fontSize)
    })

    expect(minimum, '`--tap-target-min` est introuvable : ce test ne mesure rien').toBeGreaterThan(
      0,
    )

    const small = await page.locator('a[href], button:not([disabled])').evaluateAll(
      (nodes, floor) =>
        nodes
          .filter((node) => {
            const box = node.getBoundingClientRect()
            // Le lien d'évitement est replié hors focus : sans surface, il n'est
            // pas une cible tactile.
            return box.height > 0 && box.height < floor - 0.5
          })
          .map((node) => `${node.tagName.toLowerCase()} « ${node.textContent?.trim()} »`),
      minimum,
    )

    expect(small).toEqual([])
  })
})
