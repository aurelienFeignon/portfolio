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
import { skillFrontmatterSchema } from './schemas/skill.ts'

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
 * pratiques, c'est-à-dire du plus concret au plus transversal.
 *
 * ⭐⭐ **Il est lu depuis l'énumération du schéma, et non recopié.** L'ordre de
 * `z.enum` y est donc porteur de sens, ce que `schemas/skill.ts` dit à sa source.
 * La conséquence est ce qui compte : la liste est **exhaustive par
 * construction** — une sixième catégorie y entre toute seule, et il n'y a rien
 * à tenir d'accord.
 *
 * ⚠️ Deux formes ont été écartées en revue, et la seconde de justesse. Un
 * tableau typé `readonly SkillCategory[]` ne vérifie que ses éléments : une
 * catégorie oubliée compilait, et ses compétences **disparaissaient de la page**
 * sans un mot, `indexOf` rendant −1. Un `Record<SkillCategory, number>` ferme
 * bien ce trou par le compilateur — mais il écrit alors la décision **deux
 * fois**, dans l'ordre des clés et dans les valeurs, qui peuvent diverger.
 * Lire l'énumération ne détecte pas le problème : il le supprime.
 */
const CATEGORY_ORDER: readonly SkillCategory[] = skillFrontmatterSchema.shape.category.options

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
    // `indexOf` ne peut pas rendre −1 : la liste **est** l'énumération.
    const byCategory = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (byCategory !== 0) return byCategory
    if (a.level !== b.level) return b.level - a.level
    return collator.compare(a.name, b.name)
  }
}

/**
 * Regroupe des compétences par catégorie, **dans l'ordre du domaine** (P4-06).
 *
 * L'ordre des cinq catégories est une décision — du plus concret au plus
 * transversal — et il vit dans `CATEGORY_ORDER`, une seule fois. Le groupement
 * le **rétablit** plutôt que de supposer l'entrée triée : sans quoi une liste
 * reçue autrement, ou un `bySkillOrder` qui changerait demain, réordonnerait la
 * page en silence.
 *
 * Une catégorie que rien ne remplit n'apparaît pas. Le cas est réel, pas
 * théorique : une locale peut ne traduire qu'une partie des compétences (R-07),
 * et un titre suivi du vide est un défaut visible.
 *
 * L'ordre **à l'intérieur** d'une catégorie est celui reçu : c'est `bySkillOrder`
 * qui en décide, et ce n'est pas à deux endroits de le faire.
 */
export function groupByCategory<T extends { readonly category: SkillCategory }>(
  skills: readonly T[],
): readonly { readonly category: SkillCategory; readonly skills: readonly T[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    skills: skills.filter((skill) => skill.category === category),
  })).filter((group) => group.skills.length > 0)
}

/** Tri sans mutation : la liste reçue du chargeur est mémoïsée et partagée. */
export function sorted<T>(entries: readonly T[], compare: (a: T, b: T) => number): readonly T[] {
  return [...entries].sort(compare)
}
