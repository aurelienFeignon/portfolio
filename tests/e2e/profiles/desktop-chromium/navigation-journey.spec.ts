/**
 * Les parcours de navigation complets (P4-12).
 *
 * @covers E2E-01 — Accueil → Projets → un projet → retour → Compétences → Expériences
 * @covers E2E-02 — Deep link sur une fiche : contenu et URL cohérents
 * @covers E2E-03 — Bascule fr ↔ en sur une page de détail
 *
 * **Ce que ces parcours gardent, et qu'aucun autre ne gardait.** Le banc savait
 * déjà qu'une page se rend, qu'un `href` est juste et qu'un document est bien
 * formé. Il ne savait rien de la **traversée** : que l'on puisse partir de
 * l'accueil et atteindre les trois sections en cliquant, revenir en arrière et
 * retrouver la page qu'on avait quittée, ou changer de langue depuis une fiche
 * sans perdre l'entité qu'on lisait. Un `href` juste vers une route absente et un
 * sélecteur de langue qui retomberait sur la section donnent exactement les mêmes
 * tests verts.
 *
 * ⚠️ **Le « retour » est le bouton du navigateur, et c'est un constat autant
 * qu'un choix.** Une fiche n'offre aucun retour visible : ni fil d'Ariane rendu,
 * ni lien vers sa liste. Le `BreadcrumbList` de P4-09 est pourtant émis sur les
 * sections **et** sur les fiches — la position exacte pour laquelle la même tâche
 * avait refusé `links.repository`, « une donnée structurée décrit ce que la page
 * montre ». L'incohérence est une dette nommée (`phase-4-log.md` §19.2), pas un
 * défaut que P4-12 corrige : c'est une tâche de parcours, elle constate.
 *
 * Profil `desktop-chromium` seul : la navigation est faite de balises `<a>` et ces
 * assertions portent sur des documents servis. Les rejouer sur quatre profils
 * donnerait quatre fois le même résultat (playwright.config.ts).
 *
 * Aucune entité de `content/` n'est nommée : les fiches visitées sont déduites du
 * sitemap. Les **sections**, elles, sont des constantes de routage.
 */
import { detailPath, translatedPair } from '../../support/sitemap'
import { expect, test } from '../../support/test'

test.describe('parcours de navigation', () => {
  test('mène de l’accueil aux trois sections, en passant par une fiche et un retour', async ({
    page,
  }) => {
    /*
     * Un seul test, et une seule traversée : un parcours est une **séquence**.
     * Le découper en six tests indépendants perdrait précisément ce qu'il prouve
     * — que l'état du navigateur survit d'une étape à la suivante — et le
     * ferait payer six contextes au lieu d'un.
     */
    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    const main = page.getByRole('main')

    // 1. L'accueil. On part du `SectionGuide`, pas de l'en-tête : c'est le seul
    //    chemin propre à cette page, et P4-03 a justifié de doubler la cible.
    await page.goto('/fr')
    await main.getByRole('link', { name: 'Projets' }).click()
    await expect(page).toHaveURL(/\/fr\/projects$/)
    await expect(nav.getByRole('link', { name: 'Projets' })).toHaveAttribute('aria-current', 'true')

    // 2. La liste mène à la fiche que le sitemap annonce. Le lien est visé par son
    //    `href` — donc sans nommer d'entité, et en prouvant au passage que la
    //    liste contient bien l'adresse que le sitemap publie.
    const fiche = await detailPath(page.request, 'fr', 'projects')
    await main.locator(`a[href="${fiche}"]`).click()
    await expect(page).toHaveURL(new RegExp(`${fiche}$`))
    const titreDeLaFiche = await main.getByRole('heading', { level: 1 }).textContent()
    expect(titreDeLaFiche?.trim()).not.toBe('')

    // 3. Le retour. Le bouton du navigateur est le seul retour qui existe, et ce
    //    qu'on vérifie n'est pas l'URL seule : une page restaurée depuis le cache
    //    arrière peut être vide. La liste doit reporter son propre titre et
    //    reproposer le lien qu'on vient de suivre.
    await page.goBack()
    await expect(page).toHaveURL(/\/fr\/projects$/)
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Projets')
    await expect(main.locator(`a[href="${fiche}"]`)).toBeVisible()

    // 4. Puis les deux autres sections, par l'en-tête cette fois — le chemin
    //    qu'un visiteur emprunte depuis n'importe quelle page.
    for (const [nom, url] of [
      ['Compétences', /\/fr\/skills$/],
      ['Expériences', /\/fr\/experiences$/],
    ] as const) {
      await nav.getByRole('link', { name: nom }).click()
      await expect(page).toHaveURL(url)
      await expect(main.getByRole('heading', { level: 1 })).toHaveText(nom)
      await expect(nav.getByRole('link', { name: nom })).toHaveAttribute('aria-current', 'true')
    }
  })

  test('une fiche atteinte directement rend son contenu, sans redirection', async ({
    page,
    request,
  }) => {
    /*
     * ⚠️ **Ce que ce parcours ajoute à `projects.spec.ts`, qui visite la même
     * page.** Celui-là vérifie ce que la fiche rend ; celui-ci vérifie ce que
     * l'**arrivée** vaut : qu'un lien partagé ou un résultat de recherche tombe
     * sur la page elle-même, en 200, à l'adresse demandée. Une redirection vers
     * la section rendrait un document parfaitement valide et perdrait l'entité,
     * sans qu'aucune assertion de structure ne bouge.
     *
     * ⚠️ La part « état de scène cohérent » du scénario n'est pas ici : elle
     * suppose `data-scene-focus`, qui n'existe pas avant P6-07. L'inventaire la
     * porte comme reportée plutôt que de la faire semblant tenue.
     */
    const fiche = await detailPath(request, 'fr', 'experiences')

    const response = await page.goto(fiche)

    expect(response?.status()).toBe(200)
    expect(
      response?.request().redirectedFrom(),
      'la fiche a été atteinte par une redirection',
    ).toBeNull()
    await expect(page).toHaveURL(new RegExp(`${fiche}$`))
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).not.toBeEmpty()
  })

  test('la bascule de langue depuis une fiche garde l’entité, dans les deux sens', async ({
    page,
  }) => {
    /*
     * ⭐⭐ **C'est la promesse de P3-09, et rien ne l'observait sur une fiche.**
     * Le sélecteur mène « à la page existante la plus proche » quand la
     * traduction manque — la **section**. Sur une entité traduite, il doit mener
     * à l'entité, et le repli serait une régression silencieuse : la page
     * s'affiche, dans la bonne langue, et le visiteur a perdu ce qu'il lisait.
     * Le seul parcours qui touchait le sélecteur le faisait depuis une page de
     * **section**, où le repli et la cible juste sont la même URL.
     *
     * ⚠️ Le cas « entité non traduite » n'est pas observable : `content/` est
     * parfaitement symétrique (voir `support/sitemap.ts`). Il est tenu par les
     * tests unitaires de `languageOptions`, sur fixtures.
     */
    const { fr, en } = await translatedPair(page.request)

    await page.goto(fr)
    await page.getByRole('link', { name: 'English' }).click()

    await expect(page).toHaveURL(new RegExp(`${en}$`))
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).not.toBeEmpty()

    // Le retour compte autant que l'aller : une table d'alternatives fausse dans
    // un seul sens donnerait un aller juste et un retour vers l'accueil.
    await page.getByRole('link', { name: 'Français' }).click()

    await expect(page).toHaveURL(new RegExp(`${fr}$`))
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  })
})
