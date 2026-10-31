import { describe, expect, it } from 'vitest'
import { offerHover } from '@/scene/state/board-render/hover-gate'
import { type BoardTarget, targetKey } from '@/scene/state/board-render/targets'

const lid: BoardTarget = { kind: 'processor', slug: 'nexus' }
const chip: BoardTarget = { kind: 'chip', slug: 'ts' }

/** Ce que la scène envoie, depuis une prop `hovered` qui ne change pas pendant la séquence. */
function replay(hovered: BoardTarget | null, offers: readonly (BoardTarget | null)[]) {
  const last = { current: targetKey(hovered) }
  return offers.filter((target) => offerHover(last, target))
}

describe('offerHover', () => {
  it('sortie puis mouvement dans le même événement : le survol revient sur la cible', () => {
    // Le corps du processeur → son capot : `onPointerOut` puis `onPointerMove`, sans rendu entre.
    expect(replay(lid, [null, { kind: 'processor', slug: 'nexus' }])).toEqual([null, lid])
  })

  it('n’envoie pas deux fois la même cible', () => {
    expect(replay(null, [chip, { kind: 'chip', slug: 'ts' }, null, null])).toEqual([chip, null])
  })

  it('réaligné sur la prop effacée par la route : la même cible se rallume', () => {
    const last = { current: '' }
    expect(offerHover(last, chip)).toBe(true)
    last.current = targetKey(null)
    expect(offerHover(last, chip)).toBe(true)
  })
})
