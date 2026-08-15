/**
 * Le sitemap servi, lu une seule fois pour tous les profils E2E.
 *
 * **Pourquoi ce module existe.** Aucun test E2E ne nomme une entité de
 * `content/` : le contenu appartient à l'auteur du site et change — P2-11 a
 * déplacé Augure des projets vers les expériences, ce qui a cassé la première
 * version de ces tests. Chaque parcours qui a besoin d'une URL réelle la déduit
 * donc du sitemap, et cette déduction était **déjà recopiée** avant d'atterrir
 * ici : trois fois dans `profiles/desktop-chromium/i18n-routing.spec.ts`, où le
 * commentaire d'origine le disait, puis une quatrième dans le parcours de chrome
 * de P4-02 — ce qui a décidé du déplacement.
 *
 * ⚠️ **Un extracteur fautif ne fait pas échouer un test : il le rend vert sans
 * avoir rien inspecté.** C'est arrivé dans ce fichier voisin, sur `hreflang` servi
 * en casse mixte. D'où l'assertion de non-vide portée par la fonction elle-même,
 * plutôt que laissée à chaque appelant.
 */
import type { APIRequestContext } from '@playwright/test'

import { expect } from '@playwright/test'

const SITE_URL = process.env['SITE_URL']

if (SITE_URL === undefined || SITE_URL === '') {
  throw new Error(
    'SITE_URL est absente : ces tests comparent les URL servies à l’origine de construction. ' +
      'Elle est fournie par docker-compose*.yml et par la CI.',
  )
}

/** L'origine avec laquelle l'image a été **construite**, sans barre finale. */
export const ORIGIN = SITE_URL.replace(/\/$/, '')

/** Les chemins listés par le sitemap — jamais vide, la fonction s'en assure. */
export async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
  const xml = await (await request.get('/sitemap.xml')).text()
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    (match[1] as string).slice(ORIGIN.length),
  )

  expect(paths.length).toBeGreaterThan(0)
  return paths
}

/**
 * Un chemin de page de **détail** dans la locale demandée, déduit du sitemap.
 *
 * Une page de détail a quatre segments (`/fr/projects/portfolio`), là où une
 * section en a trois. C'est la seule caractéristique qui ne dépende pas du
 * contenu du jour.
 */
export async function detailPath(
  request: APIRequestContext,
  locale: string,
  section: string,
): Promise<string> {
  const prefix = `/${locale}/${section}/`
  const path = (await sitemapPaths(request)).find((candidate) => candidate.startsWith(prefix))

  expect(path, `aucune page de détail sous ${prefix} au sitemap`).toBeDefined()
  return path as string
}
