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
    /**
     * Intitulé de poste, émis par le `Person` des données structurées (P4-09).
     *
     * ⚠️ **Ce n'est pas une affirmation neuve** — et c'est ce qui autorise à
     * l'écrire ici. « développeur Full-Stack » est déjà publié dans
     * `description` ci-dessus, sur chaque page du site, depuis P3-06. Cette clé
     * ne fait que le rendre **lisible par une machine** au lieu de le laisser
     * enfoui dans une phrase.
     *
     * Un intitulé de poste déduit du contenu aurait été le mauvais chemin : deux
     * expériences sont en cours, et rien ne dit laquelle décrit le métier.
     */
    jobTitle: 'Développeur Full-Stack',
    /**
     * Gabarit de titre (P4-08). `%s` est l'emplacement que Next remplit avec le
     * titre de la page — la convention vient de lui, pas de nous.
     *
     * Il est **dans le dictionnaire** et non écrit en dur parce que le
     * séparateur est une décision typographique par langue : le tiret cadratin
     * entouré d'espaces est français, un anglophone écrit souvent un tiret demi
     * ou une barre verticale. Le nom, lui, est un nom propre et ne bouge pas.
     */
    titleTemplate: '%s — Aurélien Feignon',
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

  /** Page introuvable (P4-07). Servie par réécriture du proxy, jamais liée. */
  notFound: {
    title: 'Page introuvable',
    message:
      'Cette adresse ne correspond à aucune page du site. Elle a peut-être changé, ou comporte une faute de frappe.',
    elsewhere: 'Ou reprendre par une section :',
  },

  /**
   * Frontières d'erreur (P4-07).
   *
   * ⛔ **Aucun détail de la panne n'est affiché**, et c'est une décision, pas un
   * oubli : le message d'une exception peut porter un chemin de fichier ou une
   * valeur d'environnement (`vision.md` §5.4, « messages d'erreur neutres »).
   * Ce que le visiteur peut faire tient en deux gestes, et ils sont ici.
   */
  error: {
    title: 'Une erreur est survenue',
    message:
      'La page n’a pas pu s’afficher. Réessayer suffit parfois ; sinon, l’accueil reste accessible.',
    retry: 'Réessayer',
  },

  /**
   * Le retour à l'accueil — **une seule clé**, partagée par la page introuvable
   * et par les frontières d'erreur. Deux clés de même valeur seraient deux
   * traductions à maintenir d'accord pour la même phrase.
   */
  backHome: 'Retour à l’accueil',

  /** Titre du bloc « pile technique », commun aux deux types de fiche (P4-05). */
  technologies: 'Technologies',

  /** Listes vides — une locale peut ne pas encore traduire une section (R-07). */
  empty: 'Rien à afficher dans cette langue pour le moment.',
}

export type Messages = typeof fr
