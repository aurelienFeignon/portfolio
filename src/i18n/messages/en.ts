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
    /** Le profil du CV anglais, mot pour mot — décision D7, voir `fr.ts`. */
    intro:
      'Senior Full Stack Developer specialised in real-time architectures and distributed systems, with hands-on experience deploying ML pipelines (Python/TensorFlow) and agentic LLM features (tool-calling, multi-provider). I work from architectural design to operations, with a strong focus on reliability, traceability and performance.',
    /**
     * Voir `fr.ts` : ce n'est pas une affirmation neuve — elle est déjà publiée
     * dans `description` ci-dessus, et le CV porte « Senior » (P4-09, aligné le
     * 2026-08-16).
     */
    jobTitle: 'Senior Full Stack Developer',
    /**
     * La barre verticale est le séparateur usuel d'un titre de page en anglais,
     * là où le français emploie le tiret cadratin entouré d'espaces. Ce n'est
     * pas une différence inventée pour satisfaire le test de non-régression :
     * c'est la formulation idiomatique de chaque langue, cherchée **d'abord**,
     * comme la règle de P4-04 §9.3 le demande.
     */
    titleTemplate: '%s | Aurélien Feignon',
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
  },

  skills: {
    categories: {
      language: 'Languages',
      framework: 'Frameworks & libraries',
      tooling: 'Tooling',
      /**
       * Identique au français, et c'est le mot juste dans les deux langues —
       * la seconde exception du test de non-régression des dictionnaires, après
       * le nom propre `site.name`. Le forcer à différer aurait dégradé le
       * libellé pour satisfaire un test.
       */
      infrastructure: 'Infrastructure',
      practice: 'Practices',
    },
  },

  notFound: {
    title: 'Page not found',
    message:
      'This address does not match any page on the site. It may have moved, or contain a typo.',
    elsewhere: 'Or start from a section:',
  },

  error: {
    title: 'Something went wrong',
    message:
      'This page could not be displayed. Trying again sometimes helps; otherwise the home page is still there.',
    retry: 'Try again',
  },

  backHome: 'Back to the home page',

  /** Titre du bloc « pile technique », commun aux deux types de fiche (P4-05). */
  technologies: 'Tech stack',

  empty: 'Nothing to show in this language yet.',
}
