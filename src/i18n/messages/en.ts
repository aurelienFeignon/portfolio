/**
 * Dictionnaire d'interface — anglais (P3-04).
 *
 * L'annotation `: Messages` est le mécanisme de complétude : une clé manquante
 * ou une clé en trop **ne compile pas**. Aucun test n'est nécessaire pour cela,
 * et aucun ne pourrait le faire aussi tôt — `tsc` échoue avant que la suite ne
 * démarre (`architecture.md` §4.3).
 */
import type { Messages } from './fr.ts'

export const en: Messages = {
  skipToContent: 'Skip to main content',

  nav: {
    label: 'Main navigation',
    home: 'Home',
  },

  language: {
    label: 'Language',
    current: 'Current language',
    unavailable: 'This page is not available in this language.',
  },

  site: {
    name: 'Portfolio',
    description: 'Full-Stack developer portfolio: professional experience, projects and skills.',
  },

  sections: {
    experiences: {
      name: 'Experience',
      description: 'Professional background: roles, assignments and achievements.',
    },
    projects: {
      name: 'Projects',
      description: 'Personal, professional and open-source projects.',
    },
    skills: {
      name: 'Skills',
      description: 'Languages, frameworks, tooling, infrastructure and practices.',
    },
  },

  ongoing: 'Present',

  empty: 'Nothing to show in this language yet.',
}
