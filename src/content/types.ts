/**
 * Types du contenu — **dérivés des schémas**, jamais écrits deux fois (ADR-0001).
 *
 * Deux niveaux, et la distinction compte :
 *
 * - **`ContentEntryByType`** : ce que le chargeur produit — le frontmatter
 *   validé, plus le corps. Rien d'autre : c'est exactement le fichier.
 * - **`Project` / `Experience` / `Skill`** : ce que le dépôt rend, une fois les
 *   dérivations appliquées (P2-06). C'est ce que consomment les vues.
 *
 * Sans cette séparation, `isOngoing` devrait être présent dès la validation,
 * c'est-à-dire avant d'avoir été calculé. Les niveaux intermédiaires ne sont pas
 * nommés : aucun consommateur ne les exerce, et un alias sans appelant est du
 * vocabulaire public à maintenir pour rien.
 *
 * Ce fichier ne produit aucun code à l'exécution : tout y est effacé à la
 * compilation. C'est aussi pourquoi il est exclu de la mesure de couverture
 * (`testing-strategy.md` §6).
 */
import type { z } from 'zod'

import type { experienceFrontmatterSchema } from './schemas/experience.ts'
import type { projectFrontmatterSchema } from './schemas/project.ts'
import type { skillFrontmatterSchema } from './schemas/skill.ts'

/**
 * Le corps MDX ne fait pas partie du frontmatter : il est ce qui reste du fichier
 * une fois celui-ci retiré. Il reste une **chaîne** jusqu'au rendu — la couche
 * Content ne compile rien (ADR-0009).
 */
type WithBody<TFrontmatter> = TFrontmatter & {
  readonly body: string
  /**
   * Chemin **relatif à la racine du dépôt**, tel que `source.ts` le fabrique.
   *
   * ⚠️ Il est publié parce que deux routes le reconstruisaient à la main, avec
   * l'extension écrite en dur — or `CONTENT_EXTENSIONS` autorise `.md` **et**
   * `.mdx` pour n'importe quel type. Le jour où un fichier change d'extension,
   * le message d'erreur aurait nommé un fichier inexistant : la panne exacte
   * contre laquelle `ContentError.file` existe, retournée contre lui.
   */
  readonly file: string
}

/** Dérivation de P2-06 : une date de fin absente signifie « toujours en cours ». */
interface Ongoing {
  readonly isOngoing: boolean
}

export type SkillCategory = z.infer<typeof skillFrontmatterSchema>['category']

/**
 * Association type de contenu → **entrée validée**, pour typer le chargeur.
 * C'est exactement le fichier : frontmatter validé plus corps, sans dérivation.
 */
export interface ContentEntryByType {
  experiences: WithBody<z.infer<typeof experienceFrontmatterSchema>>
  projects: WithBody<z.infer<typeof projectFrontmatterSchema>>
  skills: WithBody<z.infer<typeof skillFrontmatterSchema>>
}

/** Ce que rend le dépôt : l'entrée, dérivations appliquées (P2-06). */
export type Project = ContentEntryByType['projects'] & Ongoing
export type Experience = ContentEntryByType['experiences'] & Ongoing
export type Skill = ContentEntryByType['skills']
