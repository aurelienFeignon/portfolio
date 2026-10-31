/**
 * Le **format** du plan de carte versionné (P8-15b) : ce que `make board` écrit et que la scène lit.
 *
 * ⭐ Isolé de `board/` à dessein : la scène (chunk 3D) lit ce format sans tirer la moindre valeur du
 * module pur qui calcule le plan — seulement des types, effacés à la compilation, et
 * `isBoardFile`, qui ne dépend de rien.
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random`.
 */
import type { CameraSpec, ViewId } from '../layout.ts'
import type { BoardPlan } from '../board/plan.ts'
import type { ChipSizing } from '../board/zones.ts'

/** Numéro du format : à incrémenter dès que la forme de `BoardFile` change. */
export const BOARD_FILE_VERSION = 1

export interface BoardFile {
  readonly version: typeof BOARD_FILE_VERSION
  readonly locale: string
  /** L'année courante **gravée** à la génération : la frise s'arrête là, pas à l'année du visiteur. */
  readonly year: number
  readonly chipSizing: ChipSizing
  /** Le plan du palier `full` ; les paliers plus légers en dérivent à l'exécution. */
  readonly plan: BoardPlan
  readonly cameras: Readonly<Record<ViewId, CameraSpec>>
}

const VIEWS: readonly ViewId[] = ['accueil', 'experiences', 'projets', 'competences']

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Garde de type **minimale** sur du JSON relu : la version, les champs scalaires, la présence du
 * plan et des quatre cadrages. Elle ne revalide pas la géométrie — le fichier est produit par notre
 * générateur et gardé frais par un test ; elle refuse seulement ce qui n'est manifestement pas un
 * plan de cette version (fichier d'un autre format, réponse tronquée ou page d'erreur).
 */
export function isBoardFile(value: unknown): value is BoardFile {
  if (!isObject(value)) return false
  if (value['version'] !== BOARD_FILE_VERSION) return false
  if (typeof value['locale'] !== 'string' || typeof value['year'] !== 'number') return false
  if (typeof value['chipSizing'] !== 'string') return false
  const plan = value['plan']
  if (!isObject(plan)) return false
  for (const key of ['bounds', 'district', 'timeline', 'traces']) {
    if (!isObject(plan[key])) return false
  }
  if (!Array.isArray(plan['zones']) || !Array.isArray(plan['passives'])) return false
  const cameras = value['cameras']
  return isObject(cameras) && VIEWS.every((view) => isObject(cameras[view]))
}
