import { paliersAnnonces, RACINE } from '../../support/scene'
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

  test('⛔ le contenu reste AU-DESSUS de la scène, et la scène reçoit le pointeur ailleurs', async ({
    page,
  }) => {
    await page.goto('/fr')
    await expect(page.locator(`${RACINE} canvas`)).toBeAttached({ timeout: 10_000 })

    /*
     * ⭐⭐ **Le contrat a changé avec NEXUS (D11), et c'est écrit.** La Phase 5
     * exigeait une scène insensible au pointeur (`pointer-events: none`,
     * `z-index: -1`) parce qu'elle n'avait rien à cliquer. NEXUS a besoin du
     * survol, du clic et du glisser : la couche reçoit le pointeur, et c'est
     * l'EMPILEMENT qui protège le contenu.
     *
     * ⛔ Les deux moitiés sont affirmées séparément, par ce qu'un pointeur
     * TOUCHE réellement (`elementFromPoint`) et non par des valeurs de CSS : un
     * contexte de superposition imprévu peut annuler un `z-index` sans que la
     * valeur calculée change.
     */
    const touche = await page.evaluate(() => {
      const panneau = document.querySelector('[data-reading-panel]') as HTMLElement
      const cadre = panneau.getBoundingClientRect()
      const auPanneau = document.elementFromPoint(cadre.left + cadre.width / 2, cadre.top + 40)
      const aLaScene = document.elementFromPoint(window.innerWidth - 60, window.innerHeight / 2)
      return {
        panneauTouche: auPanneau !== null && panneau.contains(auPanneau),
        sceneTouchee: aLaScene?.closest('[data-scene-root]') !== null && aLaScene !== null,
      }
    })

    expect(touche.panneauTouche).toBe(true)
    expect(touche.sceneTouchee).toBe(true)

    // Et le site reste navigable au-dessus de la scène.
    await page.getByRole('link', { name: 'Expériences' }).first().click()
    await expect(page).toHaveURL(/\/fr\/experiences$/)
  })

  test('⭐ navigation hybride : un lien du DOM garde la scène, Échap ramène à la vue d’ensemble', async ({
    page,
  }) => {
    await page.goto('/fr')
    const canvas = page.locator(`${RACINE} canvas`)
    await expect(canvas).toBeAttached({ timeout: 10_000 })

    // Un marqueur posé sur LE canvas : s'il survit, la page n'a pas été rechargée.
    await canvas.evaluate((element) => element.setAttribute('data-temoin', 'meme-canvas'))

    await page.getByRole('link', { name: 'Projets' }).first().click()
    await expect(page).toHaveURL(/\/fr\/projects$/)
    await expect(page.locator(`${RACINE} canvas[data-temoin="meme-canvas"]`)).toBeAttached()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Projets')

    // Échap : une navigation comme une autre, vers l'accueil.
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/fr$/)
    await expect(page.locator(`${RACINE} canvas[data-temoin="meme-canvas"]`)).toBeAttached()
  })

  test('une fiche se lit sans scène : la couche reste montée, mais cachée', async ({ page }) => {
    await page.goto('/fr/projects')
    await expect(page.locator(`${RACINE} canvas`)).toBeAttached({ timeout: 10_000 })
    await page
      .getByRole('link', { name: /portfolio/i })
      .first()
      .click()
    await expect(page.locator(RACINE)).toHaveAttribute('data-scene-visible', 'false')
    await expect(page.locator(RACINE)).toBeHidden()
  })

  test('n’écrit aucun texte dans la page : rien n’y vit qui n’existe dans le DOM', async ({
    page,
  }) => {
    await page.goto('/fr')
    await expect(page.locator(`${RACINE} canvas`)).toBeAttached({ timeout: 10_000 })

    await expect(page.locator(RACINE)).toHaveText('')
  })

  test('annonce le palier qu’il a décidé, par un repère de performance', async ({ page }) => {
    await page.goto('/fr')
    await expect(page.locator(`${RACINE} canvas`)).toBeAttached({ timeout: 10_000 })

    // ⭐ Ce repère est ce que lit `scripts/measure-performance.mts`. Le palier
    // exact dépend de la machine — `reduced` sur un runner à 2 vCPU —, d'où une
    // assertion sur « un palier monté » et non sur `full`.
    const reperes = await paliersAnnonces(page)
    expect(reperes).toHaveLength(1)
    expect(['scene:tier:full', 'scene:tier:reduced', 'scene:tier:lite']).toContain(reperes[0])
  })
})
