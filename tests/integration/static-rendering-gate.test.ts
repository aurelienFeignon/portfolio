/**
 * P3-02 — le gate qui refuse une route rendue à la demande.
 *
 * Ce test **exécute réellement** `scripts/check-static-rendering.mts` dans un
 * processus séparé et constate son code de sortie, exactement comme
 * `content-gate.test.ts` le fait pour le gate de contenu. Le script est branché
 * sur `pnpm build`, donc son code de sortie **est** celui du build.
 *
 * Il existe parce que la revue a fait remarquer que ce gate — celui qui protège
 * la production entière — n'était vérifié que par une capture d'écran textuelle
 * dans le journal de phase, c'est-à-dire par une observation non rejouable. Le
 * script prend désormais sa racine en argument, ce qui le rend exécutable contre
 * des manifestes fabriqués.
 *
 * Les manifestes sont **écrits ici** plutôt que versionnés : ce sont quelques
 * lignes de JSON par cas, et les figer dans le dépôt les ferait diverger de la
 * forme réelle que Next produit sans que personne ne le remarque.
 */
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

const run = promisify(execFile)
const SCRIPT = join(process.cwd(), 'scripts', 'check-static-rendering.mts')

interface Manifests {
  readonly appRoutes: Record<string, string>
  readonly routes: Record<string, { compute?: string; routeType?: string }>
  readonly dynamicRoutes?: Record<string, { fallback: unknown }>
  readonly sitemap?: readonly string[]
  /**
   * Ce que `SERVED_PATHS` annonce au proxy. Écrit dans un module à part, comme
   * dans le dépôt : le gate le charge par son chemin, ce qui est précisément ce
   * qui rend cette confrontation exécutable contre des cas fabriqués.
   */
  readonly served?: readonly string[]
  /** Ce que le proxy laisse passer sans que ce soit une page. */
  readonly passthrough?: readonly string[]
}

/** Écrit une arborescence `.next` minimale, plus le module que lit le proxy. */
async function writeBuild(
  manifests: Manifests,
): Promise<{ root: string; servedPath: string; publicDir: string }> {
  const root = await mkdtemp(join(tmpdir(), 'next-manifests-'))
  await mkdir(join(root, 'server', 'app'), { recursive: true })

  await writeFile(join(root, 'app-path-routes-manifest.json'), JSON.stringify(manifests.appRoutes))
  await writeFile(
    join(root, 'prerender-manifest.json'),
    JSON.stringify({ routes: manifests.routes, dynamicRoutes: manifests.dynamicRoutes ?? {} }),
  )
  if (manifests.sitemap !== undefined) {
    const urls = manifests.sitemap
      .map((path) => `<url><loc>https://exemple.test${path}</loc></url>`)
      .join('')
    await writeFile(join(root, 'server', 'app', 'sitemap.xml.body'), `<urlset>${urls}</urlset>`)
  }

  // Un `public/` vide, et déclaré : le contrôle 6 lit ce répertoire, et lui
  // laisser celui du dépôt ferait dépendre chaque cas des fichiers réels.
  const publicDir = join(root, 'public')
  await mkdir(publicDir, { recursive: true })

  const servedPath = join(root, 'route-manifest.ts')
  await writeFile(
    servedPath,
    `export const SERVED_PATHS: readonly string[] = ${JSON.stringify(manifests.served ?? [])}\n` +
      `export const PASSTHROUGH_PATHS: readonly string[] = ${JSON.stringify(
        manifests.passthrough ?? ['/sitemap.xml'],
      )}\n`,
  )

  return { root, servedPath, publicDir }
}

async function runGate(
  root: string,
  servedPath: string,
  publicDir: string,
): Promise<{ code: number; output: string }> {
  try {
    const { stdout, stderr } = await run('node', [SCRIPT, root, servedPath, publicDir])
    return { code: 0, output: stdout + stderr }
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string }
    return { code: failure.code ?? -1, output: (failure.stdout ?? '') + (failure.stderr ?? '') }
  }
}

/** Écrit le build fabriqué, puis exécute le gate contre lui. */
async function checkRendering(manifests: Manifests): Promise<{ code: number; output: string }> {
  const { root, servedPath, publicDir } = await writeBuild(manifests)
  return runGate(root, servedPath, publicDir)
}

/** Un site minuscule mais complet : une page, prégénérée, close, au sitemap et servie. */
const HEALTHY: Manifests = {
  appRoutes: { '/[locale]/page': '/[locale]', '/sitemap.xml/route': '/sitemap.xml' },
  routes: {
    '/fr': { compute: 'static', routeType: 'page' },
    // Les deux destinations de réécriture : prégénérées comme les autres — le
    // contrôle 5 l'exige — mais ni au sitemap ni au manifeste, parce qu'elles
    // ne sont pas des adresses du site. C'est cette propriété que le premier
    // test porte, et il n'y a rien à en dire de plus dans un test séparé.
    '/fr/404': { compute: 'static', routeType: 'page' },
    '/en/404': { compute: 'static', routeType: 'page' },
    '/sitemap.xml': { compute: 'static', routeType: 'route' },
  },
  dynamicRoutes: { '/[locale]': { fallback: false } },
  sitemap: ['/fr'],
  served: ['/fr'],
  passthrough: ['/sitemap.xml'],
}

describe('gate de rendu statique', () => {
  it('sort en 0 sur un build entièrement statique', async () => {
    const { code, output } = await checkRendering(HEALTHY)

    expect(code).toBe(0)
    expect(output).toContain('au sitemap comme au manifeste du proxy')
  })

  it('refuse une route qui se rendrait à la demande', async () => {
    // `fallback: null` est ce que produit l'absence de `dynamicParams = false`.
    const { code, output } = await checkRendering({
      ...HEALTHY,
      dynamicRoutes: { '/[locale]': { fallback: null } },
    })

    expect(code).toBe(1)
    expect(output).toContain('se rendrait à la demande')
    expect(output).toContain('dynamicParams = false')
  })

  it('refuse une route ni prégénérée ni close', async () => {
    const { code, output } = await checkRendering({ ...HEALTHY, dynamicRoutes: {} })

    expect(code).toBe(1)
    expect(output).toContain("n'est ni prégénérée, ni close")
  })

  it('refuse un régime de rendu autre que `static`', async () => {
    const { code, output } = await checkRendering({
      ...HEALTHY,
      routes: { ...HEALTHY.routes, '/fr': { compute: 'incremental', routeType: 'page' } },
    })

    expect(code).toBe(1)
    expect(output).toContain('régime « incremental »')
  })

  it('refuse un régime **non déclaré**, plutôt que de le laisser passer', async () => {
    // Si Next renomme ou retire ce champ, le contrôle doit le dire — pas devenir
    // muet. C'est la différence entre « n'accepter que `static` » et « refuser
    // ce qu'on ne reconnaît pas ».
    const { code, output } = await checkRendering({
      ...HEALTHY,
      routes: { ...HEALTHY.routes, '/fr': { routeType: 'page' } },
    })

    expect(code).toBe(1)
    expect(output).toContain('non déclaré')
  })

  it('refuse une page prégénérée absente du sitemap', async () => {
    // Le sens routes → sitemap : sans lui, une section qui gagne des pages de
    // détail sans entrer au sitemap est invisible à l'index **et** au contrôle
    // E2E de R-07, qui ne parcourt que les URL du sitemap.
    const { code, output } = await checkRendering({
      ...HEALTHY,
      routes: { ...HEALTHY.routes, '/en': { compute: 'static', routeType: 'page' } },
      sitemap: ['/fr'],
    })

    expect(code).toBe(1)
    expect(output).toContain('/en — prégénérée mais absente du sitemap')
  })

  it('ne réclame pas de sitemap à un site qui n’en publie pas', async () => {
    const { code } = await checkRendering({
      appRoutes: { '/[locale]/page': '/[locale]' },
      routes: {
        '/fr': { compute: 'static', routeType: 'page' },
        // Les deux destinations de réécriture restent exigées : ce site n'a pas
        // de sitemap, il a quand même un proxy.
        '/fr/404': { compute: 'static', routeType: 'page' },
        '/en/404': { compute: 'static', routeType: 'page' },
      },
      dynamicRoutes: { '/[locale]': { fallback: false } },
      served: ['/fr'],
      passthrough: [],
    })

    expect(code).toBe(0)
  })

  it('ignore les routes internes de Next', async () => {
    // `/_not-found` n'a ni `generateStaticParams` ni vocation à être indexée :
    // l'exiger au sitemap ferait échouer tous les builds.
    const { code } = await checkRendering({
      ...HEALTHY,
      appRoutes: { ...HEALTHY.appRoutes, '/_not-found/page': '/_not-found' },
      routes: { ...HEALTHY.routes, '/_not-found': { compute: 'static', routeType: 'page' } },
    })

    expect(code).toBe(0)
  })

  it('refuse une URL annoncée au sitemap sans page derrière', async () => {
    // L'autre sens du contrôle 3. Sans lui, le sitemap peut promettre à un
    // moteur de recherche une adresse qui répond 404 — et seul un parcours E2E,
    // exécuté bien plus tard, le verrait.
    const { code, output } = await checkRendering({ ...HEALTHY, sitemap: ['/fr', '/fr/fantome'] })

    expect(code).toBe(1)
    expect(output).toContain('/fr/fantome — annoncée au sitemap')
  })

  it('refuse un build qui ne déclare aucune route applicative', async () => {
    // Un contrôle qui ne trouve rien ne vérifie rien (`phase-2-log.md` §10.5).
    const { code, output } = await checkRendering({ appRoutes: {}, routes: {} })

    expect(code).toBe(1)
    expect(output).toContain('Aucune route applicative')
  })

  it('refuse de conclure sans les manifestes de `next build`', async () => {
    const root = await mkdtemp(join(tmpdir(), 'next-empty-'))

    await expect(run('node', [SCRIPT, root])).rejects.toMatchObject({ code: 1 })
  })
})

/**
 * Le manifeste que lit le proxy (P4-07) : `SERVED_PATHS` est produit **avant**
 * `next build`, alors que les pages prégénérées en sont le produit. Ce sont deux
 * énumérations, et elles ne peuvent pas être fusionnées — le proxy a besoin de la
 * liste pour être compilé.
 *
 * ⚠️ **Les deux sens sont des pannes silencieuses, et elles ne se ressemblent
 * pas.** Un chemin annoncé en trop laisse passer une URL sans page : Next sert
 * alors sa 404 interne, hors du layout racine, donc sans `lang` — exactement le
 * défaut que P4-07 existe pour supprimer. Un chemin manquant fait réécrire une
 * **page réelle** en 404 : elle disparaît de l'index et du site, en répondant
 * proprement.
 */
describe('manifeste du proxy', () => {
  it('refuse un chemin annoncé servi sans page derrière', async () => {
    const { code, output } = await checkRendering({ ...HEALTHY, served: ['/fr', '/fr/fantome'] })

    expect(code).toBe(1)
    expect(output).toContain('/fr/fantome — annoncé servi par le proxy')
  })

  it('refuse une page servie que le proxy ne connaît pas', async () => {
    const { code, output } = await checkRendering({
      ...HEALTHY,
      routes: { ...HEALTHY.routes, '/en': { compute: 'static', routeType: 'page' } },
      sitemap: ['/fr', '/en'],
      served: ['/fr'],
    })

    expect(code).toBe(1)
    expect(output).toContain('/en — prégénérée mais absente du manifeste du proxy')
  })

  it('n’écarte que la page introuvable, pas une entité dont le slug est « 404 »', async () => {
    // ⚠️ `route.endsWith('/404')` aurait écarté celle-ci, et le build aurait
    // cassé en accusant le sitemap et le manifeste — les deux fichiers qui ont
    // raison. L'exception est exacte, locale par locale.
    const { code, output } = await checkRendering({
      ...HEALTHY,
      routes: { ...HEALTHY.routes, '/fr/projects/404': { compute: 'static', routeType: 'page' } },
      sitemap: ['/fr', '/fr/projects/404'],
      served: ['/fr', '/fr/projects/404'],
    })

    expect(output).not.toContain('/fr/projects/404')
    expect(code).toBe(0)
  })

  it('refuse un build où la destination de réécriture n’existe pas', async () => {
    // Les contrôles 3 et 4 l'excluent tous les deux : sans le contrôle 5, elle
    // pouvait disparaître sans qu'aucun ne bouge, et toute URL inconnue serait
    // réécrite vers une route absente.
    const routes = Object.fromEntries(
      Object.entries(HEALTHY.routes).filter(([route]) => route !== '/fr/404'),
    )
    const { code, output } = await checkRendering({ ...HEALTHY, routes })

    expect(code).toBe(1)
    expect(output).toContain('/fr/404 — destination de réécriture du proxy')
  })

  it('refuse une route servie que le proxy ne laisserait pas passer', async () => {
    // `sitemap.xml` répond sans être une page : absent des chemins laissés
    // passer, il serait réécrit en 404 et le site perdrait son index.
    const { code, output } = await checkRendering({ ...HEALTHY, passthrough: [] })

    expect(code).toBe(1)
    expect(output).toContain('/sitemap.xml — servie par le build')
  })

  it('refuse un chemin laissé passer que plus rien ne sert', async () => {
    // ⚠️ L'autre sens, et il n'y était pas. Une entrée **périmée** — un fichier
    // supprimé de `public/`, une route-poignée retirée — laisse le proxy faire
    // passer une URL que Next sert alors par sa 404 interne, hors du layout
    // racine, donc sans « lang ». C'est le trou de toute la tâche, rouvert par
    // l'autre bout. Relevé en revue.
    const { code, output } = await checkRendering({
      ...HEALTHY,
      passthrough: ['/sitemap.xml', '/resume/cv-supprime.pdf'],
    })

    expect(code).toBe(1)
    expect(output).toContain('/resume/cv-supprime.pdf — laissée passer par le proxy')
  })

  it('refuse de conclure sans manifeste de routes', async () => {
    // Le proxy ne peut pas exister sans cette liste : son absence n'est pas
    // « rien à vérifier », c'est un build cassé.
    //
    // ⚠️ Le build fabriqué ici est **entièrement sain** — sitemap compris. Sans
    // cette précaution le test passait déjà, avant que le contrôle n'existe :
    // le gate sortait en 1 sur un `sitemap.xml.body` absent, et l'assertion
    // aurait été verte quoi qu'on écrive. Un test doit échouer pour la raison
    // qu'il nomme.
    const { root, publicDir } = await writeBuild(HEALTHY)

    const { code, output } = await runGate(root, join(root, 'inexistant.ts'), publicDir)

    expect(code).toBe(1)
    expect(output).toContain('manifeste de routes')
  })
})
