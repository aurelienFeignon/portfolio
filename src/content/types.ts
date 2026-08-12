/**
 * Types du contenu — **dérivés des schémas**, jamais écrits deux fois (ADR-0001).
 *
 * Ce fichier ne produit aucun code à l'exécution : tout y est effacé à la
 * compilation. C'est aussi pourquoi il est exclu de la mesure de couverture
 * (`testing-strategy.md` §6).
 */
import type { z } from 'zod'

import type { experienceFrontmatterSchema } from './schemas/experience'
import type { projectFrontmatterSchema } from './schemas/project'
import type { skillFrontmatterSchema } from './schemas/skill'

/**
 * Le corps MDX ne fait pas partie du frontmatter : il est ce qui reste du fichier
 * une fois celui-ci retiré. Il reste une **chaîne** jusqu'au rendu — la couche
 * Content ne compile rien (ADR-0009).
 */
type WithBody<TFrontmatter> = TFrontmatter & { readonly body: string }

export type ProjectFrontmatter = z.infer<typeof projectFrontmatterSchema>
export type ExperienceFrontmatter = z.infer<typeof experienceFrontmatterSchema>
export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>

export type Project = WithBody<ProjectFrontmatter>
export type Experience = WithBody<ExperienceFrontmatter>
export type Skill = WithBody<SkillFrontmatter>

/** Association type de contenu → entité, pour typer les fonctions génériques. */
export interface ContentEntityByType {
  experiences: Experience
  projects: Project
  skills: Skill
}
