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
import { SCHEMA_CONTEXT, personId } from '@/seo/json-ld'
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
async function pageOf(request: import('@playwright/test').APIRequestContext, path: string) {
  const html = await (await request.get(path)).text()
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].map((match) => JSON.parse(match[1] as string) as { '@context': string; '@graph': unknown[] })

  expect(blocks.length, `aucun bloc JSON-LD sur ${path}`).toBeGreaterThan(0)
  const graph = blocks.flatMap((block) => {
    // La chaîne vient du module qui l'émet : la recopier ici en ferait une
    // seconde écriture, et le test cesserait de garder ce que le code décide.
    expect(block['@context']).toBe(SCHEMA_CONTEXT)
    return block['@graph'] as Record<string, unknown>[]
  })

  // Le HTML est **rendu avec** le graphe : un appelant qui en a besoin ne
  // retélécharge pas le même document, ce que faisait le parcours des dates.
  return { html, graph }
}

const graphOf = async (request: import('@playwright/test').APIRequestContext, path: string) =>
  (await pageOf(request, path)).graph

const nodeOfType = (graph: Record<string, unknown>[], type: string) =>
  graph.find((node) => node['@type'] === type)

test.describe('données structurées', () => {
  test('l’accueil décrit la personne et le site', async ({ request }) => {
    const graph = await graphOf(request, '/fr')

    const person = nodeOfType(graph, 'Person')
    expect(person).toBeDefined()
    expect(person?.['name']).toBe('Aurélien Feignon')
    // Aligné sur le CV, qui porte « senior » (D7, 2026-08-16) : deux documents
    // publiés par le même site ne peuvent pas s'intituler différemment.
    expect(person?.['jobTitle']).toBe('Développeur Full Stack senior')

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

    /*
     * ⚠️ L'existence **avant** la longueur : le champ est délibérément omis quand
     * la liste est vide, si bien qu'un `featured` perdu dans `content/` faisait
     * échouer ce parcours sur un `TypeError` opaque — avant même d'atteindre
     * l'assertion qui garde D2. Un test doit échouer en disant pourquoi. Relevé
     * en revue.
     */
    expect(person?.['knowsAbout'], 'aucune compétence mise en avant').toBeDefined()
    expect((person?.['knowsAbout'] as string[]).length).toBeGreaterThan(0)
    expect(JSON.stringify(person)).not.toContain('level')
  })

  test('une fiche de projet nomme son auteur, et pas seulement son identifiant', async ({
    request,
  }) => {
    /*
     * ⛔⛔ Le nœud `Person` complet ne vit que sur l'accueil. Une fiche lue seule
     * — ce que fait tout consommateur — n'aurait trouvé qu'un renvoi vers un nœud
     * absent de son graphe. Ce parcours lit **une page qui ne porte pas la
     * personne**, ce qu'un test unitaire ne peut pas exprimer.
     */
    const path = await detailPath(request, 'fr', 'projects')
    const graph = await graphOf(request, path)

    expect(nodeOfType(graph, 'Person')).toBeUndefined()
    expect(nodeOfType(graph, 'CreativeWork')?.['author']).toEqual({
      // Dérivé du module, comme `SCHEMA_CONTEXT` et `PROFILE_URLS` : la
      // convention du fragment est **la** décision du module, et la transcrire
      // à la main ferait de ce test un second endroit où elle est écrite.
      '@id': personId(new URL(ORIGIN)),
      name: 'Aurélien Feignon',
    })
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
    const { html, graph } = await pageOf(request, path)
    const work = nodeOfType(graph, 'CreativeWork')

    expect(work?.['url']).toBe(`${ORIGIN}${path}`)

    /*
     * ⭐⭐⭐ La propriété que P4-17 a rendue vraie par construction, vérifiée sur
     * le HTML **réellement servi** : la date émise est exactement celle que
     * `content/` porte, jamais complétée. La comparer à l'attribut `datetime` de
     * la page est ce qui la rend indépendante du contenu du jour — les deux
     * canaux lisent la même valeur, et c'est cela qu'il faut garder.
     */
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

  /*
   * ⭐⭐ **Les deux sections à détail, et pas une seule.** Le nom de la feuille est
   * choisi par des chemins différents — la route d'expérience passe
   * `experience.role`, le composeur de projet dérive `project.title` —, si bien
   * qu'un parcours qui n'en visitait qu'un laissait l'autre sans mécanisme.
   * C'est ce qui autorise la décision à vivre dans une route : elle est
   * **confrontée**, pas confiée à la discipline. Relevé en revue (angle altitude).
   *
   * ⚠️ Le fil nomme la page comme son `h1`, et non comme sa balise `<title>` —
   * qui porte en plus l'employeur et le suffixe de marque. C'est délibéré : un
   * fil d'Ariane annonce la **position** dans le site, que le `h1` désigne.
   */
  for (const section of ['experiences', 'projects'] as const) {
    test(`le fil d’une fiche de ${section} s’appelle comme le titre de la page`, async ({
      page,
      request,
    }) => {
      // Deux libellés pour la même page, c'est deux réponses à la même question
      // envoyées au même moteur de recherche.
      const path = await detailPath(request, 'fr', section)
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
  }

  test('chaque page du sitemap porte des données structurées', async ({ request }) => {
    /*
     * ⭐⭐ **Le contrôle qui aurait attrapé le défaut de P4-08.** Vérifier deux
     * pages nommées à la main prouve que le mécanisme fonctionne ; il ne dit rien
     * de la septième page, écrite plus tard, qui aurait simplement oublié le
     * bloc. Le périmètre est donc **dérivé du sitemap**, pas énuméré.
     */
    /*
     * ⚠️ Groupé, et non en série. La Phase 3 a supprimé exactement ce motif —
     * « 84 requêtes séquentielles pour 17 URL distinctes » (`phase-3-log.md`
     * §19.5) — et §19.7 en a écrit le déclencheur chiffré : à ~50 entités par
     * section, le sitemap en compte ~200 et ce seul parcours redevient le plus
     * long de la suite. Le rejouer en série ici l'aurait réintroduit dans le
     * commit qui cite la leçon.
     */
    const paths = await sitemapPaths(request)
    const graphs = await Promise.all(paths.map((path) => graphOf(request, path).catch(() => [])))
    const missing = paths.filter((_, index) => (graphs[index] ?? []).length === 0)

    expect(missing).toEqual([])
  })

  test('les pages introuvables n’en portent aucune', async ({ request }) => {
    // Une 404 ne décrit aucune entité. En déclarer une reviendrait à annoncer à
    // un moteur de recherche du contenu là où le statut dit qu'il n'y en a pas.
    const html = await (await request.get('/fr/404')).text()

    expect(html).not.toContain('application/ld+json')
  })
})
