/**
 * L'image de partage n'invente aucune couleur (P4-08).
 *
 * **Pourquoi cette duplication existe et ne peut pas ne pas exister.**
 * `ImageResponse` rend hors du navigateur : pas de feuille de style, pas de
 * variables CSS, donc pas de `var(--color-accent)`. L'image doit porter les
 * valeurs en clair, et c'est le **seul** endroit du dépôt où le palette est
 * recopié — la règle 3 de l'ADR-0010 veut que tout littéral remonte en token.
 *
 * ⚠️ Le mode de panne est purement visuel et **silencieux** : le jour où un
 * token change, l'image continue de se générer, sans erreur, dans les anciennes
 * couleurs. Personne ne regarde une vignette de partage à chaque déploiement.
 *
 * Ce test ne vérifie donc pas que l'image est belle — il vérifie que chaque
 * couleur qu'elle emploie **existe encore dans les tokens**. C'est la seule
 * moitié qui soit automatisable, et c'est celle qui casse.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const IMAGE = join(process.cwd(), 'src', 'app', '[locale]', 'opengraph-image.tsx')
const TOKENS = join(process.cwd(), 'src', 'app', 'globals.css')

/** Les couleurs écrites en clair, quelle que soit leur casse. */
function hexColours(source: string): string[] {
  return [...source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(([hex]) => hex.toLowerCase())
}

describe('palette de l’image de partage', () => {
  it('en emploie, sinon ce test ne vérifie rien', async () => {
    // Un parcours qui ne trouve rien rend l'assertion suivante verte pour la
    // pire des raisons (`phase-2-log.md` §10.5).
    expect(hexColours(await readFile(IMAGE, 'utf8')).length).toBeGreaterThan(0)
  })

  it('n’en emploie aucune qui ne soit un token', async () => {
    const [image, tokens] = await Promise.all([readFile(IMAGE, 'utf8'), readFile(TOKENS, 'utf8')])
    const declared = new Set(hexColours(tokens))

    const invented = hexColours(image).filter((colour) => !declared.has(colour))

    expect(
      invented,
      'ces couleurs ne sont plus dans globals.css : l’image de partage a dérivé du site',
    ).toEqual([])
  })
})
