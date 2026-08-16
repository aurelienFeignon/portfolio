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
  },

  language: {
    label: 'Language',
    unavailable: 'This page is not available in this language.',
  },

  site: {
    /** Nom propre : identique au français, et c'est voulu (P4-02). */
    name: 'Aurélien Feignon',
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

  experience: {
    highlights: 'Highlights',
    /**
     * « Tech stack » plutôt que « Technologies », qui serait le mot français à
     * l'identique : le test de non-régression des dictionnaires refuse les
     * valeurs égales, et son unique exception est un **nom propre**. Élargir la
     * liste pour un mot commun aux deux langues affaiblirait le garde — et le
     * libellé retenu est de toute façon celui qu'un lecteur anglophone attend
     * sur un portfolio.
     */
    technologies: 'Tech stack',
  },

  empty: 'Nothing to show in this language yet.',
}
