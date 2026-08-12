/**
 * Vocabulaire des locales — écrit en Phase 2 par nécessité, complété en P3-01.
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
 * Ce fichier ne contient QUE le vocabulaire. Négociation `Accept-Language`,
 * dictionnaires et repli restent en Phase 3.
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
