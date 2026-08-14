/**
 * Frontmatter d'une compétence — `architecture.md` §3.4 (P2-02).
 *
 * Le `slug` d'une compétence est la **cible des références** portées par les
 * projets et les expériences (`technologies`). C'est ce qui fait de ce type le
 * référentiel de la couche, et de P2-07 une vérification indispensable.
 */
import { z } from 'zod'

import { nonEmptyTextSchema, slugSchema } from './common.ts'

export const skillFrontmatterSchema = z.strictObject({
  slug: slugSchema,
  name: nonEmptyTextSchema,
  category: z.enum(['language', 'framework', 'tooling', 'infrastructure', 'practice']),
  /**
   * Échelle fermée de 1 à 5, en littéraux plutôt qu'en `number` borné : le type
   * dérivé est alors `1 | 2 | 3 | 4 | 5`, et un affichage qui oublie un palier
   * échoue à la compilation plutôt qu'à l'exécution.
   */
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  /** Absent vaut « non mise en avant » — même défaut sûr que pour un projet. */
  featured: z.boolean().default(false),
})
