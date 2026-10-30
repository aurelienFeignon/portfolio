import { describe, expect, it } from 'vitest'
import { makeBoardContent } from '../../../fixtures/builders/board'
import { buildBoardFile } from '@/scene/state/board/file'
import { BOARD_FILE_VERSION, isBoardFile } from '@/scene/state/board-render/file-format'

const file = buildBoardFile(makeBoardContent(), { locale: 'en', year: 2026, chipSizing: 'uniform' })

describe('isBoardFile', () => {
  it('accepte un fichier produit par le générateur, relu depuis du JSON', () => {
    expect(isBoardFile(JSON.parse(JSON.stringify(file)))).toBe(true)
  })

  it.each([null, undefined, 42, 'x', [], {}])('refuse %j', (value) => {
    expect(isBoardFile(value)).toBe(false)
  })

  it('refuse une autre version du format', () => {
    expect(isBoardFile({ ...file, version: BOARD_FILE_VERSION + 1 })).toBe(false)
  })

  it.each(['locale', 'year', 'chipSizing', 'plan', 'cameras'] as const)(
    'refuse un fichier sans %s',
    (key) => {
      const rest = Object.fromEntries(Object.entries(file).filter(([name]) => name !== key))
      expect(isBoardFile(rest)).toBe(false)
    },
  )

  it('refuse un plan ou des cadrages mal formés', () => {
    expect(isBoardFile({ ...file, plan: null })).toBe(false)
    expect(isBoardFile({ ...file, plan: {} })).toBe(false)
    expect(isBoardFile({ ...file, cameras: { accueil: file.cameras.accueil } })).toBe(false)
    expect(isBoardFile({ ...file, year: '2026' })).toBe(false)
  })
})
