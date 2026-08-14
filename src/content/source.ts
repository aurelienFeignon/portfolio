/**
 * Lecture du contenu sur le système de fichiers (P2-03).
 *
 * C'est le seul endroit du projet qui lit `content/` (ADR-0001 §6). Tout ce qui
 * est au-dessus reçoit des objets, jamais des chemins.
 *
 * **Une fabrique, pas un module global.** `createContentSource(racine)` permet
 * aux tests de pointer un dossier de fixtures sans variable d'environnement, sans
 * mutation globale et sans jamais lire le contenu réel — c'est un critère de
 * sortie de la phase, pas une préférence de style.
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Locale } from '../i18n/locales.ts'

import type { ContentType } from './content-type.ts'
import { ContentError } from './errors.ts'
import { parseFrontmatter, splitFrontmatter } from './frontmatter.ts'

/**
 * `.md` pour un contenu simple, `.mdx` dès qu'un composant est utilisé.
 *
 * Exporté parce que le gate de contenu doit dire **exactement** ce que le
 * chargeur lit. Une seconde liste écrite ailleurs finirait par diverger, et le
 * gate refuserait alors un fichier que le chargeur lit très bien — la panne
 * inverse de celle qu'il existe pour empêcher.
 */
export const CONTENT_EXTENSIONS = ['.md', '.mdx'] as const

export interface ContentFile {
  readonly locale: Locale
  readonly type: ContentType
  /** Le nom du fichier fait foi (`architecture.md` §3.1). */
  readonly slug: string
  /** Chemin relatif à la racine du dépôt, tel qu'on l'ouvre dans un éditeur. */
  readonly file: string
  readonly frontmatter: Record<string, unknown>
  readonly body: string
}

export interface ContentSource {
  read(locale: Locale, type: ContentType): Promise<readonly ContentFile[]>
}

/** Le slug d'un fichier lisible, ou `null` si le chargeur l'ignore. */
export function slugOf(filename: string): string | null {
  const extension = CONTENT_EXTENSIONS.find((candidate) => filename.endsWith(candidate))
  return extension === undefined ? null : filename.slice(0, -extension.length)
}

function isMissingDirectory(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT'
}

export interface ContentSourceOptions {
  /**
   * Mémoïser les lectures réussies pour la durée du processus.
   *
   * Vrai par défaut : au build et en production, le contenu est figé et le
   * relire serait du travail pur perte.
   *
   * **À passer à `false` en développement.** Une lecture mémoïsée y rendrait
   * toute édition de contenu invisible **jusqu'au redémarrage du serveur** — le
   * chemin d'échec évictait déjà son entrée pour cette raison exacte, mais le
   * chemin nominal, non. Trouvé en revue.
   *
   * Le choix est une **option et non une lecture de `NODE_ENV`** : la couche
   * Content ne consulte pas l'environnement, elle reçoit une décision prise à sa
   * composition. C'est aussi ce qui rend les deux comportements testables sans
   * manipuler de variable globale.
   */
  readonly memoise?: boolean
}

export function createContentSource(
  root: string,
  { memoise = true }: ContentSourceOptions = {},
): ContentSource {
  /**
   * Mémoïsation à la **durée de vie du processus**, et non par requête.
   *
   * `architecture.md` §3.2 annonçait un cache React (`cache()`). C'est
   * impossible ici : la couche Content ne peut pas importer React (CT-09), et ce
   * serait de toute façon plus faible. Le contenu ne change qu'au déploiement
   * (pas d'ISR, H-05) et les pages sont générées au build : deux requêtes ne
   * peuvent pas voir deux états différents. Écart consigné dans
   * `phase-2-log.md` §9.
   *
   * On mémorise la **promesse**, pas son résultat : deux lectures simultanées du
   * même dossier partagent alors le même travail au lieu de le faire deux fois.
   */
  const cache = new Map<string, Promise<readonly ContentFile[]>>()

  async function readDirectory(locale: Locale, type: ContentType): Promise<readonly ContentFile[]> {
    const directory = join(root, locale, type)

    let filenames: string[]
    try {
      filenames = await readdir(directory)
    } catch (cause) {
      // Un dossier absent signifie « aucun contenu de ce type dans cette
      // locale », cas normal et attendu (risque R-07). En revanche, une racine
      // absente est une erreur de configuration : elle rendrait TOUT le site
      // vide, en silence, ce qui est exactement le mode de panne à interdire.
      if (isMissingDirectory(cause)) {
        await assertRootExists()
        return []
      }
      throw cause
    }

    const files = filenames
      .map((filename) => ({ filename, slug: slugOf(filename) }))
      .filter((entry): entry is { filename: string; slug: string } => entry.slug !== null)
      .sort((a, b) => a.filename.localeCompare(b.filename))

    const seen = new Map<string, string>()
    for (const { filename, slug } of files) {
      const previous = seen.get(slug)
      if (previous !== undefined) {
        // `augure.md` et `augure.mdx` visent la même URL : laisser passer, c'est
        // laisser l'ordre de lecture du système de fichiers décider du contenu
        // publié.
        throw new ContentError(
          join(locale, type, filename),
          `porte le même slug « ${slug} » que « ${previous} » : une seule URL, deux fichiers`,
        )
      }
      seen.set(slug, filename)
    }

    return Promise.all(
      files.map(async ({ filename, slug }) => {
        const file = join('content', locale, type, filename)
        const raw = await readFile(join(directory, filename), 'utf8')
        const { yaml, body } = splitFrontmatter(file, raw)

        return {
          locale,
          type,
          slug,
          file,
          frontmatter: parseFrontmatter(file, yaml),
          body,
        }
      }),
    )
  }

  async function assertRootExists(): Promise<void> {
    try {
      await readdir(root)
    } catch (cause) {
      throw new ContentError(root, 'racine du contenu introuvable', { cause })
    }
  }

  return {
    read(locale, type) {
      if (!memoise) return readDirectory(locale, type)

      const key = `${locale}/${type}`
      const cached = cache.get(key)
      if (cached !== undefined) return cached

      // Un échec n'est pas mémorisé : sans cette éviction, une erreur corrigée
      // dans l'éditeur continuerait d'être servie jusqu'au redémarrage du
      // serveur de développement.
      const pending = readDirectory(locale, type).catch((error: unknown) => {
        cache.delete(key)
        throw error
      })
      cache.set(key, pending)
      return pending
    },
  }
}

/**
 * Racine par défaut : `content/` à la racine du dépôt.
 *
 * Elle est lue **au build** — toutes les pages de contenu sont statiques
 * (`architecture.md` §4.2), et l'image de production ne contient donc pas
 * `content/`. La conséquence est à vérifier avant la mise en production
 * (P4-13) : aucune route ne doit pouvoir se rendre à la demande.
 */
export function defaultContentRoot(): string {
  return join(process.cwd(), 'content')
}
