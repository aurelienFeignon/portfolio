/**
 * Les liens vers les trois sections, pour une locale (P4-03).
 *
 * Composition pure, comme `language-options.ts` : `src/routing` sait construire
 * un chemin, `src/ui` sait afficher un lien, et ni l'un ni l'autre n'a le droit
 * de connaître l'autre (`architecture.md` §1.2). `src/app` est le seul endroit
 * où les deux se rencontrent — c'est sa raison d'être.
 *
 * Écrit ici parce que **deux** consommateurs le demandent et qu'ils ne peuvent
 * pas se le passer : `place-layout.tsx` pour la navigation de l'en-tête, et
 * l'accueil pour son accès aux sections. L'App Router ne fait pas descendre de
 * valeur d'un layout vers une page, donc la seule alternative à ce module était
 * de recopier l'expression — ce que `place-layout.tsx` disait justement éviter
 * pour les quatre layouts, avant que la page d'accueil ne la recopie quand même.
 */
import type { Locale } from '@/i18n/locales'
import { sectionPath } from '@/routing/paths'
import { SECTIONS } from '@/routing/sections'
import type { SectionLink } from '@/ui/site-nav'

export function sectionLinks(locale: Locale): readonly SectionLink[] {
  return SECTIONS.map((section) => ({ section, href: sectionPath(locale, section) }))
}
