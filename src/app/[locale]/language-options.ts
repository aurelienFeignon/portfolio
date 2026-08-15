/**
 * Ce que le sélecteur de langue affiche pour la page courante (P3-09).
 *
 * Composition pure : `src/routing` sait où mène chaque langue, `src/ui` sait
 * l'afficher, et ni l'un ni l'autre n'a le droit de connaître l'autre. `src/app`
 * est le seul endroit où les deux se rencontrent — c'est sa raison d'être.
 *
 * Le sélecteur reçoit **toujours une cible atteignable** : la page elle-même
 * quand elle existe dans cette langue, sa section sinon. C'est `translated` qui
 * porte la différence, et le composant qui la dit à l'utilisateur.
 */
import type { Locale } from '@/i18n/locales'
import { localeAlternates } from '@/routing/alternates'
import type { PageLocation } from '@/routing/paths'
import type { LanguageOption } from '@/ui/language-switcher'

export function languageOptions(
  location: PageLocation,
  availableLocales: readonly Locale[],
): readonly LanguageOption[] {
  return localeAlternates(location, availableLocales).map(
    ({ locale, path, fallbackPath, translated }) => ({
      locale,
      href: path ?? fallbackPath,
      translated,
    }),
  )
}
