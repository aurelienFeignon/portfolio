/**
 * Les pages **rendues à la demande** — l'exception nommée au gate de rendu statique (P10-06).
 *
 * Tout le site est prérendu, et `scripts/check-static-rendering.mts` refuse le contraire : aucune
 * requête ne doit lire `content/`, présent dans l'image par le seul effet du traceur de Next
 * (`phase-4-log.md` §20.8). La page de contact y fait exception **par
 * nécessité** : le time-trap de P10-03 pose l'instant du rendu en champ caché, et prérendue, elle
 * porterait l'instant du build — le piège laisserait alors tout passer, sans rien dire.
 *
 * Elle reste admissible parce qu'elle ne lit que les dictionnaires ; le layout racine qu'elle
 * traverse ne lit plus `content/` (étiquettes gravées par `make board`).
 *
 * ⛔ L'exception est **exacte**, et le gate la confronte dans les deux sens : une route déclarée
 * ici doit exister au build **et ne pas** y être prérendue (sinon le piège serait gravé), et ses
 * chemins doivent figurer au manifeste du proxy mais **pas** au sitemap.
 */
import { LOCALES } from '../i18n/locales.ts'

import { contactPath } from './paths.ts'

export interface OnDemandPage {
  /** La route telle que la nomme `app-path-routes-manifest.json`. */
  readonly route: string
  /** Les adresses qu'elle sert, une par locale. */
  readonly paths: readonly string[]
}

export const ON_DEMAND_PAGES: readonly OnDemandPage[] = [
  { route: '/[locale]/contact', paths: LOCALES.map(contactPath) },
]
