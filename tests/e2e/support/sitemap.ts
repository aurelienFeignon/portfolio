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

/**
 * Le sitemap n'est téléchargé qu'**une fois par processus de test**.
 *
 * ⛔ L'en-tête de ce fichier affirmait « lu une seule fois pour tous les profils
 * E2E » depuis son extraction, et le code le démentait : chaque appel refaisait
 * la requête — cinq fois sur les seuls parcours de P4-09. Une prose qui survit
 * au code qu'elle décrit, trouvée par la mesure et non par la relecture.
 *
 * C'est la **promesse** qui est mémoïsée, pas son résultat : deux parcours
 * concurrents partagent le même travail au lieu de le faire deux fois — le motif
 * que la couche Content applique depuis P2-03.
 */
let cached: Promise<string[]> | undefined

/** Les chemins listés par le sitemap — jamais vide, la fonction s'en assure. */
export async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
  cached ??= (async () => {
    const xml = await (await request.get('/sitemap.xml')).text()
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
      (match[1] as string).slice(ORIGIN.length),
    )

    expect(paths.length).toBeGreaterThan(0)
    return paths
  })()

  return cached
}

/**
 * Une entité de **détail** traduite dans les deux langues, déduite du sitemap.
 *
 * Surtout pas un slug codé en dur : `content/` appartient à l'auteur du site, et
 * P2-11 a justement déplacé Augure des projets vers les expériences — ce qui a
 * cassé la première version de ces tests. Un E2E qui nomme une entité teste le
 * contenu du jour ; celui-ci teste la **propriété** qui doit rester vraie quel
 * que soit le contenu.
 *
 * ⭐ Extraite ici au **deuxième exemplaire** (P4-12) : la bascule de langue sur
 * une fiche en a besoin comme les métadonnées de la Phase 3, et c'est la règle du
 * dépôt — une déduction recopiée est une déduction qui divergera.
 *
 * ⚠️ **Elle ne rend que le cas traduit, et c'est tout ce que `content/` porte**
 * aujourd'hui : les deux locales sont parfaitement symétriques, si bien que le cas
 * « entité absente d'une langue » n'existe que dans les fixtures unitaires
 * (`phase-3-log.md`, réserves de sortie). Un parcours ne peut pas l'observer.
 */
export async function translatedPair(
  request: APIRequestContext,
): Promise<{ fr: string; en: string }> {
  const paths = await sitemapPaths(request)
  const pair = paths
    .filter((path) => path.startsWith('/fr/') && path.split('/').length === 4)
    .map((path) => ({ fr: path, en: path.replace(/^\/fr\//, '/en/') }))
    .find(({ en }) => paths.includes(en))

  // Sans entité traduite, les tests qui l'emploient ne vérifieraient rien :
  // mieux vaut échouer que passer sur une collection vide.
  expect(pair, 'aucune entité présente dans les deux langues au sitemap').toBeDefined()
  return pair as { fr: string; en: string }
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
