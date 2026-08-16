/**
 * Normalisations et dérivations (P2-06).
 *
 * Toutes ces fonctions sont **pures** : elles ne lisent rien, ne datent rien,
 * n'ont pas d'horloge. Un tri qui dépendrait de « maintenant » donnerait deux
 * résultats différents à deux builds, ce qui est intestable et se voit en
 * production sous forme de page qui change sans que le contenu ait bougé.
 */
import type { Locale } from '../i18n/locales.ts'
import { compareAtCommonPrecision } from './schemas/common.ts'

import type { SkillCategory } from './types.ts'

interface Period {
  readonly startedAt: string
  readonly endedAt?: string | undefined
}

/**
 * Une date de fin absente signifie « toujours en cours ». La dérivation est faite
 * une fois ici plutôt que réécrite dans chaque vue, où l'une d'elles finirait par
 * tester `endedAt === null` et afficher « en cours » sur une expérience terminée.
 */
export function withOngoing<T extends Period>(entry: T): T & { readonly isOngoing: boolean } {
  return { ...entry, isOngoing: entry.endedAt === undefined }
}

/**
 * Du plus récent au plus ancien, un élément en cours passant devant tous les
 * éléments terminés.
 *
 * La date de fin absente est remplacée par une borne haute plutôt que traitée à
 * part : deux éléments en cours restent alors départagés par leur date de début,
 * et le tri reste une simple comparaison de chaînes ISO — sans `Date`, donc sans
 * fuseau horaire.
 *
 * Le `slug` tranche les égalités parfaites : sans lui, deux entités commencées et
 * terminées le même jour pourraient changer d'ordre d'un build à l'autre.
 */
const STILL_RUNNING = '9999-12-31'

export function byMostRecent<T extends Period & { readonly slug: string }>(a: T, b: T): number {
  const endedA = a.endedAt ?? STILL_RUNNING
  const endedB = b.endedAt ?? STILL_RUNNING

  /*
   * ⚠️ `compareAtCommonPrecision` et non `localeCompare`, pour deux raisons qui
   * se cumulent depuis que les dates portent leur précision.
   *
   * `localeCompare` d'abord : les chaînes n'ont plus la même longueur, le tiret
   * devient porteur, et il est traité comme de la ponctuation — un poids qui
   * dépend d'une collation qu'aucun test ici ne contrôle.
   *
   * La comparaison brute ensuite : elle lit une valeur grossière comme le
   * **début** de sa période, ce qui est juste pour une date de début et faux
   * pour une date de fin. Deux fins qui n'affirment pas la même chose sont donc
   * déclarées **égales**, et le départage passe explicitement à la date de
   * début, puis au slug — plutôt qu'à une convention que le contenu ne porte pas.
   */
  const byEnd = compareAtCommonPrecision(endedB, endedA)
  if (byEnd !== 0) return byEnd

  const byStart = compareAtCommonPrecision(b.startedAt, a.startedAt)
  if (byStart !== 0) return byStart

  // Le slug départage des égalités parfaites, et son ordre est pour des humains.
  return a.slug.localeCompare(b.slug)
}

/**
 * Ordre de présentation des catégories de compétences : des langages vers les
 * pratiques, c'est-à-dire du plus concret au plus transversal. Il vient de
 * l'énumération du schéma, dont l'ordre est donc porteur de sens.
 */
const CATEGORY_ORDER: readonly SkillCategory[] = [
  'language',
  'framework',
  'tooling',
  'infrastructure',
  'practice',
]

interface SkillOrderKey {
  readonly category: SkillCategory
  readonly level: number
  readonly name: string
}

/**
 * Compétences : par catégorie, puis par niveau décroissant, puis par nom.
 *
 * Le nom est comparé avec un `Intl.Collator` de la locale : « Élasticsearch » se
 * range à sa place alphabétique au lieu d'être rejeté après « Z », ce que fait
 * une comparaison de codes de caractères.
 */
export function bySkillOrder(locale: Locale): (a: SkillOrderKey, b: SkillOrderKey) => number {
  const collator = new Intl.Collator(locale)

  return (a, b) => {
    const byCategory = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (byCategory !== 0) return byCategory
    if (a.level !== b.level) return b.level - a.level
    return collator.compare(a.name, b.name)
  }
}

/** Tri sans mutation : la liste reçue du chargeur est mémoïsée et partagée. */
export function sorted<T>(entries: readonly T[], compare: (a: T, b: T) => number): readonly T[] {
  return [...entries].sort(compare)
}
