/**
 * Internationalisation, vue depuis l'extérieur (Phase 3).
 *
 * Ces assertions n'observent que des réponses HTTP et du HTML servi : elles ne
 * dépendent d'aucun profil et sont donc jouées **une seule fois**, sur
 * `desktop-chromium`. Dans `make ci`, elles s'exécutent contre l'**image de
 * production** — c'est-à-dire contre l'artefact déployé, et non contre ce que la
 * configuration prétend.
 *
 * `SITE_URL` est l'origine avec laquelle l'image a été **construite** : les
 * `canonical` et les `hreflang` sont gravés dans le HTML statique, ils ne
 * dépendent pas de l'adresse par laquelle on interroge le serveur. C'est
 * précisément ce que ces tests vérifient.
 */
import type { APIRequestContext } from '@playwright/test'

import { ORIGIN as origin, sitemapPaths } from '../../support/sitemap'
import { expect, test } from '../../support/test'

/**
 * Extrait les `href` des balises `<link rel="alternate" hreflang="…">` du HTML.
 *
 * ⚠️ **Les expressions sont insensibles à la casse, et ce n'est pas de la
 * prudence.** Next sert l'attribut sous la forme `hrefLang="fr"`, en casse mixte
 * — c'est le nom de la propriété React, restitué tel quel. Les noms d'attributs
 * HTML étant insensibles à la casse, un navigateur comme un moteur de recherche
 * y lisent bien `hreflang` : le site est correct. Mais une extraction sensible à
 * la casse n'y voit rien, et c'est ce qui est arrivé à la première version de ce
 * fichier — le test « aucun `hreflang` ne pointe vers une page inexistante »
 * passait au vert **sans avoir inspecté un seul lien**.
 */
function hreflangsOf(html: string): { hreflang: string; href: string }[] {
  return [...html.matchAll(/<link[^>]+rel="alternate"[^>]*>/gi)].flatMap((tag) => {
    const hreflang = /hreflang="([^"]+)"/i.exec(tag[0])?.[1]
    const href = /href="([^"]+)"/i.exec(tag[0])?.[1]
    return hreflang !== undefined && href !== undefined ? [{ hreflang, href }] : []
  })
}

/**
 * Une entité traduite dans les deux langues, **déduite du sitemap**.
 *
 * Surtout pas un slug codé en dur : `content/` appartient à l'auteur du site, et
 * P2-11 a justement déplacé Augure des projets vers les expériences — ce qui a
 * cassé la première version de ces tests. Un E2E qui nomme une entité teste le
 * contenu du jour ; celui-ci teste la **propriété** qui doit rester vraie quel
 * que soit le contenu.
 */
async function translatedPair(request: APIRequestContext): Promise<{ fr: string; en: string }> {
  const paths = await sitemapPaths(request)
  const pair = paths
    .filter((path) => path.startsWith('/fr/') && path.split('/').length === 4)
    .map((path) => ({ fr: path, en: path.replace(/^\/fr\//, '/en/') }))
    .find(({ en }) => paths.includes(en))

  // Sans entité traduite, ces tests ne vérifieraient rien : mieux vaut échouer.
  expect(pair, 'aucune entité présente dans les deux langues au sitemap').toBeDefined()
  return pair as { fr: string; en: string }
}

function canonicalOf(html: string): string | undefined {
  const tag = /<link[^>]+rel="canonical"[^>]*>/i.exec(html)?.[0]
  return tag === undefined ? undefined : /href="([^"]+)"/i.exec(tag)?.[1]
}

test.describe('négociation de la racine', () => {
  for (const [header, expected] of [
    ['fr', '/fr'],
    ['en', '/en'],
    ['en-GB,en;q=0.9', '/en'],
    ['de,es;q=0.8', '/fr'],
  ] as const) {
    test(`« ${header} » mène à ${expected}`, async ({ request }) => {
      const response = await request.get('/', {
        headers: { 'accept-language': header },
        maxRedirects: 0,
      })

      expect(response.status()).toBe(307)
      expect(response.headers()['location']).toBe(expected)
    })
  }

  test('sans en-tête, mène à la locale par défaut', async ({ request }) => {
    const response = await request.get('/', { headers: { 'accept-language': '' }, maxRedirects: 0 })

    expect(response.headers()['location']).toBe('/fr')
  })

  test('déclare varier selon la langue demandée', async ({ request }) => {
    // Sans cet en-tête, Cloudflare mémoriserait la redirection du premier
    // visiteur et l'enverrait à tous les suivants (P3-03).
    const response = await request.get('/', {
      headers: { 'accept-language': 'en' },
      maxRedirects: 0,
    })

    expect(response.headers()['vary']?.toLowerCase()).toContain('accept-language')
  })

  test('redirige temporairement, jamais définitivement', async ({ request }) => {
    // Un 301 serait mémorisé par le navigateur, quelle que soit sa langue.
    const response = await request.get('/', { maxRedirects: 0 })

    expect([301, 308]).not.toContain(response.status())
  })
})

test.describe('locale inconnue', () => {
  test('répond 404, sans deviner la plus proche', async ({ request }) => {
    // Deviner polluerait l'index avec des URL qui n'existent pas
    // (`architecture.md` §10).
    expect((await request.get('/de')).status()).toBe(404)
    expect((await request.get('/de/projects')).status()).toBe(404)
  })

  test('répond 404 sur un slug inconnu, dans les deux langues', async ({ request }) => {
    expect((await request.get('/fr/projects/inexistant')).status()).toBe(404)
    expect((await request.get('/en/experiences/inexistant')).status()).toBe(404)
  })
})

test.describe('deux locales, deux pages', () => {
  test('résolvent chacune leur contenu, indépendamment', async ({ page, request }) => {
    // C'est le critère de sortie de la phase, constaté sur l'artefact.
    const { fr, en } = await translatedPair(request)

    await page.goto(fr)
    const french = await page.getByRole('main').textContent()

    await page.goto(en)
    const english = await page.getByRole('main').textContent()

    expect(french).toBeTruthy()
    expect(english).toBeTruthy()
    expect(french).not.toBe(english)
  })

  test('chacune est canonique d’elle-même', async ({ request }) => {
    const pair = await translatedPair(request)

    for (const path of [pair.fr, pair.en]) {
      const html = await (await request.get(path)).text()
      expect(canonicalOf(html)).toBe(`${origin}${path}`)
    }
  })

  test('se référencent mutuellement, et déclarent un `x-default`', async ({ request }) => {
    const { fr, en } = await translatedPair(request)
    const html = await (await request.get(fr)).text()

    expect(hreflangsOf(html)).toEqual(
      expect.arrayContaining([
        { hreflang: 'fr', href: `${origin}${fr}` },
        { hreflang: 'en', href: `${origin}${en}` },
        { hreflang: 'x-default', href: `${origin}${fr}` },
      ]),
    )
  })
})

test.describe('sitemap et robots', () => {
  test('le sitemap n’annonce que des URL de l’origine configurée', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])

    expect(locations.length).toBeGreaterThan(0)
    for (const location of locations) {
      expect(location?.startsWith(`${origin}/`)).toBe(true)
    }
  })

  test('le sitemap contient les deux versions d’une entité traduite', async ({ request }) => {
    const { fr, en } = await translatedPair(request)
    const xml = await (await request.get('/sitemap.xml')).text()

    expect(xml).toContain(`<loc>${origin}${fr}</loc>`)
    expect(xml).toContain(`<loc>${origin}${en}</loc>`)
  })

  test('aucune URL du sitemap ne renvoie une erreur', async ({ request }) => {
    const paths = await sitemapPaths(request)
    const statuses = await Promise.all(
      paths.map(async (path) => `${path} → ${(await request.get(path)).status()}`),
    )

    expect(statuses).toEqual(paths.map((path) => `${path} → 200`))
  })

  test('aucun `hreflang` ne pointe vers une page inexistante (R-07)', async ({ request }) => {
    // La vérification qui compte : on suit réellement chaque lien alternatif de
    // chaque page du sitemap. Une promesse fausse faite à un moteur de recherche
    // se constate ici, pas en relisant le code.
    const paths = await sitemapPaths(request)

    const announced = (
      await Promise.all(
        paths.map(async (path) => {
          const html = await (await request.get(path)).text()
          return hreflangsOf(html).map(({ href }) => ({ path, href }))
        }),
      )
    ).flat()

    // Sans ce compte, le test passe au vert quand l'extraction ne trouve rien —
    // et c'est exactement ce qui s'est produit au premier essai.
    expect(announced.length).toBeGreaterThanOrEqual(paths.length)

    for (const { href } of announced) {
      expect(href.startsWith(`${origin}/`)).toBe(true)
    }

    // Dédupliquées : les alternatives d'un groupe de traductions sont les mêmes
    // sur chaque page du groupe, et les suivre une fois par page multiplierait
    // les requêtes par le nombre de langues sans rien vérifier de plus.
    const targets = [...new Set(announced.map(({ href }) => href.slice(origin.length)))].sort()
    const statuses = await Promise.all(
      targets.map(async (target) => `${target} → ${(await request.get(target)).status()}`),
    )

    expect(statuses).toEqual(targets.map((target) => `${target} → 200`))
  })

  test('robots.txt autorise tout et désigne le sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt')
    const body = await response.text()

    expect(response.status()).toBe(200)
    expect(body).toContain('Allow: /')
    expect(body).toContain(`Sitemap: ${origin}/sitemap.xml`)
  })

  test('robots.txt ne bloque pas le CV, dont le `noindex` doit pouvoir être lu', async ({
    request,
  }) => {
    // Une URL bloquée par robots.txt peut être indexée sur la foi de liens
    // entrants, sans que son `X-Robots-Tag` ait jamais été vu.
    const body = await (await request.get('/robots.txt')).text()

    expect(body).not.toContain('Disallow: /resume')
  })
})
