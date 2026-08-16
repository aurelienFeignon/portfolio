/**
 * Dictionnaire d'interface — français (P3-04).
 *
 * **Le français est la référence** : `Messages` est dérivé de ce fichier, et
 * toute autre locale doit s'y conformer. Une clé oubliée en anglais est une
 * **erreur de compilation**, pas une chaîne vide découverte en production
 * (`architecture.md` §4.3).
 *
 * Ce qui vit ici : les **chaînes d'interface** — libellés de navigation, textes
 * de repères, gabarits de métadonnées. Ce qui n'y vit jamais : le contenu
 * éditorial, qui est en Markdown (CF-09, ADR-0001). La frontière est nette et
 * vérifiable — si une phrase parle d'une expérience ou d'un projet en
 * particulier, elle est du contenu, et sa place est dans `content/`.
 *
 * Pas d'`as const` : le type dérivé doit être `string`, sinon l'anglais devrait
 * porter les **mêmes littéraux** que le français pour compiler.
 *
 * **Aucune clé n'est écrite en prévision d'un usage.** Une clé traduite que rien
 * ne rend est un coût de traduction sans contrepartie, et elle laisse croire que
 * le besoin est traité. Deux d'entre elles (`language.current`, `nav.home`) ont
 * été retirées en revue pour cette raison : la première parce qu'`aria-current`
 * porte déjà l'information à un lecteur d'écran, la seconde parce qu'il n'y avait
 * pas de lien d'accueil dans la navigation.
 *
 * P4-02 a ajouté ce lien sans faire revenir `nav.home` : c'est **la marque** qui
 * ramène à l'accueil, et son libellé est `site.name`. Un second lien
 * « Accueil » aurait doublé la cible et sa lecture par les technologies
 * d'assistance.
 */
export const fr = {
  skipToContent: 'Aller au contenu principal',

  nav: {
    label: 'Navigation principale',
  },

  language: {
    /** Nom accessible du sélecteur de langue (P3-09). */
    label: 'Langue',
    /** Affiché quand l'entité courante n'existe pas dans l'autre langue. */
    unavailable: 'Cette page n’existe pas dans cette langue.',
  },

  site: {
    /**
     * Identité de marque, tranchée à l'ouverture de la Phase 4
     * (`phase-4-log.md` §3.1) : c'est le nom que cherche un recruteur, celui du
     * domaine, et celui qui deviendra le suffixe du gabarit de titre en P4-08.
     *
     * Sert au libellé de la marque dans l'en-tête, au `h1` de l'accueil et au
     * titre de la page. **Nom propre, donc identique en anglais** — c'est
     * l'unique égalité que le test de non-régression des dictionnaires tolère.
     */
    name: 'Aurélien Feignon',
    description:
      'Portfolio de développeur Full-Stack : expériences professionnelles, projets et compétences.',
  },

  sections: {
    experiences: {
      name: 'Expériences',
      description: 'Parcours professionnel : postes, missions et réalisations.',
    },
    projects: {
      name: 'Projets',
      description: 'Projets personnels, professionnels et open source.',
    },
    skills: {
      name: 'Compétences',
      description: 'Langages, frameworks, outillage, infrastructure et pratiques.',
    },
  },

  /** Affiché à la place d'une date de fin quand l'entité est en cours (P2-06). */
  ongoing: 'En cours',

  /** Titres des blocs d'une fiche d'expérience (P4-04). */
  experience: {
    highlights: 'Réalisations',
    technologies: 'Technologies',
  },

  /** Titres des groupes de la page Compétences (P4-06). */
  skills: {
    categories: {
      language: 'Langages',
      /**
       * « et bibliothèques » n'est pas un ornement : la catégorie porte aussi
       * Zustand, React Flow ou Mercure, qui ne sont pas des frameworks. Le
       * libellé plus juste se trouve être aussi le libellé traduisible — «
       * Frameworks » seul aurait été identique en anglais.
       */
      framework: 'Frameworks et bibliothèques',
      tooling: 'Outillage',
      infrastructure: 'Infrastructure',
      practice: 'Pratiques',
    },
  },

  /** Listes vides — une locale peut ne pas encore traduire une section (R-07). */
  empty: 'Rien à afficher dans cette langue pour le moment.',
}

export type Messages = typeof fr
