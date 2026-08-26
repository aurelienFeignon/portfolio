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

import { isSectionWithDetail, sectionForSegment, segmentFor, type Section } from './sections.ts'

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
 * La forme canonique d'un chemin : **une barre finale désigne la même page**.
 *
 * ⭐ Elle est ici, et une seule fois, parce que **deux couches en dépendent au
 * caractère près** : le proxy, qui décide si une adresse est servable, et la
 * lecture d'URL de la scène (P6-01), qui décide quel écran cadrer. Écrite deux
 * fois, elle ne vaudrait qu'à un endroit sur deux — le jour où la règle change
 * (une redirection plutôt qu'une équivalence, ou l'option `trailingSlash` de
 * Next), la scène cadrerait la mauvaise zone sur une page servie en 200, sans un
 * rouge. C'est le motif que `notFoundPath` a déjà servi à supprimer dans ce
 * fichier.
 *
 * ⚠️ Elle n'en retire **qu'une**, comme le proxy : `/fr/projects//` n'est pas
 * `/fr/projects`, et n'est servie nulle part.
 */
export function withoutTrailingSlash(pathname: string): string {
  return pathname.replace(/\/$/, '')
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
 * `/fr/404` — la page introuvable, **destination de réécriture** et non adresse
 * du site (P4-07).
 *
 * Elle est ici parce que trois endroits doivent s'accorder au caractère près :
 * le proxy qui y réécrit, le gate qui exige qu'elle soit prégénérée et qui
 * l'exclut du sitemap, et l'arborescence `app/[locale]/404/`. Les deux premiers
 * l'écrivaient en dur — le jour où l'un dérive, le proxy réécrit vers une route
 * qui n'existe pas et les deux contrôles restent verts.
 */
export function notFoundPath(locale: Locale): string {
  return `${homePath(locale)}/404`
}

/**
 * `/fr/opengraph-image` — l'image de partage de la langue (P4-08).
 *
 * Trois endroits doivent s'accorder au caractère près : le fichier
 * `app/[locale]/opengraph-image.tsx` qui la produit, les métadonnées qui
 * l'annoncent en `og:image`, et le manifeste qui autorise le proxy à la laisser
 * passer. Un `og:image` qui désigne une adresse réécrite en 404 est un partage
 * sans vignette — et rien ne le dirait.
 */
export function shareImagePath(locale: Locale): string {
  return `${homePath(locale)}/opengraph-image`
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

/** Ce qu'une URL de page désigne : sa langue, et l'endroit. */
export interface ParsedPage {
  readonly locale: Locale
  readonly location: PageLocation
}

/**
 * L'opération **inverse** de `pathFor` : ce qu'un chemin désigne, ou `null` si
 * le site ne sert **aucune page** à cette adresse.
 *
 * ⭐⭐ **Elle lit la FORME, jamais l'EXISTENCE.** `parsePagePath('/fr/projects/x')`
 * rend une entité `x` sans savoir si `x` existe — cette couche ne lit pas le
 * contenu, et c'est une propriété d'architecture (`architecture.md` §1.2), pas
 * une limite de l'implémentation. Ce qu'elle refuse est ce qu'**aucune route ne
 * sert, dans aucune langue** :
 *
 * - une locale que `isLocale` ne reconnaît pas ;
 * - un segment de section qu'aucune locale n'emploie ;
 * - une **fiche d'entité sous une section qui n'en a pas** — les compétences
 *   n'en ont pas en v1, donc `/fr/skills/typescript` n'est servi nulle part ;
 * - un chemin **plus profond** que `/{locale}/{section}/{slug}`.
 *
 * ⛔ Un slug dont l'échappement est tronqué — `%E0%A4%A`, qu'aucun encodage n'a
 * pu produire — fait **jeter** `decodeURIComponent`. Il ne nomme donc aucune
 * entité, et le chemin retombe sur **sa section**, qui elle est servie. Laisser
 * l'exception remonter ferait tomber l'appelant sur une adresse tapée à la main.
 */
export function parsePagePath(pathname: string): ParsedPage | null {
  const chemin = withoutTrailingSlash(pathname)
  const locale = localeFromPathname(chemin)
  if (locale === null) return null

  const [, , segment = '', slug = '', ...reste] = chemin.split('/')
  if (reste.length > 0) return null

  if (segment === '') return { locale, location: { kind: 'home' } }

  const section = sectionForSegment(locale, segment)
  if (section === null) return null

  // ⭐ L'ordre compte : la section est rendue **avant** que la fiche d'entité ne
  // soit exigée, sans quoi `/fr/skills` — une page bien servie — serait refusée
  // en même temps que `/fr/skills/typescript`, qui ne l'est pas.
  if (slug === '') return { locale, location: { kind: 'section', section } }
  if (!isSectionWithDetail(section)) return null

  const decode = slugFromSegment(slug)
  return decode === null
    ? { locale, location: { kind: 'section', section } }
    : { locale, location: { kind: 'entity', section, slug: decode } }
}

/** L'aller-retour de l'`encodeURIComponent` qu'`entityPath` applique. */
function slugFromSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}
