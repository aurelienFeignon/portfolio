/**
 * Fabriques d'entités pour les tests (P2-09).
 *
 * Ce que produisent ces fonctions est ce que **rend le dépôt** : frontmatter
 * validé, corps, et dérivations appliquées. Elles servent aux tests qui
 * consomment le contenu — composants, métadonnées, sitemap — et qui n'ont aucune
 * raison de passer par le système de fichiers pour obtenir un projet.
 *
 * Les fabriques de `frontmatter.ts`, elles, produisent du YAML lu sur disque,
 * c'est-à-dire de l'inconnu à valider. Les deux ne se remplacent pas — mais
 * **les données, elles, ne sont écrites qu'une fois** : celles-ci sont validées
 * par le vrai schéma, exactement comme le fait le chargeur. Deux jeux de valeurs
 * recopiées avaient déjà commencé à diverger.
 */
import { experienceFrontmatterSchema } from '@/content/schemas/experience'
import { projectFrontmatterSchema } from '@/content/schemas/project'
import { skillFrontmatterSchema } from '@/content/schemas/skill'
import type { Experience, Project, Skill } from '@/content/types'

import {
  makeExperienceFrontmatter,
  makeProjectFrontmatter,
  makeSkillFrontmatter,
} from './frontmatter'

export function makeProject(overrides: Partial<Project> = {}): Project {
  const frontmatter = projectFrontmatterSchema.parse(makeProjectFrontmatter())
  return {
    ...frontmatter,
    body: 'Le corps du projet.',
    file: 'content/fr/projects/exemple.mdx',
    isOngoing: frontmatter.endedAt === undefined,
    ...overrides,
  }
}

export function makeExperience(overrides: Partial<Experience> = {}): Experience {
  const frontmatter = experienceFrontmatterSchema.parse(makeExperienceFrontmatter())
  return {
    ...frontmatter,
    body: 'Le corps de l’expérience.',
    file: 'content/fr/experiences/exemple.md',
    isOngoing: frontmatter.endedAt === undefined,
    ...overrides,
  }
}

export function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    ...skillFrontmatterSchema.parse(makeSkillFrontmatter()),
    body: 'Le corps de la compétence.',
    file: 'content/fr/skills/exemple.md',
    ...overrides,
  }
}
