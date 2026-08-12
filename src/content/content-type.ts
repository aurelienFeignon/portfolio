/**
 * Les trois types de contenu, et le lien entre un type et son schéma (P2-02).
 *
 * Le nom d'un type est **aussi** un nom de dossier (`content/fr/projects/`) et un
 * segment d'URL (`/fr/projects`). Le pluriel est donc porté par la valeur
 * elle-même, plutôt que reconstruit ailleurs par concaténation.
 */
import { experienceFrontmatterSchema } from './schemas/experience'
import { projectFrontmatterSchema } from './schemas/project'
import { skillFrontmatterSchema } from './schemas/skill'

export const CONTENT_TYPES = ['experiences', 'projects', 'skills'] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

/**
 * Table exhaustive par construction : ajouter un type de contenu sans lui donner
 * de schéma ne compile pas. C'est ce qui évite le chargeur générique qui accepte
 * n'importe quoi faute de correspondance.
 */
export const FRONTMATTER_SCHEMAS = {
  experiences: experienceFrontmatterSchema,
  projects: projectFrontmatterSchema,
  skills: skillFrontmatterSchema,
} as const satisfies Record<ContentType, unknown>

export function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value)
}
