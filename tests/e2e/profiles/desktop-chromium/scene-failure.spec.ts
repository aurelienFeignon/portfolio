import { expect, test } from '../../support/test'

/**
 * P5-07 — ce que devient le site quand la scène tombe. ADR-0003 point 5 :
 * *« toute défaillance fait basculer en `none` ; le contenu reste intact et
 * aucun message anxiogène n'est affiché. »*
 *
 * ⭐ Les deux défaillances éprouvées ici sont **provoquées, pas simulées** : un
 * vrai `WEBGL_lose_context` sur le contexte que three emploie, et un vrai chunk
 * refusé par le réseau. La troisième — une exception pendant le rendu de la
 * scène — ne se provoque contre une image de production qu'en fabriquant la
 * panne ; elle est éprouvée sur la frontière elle-même, en Vitest.
 *
 * ⛔ Ce fichier vit dans `profiles/desktop-chromium/` et non dans `shared/`,
 * pour la raison écrite en P5-04 : il commence par affirmer que le canvas est
 * là, ce qui est faux par construction sous `no-webgl` et sous `no-js`.
 */
const RACINE = '[data-scene-root]'

/**
 * ⛔⛔ **Attendre que le canvas soit ATTACHÉ ne suffit pas, et l'ignorer rend ce
 * banc faux d'une manière qui se lit comme un défaut du code.** R3F pose le
 * `<canvas>` dans le DOM *avant* de créer son contexte WebGL : un
 * `getContext('webgl2')` lancé dans cette fenêtre **crée un contexte à lui** et
 * le perd — celui de la scène, créé juste après, n'a rien vu. Le décor reste, et
 * le parcours accuse le code.
 *
 * ⭐ Le repère est donc la **taille du canvas** : c'est le renderer qui la fixe,
 * par `setSize`, dans la même passe que la création du contexte. Trouvé parce que
 * l'échec **se déplaçait** d'un test à l'autre selon la charge — la signature
 * d'une course, jamais celle d'un défaut déterministe.
 *
 * ⛔⛔ **Et il ne suffit pas que cette taille soit non nulle.** Un `<canvas>`
 * sans attribut mesure **300 × 150** par spécification : `width > 0` était donc
 * vrai dès l'attachement, et mon premier repère n'attendait rigoureusement rien.
 * Il faut la comparer à la fenêtre, que le décor couvre entièrement — un chiffre
 * que seule la mise à l'échelle du renderer peut produire.
 */
async function sceneRendue(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator(`${RACINE} canvas`)).toBeAttached({ timeout: 10_000 })
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-scene-root] canvas')
      return canvas !== null && canvas.width >= window.innerWidth
    },
    undefined,
    { timeout: 10_000 },
  )
}

/** Le repère d'un site intact : le titre de la page, et aucun avis d'erreur. */
async function siteIntact(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Une erreur est survenue')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0)
}

test.describe('la scène tombe, le site reste', () => {
  test('perte du contexte WebGL : le décor disparaît en entier, la page ne bronche pas', async ({
    page,
  }) => {
    await page.goto('/fr')
    await sceneRendue(page)

    /*
     * ⭐ `getContext('webgl2')` sur un canvas déjà initialisé rend **le contexte
     * existant**, celui-là même que three emploie : la perte provoquée ici est
     * celle que subirait un visiteur, pas une imitation.
     */
    const perdu = await page.locator(`${RACINE} canvas`).evaluate((canvas) => {
      const contexte = (canvas as HTMLCanvasElement).getContext('webgl2')
      const extension = contexte?.getExtension('WEBGL_lose_context')
      if (!extension) return false
      extension.loseContext()
      return true
    })
    // ⛔ Sans ce contrôle, un navigateur sans l'extension rendrait ce parcours
    // vert sans avoir rien perdu — le test passerait pour la mauvaise raison.
    expect(
      perdu,
      'WEBGL_lose_context doit être disponible pour que ce test dise quelque chose',
    ).toBe(true)

    // La bascule retire l'enveloppe, pas seulement le canvas : au palier `none`,
    // le DOM doit ressembler à celui d'un visiteur sans WebGL.
    await expect(page.locator(RACINE)).toHaveCount(0)
    await siteIntact(page)
  })

  test('chunk 3D refusé par le réseau : aucun décor, aucun message, un site normal', async ({
    page,
  }) => {
    /*
     * ⭐ Le chunk du moteur est désigné par ce qu'il CONTIENT, jamais par son
     * nom : celui-ci porte le nom du paquet sur le serveur de développement et
     * un condensat dans l'image de production. Un filtre par nom marcherait
     * d'un côté et échouerait en silence de l'autre. Même repère que
     * `scene-absente.spec.ts`.
     *
     * ⛔ D'où deux chargements plutôt qu'un : lire le corps de **chaque** chunk
     * dans l'intercepteur était ma première écriture, et elle échouait sur
     * `Response has been disposed` — la lecture d'une réponse court après la vie
     * de la requête qui l'a produite. On repère d'abord, on refuse ensuite.
     */
    await page.goto('/fr')
    await sceneRendue(page)

    /*
     * ⭐ Parcourus du **dernier au premier** : le chunk du moteur est chargé
     * après `idle`, donc parmi les derniers. Dans l'ordre naturel, ce parcours
     * retéléchargeait la trentaine de chunks du socle avant de l'atteindre —
     * 26 s sur un banc chargé, à un cheveu du délai imparti. Le repère n'a pas
     * changé ; seul l'ordre de recherche l'a fait.
     */
    const urls = (
      await page.evaluate(() =>
        performance.getEntriesByType('resource').map((entree) => entree.name),
      )
    ).filter((url) => url.includes('/_next/static/chunks/'))

    let moteur: string | undefined
    for (const url of [...new Set(urls)].reverse()) {
      const reponse = await page.request.get(url)
      if ((await reponse.text()).includes('WebGLRenderer')) {
        moteur = url
        break
      }
    }
    expect(moteur, 'aucun chunk servi ne porte le moteur : le repère est faux').toBeDefined()

    let refuse = 0
    await page.route(moteur as string, async (route) => {
      refuse += 1
      await route.abort('failed')
    })

    await page.goto('/fr')
    await siteIntact(page)

    // Laisser passer l'`idle` : c'est après lui que le chargement est tenté.
    await page.waitForTimeout(3_000)

    expect(refuse, 'le chunk du moteur doit avoir été demandé, puis refusé').toBeGreaterThan(0)
    await expect(page.locator(RACINE)).toHaveCount(0)
    await siteIntact(page)

    // Et le site reste navigable, ce qui est le vrai critère d'ADR-0003.
    await page.getByRole('link', { name: 'Expériences' }).first().click()
    await expect(page).toHaveURL(/\/fr\/experiences$/)
  })
})
