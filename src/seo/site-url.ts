/**
 * Origine du site, définie **en un seul endroit**.
 *
 * Exigence de P1-17 : le domaine ne doit jamais être recopié en dur dans les
 * métadonnées, le sitemap, les `hreflang` ou l'expéditeur du CV. Il entre par la
 * variable d'environnement `SITE_URL` et ne circule ensuite que par ces
 * fonctions.
 *
 * La partie pure (`parseSiteUrl`, `buildAbsoluteUrl`) est séparée de la lecture
 * de l'environnement : c'est ce qui la rend testable sans variable globale.
 */

export const SITE_URL_ENV = 'SITE_URL'

/**
 * Valide et normalise l'origine du site.
 *
 * Échoue plutôt que de deviner : une origine absente ou mal formée produirait
 * des `canonical` et des `hreflang` faux, c'est-à-dire une erreur silencieuse
 * qui ne se voit qu'une fois le site indexé (architecture.md §10).
 */
export function parseSiteUrl(raw: string | undefined): URL {
  if (raw === undefined || raw.trim() === '') {
    throw new Error(`${SITE_URL_ENV} est absente : impossible de construire des URL absolues.`)
  }

  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new Error(`${SITE_URL_ENV} n'est pas une URL absolue valide : « ${raw} ».`)
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${SITE_URL_ENV} doit utiliser http ou https, reçu « ${url.protocol} ».`)
  }

  // Une origine ne porte ni chemin, ni requête, ni fragment : les laisser passer
  // produirait des URL absolues à double segment.
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new Error(`${SITE_URL_ENV} doit être une origine seule, sans chemin : « ${raw} ».`)
  }

  return url
}

/**
 * Construit une URL absolue à partir d'un chemin de l'application.
 * Tolère l'absence comme la présence du `/` initial, jamais de double slash.
 *
 * Aucune normalisation manuelle n'est nécessaire : `parseSiteUrl` garantit que
 * l'origine n'a pas de chemin, donc la résolution relative de `URL` donne déjà
 * le bon résultat dans les deux cas. Une normalisation explicite a été écrite
 * puis retirée — les tests de mutation l'ont montrée sans effet (P1-10).
 */
export function buildAbsoluteUrl(siteUrl: URL, path: string): string {
  return new URL(path, siteUrl).toString()
}

/** Lecture de l'environnement — le seul point impur du module. */
export function getSiteUrl(): URL {
  return parseSiteUrl(process.env[SITE_URL_ENV])
}
