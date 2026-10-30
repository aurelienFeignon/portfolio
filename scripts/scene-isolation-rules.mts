/**
 * P8-15i — les motifs que lit `check-scene-isolation.mts` pour la carte mère, séparés du script
 * pour qu'un test puisse les éprouver sans build (le script, lui, s'exécute à l'import).
 *
 * - `generated/` : le plan versionné (`board-plan.<locale>.json`) ne se charge que depuis le chunk
 *   3D, jamais à la première visite ;
 * - `state/board/` : le module pur du plan ne sert qu'au générateur (`make board`) — aucune
 *   **valeur** n'en doit atterrir dans un chunk, ni de première visite ni 3D. Les types y sont
 *   effacés, donc invisibles ici, comme il se doit. `board-render/` n'est PAS `board/`.
 */
export const PLAN_GENERE = /(^|\/)src\/scene\/generated\//
export const MODULE_PLAN_PUR = /(^|\/)src\/scene\/state\/board\//

/** Les sources d'une map qui sont le plan versionné (JSON de la carte). */
export const sourcesPlanGenere = (sources: readonly string[]): string[] =>
  sources.filter((source) => PLAN_GENERE.test(source))

/** Les sources d'une map qui sont une valeur du module pur du plan. */
export const sourcesModulePlanPur = (sources: readonly string[]): string[] =>
  sources.filter((source) => MODULE_PLAN_PUR.test(source))
