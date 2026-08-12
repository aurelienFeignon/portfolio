/**
 * P2-04 — le gate qui casse le build.
 *
 * Ce test **exécute réellement** `scripts/check-content.mts` dans un processus
 * séparé et constate son code de sortie. C'est la seule façon de prouver
 * l'exigence CF-10 sans reconstruire une image Docker à chaque exécution de la
 * suite : le gate est branché sur `pnpm build` (`package.json`), donc son code
 * de sortie **est** celui du build.
 *
 * La vérification par `make build` a été faite une fois, à la main, sur un
 * contenu volontairement fautif — voir `phase-2-log.md` §10.
 */
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

const run = promisify(execFile)

const SCRIPT = join(process.cwd(), 'scripts', 'check-content.mts')
const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'content')

async function checkContent(root: string): Promise<{ code: number; output: string }> {
  try {
    const { stdout, stderr } = await run('node', [SCRIPT, root])
    return { code: 0, output: stdout + stderr }
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string }
    return { code: failure.code ?? -1, output: (failure.stdout ?? '') + (failure.stderr ?? '') }
  }
}

describe('gate de contenu', () => {
  it('sort en 0 sur un contenu valide', async () => {
    const { code, output } = await checkContent(join(FIXTURES, 'valid'))

    expect(code).toBe(0)
    expect(output).toContain('Contenu valide')
  })

  it.each([
    ['une clé inconnue', 'unknown-key', /Unrecognized key: "feature"/],
    ['un slug divergent', 'slug-mismatch', /annonce le slug « augur »/],
    ['un frontmatter absent', 'no-frontmatter', /ne commence pas par un frontmatter/],
    ['un YAML illisible', 'broken-yaml', /YAML illisible/],
    ['deux fichiers pour une URL', 'duplicate-slug', /même slug/],
    [
      'une technologie inconnue des compétences',
      'unknown-technology',
      /cite des technologies inconnues.*« typscript »/,
    ],
  ])('sort en 1 sur %s, en nommant le fichier', async (_label, fixture, expected) => {
    const { code, output } = await checkContent(join(FIXTURES, 'invalid', fixture))

    expect(code).toBe(1)
    expect(output).toMatch(expected)
    expect(output).toContain('fr/projects/augure')
  })

  it('rapporte tous les fichiers fautifs en une seule passe', async () => {
    const { output } = await checkContent(join(FIXTURES, 'invalid', 'several'))

    expect(output).toContain('2 problème(s)')
    expect(output).toContain('augure.mdx')
    expect(output).toContain('typescript.md')
  })

  it('échoue sur un contenu introuvable plutôt que de passer au vert', async () => {
    // Une racine mal résolue produit exactement la même sortie qu'un contenu
    // parfait : c'est le mode de panne silencieuse que ce cas interdit.
    const { code, output } = await checkContent(join(FIXTURES, 'valid', 'en', 'skills'))

    expect(code).toBe(1)
    expect(output).toContain('Aucun fichier de contenu trouvé')
  })
})
