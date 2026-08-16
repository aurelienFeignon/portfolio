/**
 * Vocabulaire des locales — écrit en Phase 2 par nécessité, **complété en P3-01**.
 *
 * **Pourquoi ce fichier existe déjà.** La couche Content indexe le contenu par
 * locale (`content/{locale}/{type}/{slug}.md`) et son API est typée par locale
 * (`architecture.md` §3.3). Elle a donc besoin de ce vocabulaire dès la Phase 2,
 * alors que l'internationalisation est en Phase 3.
 *
 * Les deux issues étaient : le redéfinir dans `src/content` — c'est-à-dire
 * accepter deux listes de locales qui dériveront —, ou l'écrire ici tout de
 * suite. La seconde a été retenue, et l'autorisation `content → i18n` a été
 * ajoutée au graphe de dépendances : voir `architecture.md` §1.2 et
 * `phase-2-log.md` §7.
 *
 * **Ce que P3-01 a ajouté** : `LOCALE_NAMES`, et rien d'autre. La négociation
 * `Accept-Language` vit dans `negotiate.ts` (P3-03) et les dictionnaires dans
 * `messages/` (P3-04) : ce fichier reste le vocabulaire, il ne devient pas le
 * fourre-tout de la couche.
 *
 * **`parseLocale` n'existe pas, et c'est une décision.** `architecture.md` §4.4
 * et `testing-strategy.md` §4.2 le nomment, avec la signature
 * `(string) => Locale | null`. `isLocale` rend déjà ce service sous la forme dont
 * les appelants ont besoin — une **garde de type**, qui restreint la chaîne au
 * lieu de rendre une valeur à redéranger :
 *
 * ```ts
 * const { locale } = await params
 * if (!isLocale(locale)) notFound()   // `locale` est une `Locale` ensuite
 * ```
 *
 * Les deux ensemble seraient deux façons de poser la même question, donc deux
 * endroits où corriger le jour où la réponse change. Les **comportements** que
 * §4.2 exige (`fr`, `en`, `FR`, `de`, chaîne vide, valeur injectée) sont testés,
 * eux : c'est ce que le document demandait réellement.
 */

/** L'ordre fait foi : `fr` en tête est la locale par défaut (H-04). */
export const LOCALES = ['fr', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'fr'

/**
 * Garde de type, et non simple prédicat booléen : c'est ce qui permet à un
 * appelant de passer d'une `string` inconnue à une `Locale` sans conversion
 * forcée. La lecture d'un segment d'URL en dépendra en P3-02.
 */
export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/**
 * Le nom de chaque langue **dans cette langue** (endonyme).
 *
 * « English » et non « Anglais » : un visiteur qui cherche sa langue dans un
 * sélecteur ne lit pas, par construction, celle qui est affichée. C'est aussi ce
 * qu'exige la WCAG — l'élément qui porte ce libellé porte `lang` (P3-09), pour
 * qu'un lecteur d'écran prononce « English » à l'anglaise au milieu d'une page
 * française.
 *
 * `satisfies` plutôt qu'une annotation : ajouter une locale à `LOCALES` sans lui
 * donner de nom ne compile pas, et les valeurs restent des littéraux.
 */
export const LOCALE_NAMES = {
  fr: 'Français',
  en: 'English',
} as const satisfies Record<Locale, string>

/**
 * La même langue, au format qu'**OpenGraph impose** — `langue_TERRITOIRE`
 * (P4-08).
 *
 * ⚠️ **Ce format affirme un territoire que le site ne porte pas.** Nos locales
 * sont des langues : `fr` ne dit pas « France ». La spécification OpenGraph,
 * elle, n'accepte pas la langue seule, et un consommateur qui ne trouve rien
 * suppose `en_US` — c'est-à-dire qu'omettre le champ affirmerait l'anglais
 * américain sur la page française. Des deux approximations, celle-ci est la
 * moins fausse, et elle est écrite ici plutôt que devinée dans `src/seo`.
 *
 * C'est la seule entorse au principe de P4-17 (« l'incertitude voyage avec la
 * donnée ») de tout le dépôt, et elle est imposée par un format tiers.
 */
export const LOCALE_OPENGRAPH = {
  fr: 'fr_FR',
  en: 'en_US',
} as const satisfies Record<Locale, string>
