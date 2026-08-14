/**
 * Gate de contenu — exigence CF-10 (P2-04, étendu et resserré en revue).
 *
 * Exécuté **avant `next build`** (voir `package.json#scripts.build`) : un contenu
 * invalide fait échouer le build, et le message nomme le fichier.
 *
 * Pourquoi un gate séparé plutôt que de compter sur le rendu des pages : il
 * valide **tout** le contenu, y compris ce qu'aucune route ne rend encore. En
 * Phase 2, aucune page ne lit le contenu — le build passerait donc sur un
 * dossier entièrement fautif, et l'exigence CF-10 ne serait qu'une intention.
 *
 * Il tourne sous `node` seul, sans bundler ni exécuteur de tests : c'est la
 * contrepartie concrète de « la couche Content est du TypeScript pur »
 * (ADR-0001) — et c'est ce qui impose les extensions `.ts` explicites dans ses
 * imports relatifs, et l'absence de JSX dans ce qu'il importe.
 *
 * **Ce fichier ne décide de rien.** Chaque règle qu'il applique appartient à un
 * module de `src/` : la forme du dossier à `content/tree.ts`, la lecture à
 * `content/source.ts`, les schémas à `content/schemas/`, le référentiel à
 * `content/integrity.ts`, la liste blanche à `ui/mdx/`. Il les enchaîne et met en
 * forme le rapport, rien de plus.
 */
import { compile } from '@mdx-js/mdx'

import { CONTENT_TYPES } from '../src/content/content-type.ts'
import { ContentError, messageOf } from '../src/content/errors.ts'
import {
  describeUnknownTechnologies,
  findUnknownTechnologies,
  type TechnologyReference,
} from '../src/content/integrity.ts'
import { validateFile } from '../src/content/loader.ts'
import { createContentSource, defaultContentRoot, type ContentFile } from '../src/content/source.ts'
import { inspectContentTree } from '../src/content/tree.ts'
import { LOCALES, type Locale } from '../src/i18n/locales.ts'
import { describeIfForbidden, describeUnreadableBody, mdxOptions } from '../src/ui/mdx/inspect.ts'
import { MDX_COMPONENT_NAMES } from '../src/ui/mdx/whitelist.ts'

// Une racine peut être passée en argument : c'est ce qui permet à un test de
// lancer ce gate contre des fixtures fautives et de constater son code de
// sortie, plutôt que de croire sur parole qu'il échouerait.
const root = process.argv[2] ?? defaultContentRoot()
const source = createContentSource(root)

/** Une seule façon de fabriquer un message : `chemin — raison`, comme partout ailleurs. */
const fail = (file: string, reason: string) => new ContentError(file, reason).message

/**
 * Compile le corps et confronte les composants appelés à la liste blanche.
 *
 * Le gate ne validait que le frontmatter : `<Calout>` ou une balise jamais
 * refermée passaient au vert, alors que la même page aurait échoué au rendu.
 * Trouvé en revue.
 *
 * `compile` — et non `evaluate` — parce qu'il n'y a rien à rendre ici : on veut
 * savoir si le corps se compile et quels composants il appelle, pas produire un
 * arbre React. C'est aussi ce qui garde ce script exempt de React.
 */
async function checkBody(file: ContentFile): Promise<string | null> {
  const used = new Set<string>()

  try {
    await compile({ path: file.file, value: file.body }, mdxOptions(used))
  } catch (cause) {
    return fail(file.file, describeUnreadableBody(cause))
  }

  const refusal = describeIfForbidden(used, MDX_COMPONENT_NAMES)
  return refusal === null ? null : fail(file.file, refusal)
}

interface LocaleReport {
  readonly failures: readonly string[]
  readonly validated: number
}

/**
 * Tout ce qui se juge à l'intérieur d'une locale.
 *
 * Elle **rend** ses erreurs plutôt que de les pousser dans un tableau de module :
 * la fonction devient lisible d'un bloc, et les locales peuvent être traitées
 * concurremment.
 */
async function checkLocale(locale: Locale): Promise<LocaleReport> {
  const failures: string[] = []
  const references: TechnologyReference[] = []
  const skillSlugs = new Set<string>()
  let skillsAreComplete = true
  let validated = 0

  for (const type of CONTENT_TYPES) {
    let files
    try {
      files = await source.read(locale, type)
    } catch (error) {
      // Une erreur de lecture (frontmatter absent, YAML illisible, slug en
      // double) emporte le dossier : on ne peut pas valider ce qu'on n'a pas pu
      // lire. Elle est signalée puis on passe au dossier suivant, pour que
      // l'auteur voie tout ce qu'il a à corriger en une seule passe.
      failures.push(messageOf(error))
      if (type === 'skills') skillsAreComplete = false
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
        failures.push(messageOf(error))
        if (type === 'skills') skillsAreComplete = false
      }

      const bodyFailure = await checkBody(file)
      if (bodyFailure !== null) failures.push(bodyFailure)
    }
  }

  // Une compétence qui n'a pas pu être chargée manque au référentiel : signaler
  // alors « technologie inconnue » sur chaque projet qui la cite ajouterait
  // autant d'erreurs fabriquées qu'il y a de projets. Trouvé en revue.
  if (skillsAreComplete) {
    for (const problem of findUnknownTechnologies(references, skillSlugs)) {
      failures.push(fail(problem.file, describeUnknownTechnologies(problem)))
    }
  } else {
    console.warn(
      `⚠ Locale « ${locale} » : cohérence référentielle non vérifiée, une compétence au moins n’a pas pu être lue.`,
    )
  }

  return { failures, validated }
}

function report(failures: readonly string[]): never {
  console.error(`\n✗ Contenu invalide — ${failures.length} problème(s) :\n`)
  for (const failure of failures) console.error(`  ${failure}\n`)
  console.error(
    'Le build est interrompu volontairement : un contenu invalide ne doit pas\n' +
      'atteindre la production sous forme de page à moitié vide (CF-10).\n',
  )
  process.exit(1)
}

const tree = await inspectContentTree(root)

// Une racine absente rend tout le reste sans objet : la lire six fois de plus
// n'ajouterait que six exemplaires de la même erreur au rapport.
if (!tree.rootExists) report([fail(root, 'racine du contenu introuvable')])

const structural = tree.unexpected.map((entry) => fail(entry.path, entry.reason))
const reports = await Promise.all(LOCALES.map(checkLocale))
const failures = [...structural, ...reports.flatMap((locale) => locale.failures)]

if (failures.length > 0) report(failures)

const validated = reports.reduce((total, locale) => total + locale.validated, 0)

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
