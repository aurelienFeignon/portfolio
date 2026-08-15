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
import { expect, test } from '../../support/test'

const SITE_URL = process.env['SITE_URL']

if (SITE_URL === undefined || SITE_URL === '') {
  throw new Error(
    'SITE_URL est absente : ces tests comparent les URL servies à l’origine de construction. ' +
      'Elle est fournie par docker-compose*.yml et par la CI.',
  )
}

const origin = SITE_URL.replace(/\/$/, '')

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
    expect((await request.get('/en/projects/inexistant')).status()).toBe(404)
  })
})

test.describe('deux locales, deux pages', () => {
  test('résolvent chacune leur contenu, indépendamment', async ({ page }) => {
    // C'est le critère de sortie de la phase, constaté sur l'artefact.
    await page.goto('/fr/projects/augure')
    const french = await page.getByRole('main').textContent()

    await page.goto('/en/projects/augure')
    const english = await page.getByRole('main').textContent()

    expect(french).toBeTruthy()
    expect(english).toBeTruthy()
    expect(french).not.toBe(english)
  })

  test('chacune est canonique d’elle-même', async ({ request }) => {
    for (const path of ['/fr/projects/augure', '/en/projects/augure']) {
      const html = await (await request.get(path)).text()
      expect(canonicalOf(html)).toBe(`${origin}${path}`)
    }
  })

  test('se référencent mutuellement, et déclarent un `x-default`', async ({ request }) => {
    const html = await (await request.get('/fr/projects/augure')).text()

    expect(hreflangsOf(html)).toEqual(
      expect.arrayContaining([
        { hreflang: 'fr', href: `${origin}/fr/projects/augure` },
        { hreflang: 'en', href: `${origin}/en/projects/augure` },
        { hreflang: 'x-default', href: `${origin}/fr/projects/augure` },
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
    const xml = await (await request.get('/sitemap.xml')).text()

    expect(xml).toContain(`<loc>${origin}/fr/projects/augure</loc>`)
    expect(xml).toContain(`<loc>${origin}/en/projects/augure</loc>`)
  })

  test('aucune URL du sitemap ne renvoie une erreur', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
      (match[1] as string).slice(origin.length),
    )

    for (const path of paths) {
      expect(`${path} → ${(await request.get(path)).status()}`).toBe(`${path} → 200`)
    }
  })

  test('aucun `hreflang` ne pointe vers une page inexistante (R-07)', async ({ request }) => {
    // La vérification qui compte : on suit réellement chaque lien alternatif de
    // chaque page du sitemap. Une promesse fausse faite à un moteur de recherche
    // se constate ici, pas en relisant le code.
    const xml = await (await request.get('/sitemap.xml')).text()
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
      (match[1] as string).slice(origin.length),
    )

    let inspected = 0

    for (const path of paths) {
      const html = await (await request.get(path)).text()
      for (const { href } of hreflangsOf(html)) {
        expect(href.startsWith(`${origin}/`)).toBe(true)
        const target = href.slice(origin.length)
        expect(`${path} → ${href} : ${(await request.get(target)).status()}`).toBe(
          `${path} → ${href} : 200`,
        )
        inspected += 1
      }
    }

    // Sans ce compte, le test passe au vert quand l'extraction ne trouve rien —
    // et c'est exactement ce qui s'est produit au premier essai.
    expect(inspected).toBeGreaterThanOrEqual(paths.length)
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
