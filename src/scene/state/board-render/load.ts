/**
 * Le chargement du plan de carte **de la locale affichée** (P8-15c).
 *
 * ⭐ Review Focus 1 (R-07) : une fiche non traduite fait de `fr` et `en` deux plans
 * différents. La scène charge **le sien**, jamais l'autre — et le vérifie à l'arrivée.
 *
 * ⭐ **Un chemin littéral par locale** : le bundler ne découpe un `import()` en chunk que s'il en
 * voit le chemin. Un gabarit `board-plan.${locale}.json` embarquerait tout le répertoire, ou
 * rien ; le `switch` exhaustif sur `Locale` rend un chunk par locale, et une locale ajoutée
 * cesse de compiler tant qu'elle n'a pas son fichier.
 *
 * Module pur : ni Three.js, ni `next`. Aucune valeur de `board/` — `file-format.ts` seulement.
 */
import type { Locale } from '@/i18n/locales'

import { type BoardFile, isBoardFile } from './file-format.ts'

/**
 * Un plan relu qui n'est pas celui qu'attend ce code : autre version du format, autre locale,
 * ou réponse qui n'est pas un plan.
 *
 * ⭐ **Nommée `ChunkLoadError`, et c'est la même cause** : un JSON d'une autre version est un
 * chunk d'un autre déploiement, servi à une page restée ouverte. `SceneBoundary` range en
 * `chunk` sur ce nom-là et sur lui seul — le visiteur voit la page sans scène, comme pour un
 * chunk introuvable.
 */
export class StaleBoardFileError extends Error {
  override readonly name = 'ChunkLoadError'
}

/** Le fichier relu, s'il est un plan de cette version ET de cette locale ; une erreur sinon. */
export function checkBoardFile(value: unknown, locale: Locale): BoardFile {
  if (!isBoardFile(value)) {
    throw new StaleBoardFileError('Plan de carte illisible ou d’une autre version du format')
  }
  if (value.locale !== locale) {
    throw new StaleBoardFileError(`Plan de carte de la locale ${value.locale}, attendu ${locale}`)
  }
  return value
}

/** Le chargeur — paresseux : rien n'est importé avant son appel. */
export function boardFileLoader(locale: Locale): () => Promise<BoardFile> {
  switch (locale) {
    case 'fr':
      return () =>
        import('@/scene/generated/board-plan.fr.json').then((m) => checkBoardFile(m.default, 'fr'))
    case 'en':
      return () =>
        import('@/scene/generated/board-plan.en.json').then((m) => checkBoardFile(m.default, 'en'))
  }
}
