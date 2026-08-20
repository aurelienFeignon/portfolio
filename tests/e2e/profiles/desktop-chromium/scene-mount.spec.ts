import { expect, test } from '../../support/test'

/**
 * P5-04 — le montage de la scène, éprouvé là où il vit.
 *
 * `src/scene/components` est **hors de la mesure de couverture** : ce qui le
 * tient est ce fichier. Chaque assertion correspond à un point d'ADR-0003 —
 * après `idle`, `aria-hidden`, rien de focusable, et le site intact avec lui.
 *
 * ⛔ **Il est dans `profiles/desktop-chromium/` et non dans `shared/`, et c'est
 * une correction.** Écrit d'abord en partagé, il s'exécutait aussi sous
 * `no-webgl` — où la scène ne doit précisément **pas** monter. Un banc qui
 * affirme « le canvas est là » ne peut pas être joué sur un profil dont tout
 * l'objet est qu'il n'y soit pas. L'absence est vérifiée en face, dans
 * `profiles/no-webgl/scene-absente.spec.ts`.
 *
 * ⚠️ Ce banc ne dit rien du **contenu** de la scène : elle est vide à ce stade,
 * et c'est P5-05 qui la remplira.
 */
const RACINE = '[data-scene-root]'

test.describe('montage de la scène', () => {
  test('monte un canvas décoratif, sans rien voler au document', async ({ page }) => {
    await page.goto('/fr')

    // Le contenu est là AVANT la scène : c'est tout l'objet du montage différé.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await expect(page.locator(`${RACINE} canvas`)).toBeAttached({ timeout: 10_000 })
    await expect(page.locator(RACINE)).toHaveAttribute('aria-hidden', 'true')

    // ⛔ Rien de focusable dans la scène : le parcours au clavier ne doit pas
    // pouvoir y entrer, sous peine d'un piège invisible pour qui n'a pas de
    // souris. `aria-hidden` posé sur un contenu focusable est justement la
    // faute qu'axe signale — ici, il n'y a rien à focaliser.
    const focusables = page
      .locator(RACINE)
      .locator('a, button, input, select, textarea, [tabindex]')
    await expect(focusables).toHaveCount(0)
  })

  test('⛔ n’intercepte aucun clic : un décor plein écran couvrirait tout le site', async ({
    page,
  }) => {
    await page.goto('/fr')
    await expect(page.locator(`${RACINE} canvas`)).toBeAttached({ timeout: 10_000 })

    // Le lien est sous une couche fixe qui couvre la fenêtre. S'il répond, c'est
    // que `pointer-events` est bien coupé — sinon la scène avalerait la
    // navigation entière, et le site deviendrait inutilisable à la souris.
    await page.getByRole('link', { name: 'Expériences' }).first().click()

    await expect(page).toHaveURL(/\/fr\/experiences$/)
  })

  test('n’écrit aucun texte dans la page : rien n’y vit qui n’existe dans le DOM', async ({
    page,
  }) => {
    await page.goto('/fr')
    await expect(page.locator(`${RACINE} canvas`)).toBeAttached({ timeout: 10_000 })

    await expect(page.locator(RACINE)).toHaveText('')
  })
})
