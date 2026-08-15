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
 * `src/ui` ne pouvant pas importer `src/routing`, ces liens sont construits ici
 * comme ils le sont dans `src/app` : par le composant qui compose les deux.
 */
import type { SectionLink } from '@/ui/site-nav'

/** Les trois sections, avec les chemins que `src/routing` produirait. */
export function makeSectionLinks(locale: 'fr' | 'en' = 'fr'): SectionLink[] {
  return [
    { section: 'experiences', href: `/${locale}/experiences` },
    { section: 'projects', href: `/${locale}/projects` },
    { section: 'skills', href: `/${locale}/skills` },
  ]
}
