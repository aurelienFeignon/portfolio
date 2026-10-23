/**
 * Le repère du palier décidé — ce qu'une mesure lit pour savoir quelle scène
 * elle a vue (`performance-budget.md` §6.3).
 */
import { describe, expect, it } from 'vitest'

import { CAPABILITY_TIERS } from '@/scene/capability/resolve'
import { tierMark } from '@/scene/capability/tier-mark'

describe('le repère de palier', () => {
  it('nomme chacun des quatre paliers sous un préfixe commun', () => {
    // ⛔ Ce littéral est celui que relisent `scripts/measure-performance.mts` et
    // les deux bancs E2E du montage : le changer ici exige de le changer là-bas.
    expect(CAPABILITY_TIERS.map(tierMark)).toEqual([
      'scene:tier:full',
      'scene:tier:reduced',
      'scene:tier:lite',
      'scene:tier:none',
    ])
  })
})
