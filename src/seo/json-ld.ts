/**
 * Données structurées JSON-LD — `Person`, `WebSite`, `CreativeWork`,
 * `BreadcrumbList` (P4-09, `architecture.md` §9).
 *
 * **Ce module émet des données, il ne rend rien.** Ce qui en sort est lu par une
 * machine et par personne d'autre : un champ faux n'a aucun symptôme, aucune
 * page cassée, aucun test rouge ailleurs. C'est la même classe de panne que les
 * dates de P4-17, et elle appelle la même discipline — on n'affirme que ce que
 * l'on sait, et on le réémet **verbatim**.
 *
 * **Il ne lit rien non plus.** Comme `metadata.ts`, il reçoit de son appelant
 * tout ce qu'il ne peut pas déduire : les libellés viennent du dictionnaire, les
 * entités du dépôt, et `src/seo` n'a le droit d'atteindre ni l'un ni l'autre
 * (`architecture.md` §1.2). La composition vit dans
 * `src/app/[locale]/structured-data.ts`.
 *
 * ⚠️ **Note pour l'ADR-0015 (CSP, Phase 14).** Ces nœuds sont servis dans un
 * `<script type="application/ld+json">` inline. Une `script-src` stricte écrite
 * sans y penser les supprimerait — silencieusement, puisqu'un bloc de données
 * qui disparaît ne casse aucune page. La politique devra porter un `nonce` ou un
 * condensat pour ces blocs. Il n'y a pas de CSP aujourd'hui (`deploy/Caddyfile`
 * le dit explicitement), donc rien à faire maintenant — mais c'est écrit ici
 * pour ne pas être découvert après.
 */
import { DEFAULT_LOCALE, type Locale } from '../i18n/locales.ts'
import { homePath, pathFor, type PageLocation } from '../routing/paths.ts'

import { buildAbsoluteUrl } from './site-url.ts'

/**
 * Le vocabulaire. `https://schema.org` est un **identifiant**, pas une adresse
 * que le navigateur visitera : rien n'est téléchargé.
 *
 * ⚠️ C'est aussi la première origine étrangère jamais gravée dans le HTML de ce
 * site. Le parcours qui refuse les origines étrangères (P4-08) la connaît
 * nommément — l'y ajouter était le geste juste ; l'assouplir en « toute origine
 * externe est tolérée » aurait rendu le `localhost` de P4-08 réinvisible.
 */
export const SCHEMA_CONTEXT = 'https://schema.org'

/** Un nœud du graphe. Les clés sont celles de schema.org, donc hors de notre contrôle. */
export type JsonLdNode = Readonly<Record<string, unknown>>

/**
 * ⚠️ Un `type` et non une `interface`, et ce n'est pas une préférence de style :
 * TypeScript ne donne de signature d'index implicite qu'aux **alias de type**.
 * `src/ui/json-ld.tsx` reçoit ce document sous la forme structurelle
 * `Record<string, unknown>` — le graphe de dépendances lui interdisant d'importer
 * `src/seo` —, et une `interface` n'y serait pas assignable.
 */
export type JsonLdDocument = {
  readonly '@context': typeof SCHEMA_CONTEXT
  readonly '@graph': readonly JsonLdNode[]
}

/**
 * Emballe les nœuds d'une page dans un document unique.
 *
 * Un document par nœud serait la même déclaration de vocabulaire répétée — et
 * surtout, deux graphes séparés ne peuvent pas se désigner l'un l'autre par
 * `@id` : le `WebSite` cesserait de savoir qui l'a écrit.
 */
export function jsonLdDocument(nodes: readonly JsonLdNode[]): JsonLdDocument {
  return { '@context': SCHEMA_CONTEXT, '@graph': nodes }
}

/**
 * L'identifiant de la personne — **indépendant de la langue**, et c'est le point.
 *
 * ⭐ `…/fr#person` et `…/en#person` seraient **deux personnes** pour un moteur de
 * recherche, chacune décrite à moitié, dont aucune ne porterait l'ensemble des
 * profils. Il n'y a qu'une personne, décrite en deux langues — l'identifiant doit
 * le dire.
 *
 * Un `@id` est un identifiant, pas une page à servir : `https://site/#person`
 * n'a pas à répondre, et ne répond pas.
 */
export function personId(siteUrl: URL): string {
  return `${buildAbsoluteUrl(siteUrl, '/')}#person`
}

/**
 * Même raisonnement : le site n'est pas sa page d'accueil française.
 *
 * ⚠️ **Non exportée**, contrairement à `personId` — celui-ci a un appelant hors
 * de ce module, celle-ci n'en a pas. Une fonction exportée sans appelant est du
 * vocabulaire public à maintenir pour rien, et la symétrie apparente avec sa
 * jumelle n'est pas une raison suffisante : c'est le motif qui a fait retirer
 * `precisionOf()` avant son commit en P4-17.
 */
function webSiteId(siteUrl: URL): string {
  return `${buildAbsoluteUrl(siteUrl, '/')}#website`
}

/**
 * La personne **telle qu'une autre page la désigne** : son identifiant, et son
 * nom.
 *
 * ⛔⛔ **Un `@id` seul ne suffit pas, et c'est un constat de revue.** Le nœud
 * `Person` complet n'est émis que par l'accueil ; une fiche de projet qui
 * référencerait `…#person` sans plus produirait, pour qui ne lit que cette
 * page-là, un **nœud anonyme** — une œuvre dont l'auteur n'a pas de nom. Le
 * `@id` reste ce qui rattache les deux au même être ; le nom est ce qui rend la
 * référence lisible seule.
 *
 * Ce n'est pas une seconde description de la personne : c'est la même, réduite à
 * ce qu'une machine doit pouvoir lire sans avoir visité l'accueil. Le nom vient
 * du dictionnaire, comme partout ailleurs.
 */
function personReference(siteUrl: URL, name: string): JsonLdNode {
  return { '@id': personId(siteUrl), name }
}

/*
 * Les trois interfaces d'entrée ci-dessous ne sont **pas exportées** : elles
 * typent la signature de leur fonction, et aucun appelant ne les nomme — tous
 * construisent leur objet sur place. Un type exporté sans consommateur est du
 * vocabulaire public à maintenir pour rien, au même titre qu'une fonction.
 */
interface PersonInput {
  readonly name: string
  readonly jobTitle: string
  /** Les profils publics — `src/seo/profiles.ts`, source unique. */
  readonly sameAs: readonly string[]
  /**
   * Les compétences mises en avant, **par leur nom seul**.
   *
   * ⛔ Jamais les niveaux : ils sont une auto-évaluation que personne n'a relue
   * (décision D2), la page ne les affiche pas, et une donnée structurée qui les
   * porterait les publierait par la porte de derrière.
   */
  readonly knowsAbout: readonly string[]
}

export function personNode(siteUrl: URL, input: PersonInput): JsonLdNode {
  return {
    '@type': 'Person',
    '@id': personId(siteUrl),
    name: input.name,
    jobTitle: input.jobTitle,
    /*
     * ⛔ **Aucune `description`, et c'est une décision.** La première version y
     * mettait `site.description` — « Portfolio de développeur Full-Stack :
     * expériences, projets et compétences ». C'est la description du **site**,
     * pas de la personne : l'émettre ici affirmait sur quelqu'un une phrase
     * écrite pour décrire des rubriques, et la répétait mot pour mot sur le nœud
     * `WebSite` du même graphe. C'est la faute exacte de l'`alt` d'image relevée
     * en revue de P4-08 — décrire A avec le texte de B —, et une description
     * fausse est pire qu'absente.
     *
     * Aucune prose sur Aurélien n'existe dans ce dépôt, et en écrire une est la
     * **décision éditoriale D7**, ouverte. Le jour où elle est tranchée, sa place
     * est ici. Relevé en revue.
     */
    /*
     * L'accueil de la **locale par défaut** — une page réellement servie.
     *
     * ⚠️ Ce n'est pas l'origine nue : `/` n'est pas une page mais une
     * **redirection 307** qui négocie `Accept-Language` (P3-03), et elle ne
     * figure à aucun sitemap. Le commentaire d'origine promettait déjà l'accueil
     * de la locale par défaut, et le code émettait `/` — une prose qui survit au
     * code qu'elle décrit, la quatrième de cette phase. Relevé en revue.
     *
     * Les traductions sont déclarées par le `hreflang`, canal prévu pour cela.
     */
    url: buildAbsoluteUrl(siteUrl, homePath(DEFAULT_LOCALE)),
    /*
     * ⛔ **Un champ vide est omis, jamais émis vide.** `sameAs: []` affirme
     * « cette personne n'a aucun profil public », là où l'absence du champ ne dit
     * rien. Les deux se ressemblent dans du JSON ; pour un consommateur, l'un est
     * une donnée et l'autre un silence. C'est la règle des dates, appliquée aux
     * listes : on n'affirme pas ce qu'on ne sait pas.
     */
    ...(input.sameAs.length > 0 ? { sameAs: input.sameAs } : {}),
    ...(input.knowsAbout.length > 0 ? { knowsAbout: input.knowsAbout } : {}),
  }
}

interface WebSiteInput {
  readonly locale: Locale
  readonly name: string
  readonly description: string
}

export function webSiteNode(siteUrl: URL, input: WebSiteInput): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': webSiteId(siteUrl),
    /*
     * L'origine nue, contrairement à `Person.url` : un `WebSite` **est** le site,
     * et son URL est sa racine. La redirection que `/` porte est un détail de
     * service, pas une propriété de l'entité — là où `Person.url` promet « une
     * page qui parle de cette personne » et doit donc en désigner une vraie.
     */
    url: buildAbsoluteUrl(siteUrl, '/'),
    name: input.name,
    description: input.description,
    inLanguage: input.locale,
    // Par référence, jamais par copie : redécrire la personne ici en ferait une
    // seconde source de vérité, et sa divergence serait muette.
    author: personReference(siteUrl, input.name),
  }
}

interface CreativeWorkInput {
  readonly locale: Locale
  readonly location: PageLocation
  readonly name: string
  readonly description: string
  /**
   * La date de début, **telle que le contenu la porte** (P4-17).
   *
   * ⭐⭐⭐ Elle est réémise sans être complétée : `2021` reste `2021`. La compléter
   * en `2021-01-01` affirmerait un jour que personne ne connaît, à un moteur de
   * recherche, sans que rien ne le signale — une date complète étant toujours
   * valide. `AAAA`, `AAAA-MM` et `AAAA-MM-JJ` sont tous trois des `Date` au sens
   * de schema.org, qui suit ISO 8601.
   */
  readonly startedAt: string
  /** Les libellés résolus, tels que la page les affiche — jamais les slugs. */
  readonly keywords: readonly string[]
  /**
   * Le nom de l'auteur.
   *
   * ⛔ Il est **obligatoire** : le nœud `Person` complet ne vit que sur
   * l'accueil, et une œuvre qui ne donnerait qu'un `@id` serait, pour qui lit
   * cette page seule, une œuvre sans auteur nommé. Voir `personReference`.
   */
  readonly authorName: string
}

export function creativeWorkNode(siteUrl: URL, input: CreativeWorkInput): JsonLdNode {
  return {
    '@type': 'CreativeWork',
    url: buildAbsoluteUrl(siteUrl, pathFor(input.locale, input.location)),
    name: input.name,
    description: input.description,
    inLanguage: input.locale,
    dateCreated: input.startedAt,
    keywords: input.keywords,
    author: personReference(siteUrl, input.authorName),
  }
}

/**
 * Un niveau du fil d'Ariane : un libellé, et l'endroit qu'il désigne.
 *
 * L'appelant donne le **libellé** parce que `src/seo` ne lit pas le dictionnaire ;
 * il donne l'**endroit** et non l'URL parce que c'est `routing` qui construit les
 * chemins, et qu'un fil d'Ariane qui les concaténerait lui-même finirait par les
 * écrire autrement que le `canonical` de la même page.
 */
export interface TrailStep {
  readonly name: string
  readonly location: PageLocation
}

export function breadcrumbNode(
  siteUrl: URL,
  locale: Locale,
  trail: readonly TrailStep[],
): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      // Schema.org numérote à partir de 1 : un fil qui commencerait à 0
      // décalerait tout le chemin affiché dans un résultat de recherche.
      position: index + 1,
      name: step.name,
      // Chaque niveau **dans la langue de la page** : un fil anglais qui
      // pointerait vers `/fr/projects` ferait changer de langue en remontant.
      item: buildAbsoluteUrl(siteUrl, pathFor(locale, step.location)),
    })),
  }
}
