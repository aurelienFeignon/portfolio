import { describe, expect, it } from 'vitest'

import { sourcesModulePlanPur, sourcesPlanGenere } from '../../../scripts/scene-isolation-rules.mts'

/** P8-15i — les motifs du garde d'isolation, éprouvés sans build. */
describe('motifs de l’isolation de la carte mère', () => {
  const sources = [
    '[project]/src/scene/generated/board-plan.fr.json',
    '[project]/src/scene/state/board/plan.ts',
    '[project]/src/scene/state/board-render/geometry.ts',
    '[project]/src/scene/state/scene-state.ts',
    '[project]/node_modules/.pnpm/three@0.185.1/node_modules/three/build/three.core.js',
  ]

  it('reconnaît le plan versionné', () => {
    expect(sourcesPlanGenere(sources)).toEqual([sources[0]])
  })

  it('reconnaît le module pur, mais pas `board-render/`', () => {
    expect(sourcesModulePlanPur(sources)).toEqual([sources[1]])
  })

  it('ne voit rien dans un chunk sans carte', () => {
    expect(sourcesPlanGenere([sources[3]!])).toEqual([])
    expect(sourcesModulePlanPur([sources[3]!])).toEqual([])
  })
})
