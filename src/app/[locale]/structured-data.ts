/**
 * Composition des données structurées d'une page (P4-09).
 *
 * **Le partage des rôles est celui de `page-metadata.ts`, et pour les mêmes
 * raisons.** `src/seo/json-ld.ts` fabrique des nœuds et ne lit rien ; ce module
 * décide **lesquels une page porte**, et va chercher ce qu'ils affirment — le
 * dictionnaire pour les libellés, le dépôt pour les compétences. La couche `seo`
 * n'a le droit d'atteindre ni l'un ni l'autre (`architecture.md` §1.2).
 *
 * Il est ici et non dans les six routes parce que c'est **la seule décision à
 * branches** de la tâche : quels nœuds, avec quel fil d'Ariane. Les routes sont
 * exclues de la couverture (`testing-strategy.md` §6), et l'exclusion n'est
 * honnête que si l'on continue d'en sortir ce qui décide.
 */
import type { ContentRepository } from '@/content/repository'
import { type Locale } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import {
  breadcrumbNode,
  creativeWorkNode,
  jsonLdDocument,
  personNode,
  webSiteNode,
  type JsonLdDocument,
  type TrailStep,
} from '@/seo/json-ld'
import { PROFILE_URLS } from '@/seo/profiles'
import { getSiteUrl } from '@/seo/site-url'
import type { PageLocation } from '@/routing/paths'
import type { Section } from '@/routing/sections'

/**
 * Le fil d'Ariane d'un endroit — **dérivé de l'endroit**, jamais écrit à la main.
 *
 * L'accueil s'y nomme par `site.name`, comme le lien de la marque dans l'en-tête :
 * c'est la même cible et le même libellé, et deux écritures finiraient par n'être
 * plus la même (P4-02).
 */
function trailTo(
  locale: Locale,
  location: PageLocation,
  entityName?: string,
): readonly TrailStep[] {
  const messages = getMessages(locale)
  const home: TrailStep = { name: messages.site.name, location: { kind: 'home' } }

  if (location.kind === 'home') return [home]

  const section: TrailStep = {
    name: messages.sections[location.section].name,
    location: { kind: 'section', section: location.section },
  }

  if (location.kind === 'section') return [home, section]

  return [home, section, { name: entityName ?? '', location }]
}

/**
 * L'accueil : la personne et le site.
 *
 * ⚠️ **Pas de fil d'Ariane** — l'accueil est la racine, et un fil à un seul
 * niveau qui se désigne lui-même ne dit rien à personne.
 *
 * ⭐ `getFeaturedSkills` reçoit ici **son premier appelant de production**. Le
 * drapeau `featured` était porté par le contenu et lu par personne — c'était une
 * dette nommée du prompt de reprise.
 *
 * ⚠️ **Ce que la page affiche et ce qu'elle déclare ne coïncident pas exactement
 * ici**, et c'est assumé : les dix compétences mises en avant vivent sur
 * `/skills`, pas sur l'accueil. `Person` décrit une **personne**, pas la page qui
 * la porte, et le site entier montre ces compétences — le `@id` est le même d'une
 * page à l'autre. C'est l'usage établi pour un `Person` d'auteur ; s'il fallait un
 * jour le resserrer, la place de `knowsAbout` serait `/skills`.
 */
export async function homeStructuredData(
  repository: ContentRepository,
  locale: Locale,
): Promise<JsonLdDocument> {
  const siteUrl = getSiteUrl()
  const { site } = getMessages(locale)
  const featured = await repository.getFeaturedSkills(locale)

  return jsonLdDocument([
    personNode(siteUrl, {
      name: site.name,
      jobTitle: site.jobTitle,
      description: site.description,
      sameAs: PROFILE_URLS,
      /*
       * ⛔ **Le nom seul.** `level` est une auto-évaluation que personne n'a
       * relue (décision D2, ouverte) : la page ne l'affiche pas, et une donnée
       * structurée qui le porterait le publierait par la porte de derrière —
       * exactement la faute que P4-06 avait vue venir et que P4-04 a payée sur
       * les dates.
       */
      knowsAbout: featured.map((skill) => skill.name),
    }),
    webSiteNode(siteUrl, {
      locale,
      name: site.name,
      description: site.description,
    }),
  ])
}

/** Une page de section : son fil d'Ariane, et rien d'autre. */
export function sectionStructuredData(locale: Locale, section: Section): JsonLdDocument {
  return jsonLdDocument([
    breadcrumbNode(getSiteUrl(), locale, trailTo(locale, { kind: 'section', section })),
  ])
}

/**
 * Une fiche d'expérience : **le fil d'Ariane seul**.
 *
 * ⛔ Il n'existe pas de type schema.org honnête pour « un poste occupé ».
 * `CreativeWork` serait faux — une expérience n'est pas une œuvre —, et
 * `Person.worksFor` affirmerait une **organisation** : or l'une des deux
 * expériences est le projet propre de l'auteur, dont la société n'est pas
 * constituée (`content/README.md`). Déclarer un employeur inexistant serait la
 * faute que ce dépôt passe son temps à supprimer.
 *
 * @param name Le titre que la page affiche — son `h1`, c'est-à-dire le rôle. Un
 * fil d'Ariane qui nommerait la page autrement qu'elle ne s'intitule enverrait
 * deux libellés au même moteur de recherche.
 */
export function experienceStructuredData(
  locale: Locale,
  entity: { readonly slug: string; readonly name: string },
): JsonLdDocument {
  const location: PageLocation = { kind: 'entity', section: 'experiences', slug: entity.slug }

  return jsonLdDocument([
    breadcrumbNode(getSiteUrl(), locale, trailTo(locale, location, entity.name)),
  ])
}

/**
 * Une fiche de projet : l'œuvre, et son fil d'Ariane.
 *
 * @param keywords Les libellés de technologies **résolus**, tels que la page les
 * affiche. Les slugs bruts seraient une seconde écriture de ce que le visiteur
 * lit — et la fiche d'un projet a déjà livré cette divergence une fois (P4-05).
 */
export function projectStructuredData(
  locale: Locale,
  project: {
    readonly slug: string
    readonly title: string
    readonly summary: string
    readonly startedAt: string
  },
  keywords: readonly string[],
): JsonLdDocument {
  const siteUrl = getSiteUrl()
  const location: PageLocation = { kind: 'entity', section: 'projects', slug: project.slug }

  return jsonLdDocument([
    creativeWorkNode(siteUrl, {
      locale,
      location,
      name: project.title,
      description: project.summary,
      // Verbatim, à la précision que le contenu porte (P4-17).
      startedAt: project.startedAt,
      keywords,
    }),
    breadcrumbNode(siteUrl, locale, trailTo(locale, location, project.title)),
  ])
}
