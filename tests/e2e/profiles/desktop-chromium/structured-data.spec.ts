/**
 * Données structurées JSON-LD (P4-09) — `architecture.md` §9.
 *
 * **Pourquoi en E2E et pas seulement en unitaire.** `json-ld.ts` et
 * `structured-data.ts` sont couverts à 100 %, et ils ne prouvent pourtant rien
 * de ce qui compte ici : qu'un bloc **atteigne le document servi**, qu'il y soit
 * **relisible** après être passé par le sérialiseur et par le parseur HTML, et
 * que les URL qu'il grave soient celles de la page qui le porte.
 *
 * ⚠️ C'est la leçon de P4-08, appliquée avant d'en payer la version JSON-LD :
 * l'image de partage était produite, prégénérée, et **référencée par personne**.
 * Un bloc de données ne casse jamais bruyamment — il manque.
 *
 * Profil `desktop-chromium` seul : ce sont des assertions sur un document servi,
 * identiques sur les quatre profils.
 */
import { PROFILE_URLS } from '@/seo/profiles'

import { ORIGIN, detailPath, sitemapPaths } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * Les documents JSON-LD d'une page, **relus**.
 *
 * Le `JSON.parse` n'est pas un détail de commodité : c'est l'assertion. Un bloc
 * qu'un consommateur ne peut pas relire — parce qu'un `</script>` l'a coupé en
 * deux, par exemple — est présent, visible dans le HTML, et sans aucune valeur.
 */
async function graphOf(request: import('@playwright/test').APIRequestContext, path: string) {
  const html = await (await request.get(path)).text()
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].map((match) => JSON.parse(match[1] as string) as { '@context': string; '@graph': unknown[] })

  expect(blocks.length, `aucun bloc JSON-LD sur ${path}`).toBeGreaterThan(0)
  return blocks.flatMap((block) => {
    expect(block['@context']).toBe('https://schema.org')
    return block['@graph'] as Record<string, unknown>[]
  })
}

const nodeOfType = (graph: Record<string, unknown>[], type: string) =>
  graph.find((node) => node['@type'] === type)

test.describe('données structurées', () => {
  test('l’accueil décrit la personne et le site', async ({ request }) => {
    const graph = await graphOf(request, '/fr')

    const person = nodeOfType(graph, 'Person')
    expect(person).toBeDefined()
    expect(person?.['name']).toBe('Aurélien Feignon')
    expect(person?.['jobTitle']).toBe('Développeur Full-Stack')

    const site = nodeOfType(graph, 'WebSite')
    expect(site).toBeDefined()
    expect(site?.['inLanguage']).toBe('fr')
  })

  test('la personne est **la même** dans les deux langues', async ({ request }) => {
    /*
     * ⭐ Deux identifiants feraient deux personnes pour un moteur de recherche,
     * chacune décrite à moitié. C'est la seule propriété de cette tâche qu'un
     * test unitaire ne peut pas établir : elle porte sur deux pages.
     */
    const [french, english] = await Promise.all([graphOf(request, '/fr'), graphOf(request, '/en')])

    expect(nodeOfType(french, 'Person')?.['@id']).toBe(nodeOfType(english, 'Person')?.['@id'])
    expect(nodeOfType(french, 'Person')?.['jobTitle']).not.toBe(
      nodeOfType(english, 'Person')?.['jobTitle'],
    )
  })

  test('elle est rattachée à ses profils publics', async ({ request }) => {
    const person = nodeOfType(await graphOf(request, '/fr'), 'Person')

    expect(person?.['sameAs']).toEqual(PROFILE_URLS)
  })

  test('elle déclare ce qu’elle connaît, et **jamais** à quel niveau', async ({ request }) => {
    /*
     * ⛔ Décision D2, ouverte : les niveaux (1 à 5) sont une auto-évaluation que
     * personne n'a relue. `/skills` ne les affiche pas depuis P4-06 ; ce parcours
     * vérifie qu'ils ne sont pas republiés par le canal des machines, qui est
     * précisément celui que personne ne regarde.
     */
    const person = nodeOfType(await graphOf(request, '/fr'), 'Person')
    const known = person?.['knowsAbout'] as string[]

    expect(known.length).toBeGreaterThan(0)
    expect(JSON.stringify(person)).not.toContain('level')
  })

  test('une page de section porte son fil d’Ariane, dans sa langue', async ({ request }) => {
    const trail = nodeOfType(await graphOf(request, '/en/skills'), 'BreadcrumbList')
    const items = trail?.['itemListElement'] as Record<string, unknown>[]

    expect(items).toHaveLength(2)
    expect(items[0]?.['item']).toBe(`${ORIGIN}/en`)
    expect(items[1]?.['item']).toBe(`${ORIGIN}/en/skills`)
  })

  test('une fiche de projet est une œuvre, datée à la précision qu’elle connaît', async ({
    request,
  }) => {
    const path = await detailPath(request, 'fr', 'projects')
    const work = nodeOfType(await graphOf(request, path), 'CreativeWork')

    expect(work?.['url']).toBe(`${ORIGIN}${path}`)

    /*
     * ⭐⭐⭐ La propriété que P4-17 a rendue vraie par construction, vérifiée sur
     * le HTML **réellement servi** : la date émise est exactement celle que
     * `content/` porte, jamais complétée. La comparer à l'attribut `datetime` de
     * la page est ce qui la rend indépendante du contenu du jour — les deux
     * canaux lisent la même valeur, et c'est cela qu'il faut garder.
     */
    const html = await (await request.get(path)).text()
    /*
     * ⚠️ **Insensible à la casse, et ce n'est pas une précaution gratuite.** Next
     * sert l'attribut sous la forme `dateTime="…"`, en casse mixte — les noms
     * d'attributs HTML étant insensibles à la casse, navigateurs et moteurs y
     * lisent bien `datetime`. La Phase 3 a déjà payé exactement cela sur
     * `hrefLang` (`phase-3-log.md` §14.1), où l'extracteur fautif rendait le test
     * **vert sans rien inspecter**. Ici il a échoué, parce que la ligne
     * ci-dessous refuse une extraction vide.
     */
    const displayed = /<time datetime="([^"]+)"/i.exec(html)?.[1]

    expect(displayed).toBeDefined()
    expect(work?.['dateCreated']).toBe(displayed)
  })

  test('le dernier niveau du fil d’Ariane s’appelle comme le titre de la page', async ({
    page,
    request,
  }) => {
    // Deux libellés pour la même page, c'est deux réponses à la même question
    // envoyées au même moteur de recherche.
    const path = await detailPath(request, 'fr', 'experiences')
    const graph = await graphOf(request, path)
    const items = nodeOfType(graph, 'BreadcrumbList')?.['itemListElement'] as Record<
      string,
      unknown
    >[]

    await page.goto(path)

    expect(items).toHaveLength(3)
    expect(items[2]?.['name']).toBe(await page.locator('h1').textContent())
    expect(items[2]?.['item']).toBe(`${ORIGIN}${path}`)
  })

  test('chaque page du sitemap porte des données structurées', async ({ request }) => {
    /*
     * ⭐⭐ **Le contrôle qui aurait attrapé le défaut de P4-08.** Vérifier deux
     * pages nommées à la main prouve que le mécanisme fonctionne ; il ne dit rien
     * de la septième page, écrite plus tard, qui aurait simplement oublié le
     * bloc. Le périmètre est donc **dérivé du sitemap**, pas énuméré.
     */
    const missing: string[] = []

    for (const path of await sitemapPaths(request)) {
      const graph = await graphOf(request, path).catch(() => [])
      if (graph.length === 0) missing.push(path)
    }

    expect(missing).toEqual([])
  })

  test('les pages introuvables n’en portent aucune', async ({ request }) => {
    // Une 404 ne décrit aucune entité. En déclarer une reviendrait à annoncer à
    // un moteur de recherche du contenu là où le statut dit qu'il n'y en a pas.
    const html = await (await request.get('/fr/404')).text()

    expect(html).not.toContain('application/ld+json')
  })
})
