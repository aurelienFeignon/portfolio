/**
 * **Fichier généré — ne pas éditer à la main.**
 *
 * Produit par `scripts/generate-route-manifest.mts` avant chaque `next build`,
 * puis confronté au build par `check-static-rendering.mts` : deux énumérations
 * qui divergent sont la panne que décrit R-07.
 *
 * Il existe pour que `src/proxy.ts` sache ce que le serveur peut servir sans
 * lire le disque — ni `content/` ni `public/` ne sont interrogeables depuis une
 * fonction de proxy, et `content/` n'est même pas dans l'image de production.
 */

/** Les **pages** du site. Toute autre URL est réécrite vers la page introuvable. */
export const SERVED_PATHS: readonly string[] = [
  '/en',
  '/en/experiences',
  '/en/experiences/askor',
  '/en/experiences/augure',
  '/en/projects',
  '/en/projects/portfolio',
  '/en/skills',
  '/fr',
  '/fr/experiences',
  '/fr/experiences/askor',
  '/fr/experiences/augure',
  '/fr/projects',
  '/fr/projects/portfolio',
  '/fr/skills',
]

/**
 * Ce que le serveur sert **sans que ce soit une page** : les fichiers de
 * `public/` et les routes-poignées de l'App Router.
 *
 * ⛔ Sans cette liste, le proxy ne pouvait distinguer un fichier réel d'une URL
 * inventée qu'à l'extension — et une adresse inconnue portant un point
 * (`/wp-login.php`, `/cv.pdf`) échappait alors à la réécriture pour recevoir la
 * 404 interne de Next, hors du layout racine, donc **sans `lang`**.
 */
export const PASSTHROUGH_PATHS: readonly string[] = [
  '/README.md',
  '/en/opengraph-image',
  '/fr/opengraph-image',
  '/icon',
  '/resume/cv-en.pdf',
  '/resume/cv-fr.pdf',
  '/robots.txt',
  '/sitemap.xml',
]
