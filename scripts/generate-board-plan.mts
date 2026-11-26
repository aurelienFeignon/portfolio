/**
 * Engendre le plan de la carte mère à partir du contenu (P8-15b, `carte-mere.md` §12) :
 * un fichier JSON par locale, versionné, que la scène charge à la demande.
 *
 * Il engendre aussi, par locale, `board-labels.<locale>.json` : les **noms** issus du contenu
 * (employeurs, projets, compétences) que le layout racine donne à la scène (P8-15g). ⛔ Le layout
 * les lisait dans `content/` à chaque rendu, ce qui n'était sans conséquence que tant que toutes
 * les pages étaient prérendues : la page de contact (P10-06) se rend à la demande, et aucune
 * requête ne doit lire `content/`. Les graver ici ferme ce chemin pour tout layout.
 *
 *   node scripts/generate-board-plan.mts [--year AAAA] [--out <dossier>]
 *
 * Par défaut : l'année courante, et `src/scene/generated/`.
 *
 * ⭐ **L'année est gravée dans le fichier.** La frise s'allonge d'un an chaque 1er janvier ; un
 * plan qui suivrait l'horloge du visiteur changerait sans que rien n'ait été regénéré. Le test de
 * fraîcheur relance donc ce script avec l'année du fichier versionné.
 *
 * ⛔ **Une liaison perdue fait échouer la commande** (sortie 1, couples nommés) et **rien n'est
 * écrit** : un plan qui omet silencieusement un lien compétence → projet serait pire qu'un build
 * cassé. Le build l'exécute avant `next build`.
 *
 * Écriture formatée par l'API Prettier avec la config du dépôt : `prettier --check` passe sur le
 * fichier engendré et le diff reste lisible.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import prettier from 'prettier'

import { contentRepository } from '../src/content/repository.ts'
import { LOCALES, type Locale } from '../src/i18n/locales.ts'
import { boardLosses, buildBoardFile, summarize } from '../src/scene/state/board/file.ts'
import { toBoardContent } from '../src/scene/state/board/content.ts'
import type { BoardFile } from '../src/scene/state/board-render/file-format.ts'
import type { BoardContentLabels } from '../src/scene/state/board-render/labels.ts'

const { values } = parseArgs({
  options: { year: { type: 'string' }, out: { type: 'string' } },
})

const year = values.year === undefined ? new Date().getFullYear() : Number(values.year)
if (!Number.isInteger(year)) {
  console.error(`✗ --year attend une année entière, reçu « ${values.year} ».`)
  process.exit(1)
}
const defaultDir = join(import.meta.dirname, '..', 'src', 'scene', 'generated')
const outDir = values.out ?? defaultDir

async function build(
  locale: Locale,
): Promise<{ file: BoardFile; labels: BoardContentLabels; ms: number }> {
  const started = performance.now()
  const content = await contentRepository.getAllForBoard(locale)
  const file = buildBoardFile(toBoardContent(content), {
    locale,
    year,
    chipSizing: 'uniform',
  })
  const labels: BoardContentLabels = {
    experiences: Object.fromEntries(content.experiences.map((e) => [e.slug, e.company])),
    projects: Object.fromEntries(content.projects.map((p) => [p.slug, p.title])),
    skills: Object.fromEntries(content.skills.map((s) => [s.slug, s.name])),
  }
  return { file, labels, ms: Math.round(performance.now() - started) }
}

/** L'année gravée dans le fichier déjà présent, ou `undefined` s'il manque ou est illisible. */
async function engravedYear(path: string): Promise<number | undefined> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as { year?: unknown }
    return typeof parsed.year === 'number' ? parsed.year : undefined
  } catch {
    return undefined
  }
}

const built = await Promise.all(
  LOCALES.map(async (locale) => ({ locale, ...(await build(locale)) })),
)

const failures = built.flatMap(({ locale, file }) =>
  boardLosses(file).map((loss) => `  [${locale}] ${loss.kind} : ${loss.from} → ${loss.to}`),
)
if (failures.length > 0) {
  console.error(
    `✗ ${failures.length} liaison(s) perdue(s) — rien n'est écrit :\n${failures.join('\n')}`,
  )
  process.exit(1)
}

await mkdir(outDir, { recursive: true })
/**
 * La config se résout depuis le dossier versionné, pas depuis `--out` (un dossier temporaire
 * n'en voit aucune, et le test de fraîcheur comparerait alors deux mises en forme).
 */
async function writeJson(name: string, value: unknown): Promise<void> {
  const config = await prettier.resolveConfig(join(defaultDir, name))
  const text = await prettier.format(JSON.stringify(value), { ...config, parser: 'json' })
  await writeFile(join(outDir, name), text, 'utf8')
}

for (const { locale, file, labels, ms } of built) {
  const previous = await engravedYear(join(outDir, `board-plan.${locale}.json`))
  await writeJson(`board-plan.${locale}.json`, file)
  await writeJson(`board-labels.${locale}.json`, labels)
  console.log(summarize(file, ms))
  if (previous !== undefined && previous < year) {
    console.log(
      `  ↳ une année a passé (${previous} → ${year}) : la frise de ce plan s'allonge d'autant ; elle s'allongera ainsi à chaque \`make board\` d'une nouvelle année.`,
    )
  }
}
