/**
 * Composition des données structurées d'une page (P4-09).
 *
 * **Le partage des rôles est celui de `page-metadata.ts`, à un étage près.**
 * `src/seo/json-ld.ts` fabrique des nœuds et ne lit rien ; ce module décide
 * **lesquels une page porte**, et va chercher ce qu'ils affirment — le
 * dictionnaire pour les libellés, le dépôt pour les compétences. La couche `seo`
 * n'a le droit d'atteindre ni l'un ni l'autre (`architecture.md` §1.2).
 *
 * ⚠️ **L'étage de différence, dit plutôt que passé sous silence** : `seo/metadata.ts`
 * porte lui-même son entrée impure (`pageMetadata` lit `SITE_URL`, `buildPageMetadata`
 * est pure), là où `json-ld.ts` n'expose que des fabriques de **nœuds** — un nœud
 * n'est pas une page, et il n'y avait pas d'entrée par page à y mettre. La lecture
 * de l'environnement vit donc ici, une fois par fonction de composition. Relevé en
 * revue, où l'en-tête promettait une équivalence exacte qui n'en était pas une.
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
 * Le fil d'Ariane d'une page — **dérivé de sa position**, jamais écrit à la main.
 *
 * L'accueil s'y nomme par `site.name`, comme le lien de la marque dans l'en-tête :
 * c'est la même cible et le même libellé, et deux écritures finiraient par n'être
 * plus la même (P4-02).
 *
 * ⭐ **La signature dit ce qui existe, et rien de plus.** La première version
 * prenait un `PageLocation` complet et traitait le cas « accueil » — qu'aucun
 * appelant ne lui passe, l'accueil n'ayant pas de fil — plus un `entityName`
 * optionnel qui ne pouvait jamais manquer. Deux branches mortes, **révélées par
 * la sortie de `make coverage`** et non par la relecture. Elles sont supprimées
 * plutôt que couvertes : écrire un test pour une branche inatteignable donne un
 * chiffre vert et un mécanisme qui ment.
 */
function trailTo(
  locale: Locale,
  section: Section,
  leaf?: { readonly slug: string; readonly name: string },
): readonly TrailStep[] {
  const messages = getMessages(locale)
  const steps: readonly TrailStep[] = [
    { name: messages.site.name, location: { kind: 'home' } },
    { name: messages.sections[section].name, location: { kind: 'section', section } },
  ]

  if (leaf === undefined) return steps

  return [...steps, { name: leaf.name, location: { kind: 'entity', section, slug: leaf.slug } }]
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

/**
 * Une page dont **tout ce qu'on peut dire de vrai est où elle se trouve** : les
 * trois listes de section, et les fiches d'expérience.
 *
 * ⛔ Une fiche d'expérience n'a rien de plus à déclarer, et ce n'est pas une
 * lacune. Il n'existe pas de type schema.org honnête pour « un poste occupé » :
 * `CreativeWork` serait faux — une expérience n'est pas une œuvre —, et
 * `Person.worksFor` affirmerait une **organisation**, or l'une des deux
 * expériences est le projet propre de l'auteur, dont la société n'est pas
 * constituée (`content/README.md`). Déclarer un employeur inexistant serait la
 * faute que ce dépôt passe son temps à supprimer.
 *
 * ⭐ Elle est **une** fonction et non deux. La première version en avait une par
 * type de page, dont les corps ne différaient que par un argument que `trailTo`
 * prenait déjà. Relevé en revue.
 *
 * @param leaf La feuille du chemin, pour une fiche : son slug, et le titre que
 * la page affiche — son `h1`. Un fil d'Ariane qui nommerait la page autrement
 * qu'elle ne s'intitule enverrait deux libellés au même moteur de recherche.
 * Omis pour une page de section, qui **est** la feuille.
 */
export function breadcrumbStructuredData(
  locale: Locale,
  section: Section,
  leaf?: { readonly slug: string; readonly name: string },
): JsonLdDocument {
  return jsonLdDocument([breadcrumbNode(getSiteUrl(), locale, trailTo(locale, section, leaf))])
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
  /*
   * ⭐ La section est nommée **une fois**. La première version l'écrivait deux
   * fois dans cette fonction — dans l'emplacement de l'œuvre, puis dans le fil
   * d'Ariane — sans que rien ne relie les deux : `CreativeWork.url` et le
   * dernier niveau du fil de la **même page** auraient pu désigner deux sections
   * différentes. C'est mot pour mot la classe d'erreur que `page-metadata.ts` dit
   * exister pour fermer. Relevé en revue.
   */
  const section = 'projects' satisfies Section
  const location: PageLocation = { kind: 'entity', section, slug: project.slug }

  return jsonLdDocument([
    creativeWorkNode(siteUrl, {
      locale,
      location,
      name: project.title,
      description: project.summary,
      // Verbatim, à la précision que le contenu porte (P4-17).
      startedAt: project.startedAt,
      keywords,
      // Le nom de la marque **est** celui de la personne (P4-02) : une fiche lue
      // seule doit pouvoir nommer son auteur, pas seulement le désigner.
      authorName: getMessages(locale).site.name,
    }),
    // `{ slug, name }` et non l'entité entière : un `TrailStep` ne lit que ces
    // deux champs, et lui en donner quatre laisse croire qu'il en lit quatre.
    breadcrumbNode(
      siteUrl,
      locale,
      trailTo(locale, section, { slug: project.slug, name: project.title }),
    ),
  ])
}
