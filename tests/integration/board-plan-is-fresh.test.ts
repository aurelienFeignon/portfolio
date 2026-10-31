/**
 * Les plans de carte committés disent ce que le contenu d'aujourd'hui produit (P8-15b).
 *
 * `src/scene/generated/board-plan.<locale>.json` est lu par la scène en production : périmé, il
 * dessinerait une carte qui n'est plus celle du contenu. Le générateur est exécuté en
 * **sous-processus**, comme celui du manifeste de routes : l'importer ferait de ce fichier un
 * lecteur du dépôt de contenu réel (garde d'indépendance des fixtures, P2-09).
 *
 * ⭐ L'année est **gravée** dans le fichier (la frise s'allonge d'un an chaque 1er janvier) : le
 * générateur est relancé avec l'année du fichier, sans quoi ce test rougirait tout seul le 1er
 * janvier. La comparaison est octet à octet.
 */
import { execFile } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import { LOCALES } from '../../src/i18n/locales'

const run = promisify(execFile)
const GENERATOR = join(process.cwd(), 'scripts', 'generate-board-plan.mts')
const COMMITTED = join(process.cwd(), 'src', 'scene', 'generated')

describe('plans de carte', () => {
  it(
    'sont identiques à ce que le générateur produit aujourd’hui, à l’année gravée',
    { timeout: 60_000 },
    async () => {
      const committed = await Promise.all(
        LOCALES.map((locale) => readFile(join(COMMITTED, `board-plan.${locale}.json`), 'utf8')),
      )
      const years = committed.map((text) => (JSON.parse(text) as { year: number }).year)
      expect(new Set(years).size, 'les deux locales portent la même année').toBe(1)

      const out = await mkdtemp(join(tmpdir(), 'board-plan-'))
      await run('node', [GENERATOR, '--year', String(years[0]), '--out', out])

      for (const [index, locale] of LOCALES.entries()) {
        const generated = await readFile(join(out, `board-plan.${locale}.json`), 'utf8')
        expect(generated, `régénérez : make board (${locale})`).toBe(committed[index])
      }
    },
  )

  it(
    'se génèrent encore l’an prochain (alerte un an à l’avance : aucune liaison ne se perd au 1er janvier)',
    { timeout: 60_000 },
    async () => {
      const out = await mkdtemp(join(tmpdir(), 'board-plan-next-'))
      const year = new Date().getFullYear() + 1
      try {
        await run('node', [GENERATOR, '--year', String(year), '--out', out])
      } catch (error) {
        const { stderr, stdout } = error as { stderr?: string; stdout?: string }
        expect.fail(`le générateur échoue pour ${year} :\n${stderr ?? ''}${stdout ?? ''}`)
      }
    },
  )
})
