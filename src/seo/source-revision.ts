/**
 * Révision du dépôt que l'image sert, rendue visible depuis l'extérieur.
 *
 * ⛔ **Un déploiement manquant ne se voyait qu'à l'œil.** Le job `deploy` peut
 * échouer, ou ne jamais tourner, et le site reste debout sur l'image précédente :
 * la sonde externe (`scripts/check-uptime.mts`) le jugeait sain, à raison — il
 * l'était, simplement pas à jour. Mesuré le 2026-11-11 : les deux fusions du
 * 2026-11-10 n'étaient pas servies, le `docker pull` du VPS répondant `denied`.
 *
 * ⭐ L'image porte donc sa révision (argument de construction, comme
 * `SITE_URL`), Next la pose en en-tête sur `/robots.txt` — le seul chemin servi
 * anonymement à travers Cloudflare Access —, et la sonde la compare à la tête
 * de `main`.
 *
 * ⚠️ Ce module n'importe rien : `scripts/check-uptime.mts` et `next.config.ts` le chargent sans `pnpm install` ni
 * résolution d'alias.
 */

export const SOURCE_REVISION_ENV = 'SOURCE_REVISION'

/** Nom de l'en-tête, partagé par `next.config.ts` qui l'émet et la sonde qui le lit. */
export const SOURCE_REVISION_HEADER = 'X-Source-Revision'

// Un SHA de commit complet, en minuscules : la forme du tag que déploie
// `deploy/deploy.sh` (verbe `deploy`).
const FULL_SHA = /^[0-9a-f]{40}$/

/**
 * Absente → `null` : le serveur de développement et les builds locaux n'ont pas
 * de révision à annoncer, et ne doivent pas en inventer une.
 * Présente mais mal formée → échec : un en-tête faux ferait conclure la sonde
 * à un déploiement manquant — ou pire, à un déploiement réussi.
 *
 * @param label Ce que l'erreur nomme : la variable de construction par défaut,
 * l'option de la sonde quand c'est elle qui valide.
 */
export function parseSourceRevision(
  raw: string | undefined,
  label = SOURCE_REVISION_ENV,
): string | null {
  if (raw === undefined || raw === '') return null
  if (!FULL_SHA.test(raw)) {
    throw new Error(
      `${label} doit être un SHA de commit complet (40 caractères hexadécimaux), reçu « ${raw} ».`,
    )
  }
  return raw
}
