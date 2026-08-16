/**
 * Le manifeste committé dit ce que le contenu d'aujourd'hui produit (P4-07).
 *
 * **Pourquoi ce garde existe.** `src/routing/route-manifest.ts` est généré avant
 * chaque `next build`, donc la production lit toujours une version fraîche. Mais
 * c'est la version **committée** que lisent `tests/unit/proxy.test.ts` et le
 * relecteur d'une PR : périmée, elle fait passer des tests sur une liste qui
 * n'est plus celle du site, et donne à lire un inventaire faux.
 *
 * La moitié `public/` du manifeste avait déjà son garde
 * (`public-assets-reach-the-visitor.test.ts`) ; la moitié « pages » n'en avait
 * aucun. Relevé en revue — un garde à moitié est ce que ce dépôt traque.
 *
 * ⭐ Il vérifie aussi, gratuitement, l'**idempotence de la forme** : le
 * générateur écrit du TypeScript déjà passé par le format du dépôt, faute de
 * quoi chaque build salit l'arbre de travail et `prettier --check` échoue sur un
 * fichier que personne n'a édité.
 *
 * Le générateur est exécuté en **sous-processus**, comme le gate de contenu :
 * l'importer ferait de ce fichier un lecteur du dépôt de contenu réel, ce
 * qu'interdit le garde d'indépendance des fixtures (P2-09).
 */
import { execFile } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

const run = promisify(execFile)
const GENERATOR = join(process.cwd(), 'scripts', 'generate-route-manifest.mts')
const COMMITTED = join(process.cwd(), 'src', 'routing', 'route-manifest.ts')

describe('manifeste de routes', () => {
  it('est identique à ce que le générateur produit aujourd’hui', async () => {
    const destination = join(await mkdtemp(join(tmpdir(), 'route-manifest-')), 'generated.ts')

    await run('node', [GENERATOR, destination])

    const [generated, committed] = await Promise.all([
      readFile(destination, 'utf8'),
      readFile(COMMITTED, 'utf8'),
    ])

    expect(generated, 'régénérez le manifeste : node scripts/generate-route-manifest.mts').toBe(
      committed,
    )
  })
})
