import { describe, expect, it } from 'vitest'
import { makeBoardContent, makeRealSizeBoard } from '../../../fixtures/builders/board'
import { boardCameras } from '@/scene/state/board/cameras'
import { boardLosses, buildBoardFile, summarize } from '@/scene/state/board/file'
import { BOARD_FILE_VERSION, type BoardFile } from '@/scene/state/board-render/file-format'

const options = { locale: 'fr', year: 2026, chipSizing: 'uniform' } as const

describe('buildBoardFile', () => {
  const file = buildBoardFile(makeRealSizeBoard(), options)

  it('porte la version, la locale, l’année gravée et la taille de puces', () => {
    expect(file.version).toBe(BOARD_FILE_VERSION)
    expect(file.locale).toBe('fr')
    expect(file.year).toBe(2026)
    expect(file.chipSizing).toBe('uniform')
  })

  it('porte les quatre cadrages calculés depuis le plan', () => {
    expect(file.cameras).toEqual(boardCameras(file.plan))
  })

  it('le plan est celui du palier full', () => {
    expect(file.plan.pulses).toBeGreaterThan(0)
    expect(file.plan.passives.length).toBeGreaterThan(0)
  })

  it('est sérialisable sans perte', () => {
    expect(JSON.parse(JSON.stringify(file))).toEqual(file)
  })
})

describe('boardLosses', () => {
  const clean = buildBoardFile(makeBoardContent(), options)

  it('ne nomme rien quand tout est routé', () => {
    expect(boardLosses(clean)).toEqual([])
  })

  it('nomme chaque liaison et chaque liaison de bus perdue', () => {
    const lossy: BoardFile = {
      ...clean,
      plan: {
        ...clean.plan,
        traces: {
          ...clean.plan.traces,
          unrouted: [{ skill: 's1', project: 'p1' }],
          unroutedBusLinks: [{ project: 'p2', experience: 'e1', year: 2020 }],
        },
      },
    }
    expect(boardLosses(lossy)).toEqual([
      { kind: 'link', from: 's1', to: 'p1' },
      { kind: 'bus-link', from: 'p2', to: 'e1' },
    ])
  })
})

describe('summarize', () => {
  it('contient les compteurs et la durée', () => {
    const file = buildBoardFile(makeRealSizeBoard(), options)
    const text = summarize(file, 123)
    expect(text).toContain('fr')
    expect(text).toContain('2026')
    expect(text).toContain(`${file.plan.zones.length} zone`)
    expect(text).toContain(`${file.plan.district.processors.length} processeur`)
    expect(text).toContain(`${file.plan.traces.routes.length} piste`)
    expect(text).toContain(`${file.plan.passives.length} petit`)
    expect(text).toContain('123 ms')
  })
})
