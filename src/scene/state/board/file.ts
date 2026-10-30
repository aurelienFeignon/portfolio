/**
 * Le plan de carte **versionné** (P8-15b, `carte-mere.md` §12) : du contenu d'une locale au
 * `BoardFile` que `make board` écrit — le plan du palier `full` et les quatre cadrages.
 *
 * Le format (types, version, garde) vit dans `board-render/file-format.ts`, que la scène peut lire
 * sans tirer ce module ; celui-ci ne garde que ce qui sert au générateur.
 *
 * Module pur : ni `Date` (l'année est un paramètre), ni `Math.random`, ni Three.js.
 */
import { BOARD_FILE_VERSION, type BoardFile, type BoardLoss } from '../board-render/file-format.ts'
import { boardCameras } from './cameras.ts'
import type { BoardContent } from './content.ts'
import { planBoard } from './plan.ts'
import type { ChipSizing } from './zones.ts'

export interface BuildOptions {
  readonly locale: string
  readonly year: number
  readonly chipSizing: ChipSizing
}

/** Assemble le fichier : le plan complet (palier `full`) et les cadrages qui en découlent. */
export function buildBoardFile(content: BoardContent, options: BuildOptions): BoardFile {
  const plan = planBoard(content, {
    currentYear: options.year,
    chipSizing: options.chipSizing,
    tier: 'full',
  })
  return {
    version: BOARD_FILE_VERSION,
    locale: options.locale,
    year: options.year,
    chipSizing: options.chipSizing,
    plan,
    cameras: boardCameras(plan),
  }
}

/** Les liaisons que le routeur a perdues : compétence → projet, puis projet → expérience (bus). */
export function boardLosses(file: BoardFile): readonly BoardLoss[] {
  const { unrouted, unroutedBusLinks } = file.plan.traces
  return [
    ...unrouted.map((l): BoardLoss => ({ kind: 'link', from: l.skill, to: l.project })),
    ...unroutedBusLinks.map((l): BoardLoss => ({
      kind: 'bus-link',
      from: l.project,
      to: l.experience,
    })),
  ]
}

/** Le résumé humain d'une génération : les compteurs du plan et le temps pris. */
export function summarize(file: BoardFile, ms: number): string {
  const { plan } = file
  const counts = [
    `${plan.zones.length} zone(s)`,
    `${plan.district.processors.length} processeur(s)`,
    `${plan.traces.routes.length} piste(s)`,
    `${plan.passives.length} petit(s) composant(s)`,
  ].join(', ')
  const losses = boardLosses(file).length
  return `✓ Carte mère [${file.locale}] — frise jusqu'en ${file.year} — ${counts} — ${losses} liaison(s) perdue(s) — ${ms} ms`
}
