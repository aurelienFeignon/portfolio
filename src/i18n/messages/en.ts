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

  projectRepository: 'View source on GitHub',

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
      tagline: 'Roles and assignments',
    },
    projects: {
      name: 'Projects',
      description: 'Personal, professional and open-source projects.',
      tagline: 'Apps and open source',
    },
    skills: {
      name: 'Skills',
      description: 'Languages, frameworks, tooling, infrastructure and practices.',
      tagline: 'Stack and architecture',
    },
  },

  ongoing: 'Present',

  overview: 'Overview',

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

  resumeEmail: {
    subject: 'Aurélien Feignon’s résumé',
    text: [
      'Hello,',
      '',
      'Please find my résumé attached as a PDF, as requested from my portfolio.',
      '',
      'If you did not make this request, simply ignore this message: no other will follow.',
      '',
      'Aurélien Feignon',
    ].join('\n'),
    attachmentName: 'Resume-Aurelien-Feignon.pdf',
  },

  contact: {
    title: 'Get my résumé',
    description: 'Receive Aurélien Feignon’s résumé by email.',
    intro: 'Enter your address: the résumé is sent to you by email, as a PDF.',
    emailLabel: 'Email address',
    submit: 'Send me the résumé',
    honeypotLabel: 'Leave this field empty',
    outcomes: {
      sent: 'Request received: if the address is valid, the résumé is on its way.',
      invalid: 'This email address is not valid. Please check it and try again.',
      limited: 'Too many requests from your connection. Please try again a little later.',
      unavailable: 'Sending is temporarily unavailable. Please try again later.',
    },
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
