/**
 * Ce que `content/` contient et que **personne ne lira** (P2-07, ajouté en revue).
 *
 * La règle est énoncée **une fois, ici**, et non redécidée à chaque niveau de
 * boucle du gate : est fautif tout ce qui est *présent et inattendu*. Est
 * légitime, en revanche, tout ce qui est *absent* — une locale peut ne pas
 * traduire un type de contenu (risque R-07), et c'est ce qui permet à
 * `hreflang` de ne pointer que vers ce qui existe.
 *
 * `content/fr/skill/` (au singulier) ou `content/de/` ne sont pas des erreurs de
 * lecture : ce sont des dossiers que le chargeur **n'ouvre jamais**. Sans ce
 * contrôle, ils ne cassent rien et le contenu n'existe simplement pas.
 */
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { isLocale, LOCALES } from '../i18n/locales.ts'
import { CONTENT_TYPES, isContentType } from './content-type.ts'
import { CONTENT_EXTENSIONS, slugOf } from './source.ts'

export interface UnexpectedEntry {
  /** Chemin tel qu'on l'ouvre dans un éditeur. */
  readonly path: string
  readonly reason: string
}

export interface TreeReport {
  /** Faux quand la racine elle-même est introuvable : rien d'autre n'a de sens. */
  readonly rootExists: boolean
  readonly unexpected: readonly UnexpectedEntry[]
}

export async function inspectContentTree(root: string): Promise<TreeReport> {
  let locales
  try {
    locales = await readdir(root, { withFileTypes: true })
  } catch {
    return { rootExists: false, unexpected: [] }
  }

  const unexpected: UnexpectedEntry[] = []

  for (const entry of locales) {
    // Un fichier à la racine (`content/README.md`) documente le dossier : il
    // n'est pas du contenu et n'a pas à ressembler à une locale.
    if (!entry.isDirectory()) continue

    if (!isLocale(entry.name)) {
      unexpected.push({
        path: join(root, entry.name),
        reason: `dossier de locale inattendu : les locales connues sont ${LOCALES.join(', ')}`,
      })
      continue
    }

    unexpected.push(...(await inspectLocale(root, entry.name)))
  }

  return { rootExists: true, unexpected }
}

async function inspectLocale(root: string, locale: string): Promise<UnexpectedEntry[]> {
  const unexpected: UnexpectedEntry[] = []

  for (const entry of await readdir(join(root, locale), { withFileTypes: true })) {
    if (!entry.isDirectory() || !isContentType(entry.name)) {
      unexpected.push({
        path: join(root, locale, entry.name),
        reason: `entrée inattendue : seuls les dossiers ${CONTENT_TYPES.join(', ')} sont lus`,
      })
      continue
    }

    unexpected.push(...(await inspectType(root, locale, entry.name)))
  }

  return unexpected
}

async function inspectType(root: string, locale: string, type: string): Promise<UnexpectedEntry[]> {
  const entries = await readdir(join(root, locale, type), { withFileTypes: true })

  return entries
    .filter((entry) => entry.isDirectory() || slugOf(entry.name) === null)
    .map((entry) => ({
      path: join(root, locale, type, entry.name),
      reason: `le chargeur ne lira pas cette entrée : seuls les fichiers ${CONTENT_EXTENSIONS.join(' et ')} le sont`,
    }))
}
