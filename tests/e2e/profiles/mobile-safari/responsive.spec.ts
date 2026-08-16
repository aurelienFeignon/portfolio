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
import { horizontalOverflow, shortTapTargets, tapTargetMinimum } from '../../support/responsive'
import { sitemapPaths } from '../../support/sitemap'
import { expect, test } from '../../support/test'

test.describe('responsive — moteur mobile réel', () => {
  test('aucune page servie ne déborde horizontalement', async ({ page, request }) => {
    test.setTimeout(120_000)

    const faults: string[] = []

    for (const path of [...(await sitemapPaths(request)), '/fr/404']) {
      await page.goto(path)

      const overflow = await horizontalOverflow(page)

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

    /*
     * ⭐ Le seuil et le relevé viennent de `support/responsive.ts`, **écrits une
     * fois**. Ce parcours en avait sa propre copie, qui multipliait le token par
     * la taille de police sans vérifier son unité : exprimer `--tap-target-min`
     * en `px` lui faisait calculer 704 et rougir toutes les cibles d'une page
     * conforme. Deux lecteurs du même token, divergents dans le commit qui les
     * écrit. Relevé en revue.
     */
    const small = await shortTapTargets(page, await tapTargetMinimum(page))

    expect(small).toEqual([])
  })
})
