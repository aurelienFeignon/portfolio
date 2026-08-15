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
}

/** Écrit une arborescence `.next` minimale, puis exécute le gate contre elle. */
async function checkRendering(manifests: Manifests): Promise<{ code: number; output: string }> {
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

  try {
    const { stdout, stderr } = await run('node', [SCRIPT, root])
    return { code: 0, output: stdout + stderr }
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string }
    return { code: failure.code ?? -1, output: (failure.stdout ?? '') + (failure.stderr ?? '') }
  }
}

/** Un site minuscule mais complet : une page, prégénérée, close, et au sitemap. */
const HEALTHY: Manifests = {
  appRoutes: { '/[locale]/page': '/[locale]', '/sitemap.xml/route': '/sitemap.xml' },
  routes: {
    '/fr': { compute: 'static', routeType: 'page' },
    '/sitemap.xml': { compute: 'static', routeType: 'route' },
  },
  dynamicRoutes: { '/[locale]': { fallback: false } },
  sitemap: ['/fr'],
}

describe('gate de rendu statique', () => {
  it('sort en 0 sur un build entièrement statique', async () => {
    const { code, output } = await checkRendering(HEALTHY)

    expect(code).toBe(0)
    expect(output).toContain('aucune à la demande, toutes au sitemap')
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
      routes: { '/fr': { compute: 'static', routeType: 'page' } },
      dynamicRoutes: { '/[locale]': { fallback: false } },
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

  it('refuse un build qui ne déclare aucune route applicative', async () => {
    // Un contrôle qui ne trouve rien ne vérifie rien (`phase-2-log.md` §10.5).
    const { code, output } = await checkRendering({ appRoutes: {}, routes: {} })

    expect(code).toBe(1)
    expect(output).toContain('Aucune route applicative')
  })

  it('refuse de conclure sans manifeste', async () => {
    const root = await mkdtemp(join(tmpdir(), 'next-empty-'))

    await expect(run('node', [SCRIPT, root])).rejects.toMatchObject({ code: 1 })
  })
})
