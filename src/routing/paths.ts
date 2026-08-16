/**
 * Construction des chemins de l'application (P3-05).
 *
 * **Un seul endroit construit une URL.** Le `canonical`, le `hreflang`, le
 * sitemap, le sélecteur de langue et chaque lien de page passent par ici. Une vue
 * qui concaténerait `'/' + locale + '/projects'` finirait par le faire autrement
 * qu'une autre — et le sitemap autrement que les deux, ce qui est exactement la
 * manière dont un `hreflang` se met à mentir.
 *
 * Ces fonctions rendent des **chemins**, jamais des URL absolues : l'origine
 * vient de `SITE_URL` et n'a qu'un point d'entrée (`src/seo/site-url.ts`,
 * exigence de P1-17). `src/seo` compose les deux, `src/routing` ne connaît pas le
 * domaine.
 */
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/locales.ts'

import { segmentFor, type Section } from './sections.ts'

/** `/fr` — jamais `/fr/`, sans quoi le `canonical` désignerait une autre URL. */
export function homePath(locale: Locale): string {
  return `/${locale}`
}

/**
 * L'opération **inverse** de `homePath` : la locale que porte un chemin, ou
 * `null` s'il n'en porte pas (`/de/x`, `/rien`, `/`).
 *
 * Elle est ici, contre la construction, parce que trois appelants posent la même
 * question — le proxy, pour choisir la langue d'une 404 (P4-07), et les deux
 * frontières d'erreur, qui sont des composants **client** et n'ont que l'URL pour
 * savoir dans quelle langue s'exprimer.
 *
 * Ce qu'ils font du `null` diffère : le proxy négocie l'en-tête `Accept-Language`,
 * qu'un composant client n'a pas, et les frontières retombent sur la locale par
 * défaut. C'est la **lecture** qui est commune, pas le repli — seule elle est
 * partagée, sans quoi l'un des deux comportements serait faux quelque part.
 */
export function localeFromPathname(pathname: string): Locale | null {
  const candidate = pathname.split('/')[1]
  return candidate !== undefined && isLocale(candidate) ? candidate : null
}

/**
 * La langue dans laquelle s'exprimer quand on n'a **que** l'URL.
 *
 * C'est le cas des deux frontières d'erreur (P4-07) : composants client, sans
 * `params` ni en-tête de requête. Toutes deux retombent sur la locale par
 * défaut, et cette expression était écrite deux fois — la voici une fois, ce qui
 * laisse les deux fichiers en composition pure.
 *
 * ⚠️ Le proxy **n'appelle pas** ceci, et ce n'est pas un oubli : lui dispose de
 * `Accept-Language` et doit négocier plutôt que de retomber sur `fr`. Les deux
 * replis sont différents parce que les deux situations le sont.
 */
export function displayedLocale(pathname: string): Locale {
  return localeFromPathname(pathname) ?? DEFAULT_LOCALE
}

/** `/fr/projects` */
export function sectionPath(locale: Locale, section: Section): string {
  return `${homePath(locale)}/${segmentFor(locale, section)}`
}

/**
 * `/fr/projects/augure`
 *
 * Le slug est **encodé**. Le schéma de contenu ne laisse aujourd'hui passer que
 * des minuscules, des chiffres et des traits d'union (P2-02), pour lesquels
 * l'encodage est l'identité : cet appel ne corrige donc rien aujourd'hui. Il
 * garantit qu'assouplir un jour le motif de slug produira une URL valide plutôt
 * qu'un lien cassé — c'est une propriété de la construction d'URL, et sa place
 * est ici, pas dans le schéma qui pourrait changer.
 */
export function entityPath(locale: Locale, section: Section, slug: string): string {
  return `${sectionPath(locale, section)}/${encodeURIComponent(slug)}`
}

/**
 * **Où se trouve une page**, indépendamment de la langue dans laquelle on la
 * regarde.
 *
 * Trois consommateurs ont besoin de poser exactement la même question — « quelle
 * est cette page dans l'autre langue ? » : le `hreflang` (P3-07), le sitemap
 * (P3-08) et le sélecteur de langue (P3-09). Sans ce vocabulaire commun, chacun
 * reconstruirait le chemin de son côté, et le jour où l'un dérive, le `hreflang`
 * pointe ailleurs que le sélecteur — c'est-à-dire qu'il ment.
 */
export type PageLocation =
  | { readonly kind: 'home' }
  | { readonly kind: 'section'; readonly section: Section }
  | { readonly kind: 'entity'; readonly section: Section; readonly slug: string }

export function pathFor(locale: Locale, location: PageLocation): string {
  switch (location.kind) {
    case 'home':
      return homePath(locale)
    case 'section':
      return sectionPath(locale, location.section)
    case 'entity':
      return entityPath(locale, location.section, location.slug)
  }
}

/**
 * La page existante la plus proche, quand celle-ci n'existe pas dans une langue.
 *
 * Une entité non traduite se replie sur **sa section**, qui existe toujours :
 * `/en/projects/augure` absent renvoie vers `/en/projects`. Un repli vers
 * l'accueil ferait perdre le contexte, et un lien absent priverait le visiteur du
 * seul moyen de changer de langue sur cette page.
 *
 * L'accueil et les sections sont leur propre repli : ils existent dans toutes les
 * locales, une liste vide restant une page valide (R-07).
 */
export function fallbackLocation(location: PageLocation): PageLocation {
  return location.kind === 'entity' ? { kind: 'section', section: location.section } : location
}
