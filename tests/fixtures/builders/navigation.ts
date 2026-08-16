/**
 * Liens de navigation pour les tests de composants (P4-02).
 *
 * Les sections **ne sont pas du contenu** : ce sont des constantes de routage,
 * et les nommer dans un test n'enfreint pas la règle qui interdit d'y nommer une
 * entité de `content/`. Ce qui vaut ici est la règle voisine, celle des
 * fabriques : **les données ne sont écrites qu'une fois**. `SiteNav` et
 * `SiteHeader` se testent tous deux sur les mêmes trois liens, et deux jeux
 * recopiés commencent toujours par diverger.
 *
 * Ils sont **délégués** à `sectionLinks`, le module de `src/app` que la
 * production appelle : les recopier ici en donnait une troisième transcription à
 * la main, que rien n'aurait maintenue d'accord avec `src/routing`. Ce que les
 * tests assèrent reste écrit chez eux, en toutes lettres (`/fr/projects`) —
 * seule l'**entrée** est dérivée, pas l'attendu.
 */
import type { Locale } from '@/i18n/locales'
import { sectionLinks } from '@/app/[locale]/section-links'
import type { SectionLink } from '@/ui/site-nav'

/** Les trois sections, avec les chemins que le site sert réellement. */
export function makeSectionLinks(locale: Locale = 'fr'): readonly SectionLink[] {
  return sectionLinks(locale)
}
