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
//
// ⚠️ **Amendé le 2026-08-26 (P6-01), et pas contourné en silence.** La note
// ci-dessus reste vraie de la CONSTRUCTION — aucune vue ne valide un segment
// qu'elle écrit elle-même. Elle a cessé de l'être de la LECTURE : `parsePagePath`
// lit une URL, où le segment est une chaîne quelconque venue du dehors. C'est
// `sectionForSegment` ci-dessous, et non un `isSection` : la question réelle est
// « quelle section ce segment désigne-t-il, dans cette locale ? », pas « est-ce
// une section ? ». Une garde booléenne aurait été fausse dès que les segments
// seront traduits, les deux tables ne coïncidant plus.

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
 * L'opération **inverse** de `segmentFor` : la section qu'un segment d'URL
 * désigne dans cette locale, ou `null` s'il n'en désigne aucune.
 *
 * Elle est ici, contre la construction, pour la raison que `paths.ts` écrit déjà
 * à propos de `localeFromPathname` : *l'inverse vit contre l'aller, sans quoi le
 * jour où l'un change, l'autre continue de répondre à l'ancienne question.*
 *
 * ⛔ Le segment ne peut pas être comparé à un littéral. `routeSegments` est
 * l'identité en v1 (ADR-0005), mais elle est précisément le point unique où la
 * traduction des segments aura lieu : un `'projects'` écrit en dur chez un
 * appelant serait vert aujourd'hui et cesserait de résoudre le jour où
 * `/fr/projets` existe — sans que rien ne le dise.
 */
export function sectionForSegment(locale: Locale, segment: string): Section | null {
  const segments = routeSegments[locale]
  return SECTIONS.find((section) => segments[section] === segment) ?? null
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

/**
 * Garde de type, et non simple prédicat : elle rétrécit `Section` à
 * `SectionWithDetail`, ce dont un lecteur d'URL a besoin pour construire une
 * `PageLocation` d'entité sans conversion forcée.
 *
 * ⛔ Elle existe parce que la contrainte n'est **pas** portée par le type de
 * `entityPath` : `entityPath('fr', 'skills', 'x')` compile et fabrique une
 * adresse que le site ne sert dans aucune langue. Trois endroits tiennent
 * aujourd'hui la contrainte en itérant `SECTIONS_WITH_DETAIL` — le sitemap, le
 * générateur de manifeste, et désormais la lecture d'URL. Resserrer `entityPath`
 * lui-même serait la forme profonde ; c'est un changement de la couche `routing`
 * qui déborde P6-01, et il est nommé plutôt que fait.
 */
export function isSectionWithDetail(section: Section): section is SectionWithDetail {
  return (SECTIONS_WITH_DETAIL as readonly Section[]).includes(section)
}
