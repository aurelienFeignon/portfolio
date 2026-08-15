/**
 * Les trois sections du portfolio, et le segment d'URL de chacune (P3-05).
 *
 * **Pourquoi cette liste existe alors que `src/content` a déjà `CONTENT_TYPES`.**
 * Le graphe de dépendances interdit `routing → content` (`architecture.md` §1.2),
 * et c'est délibéré : le routage doit pouvoir exister sans savoir lire un
 * fichier. Les deux listes portent aujourd'hui les mêmes valeurs, et un test
 * d'intégration le **vérifie** — c'est le seul endroit qui a le droit d'importer
 * les deux. Sans lui, ajouter un quatrième type de contenu produirait une section
 * sans route, ou une route sans contenu, sans que rien ne le signale.
 */
import type { Locale } from '../i18n/locales.ts'

export const SECTIONS = ['experiences', 'projects', 'skills'] as const

export type Section = (typeof SECTIONS)[number]

// Pas d'`isSection` : contrairement à `[locale]`, un segment de section n'est
// jamais une chaîne à valider — c'est un dossier de l'App Router, donc une
// valeur littérale du code. En écrire une garde laisserait croire qu'une
// validation a lieu quelque part ; il n'y en a pas, et il n'en faut pas.
// Retiré en revue, avec ses onze lignes de test.

/**
 * Segments d'URL par locale — **l'identité en v1** (ADR-0005).
 *
 * `/fr/projects` et non `/fr/projets`. L'ADR pèse le gain SEO marginal contre le
 * coût : table bidirectionnelle, réécriture de tous les liens, `hreflang` plus
 * fragile. La décision est réversible, et cette table est **ce qui la rend
 * locale** : le jour où l'on traduit les segments, seule cette valeur change.
 *
 * Elle n'est donc pas décorative parce qu'elle est l'identité — elle est le point
 * unique où le changement aura lieu. La supprimer au motif qu'elle « ne fait
 * rien » reviendrait à disséminer la construction d'URL dans les vues, ce que
 * `architecture.md` §4.1 écarte explicitement.
 */
export const routeSegments = {
  fr: { experiences: 'experiences', projects: 'projects', skills: 'skills' },
  en: { experiences: 'experiences', projects: 'projects', skills: 'skills' },
} as const satisfies Record<Locale, Record<Section, string>>

export function segmentFor(locale: Locale, section: Section): string {
  return routeSegments[locale][section]
}

/**
 * Les sections dont chaque entité a **sa propre page** (`architecture.md` §4.1).
 *
 * Les compétences n'en ont pas en v1 : elles vivent uniquement dans leur liste.
 * La conséquence est directe pour P3-07 et P3-08 — une compétence n'entre ni au
 * sitemap ni dans un `hreflang` comme entité, faute d'URL à annoncer. Écrit ici
 * plutôt que redécidé dans le sitemap, où ce serait une exception silencieuse.
 */
export const SECTIONS_WITH_DETAIL = ['experiences', 'projects'] as const

export type SectionWithDetail = (typeof SECTIONS_WITH_DETAIL)[number]
