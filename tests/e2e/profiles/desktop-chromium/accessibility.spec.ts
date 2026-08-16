/**
 * La passe d'accessibilité de P4-10 — `roadmap.md`, critère de sortie de phase.
 *
 * @covers E2E-08 — Clavier seul : Tab jusqu'aux trois sections, Entrée navigue, focus visible
 * @covers E2E-11 — axe-core : 0 violation serious/critical
 * @covers E2E-12 — Structure : un h1 unique, titres sans saut, liens avec nom accessible
 *
 * ⭐ Les trois scénarios sont ici **et pas ailleurs**, y compris ceux que P4-12
 * devait écrire : E2E-11 et E2E-12 sont couverts par cette passe sur un périmètre
 * plus large que ce que la stratégie exige — les dix-sept documents servis, et non
 * quatre pages nommées. En réécrire une seconde mesure aurait produit la
 * duplication que cette phase passe son temps à supprimer. Seule la moitié
 * clavier de E2E-08 manquait, et elle a été ajoutée en bas de ce fichier plutôt
 * que dans un fichier concurrent sur le même sujet.
 *
 * ⭐⭐⭐ **Ce qui change ici n'est pas le nombre de contrôles, c'est leur
 * périmètre.** Chaque tâche de la Phase 4 avait ajouté son audit axe sur les
 * pages qu'elle venait d'écrire : `/fr` en P4-03, la liste et une fiche en
 * P4-04, `/fr/skills` en P4-06, la 404 en P4-07. Sept pages **nommées à la
 * main** — et P4-07 a établi la conséquence en toutes lettres : *« un audit
 * d'accessibilité ne couvre que les pages qu'on lui donne »*. La 404 était sans
 * `<html lang>` depuis P3-02 et le gate axe ne l'avait jamais vue, faute d'un
 * parcours qui la visite.
 *
 * Le périmètre est donc **dérivé du sitemap**, plus les deux pages introuvables
 * qui n'y figurent pas — celles-là mêmes qui portaient le défaut. Une huitième
 * page écrite demain est auditée sans que personne y pense.
 *
 * ⚠️ **Trois contrôles ne sont pas dans axe, et c'est pourquoi ils sont écrits
 * à la main.** `heading-order`, `page-has-heading-one` et `landmark-one-main`
 * sont classés *best-practice* par axe-core, donc **hors** des tags WCAG que
 * `support/axe.ts` audite. Les ajouter à la liste de tags ferait entrer des
 * dizaines de règles de style ; les exiger explicitement dit ce que la mission
 * demande — « titres, focus, contrastes, points de repère » — et rien d'autre.
 *
 * Profil `desktop-chromium` seul : ce sont des assertions sur un document servi.
 * Les profils mobile et `reduced-motion` gardent leur audit d'accueil, qui porte
 * sur un rendu différent.
 */
import { expectNoBlockingAxeViolations } from '../../support/axe'
import { sitemapPaths } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * ⚠️ **Playwright accorde 30 s par test, et il n'y a pas de raison qu'un audit
 * de dix-sept documents tienne dedans sur un runner chargé.** Mesuré à 8,5 s
 * ici ; le défaut ne serait pas un défaut du site mais une CI rouge sur du code
 * conforme, c'est-à-dire le pire signal possible. Relevé en revue.
 */
const AUDIT_TIMEOUT_MS = 120_000

/**
 * Tabule jusqu'à ce que `stop` soit satisfait, et rend les `href` rencontrés.
 *
 * ⚠️ **La borne n'est pas un nombre de tabulations attendu**, c'est un garde
 * anti-boucle : compter les `Tab` encoderait le DOM du jour, et un lien ajouté à
 * l'en-tête ferait rougir un site parfaitement navigable. La sortie normale est
 * `stop`, ou le moment où le focus quitte le document.
 */
async function tabThrough(
  page: import('@playwright/test').Page,
  stop: (reached: readonly string[]) => boolean,
): Promise<string[]> {
  const reached: string[] = []

  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press('Tab')

    const href = await page.evaluate(() => {
      const node = document.activeElement
      // `body` est ce que rend le navigateur quand le focus quitte le document :
      // continuer à tabuler y ferait tourner la boucle à vide.
      if (node === null || node === document.body) return undefined
      return node.getAttribute('href') ?? ''
    })

    if (href === undefined) break
    if (href !== '') reached.push(href)
    if (stop(reached)) break
  }

  return reached
}

/** Les pages du **site** : le sitemap, plus les deux introuvables localisées. */
async function everySitePage(request: import('@playwright/test').APIRequestContext) {
  return [...(await sitemapPaths(request)), '/fr/404', '/en/404']
}

/**
 * Tous les **documents servis** — les pages du site, plus le plancher.
 *
 * ⭐ La distinction n'est pas cosmétique. `global-not-found.tsx` est un document
 * HTML complet que ce site sert, et la première version de ce fichier ne
 * l'auditait pas : la thèse de la tâche — *un audit ne couvre que ce qu'on lui
 * donne* — appliquée partout **sauf à la page que la tâche ajoute**. Relevé en
 * revue.
 *
 * Il n'a en revanche ni bannière ni pied de page, et ne peut pas en avoir : Next
 * ne l'entoure d'aucun layout, et les recopier hors du layout en ferait une
 * seconde source. C'est pourquoi les points de repère se mesurent sur
 * `everySitePage` et le reste sur celle-ci.
 */
async function everyServedDocument(request: import('@playwright/test').APIRequestContext) {
  return [...(await everySitePage(request)), '/_next/inexistant']
}

test.describe('accessibilité — toutes les pages servies', () => {
  test('aucune ne présente de violation axe serious ou critical', async ({ page, request }) => {
    test.setTimeout(AUDIT_TIMEOUT_MS)
    /*
     * Le contraste de couleurs (`color-contrast`) est dans `wcag2aa`, donc déjà
     * couvert par cet audit : il n'a pas besoin d'un contrôle séparé, et en
     * écrire un donnerait deux mesures du même critère.
     */
    for (const path of await everyServedDocument(request)) {
      await page.goto(path)
      await expectNoBlockingAxeViolations(page, path)
    }
  })

  test('chacune porte exactement un `h1`, et aucun saut de niveau', async ({ page, request }) => {
    /*
     * ⚠️ `heading-order` est *best-practice* chez axe, donc hors des tags WCAG
     * audités. Le plan du document est pourtant ce qu'un lecteur d'écran
     * parcourt pour se repérer — P4-03 s'appuie dessus explicitement, le
     * `SectionGuide` portant sa structure par des titres de niveau 2 plutôt que
     * par un second point de repère `navigation`.
     */
    test.setTimeout(AUDIT_TIMEOUT_MS)
    const faults: string[] = []

    for (const path of await everyServedDocument(request)) {
      await page.goto(path)

      const levels = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName[1])))

      const ones = levels.filter((level) => level === 1).length
      if (ones !== 1) faults.push(`${path} — ${ones} <h1> au lieu d'un seul`)

      levels.forEach((level, index) => {
        const previous = levels[index - 1]
        if (previous !== undefined && level > previous + 1) {
          faults.push(`${path} — saut de niveau h${previous} → h${level}`)
        }
      })
    }

    expect(faults).toEqual([])
  })

  test('chacune porte ses trois points de repère, une fois chacun', async ({ page, request }) => {
    /*
     * `banner`, `main` et `contentinfo` — l'en-tête, le contenu et le pied de
     * page. Un point de repère en double est aussi coûteux qu'un point de repère
     * absent : il rend la navigation par repères ambiguë au lieu de la guider.
     *
     * ⚠️ `landmark-one-main` est également *best-practice* chez axe. Et il ne
     * dirait rien du **doublon** : c'est la 404 qui a rappelé que les repères
     * viennent des layouts d'endroit, dont l'accord avec l'arborescence est
     * tenu par un autre garde.
     */
    test.setTimeout(AUDIT_TIMEOUT_MS)
    const faults: string[] = []

    // `everySitePage` et non les documents : le plancher n'a ni bannière ni pied
    // de page, et ne peut pas en avoir — voir son commentaire plus haut.
    for (const path of await everySitePage(request)) {
      await page.goto(path)

      for (const role of ['banner', 'main', 'contentinfo'] as const) {
        const count = await page.getByRole(role).count()
        if (count !== 1) faults.push(`${path} — ${count} point(s) de repère « ${role} »`)
      }
    }

    expect(faults).toEqual([])
  })

  test('aucun lien ni bouton n’est dépourvu de nom accessible', async ({ page, request }) => {
    /*
     * Un lien sans nom accessible est annoncé « lien » par un lecteur d'écran,
     * ce qui est strictement inutilisable.
     *
     * ⚠️ **Ce contrôle ne calcule pas le nom accessible, et ne le prétend plus.**
     * La première rédaction l'affirmait ; elle aurait produit un faux échec sur
     * un lien nommé par `aria-labelledby`, par `title` ou par l'`alt` d'une
     * image — trois formes qu'aucun lien du site n'emploie aujourd'hui, mais que
     * rien n'interdit. Relevé en revue. Ce qui est mesuré est la régression
     * réelle : une cible **vide de tout**, qu'aucune des quatre sources ne nomme.
     */
    test.setTimeout(AUDIT_TIMEOUT_MS)
    const faults: string[] = []

    for (const path of await everyServedDocument(request)) {
      await page.goto(path)

      for (const role of ['link', 'button'] as const) {
        const anonymous = await page
          .getByRole(role)
          .evaluateAll((nodes) =>
            nodes
              .filter(
                (node) =>
                  (node.textContent ?? '').trim() === '' &&
                  !node.getAttribute('aria-label') &&
                  !node.getAttribute('aria-labelledby') &&
                  !node.getAttribute('title') &&
                  !node.querySelector('img[alt]:not([alt=""])'),
              )
              .map((node) => node.outerHTML.slice(0, 80)),
          )

        anonymous.forEach((html) => faults.push(`${path} — ${role} sans nom : ${html}`))
      }
    }

    expect(faults).toEqual([])
  })
})

test.describe('accessibilité — le plancher sous la 404', () => {
  test('une voie que le proxy n’atteint pas déclare quand même sa langue', async ({ request }) => {
    /*
     * ⛔⛔ **Ce défaut était encore ouvert après P4-07, et il a été mesuré.** Le
     * matcher du proxy exclut `_next/` — pour ne pas faire traverser une
     * fonction à chaque ressource statique. Une adresse inconnue sous ce préfixe
     * ne recevait donc pas la 404 réécrite mais la 404 **interne** de Next,
     * servie hors de tout layout : `<html>` **sans `lang`**, la violation
     * WCAG 3.1.1 que P4-07 avait supprimée par la porte principale.
     *
     * `experimental.globalNotFound` pose `src/app/global-not-found.tsx` sous le
     * mécanisme. Relevé avant / après, même commande :
     *
     *     sans le plancher : /_next/inexistant → 404 | <html>
     *     avec le plancher : /_next/inexistant → 404 | <html lang="fr">
     *
     * ⚠️ Ce parcours est ce qui rend le drapeau **retirable sans surprise** : il
     * est expérimental, et son retrait ne casserait rien de visible — juste
     * l'attribut que personne ne regarde.
     */
    const response = await request.get('/_next/inexistant')
    const html = await response.text()

    expect(response.status()).toBe(404)
    expect(/<html\b[^>]*\blang=/.test(html), 'la 404 de secours est servie sans « lang »').toBe(
      true,
    )
  })
})

test.describe('accessibilité — le parcours au clavier', () => {
  test('le premier `Tab` atteint le lien d’évitement, et il est visible', async ({ page }) => {
    /*
     * ⚠️ **Un lien d'évitement invisible au focus ne sert à personne.** Il est
     * masqué hors écran au repos — c'est le motif habituel —, et tout l'intérêt
     * tient à ce qu'il **revienne** dans le cadre quand il le reçoit. Le vérifier
     * demande de mesurer sa position, pas sa présence : un test qui ne lirait
     * que `:focus` resterait vert sur un lien resté à `-9999px`.
     */
    await page.goto('/fr')
    await page.keyboard.press('Tab')

    const focused = page.locator(':focus')
    await expect(focused).toHaveAttribute('href', '#main')

    const box = await focused.boundingBox()
    expect(box, 'le lien d’évitement n’a pas de boîte : il est resté hors du flux').not.toBeNull()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x).toBeGreaterThanOrEqual(0)

    /*
     * ⚠️ **Une position dans le cadre ne suffit pas.** Un `opacity: 0`, un
     * `visibility: hidden` ou un `clip-path: inset(50%)` laissent la boîte
     * exactement où elle est — et le lien invisible. Les trois formes de
     * masquage sont donc lues, et non déduites de la géométrie. Relevé en revue.
     */
    const hidden = await focused.evaluate((node) => {
      const style = getComputedStyle(node)
      return {
        opacity: Number(style.opacity),
        visibility: style.visibility,
        clipPath: style.clipPath,
      }
    })

    expect(hidden.opacity).toBeGreaterThan(0)
    expect(hidden.visibility).toBe('visible')
    expect(['none', 'auto']).toContain(hidden.clipPath)
  })

  test('chaque élément focusable porte un indicateur de focus visible', async ({ page }) => {
    /*
     * ⛔ WCAG 2.4.7. Le mode de panne est silencieux : un `outline: none` posé
     * pour « nettoyer » un composant retire l'indicateur sans rien casser
     * d'autre, et P4-03 a failli le livrer — la carte cliquable reportait le
     * focus par `:has()` **après** avoir supprimé celui du lien, si bien que
     * dans un moteur sans `:has()` les trois liens n'en avaient plus du tout.
     *
     * On compare l'aspect au focus à l'aspect au repos : ce qui compte n'est pas
     * qu'une propriété particulière soit posée, mais que **quelque chose
     * change**. Une règle qui repeindrait le fond plutôt que le contour reste
     * conforme, et ce contrôle l'accepte.
     *
     * ⭐⭐ **Vérifié par deux mutations, dont une qui a survécu à bon droit.**
     * Renommer notre `:focus-visible` **ne fait pas rougir** ce test — et c'est
     * correct : l'anneau par défaut du navigateur prend alors le relais, et
     * WCAG 2.4.7 est satisfait par lui. Ce qui doit rougir est `outline: none`,
     * c'est-à-dire la suppression **de tout** indicateur ; c'est le cas, vu
     * rouge. Le test mesure donc le résultat exigé, pas le mécanisme qui le
     * produit — la première mutation était fausse, pas le test.
     */
    await page.goto('/fr')

    const focusable = page.locator('a[href], button:not([disabled])')
    const count = await focusable.count()
    expect(count, 'aucun élément focusable sur l’accueil').toBeGreaterThan(0)

    const invisible: string[] = []

    for (let index = 0; index < count; index += 1) {
      const element = focusable.nth(index)
      const styleOf = () =>
        element.evaluate((node) => {
          const style = getComputedStyle(node)
          return [style.outlineStyle, style.outlineWidth, style.outlineColor, style.boxShadow].join(
            '|',
          )
        })

      const atRest = await styleOf()
      await element.focus()
      const atFocus = await styleOf()

      if (atRest === atFocus)
        invisible.push(await element.evaluate((n) => n.outerHTML.slice(0, 80)))
    }

    expect(invisible).toEqual([])
  })

  test('la tabulation atteint les trois sections, et Entrée y mène (P4-12)', async ({ page }) => {
    /*
     * ⭐ **La moitié de E2E-08 que P4-10 n'avait pas écrite.** Cette passe
     * vérifiait que le focus est **visible** et que le lien d'évitement est
     * atteint ; personne ne vérifiait que les trois sections sont dans l'ordre de
     * tabulation, ni qu'on peut les activer au clavier. Un `tabindex="-1"` posé
     * par mégarde, ou une carte devenue cliquable par un gestionnaire plutôt que
     * par un lien, laisserait tous les autres parcours verts — y compris
     * l'audit axe, qui ne parcourt pas le document au clavier.
     *
     * ⚠️ **Aucun nombre de `Tab` n'est écrit.** Compter les tabulations
     * encoderait le DOM du jour : un lien ajouté à l'en-tête ferait rougir un
     * garde sur un site parfaitement navigable. On avance jusqu'à avoir vu les
     * trois cibles, borné par une limite qui n'est là que pour ne pas boucler.
     *
     * ⭐⭐ **Deux pages, et c'est une mutation qui l'a exigé.** La première
     * rédaction ne balayait que l'accueil — où les trois sections ont **deux**
     * chemins au clavier, l'en-tête et le `SectionGuide`. Poser `tabIndex={-1}`
     * sur toute la navigation principale la laissait donc **verte**, alors que
     * cela rend les sections inatteignables au clavier sur les quinze autres
     * pages. C'est le périmètre trop étroit de P4-10, à l'identique : *un garde
     * ne couvre que ce qu'on lui donne*. Une page de section, où l'en-tête est
     * la seule source, ferme le trou.
     */
    const sections = ['/fr/experiences', '/fr/projects', '/fr/skills']

    for (const path of ['/fr', '/fr/projects']) {
      await page.goto(path)
      const reached = await tabThrough(page, (seen) =>
        sections.every((href) => seen.includes(href)),
      )

      expect(reached, `${path} — des sections restent hors de l’ordre de tabulation`).toEqual(
        expect.arrayContaining(sections),
      )
    }

    /*
     * Puis l'activation. On repart d'une page neuve — le balayage ci-dessus a
     * laissé le focus quelque part — et on s'arrête sur la cible avant d'appuyer
     * sur Entrée : c'est le geste réel, et ce qu'il prouve est qu'un `<a href>`
     * l'honore là où un gestionnaire de clic seul ne l'honorerait pas.
     */
    await page.goto('/fr')
    await tabThrough(page, (seen) => seen.includes('/fr/skills'))

    await expect(page.locator(':focus')).toHaveAttribute('href', '/fr/skills')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/fr\/skills$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Compétences')
  })
})
