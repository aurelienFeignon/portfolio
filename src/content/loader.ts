/**
 * Validation stricte du contenu (P2-04).
 *
 * C'est ici que se joue l'exigence CF-10 : un frontmatter invalide **lève**, et
 * le message nomme le fichier fautif. Rien n'est réparé, rien n'est ignoré, rien
 * n'est remplacé par une valeur par défaut — un site à moitié rempli est un pire
 * résultat qu'un build rouge.
 */
import { z } from 'zod'

import type { Locale } from '../i18n/locales.ts'

import { FRONTMATTER_SCHEMAS, type ContentType } from './content-type.ts'
import { ContentError } from './errors.ts'
import type { ContentFile, ContentSource } from './source.ts'
import type { ContentEntryByType } from './types.ts'

/**
 * Valide un fichier lu et en fait une entité typée.
 *
 * La conversion finale est assumée : `FRONTMATTER_SCHEMAS` est exhaustive par
 * construction (`satisfies Record<ContentType, unknown>`), donc l'association
 * type → schéma est juste ; TypeScript ne sait simplement pas suivre cette
 * corrélation à travers un accès indexé générique.
 */
export function validateFile<T extends ContentType>(
  file: ContentFile & { readonly type: T },
): ContentEntryByType[T] {
  const result = FRONTMATTER_SCHEMAS[file.type].safeParse(file.frontmatter)

  if (!result.success) {
    throw new ContentError(
      file.file,
      `frontmatter invalide\n${indent(z.prettifyError(result.error))}`,
    )
  }

  // Le nom du fichier fait foi (`architecture.md` §3.1). La divergence est une
  // erreur et non une préférence : le slug du frontmatter est ce qu'on lit en
  // relisant le contenu, le nom du fichier est ce qui fabrique l'URL.
  if (result.data.slug !== file.slug) {
    throw new ContentError(
      file.file,
      `le frontmatter annonce le slug « ${result.data.slug} », mais le nom du fichier impose « ${file.slug} »`,
    )
  }

  return { ...result.data, body: file.body } as ContentEntryByType[T]
}

function indent(message: string): string {
  return message
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')
}

export interface ContentLoader {
  load<T extends ContentType>(locale: Locale, type: T): Promise<readonly ContentEntryByType[T][]>
}

export function createContentLoader(source: ContentSource): ContentLoader {
  return {
    async load(locale, type) {
      const files = await source.read(locale, type)
      return files.map((file) => validateFile({ ...file, type }))
    },
  }
}
