/**
 * P8-15c — la scène charge le plan de SA locale, et refuse un plan périmé.
 *
 * ⭐ Review Focus 1 (R-07) : `fr` et `en` peuvent produire deux plans
 * différents ; un chargeur qui servirait l'un pour l'autre resterait muet. Ce
 * banc charge les deux fichiers RÉELLEMENT engendrés et lit leur `locale` — il
 * ne nomme aucune entité de `content/`.
 */
import { describe, expect, it } from 'vitest'

import { LOCALES } from '@/i18n/locales'
import { BOARD_FILE_VERSION } from '@/scene/state/board-render/file-format'
import { boardFileLoader, checkBoardFile } from '@/scene/state/board-render/load'
import { StaleBoardFileError } from '@/scene/state/board-render/stale-board-file-error'

import { makeBoardContent } from '../../../fixtures/builders/board'
import { buildBoardFile } from '@/scene/state/board/file'

const fichier = (locale: string) =>
  JSON.parse(
    JSON.stringify(
      buildBoardFile(makeBoardContent(), { locale, year: 2026, chipSizing: 'uniform' }),
    ),
  ) as unknown

describe('boardFileLoader charge le fichier de sa locale', () => {
  it.each(LOCALES)('%s', async (locale) => {
    const plan = await boardFileLoader(locale)()
    expect(plan.locale).toBe(locale)
    expect(plan.version).toBe(BOARD_FILE_VERSION)
  })
})

describe('checkBoardFile', () => {
  it('rend le fichier lui-même quand il est valide et de la bonne locale', () => {
    const valeur = fichier('fr')
    expect(checkBoardFile(valeur, 'fr')).toBe(valeur)
  })

  it('⭐ refuse une autre version, par une erreur que la frontière range en `chunk`', () => {
    const perime = { ...(fichier('fr') as object), version: BOARD_FILE_VERSION + 1 }
    const essai = () => checkBoardFile(perime, 'fr')
    // `SceneBoundary` classe en `chunk` sur ce type (`scene-boundary.test.tsx`).
    expect(essai).toThrow(StaleBoardFileError)
    // ⭐ Son propre nom : il n'emprunte plus celui de Turbopack (P8-15h).
    expect(essai).toThrow(expect.objectContaining({ name: 'StaleBoardFileError' }))
  })

  it('⭐ refuse le plan d’une autre locale', () => {
    expect(() => checkBoardFile(fichier('en'), 'fr')).toThrow(StaleBoardFileError)
  })
})
