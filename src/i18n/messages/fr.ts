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
 */
export const fr = {
  skipToContent: 'Aller au contenu principal',

  nav: {
    label: 'Navigation principale',
    home: 'Accueil',
  },

  language: {
    /** Nom accessible du sélecteur de langue (P3-09). */
    label: 'Langue',
    /** Décrit la langue active pour un lecteur d'écran. */
    current: 'Langue actuelle',
    /** Affiché quand l'entité courante n'existe pas dans l'autre langue. */
    unavailable: 'Cette page n’existe pas dans cette langue.',
  },

  site: {
    /** Sert au `h1` de l'accueil, au titre de la page, et de suffixe aux autres. */
    name: 'Portfolio',
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

  /** Listes vides — une locale peut ne pas encore traduire une section (R-07). */
  empty: 'Rien à afficher dans cette langue pour le moment.',
}

export type Messages = typeof fr
