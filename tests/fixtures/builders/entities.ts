/**
 * Fabriques d'entités pour les tests (P2-09).
 *
 * Ce que produisent ces fonctions est ce que **rend le dépôt** : frontmatter
 * validé, corps, et dérivations appliquées. Elles servent aux tests qui
 * consomment le contenu — composants, métadonnées, sitemap — et qui n'ont aucune
 * raison de passer par le système de fichiers pour obtenir un projet.
 *
 * Les fabriques de `frontmatter.ts`, elles, produisent du YAML lu sur disque,
 * c'est-à-dire de l'inconnu à valider. Les deux ne se remplacent pas.
 */
import type { Experience, Project, Skill } from '@/content/types'

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    slug: 'augure',
    title: 'Augure',
    summary: 'Une plateforme de gestion documentaire, écrite en TypeScript de bout en bout.',
    type: 'professional',
    featured: true,
    technologies: ['typescript', 'postgresql'],
    startedAt: '2024-01-15',
    endedAt: '2025-06-30',
    body: 'Le corps du projet.',
    isOngoing: false,
    ...overrides,
  }
}

export function makeExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    slug: 'evea',
    company: 'Evea',
    role: 'Développeur Full-Stack',
    location: 'Nantes',
    startedAt: '2022-03-01',
    technologies: ['typescript'],
    highlights: ['Refonte du moteur de recherche interne'],
    body: 'Le corps de l’expérience.',
    isOngoing: true,
    ...overrides,
  }
}

export function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    slug: 'typescript',
    name: 'TypeScript',
    category: 'language',
    level: 5,
    featured: true,
    body: 'Le corps de la compétence.',
    ...overrides,
  }
}
