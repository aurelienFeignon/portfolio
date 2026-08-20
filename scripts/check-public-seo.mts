/**
 * Vérification post-déploiement — P4-16.
 *
 * ## Ce qu'elle vérifie, et pourquoi de l'extérieur
 *
 * Les `canonical`, les `hreflang` et le sitemap sont **gravés au build** et
 * servis par l'application : les vérifier dans le dépôt, ou même contre l'image,
 * ne dit rien de ce qu'un robot reçoit. P4-13 l'a payé — trois écritures de
 * `SITE_URL` coïncidaient pendant qu'on ignorait ce que le document servait.
 * Cette sonde-ci lit donc le **site public**, comme un indexeur le lit.
 *
 * ## Ce qu'elle refuse de supposer
 *
 * 1. **Que le site soit ouvert.** Derrière Cloudflare Access, toute page rend une
 *    302 vers `cloudflareaccess.com` : ce n'est pas une panne, c'est la
 *    fermeture volontaire (`deploy/README.md` §4.2). Le script la **nomme**,
 *    plutôt que de rendre « 302 inattendue » — c'est son échec le plus probable,
 *    et le plus trompeur.
 * 2. **Que la casse d'un attribut soit celle qu'on attend.** Next sert
 *    `hrefLang="fr"`, avec un L majuscule. HTML étant insensible à la casse,
 *    c'est valide et les robots le lisent — mais une lecture sensible à la casse
 *    rend « aucun hreflang » sur quatorze pages qui en portent trois chacune.
 *    ⭐⭐ Mesuré le 2026-08-18, sur la première version de cette vérification :
 *    **une absence et un instrument aveugle se lisent exactement pareil.**
 * 3. **Que le sitemap et les pages disent la même chose.** Les deux sont
 *    produits par des chemins différents ; leur désaccord est invisible à
 *    l'unité, et c'est lui qui décide de ce qui est indexé.
 *
 * ## Ce qu'elle n'est pas
 *
 * ⚠️ **Elle n'est pas un gate de CI, et ne peut pas l'être** tant que le site est
 * fermé au public : elle serait rouge en permanence pour une raison qui n'est pas
 * un défaut. Elle se lance à la main, au moment d'une mise en ligne — la
 * checklist de `deploy/README.md` §8.3 l'appelle.
 *
 * ⚠️ **Elle ne juge pas la performance.** Lighthouse contre le site réel est un
 * relevé distinct (`make lighthouse` avec `PLAYWRIGHT_BASE_URL`), parce qu'il
 * demande un navigateur et plusieurs minutes.
 */
import { buildAbsoluteUrl, parseSiteUrl } from '../src/seo/site-url.ts'

/**
 * ⭐ L'origine entre par ARGUMENT, jamais par l'environnement : une sonde
 * regarde une adresse publique, qui ne dépend d'aucun conteneur. `SITE_URL` vaut
 * `http://localhost:3000` en développement, et une sonde qui la lirait mesurerait
 * le mauvais site — c'est arrivé à celle de P4-14, à sa première exécution.
 */
const SITE = parseSiteUrl(process.argv[2] ?? 'https://aurelienfeignon.com')
const TIMEOUT_MS = 20_000
const USER_AGENT = 'portfolio-public-seo-check (P4-16)'

type Failure = { where: string; detail: string }

const failures: Failure[] = []
const fail = (where: string, detail: string): void => void failures.push({ where, detail })

type Page = { status: number; location: string | null; body: string; error?: string }

/**
 * ⛔ **Une URL injoignable est un constat, pas un plantage.** Sans ce `catch`, un
 * sitemap qui annonce un hôte mort tue le processus sur une exception de DNS :
 * le code de sortie serait bien 1, mais aucun des écarts déjà trouvés ne serait
 * imprimé. Trouvé en voyant le banc rouge, sur le cas d'une URL d'une autre
 * origine — la panne la plus banale qu'un sitemap puisse porter.
 */
async function get(url: string): Promise<Page> {
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': USER_AGENT },
    })
    return {
      status: response.status,
      location: response.headers.get('location'),
      body: await response.text(),
    }
  } catch (error) {
    return { status: 0, location: null, body: '', error: (error as Error).message }
  }
}

/**
 * La 302 d'Access ressemble à une panne et n'en est pas une. Toute lecture passe
 * par ici pour que le message dise laquelle des deux on regarde.
 */
function accessOrStatus(where: string, page: Page): boolean {
  if (page.status === 200) return true
  if (page.error !== undefined) {
    fail(where, `aucune réponse — ${page.error}`)
    return false
  }
  const target = page.location ?? ''
  if (target.includes('cloudflareaccess.com')) {
    fail(
      where,
      `${page.status} vers Cloudflare Access — le site est FERMÉ au public. Ce n'est pas un ` +
        `défaut : cette vérification suppose Access levé (deploy/README.md §4.2).`,
    )
    return false
  }
  fail(where, `${page.status}${target === '' ? '' : ` vers ${target}`} au lieu de 200`)
  return false
}

/** Les balises `<link rel="alternate" …>`, lues sans supposer l'ordre ni la casse des attributs. */
function alternatesOf(html: string): string[] {
  return [...html.matchAll(/<link\b[^>]*\brel="alternate"[^>]*>/gi)]
    .map((tag) => {
      const lang = /\bhreflang="([^"]+)"/i.exec(tag[0])?.[1]
      const href = /\bhref="([^"]+)"/i.exec(tag[0])?.[1]
      return lang === undefined || href === undefined ? null : `${lang}=${href}`
    })
    .filter((entry): entry is string => entry !== null)
    .sort()
}

/** Les alternates déclarés par le sitemap pour un bloc `<url>`, même forme. */
function alternatesOfSitemapEntry(block: string): string[] {
  return [...block.matchAll(/<xhtml:link\b[^>]*>/gi)]
    .map((tag) => {
      const lang = /\bhreflang="([^"]+)"/i.exec(tag[0])?.[1]
      const href = /\bhref="([^"]+)"/i.exec(tag[0])?.[1]
      return lang === undefined || href === undefined ? null : `${lang}=${href}`
    })
    .filter((entry): entry is string => entry !== null)
    .sort()
}

/** L'origine d'une URL, ou une marque inanalysable — jamais une exception. */
function originOf(raw: string): string {
  try {
    return new URL(raw).origin
  } catch {
    return `(URL inanalysable : ${JSON.stringify(raw.slice(0, 60))})`
  }
}

const ROBOTS_URL = buildAbsoluteUrl(SITE, '/robots.txt')
const SITEMAP_URL = buildAbsoluteUrl(SITE, '/sitemap.xml')

console.log(`Vérification post-déploiement — ${SITE.origin}\n`)

// --- 1. robots.txt : l'application autorise, et déclare son sitemap ---------
const robots = await get(ROBOTS_URL)
if (accessOrStatus('robots.txt', robots)) {
  const before = failures.length
  const expected = `Sitemap: ${SITEMAP_URL}`
  if (!robots.body.includes(expected)) {
    fail(
      'robots.txt',
      `la directive « ${expected} » est absente — Cloudflare sert peut-être le sien seul, ` +
        `ou l'image a été construite avec une autre SITE_URL`,
    )
  }
  // ⭐ Le groupe `*` et lui seul : le bloc managé de Cloudflare porte ses propres
  // `Disallow: /` pour GPTBot et meta-externalagent, qui ne nous concernent pas.
  // ⛔ Découpage plutôt qu'une regex à borne de fin : JS n'a pas `\Z`, et `\Z`
  // y désigne un « Z » littéral — un motif qui ne trouve jamais rien se lit
  // comme un site qui n'autorise personne.
  const group =
    robots.body
      .split(/^user-agent:[ \t]*/im)
      .slice(1)
      .find((block) => block.trimStart().startsWith('*')) ?? ''
  if (!/^allow:\s*\/\s*$/im.test(group)) {
    fail(
      'robots.txt',
      `le groupe « User-Agent: * » ne porte pas « Allow: / » — reçu ${JSON.stringify(group.trim().slice(0, 80))}`,
    )
  }
  if (failures.length === before) {
    console.log(`  ✓ robots.txt — « Allow: / » pour tous, et le sitemap déclaré`)
  }
}

// --- 2. sitemap.xml : présent, non vide, et de la bonne origine ------------
const sitemap = await get(SITEMAP_URL)
const entries: { loc: string; alternates: string[] }[] = []
if (accessOrStatus('sitemap.xml', sitemap)) {
  const before = failures.length
  for (const [, block] of sitemap.body.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const loc = /<loc>([^<]+)<\/loc>/i.exec(block)?.[1]
    if (loc !== undefined) entries.push({ loc, alternates: alternatesOfSitemapEntry(block) })
  }
  if (entries.length === 0)
    fail(
      'sitemap.xml',
      'aucune URL — un sitemap vide passe tous les contrôles suivants sans rien prouver',
    )
  // ⛔⛔ **Comparer les origines ANALYSÉES, jamais un préfixe de chaîne.**
  // `https://exemple.com.pages.dev/en` commence par `https://exemple.com` et
  // n'en est pas : c'est la forme exacte d'un alias de préproduction resté au
  // sitemap — du contenu dupliqué, donc précisément ce que ce contrôle existe
  // pour voir. Un `startsWith` le rend vert ; le banc le mesure.
  const etrangeres = entries.filter((e) => originOf(e.loc) !== SITE.origin)
  if (etrangeres.length > 0)
    fail(
      'sitemap.xml',
      `${etrangeres.length} URL d'une autre origine, dont ${etrangeres[0]?.loc} ` +
        `(origine réelle : ${originOf(etrangeres[0]?.loc ?? '')})`,
    )
  if (failures.length === before) {
    console.log(`  ✓ sitemap.xml — ${entries.length} URL, toutes sur ${SITE.origin}`)
  }
}

// --- 3. chaque page : servie, localisée, canonique d'elle-même -------------
for (const { loc, alternates } of entries) {
  const page = await get(loc)
  if (!accessOrStatus(loc, page)) continue

  const locale = new URL(loc).pathname.split('/')[1] ?? ''
  const lang = /<html[^>]*\blang="([^"]+)"/i.exec(page.body)?.[1]
  if (lang !== locale)
    fail(loc, `<html lang> vaut ${JSON.stringify(lang ?? '(absent)')} au lieu de « ${locale} »`)

  const canonical = /<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]+)"/i.exec(page.body)?.[1]
  if (canonical !== loc)
    fail(loc, `canonical = ${JSON.stringify(canonical ?? '(absent)')}, attendu l'URL du sitemap`)

  const pageAlternates = alternatesOf(page.body)
  if (pageAlternates.join(' ') !== alternates.join(' ')) {
    fail(
      loc,
      `les hreflang de la page et du sitemap divergent\n      page    : ${pageAlternates.join(' ') || '(aucun)'}\n      sitemap : ${alternates.join(' ') || '(aucun)'}`,
    )
  }
  if (!pageAlternates.some((entry) => entry.startsWith('x-default='))) {
    fail(
      loc,
      'aucun hreflang « x-default » — rien ne désigne la version servie aux langues non couvertes',
    )
  }
}

if (failures.length === 0) {
  console.log(
    `  ✓ ${entries.length} pages — lang, canonical et hreflang concordent avec le sitemap`,
  )
  console.log(`\n✓ Le site est indexable, et il annonce ce qu'il sert.`)
} else {
  console.error(
    `\n✗ ${failures.length} écart(s) entre ce que le site annonce et ce qu'il devrait :\n`,
  )
  for (const { where, detail } of failures) console.error(`    ${where}\n      ${detail}`)
  // `process.exit()` tronque la sortie quand stdout est un tuyau (P4-13 §20.7).
  process.exitCode = 1
}
