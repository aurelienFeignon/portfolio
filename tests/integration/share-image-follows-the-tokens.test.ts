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
 * couleur employée **existe encore dans les tokens**. C'est la seule moitié qui
 * soit automatisable, et c'est celle qui casse.
 *
 * ⛔ Il ne lisait d'abord que `opengraph-image.tsx`, alors que `icon.tsx` recopie
 * la même couleur — et son commentaire affirmait pourtant être gardé par ce
 * test. Il lit maintenant **tout `src/`**, ce qui couvre aussi
 * `src/ui/brand-palette.ts`, où les valeurs vivent désormais une seule fois.
 *
 * ⚠️ **Ce que ce test ne peut pas voir**, et qui a justifié le palette partagé :
 * il vérifie que chaque littéral **est** un token, jamais que deux fichiers
 * désignent le **même**. Deux images qui se contredisent sur l'accent le
 * laisseraient vert. C'est la duplication qu'il fallait supprimer, pas
 * surveiller. Relevé en revue.
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const SOURCE_DIR = join(process.cwd(), 'src')
const TOKENS = join(SOURCE_DIR, 'app', 'globals.css')

/** Les couleurs écrites en clair, quelle que soit leur casse. */
function hexColours(source: string): string[] {
  return [...source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(([hex]) => hex.toLowerCase())
}

/** Les couleurs écrites en clair dans les routes, avec le fichier qui les porte. */
async function colouredSources(): Promise<{ file: string; colour: string }[]> {
  const entries = await readdir(SOURCE_DIR, { recursive: true, withFileTypes: true })
  const found: { file: string; colour: string }[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue

    const path = join(entry.parentPath, entry.name)
    for (const colour of hexColours(await readFile(path, 'utf8'))) {
      found.push({ file: path.slice(SOURCE_DIR.length + 1), colour })
    }
  }

  return found
}

describe('palette des rendus hors navigateur', () => {
  it('en emploie, sinon ce test ne vérifie rien', async () => {
    // Un parcours qui ne trouve rien rend l'assertion suivante verte pour la
    // pire des raisons (`phase-2-log.md` §10.5).
    expect((await colouredSources()).length).toBeGreaterThan(0)
  })

  it('n’en emploie aucune qui ne soit un token', async () => {
    const declared = new Set(hexColours(await readFile(TOKENS, 'utf8')))

    const invented = (await colouredSources()).filter(({ colour }) => !declared.has(colour))

    expect(
      invented,
      'ces couleurs ne sont plus dans globals.css : un rendu a dérivé du site',
    ).toEqual([])
  })
})
