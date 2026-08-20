/**
 * P4-16 — la vérification post-déploiement, éprouvée sur ce qu'elle existe pour voir.
 *
 * Le script est **exécuté en sous-processus** contre un serveur de fixture, et
 * c'est son **code de sortie** qui est constaté : c'est lui qui tranche au moment
 * d'une mise en ligne, et une vérification qu'on ne voit jamais rouge ne prouve
 * rien de ce qu'elle prétend garder.
 *
 * ⭐ Les fixtures ne sont pas inventées : le `robots.txt` est celui que
 * `aurelienfeignon.com` a réellement servi le 2026-08-20, bloc managé de
 * Cloudflare compris, et les pages portent `hrefLang` avec le L majuscule que
 * Next émet — la casse qui a rendu la première lecture aveugle.
 *
 * ⚠️ **Quatrième exemplaire du lanceur de sous-processus** du dépôt, après
 * `content-gate`, `static-rendering-gate` et `uptime-probe`. Le déclencheur écrit
 * dans ce dernier — « le prochain qui touche l'un de ces trois extrait les
 * trois » — ne s'arme pas ici : ce fichier n'en touche aucun. Mais quatre copies
 * est le point où l'extraction cesse d'être facultative, et P4-16 refuse de
 * réécrire trois fichiers antérieurs dans une PR de fonctionnalité — refus que
 * le dépôt a déjà tranché ainsi pour `htmlOf` (P4-09 §15.5 bis).
 * **Déclencheur mis à jour : la prochaine tâche qui touche l'un de ces QUATRE
 * fichiers extrait les quatre.**
 */
import { execFile } from 'node:child_process'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { afterEach, describe, expect, it } from 'vitest'

const run = promisify(execFile)
const SCRIPT = join(process.cwd(), 'scripts', 'check-public-seo.mts')

type Site = { robots?: string; sitemap?: string; pages?: Record<string, string> }
type Build = (origin: string) => Site

let close: (() => Promise<void>) | null = null

afterEach(async () => {
  await close?.()
  close = null
})

/** Le `robots.txt` réellement servi le 2026-08-20 — bloc managé de Cloudflare inclus. */
const robotsOf = (origin: string): string =>
  `User-agent: GPTBot\nDisallow: /\n\n# END Cloudflare Managed Content\n\nUser-Agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`

const alternatesOf = (origin: string): { lang: string; href: string }[] => [
  { lang: 'fr', href: `${origin}/fr` },
  { lang: 'en', href: `${origin}/en` },
  { lang: 'x-default', href: `${origin}/fr` },
]

/** ⭐ `hrefLang`, avec le L majuscule de Next : c'est ce que le site sert. */
const pageOf = (origin: string, path: string, lang = path.slice(1)): string =>
  `<!doctype html><html lang="${lang}"><head>` +
  `<link rel="canonical" href="${origin}${path}"/>` +
  alternatesOf(origin)
    .map((a) => `<link rel="alternate" hrefLang="${a.lang}" href="${a.href}"/>`)
    .join('') +
  `</head><body></body></html>`

const sitemapOf = (origin: string, locs = ['/fr', '/en']): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n` +
  locs
    .map(
      (path) =>
        `<url>\n<loc>${origin}${path}</loc>\n` +
        alternatesOf(origin)
          .map((a) => `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.href}" />`)
          .join('\n') +
        `\n</url>`,
    )
    .join('\n') +
  `\n</urlset>`

/** Un site conforme, dont chaque cas ne dérange qu'une seule chose. */
const sound: Build = (origin) => ({
  robots: robotsOf(origin),
  sitemap: sitemapOf(origin),
  pages: { '/fr': pageOf(origin, '/fr'), '/en': pageOf(origin, '/en') },
})

async function serving(
  build: Build,
  handler?: (req: IncomingMessage, res: ServerResponse) => boolean,
): Promise<string> {
  const server = createServer((request, response) => {
    if (handler?.(request, response) === true) return
    const site = build(origin)
    const path = request.url ?? '/'
    const body =
      path === '/robots.txt'
        ? site.robots
        : path === '/sitemap.xml'
          ? site.sitemap
          : site.pages?.[path]
    if (body === undefined) {
      response.writeHead(404).end('introuvable')
      return
    }
    response.writeHead(200, {
      'content-type': path.endsWith('.xml') ? 'application/xml' : 'text/html',
    })
    response.end(body)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const origin = `http://127.0.0.1:${port}`
  close = () => new Promise<void>((resolve) => server.close(() => resolve()))
  return origin
}

async function check(origin: string): Promise<{ code: number; output: string }> {
  try {
    // L'origine passe par ARGUMENT : elle ne doit pouvoir s'hériter de rien.
    const { stdout, stderr } = await run('node', [SCRIPT, origin])
    return { code: 0, output: stdout + stderr }
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string }
    return { code: failure.code ?? -1, output: (failure.stdout ?? '') + (failure.stderr ?? '') }
  }
}

describe('vérification post-déploiement (P4-16)', () => {
  it('sort en 0 sur un site conforme, hrefLang à L majuscule compris', async () => {
    const { code, output } = await check(await serving(sound))

    expect(output).toContain('2 URL')
    expect(output).toContain('lang, canonical et hreflang concordent')
    expect(code).toBe(0)
  })

  it('NOMME Cloudflare Access plutôt que de rendre « 302 inattendue »', async () => {
    const origin = await serving(sound, (request, response) => {
      if (request.url === '/robots.txt') return false
      response
        .writeHead(302, { location: 'https://augure.cloudflareaccess.com/cdn-cgi/access/login/x' })
        .end()
      return true
    })
    const { code, output } = await check(origin)

    expect(output).toContain('FERMÉ au public')
    expect(output).toContain('§4.2')
    expect(code).toBe(1)
  })

  it('rougit quand le robots.txt ne déclare plus le sitemap', async () => {
    const { code, output } = await check(
      await serving((origin) => ({ ...sound(origin), robots: 'User-Agent: *\nAllow: /\n' })),
    )

    expect(output).toContain('est absente')
    expect(code).toBe(1)
  })

  it('rougit quand le groupe « * » interdit tout, sans se laisser tromper par le bloc managé', async () => {
    const { code, output } = await check(
      await serving((origin) => ({
        ...sound(origin),
        robots: `User-agent: GPTBot\nDisallow: /\n\nUser-Agent: *\nDisallow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
      })),
    )

    expect(output).toContain('ne porte pas « Allow: / »')
    expect(code).toBe(1)
  })

  it('rougit sur un sitemap vide, qui passerait tous les contrôles suivants', async () => {
    const { code, output } = await check(
      await serving((origin) => ({ ...sound(origin), sitemap: '<urlset></urlset>' })),
    )

    expect(output).toContain('aucune URL')
    expect(code).toBe(1)
  })

  it('rougit sur une URL du sitemap qui appartient à une autre origine', async () => {
    const { code, output } = await check(
      await serving((origin) => ({
        ...sound(origin),
        sitemap: sitemapOf(origin).replace(
          `<loc>${origin}/en</loc>`,
          `<loc>https://exemple.test/en</loc>`,
        ),
      })),
    )

    expect(output).toContain("d'une autre origine")
    expect(code).toBe(1)
  })

  it('rougit sur une URL qui COMMENCE par l’origine sans en être', async () => {
    // ⛔ `http://127.0.0.1:1234@exemple.test/en` commence par l'origine et n'en
    // est pas : l'hôte est `exemple.test`, le reste est un userinfo. Même forme
    // qu'un alias de préproduction — `https://exemple.com.pages.dev` commence
    // par `https://exemple.com`. Un `startsWith` rend ces deux cas VERTS.
    const { code, output } = await check(
      await serving((origin) => ({
        ...sound(origin),
        sitemap: sitemapOf(origin).replace(
          `<loc>${origin}/en</loc>`,
          `<loc>${origin}@exemple.test/en</loc>`,
        ),
      })),
    )

    expect(output).toContain("d'une autre origine")
    expect(code).toBe(1)
  })

  it('rougit sur un canonical qui désigne une autre page', async () => {
    const { code, output } = await check(
      await serving((origin) => ({
        ...sound(origin),
        pages: {
          '/fr': pageOf(origin, '/fr').replace(
            `rel="canonical" href="${origin}/fr"`,
            `rel="canonical" href="${origin}/en"`,
          ),
          '/en': pageOf(origin, '/en'),
        },
      })),
    )

    expect(output).toContain('canonical =')
    expect(code).toBe(1)
  })

  it('rougit quand la page et le sitemap ne déclarent pas les mêmes hreflang', async () => {
    const { code, output } = await check(
      await serving((origin) => ({
        ...sound(origin),
        pages: {
          '/fr': pageOf(origin, '/fr').replace(/<link rel="alternate" hrefLang="en"[^>]*>/, ''),
          '/en': pageOf(origin, '/en'),
        },
      })),
    )

    expect(output).toContain('divergent')
    expect(code).toBe(1)
  })

  it('rougit quand plus rien ne porte x-default', async () => {
    const { code, output } = await check(
      await serving((origin) => ({
        ...sound(origin),
        sitemap: sitemapOf(origin).replace(/<xhtml:link[^>]*hreflang="x-default"[^>]*>\n?/g, ''),
        pages: {
          '/fr': pageOf(origin, '/fr').replace(
            /<link rel="alternate" hrefLang="x-default"[^>]*>/,
            '',
          ),
          '/en': pageOf(origin, '/en').replace(
            /<link rel="alternate" hrefLang="x-default"[^>]*>/,
            '',
          ),
        },
      })),
    )

    expect(output).toContain('x-default')
    expect(code).toBe(1)
  })

  it('rougit quand la langue du document ne suit pas le segment de l’URL', async () => {
    const { code, output } = await check(
      await serving((origin) => ({
        ...sound(origin),
        pages: { '/fr': pageOf(origin, '/fr', 'en'), '/en': pageOf(origin, '/en') },
      })),
    )

    expect(output).toContain('<html lang>')
    expect(code).toBe(1)
  })
})
