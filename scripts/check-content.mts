/**
 * Gate de contenu — exigence CF-10 (P2-04).
 *
 * Exécuté **avant `next build`** (voir `package.json#scripts.build`) : un
 * frontmatter invalide fait échouer le build, et le message nomme le fichier.
 *
 * Pourquoi un gate séparé plutôt que de compter sur le rendu des pages : il
 * valide **tout** le contenu, y compris ce qu'aucune route ne rend encore. En
 * Phase 2, aucune page ne lit le contenu — le build passerait donc sur un
 * dossier entièrement fautif, et l'exigence CF-10 ne serait qu'une intention.
 *
 * Il tourne sous `node` seul, sans bundler ni exécuteur de tests : c'est la
 * contrepartie concrète de « la couche Content est du TypeScript pur »
 * (ADR-0001) — et c'est ce qui impose les extensions `.ts` explicites dans ses
 * imports relatifs.
 */
import { CONTENT_TYPES } from '../src/content/content-type.ts'
import { ContentError } from '../src/content/errors.ts'
import {
  describeUnknownTechnologies,
  findUnknownTechnologies,
  type TechnologyReference,
} from '../src/content/integrity.ts'
import { validateFile } from '../src/content/loader.ts'
import { createContentSource, defaultContentRoot } from '../src/content/source.ts'
import { LOCALES } from '../src/i18n/locales.ts'

// Une racine peut être passée en argument : c'est ce qui permet à un test de
// lancer ce gate contre des fixtures fautives et de constater son code de
// sortie, plutôt que de croire sur parole qu'il échouerait.
const root = process.argv[2] ?? defaultContentRoot()
const source = createContentSource(root)
const failures: string[] = []
let validated = 0

for (const locale of LOCALES) {
  // La cohérence référentielle se juge **à l'intérieur d'une locale** : un
  // projet anglais qui cite `typescript` a besoin de `en/skills/typescript.md`,
  // faute de quoi sa page renverra vers une compétence qui n'existe pas dans
  // cette langue (P2-07).
  const skillSlugs = new Set<string>()
  const references: TechnologyReference[] = []

  for (const type of CONTENT_TYPES) {
    let files
    try {
      files = await source.read(locale, type)
    } catch (error) {
      // Une erreur de lecture (frontmatter absent, YAML illisible, slug en
      // double) emporte le dossier : on ne peut pas valider ce qu'on n'a pas pu
      // lire. Elle est signalée puis on passe au dossier suivant, pour que
      // l'auteur voie tout ce qu'il a à corriger en une seule passe.
      failures.push(describe(error))
      continue
    }

    for (const file of files) {
      try {
        const entry = validateFile({ ...file, type })
        validated += 1

        if (type === 'skills') skillSlugs.add(entry.slug)
        if ('technologies' in entry) {
          references.push({ file: file.file, technologies: entry.technologies })
        }
      } catch (error) {
        failures.push(describe(error))
      }
    }
  }

  for (const problem of findUnknownTechnologies(references, skillSlugs)) {
    failures.push(`${problem.file} — ${describeUnknownTechnologies(problem)}`)
  }
}

function describe(error: unknown): string {
  return error instanceof ContentError ? error.message : String(error)
}

if (failures.length > 0) {
  console.error(`\n✗ Contenu invalide — ${failures.length} problème(s) :\n`)
  for (const failure of failures) console.error(`  ${failure}\n`)
  console.error(
    'Le build est interrompu volontairement : un contenu invalide ne doit pas\n' +
      'atteindre la production sous forme de page à moitié vide (CF-10).\n',
  )
  process.exit(1)
}

if (validated === 0) {
  // Un gate qui ne trouve rien et passe au vert est un mode de panne
  // silencieuse : une racine mal résolue produit exactement la même sortie
  // qu'un contenu parfait. Bloquant depuis que le contenu d'amorçage existe
  // (P2-10) ; c'était un simple avertissement tant que `content/` était vide.
  console.error(
    `\n✗ Aucun fichier de contenu trouvé sous « ${root} ».\n\n` +
      "  Le site ne peut pas être vide : c'est le signe d'une racine mal résolue,\n" +
      "  pas d'un contenu correct.\n",
  )
  process.exit(1)
}

console.log(`✓ Contenu valide — ${validated} fichier(s) vérifié(s).`)
