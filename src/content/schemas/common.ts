/**
 * Briques de validation partagées par les trois types de contenu (P2-02).
 *
 * Les messages sont en français : leur destinataire est l'auteur du contenu,
 * qui les lira dans la sortie d'un build cassé (CF-10). Un message qui dit
 * seulement « Invalid input » oblige à rouvrir le schéma pour comprendre.
 */
import { z } from 'zod'

/**
 * Un slug est un segment d'URL (`/fr/projects/<slug>`) et le nom du fichier qui
 * porte le contenu. Le domaine est donc restreint à ce qui est sûr dans les deux :
 * minuscules, chiffres, et des tirets qui séparent sans jamais border.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const slugSchema = z
  .string()
  .regex(
    SLUG_PATTERN,
    'doit être en minuscules, sans accent ni espace, les mots séparés par un seul tiret (ex. « mon-projet »)',
  )

/**
 * Date ISO **à précision variable** : `AAAA`, `AAAA-MM` ou `AAAA-MM-JJ`.
 *
 * ⚠️ **Renversement assumé de la décision de P2-02.** Celle-ci n'acceptait que le
 * jour, au motif d'« une seule forme à écrire, à trier et à comparer », et
 * qualifiait la précision d'affichage de « décision de rendu, pas de stockage ».
 * P4-04 a montré que cette prémisse était fausse sur le point qui compte :
 * `<time datetime>` et le JSON-LD de P4-09 **ne sont pas du rendu**, ce sont des
 * **émissions de données**. Une date complète y affirme un jour à un moteur de
 * recherche — or le CV source ne donne que des années, et `content/` portait
 * des 1ᵉʳ janvier d'attente.
 *
 * Le correctif n'est pas de retrancher la précision à l'affichage : une
 * troncature dans une vue ne protège que cette vue, et efface au passage les
 * dates réellement connues. **Quand une valeur porte une incertitude,
 * l'incertitude doit voyager avec elle** — sinon chaque consommateur redécide,
 * et le premier qui oublie affirme un fait faux, silencieusement, puisqu'une
 * date complète est toujours valide.
 *
 * Le domaine retenu est **exactement celui de `<time datetime>`** pour une date
 * calendaire : ce qui est stocké est donc émissible verbatim, juste par
 * construction.
 *
 * ⭐ Ce qui ne change pas : un jour écrit doit **exister**. `z.iso.date()` refuse
 * `2026-02-30`, là où une simple expression rationnelle l'accepterait — et le
 * mois est borné à `01`–`12` par le motif.
 */
const YEAR_PATTERN = /^\d{4}$/
const YEAR_MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/

function isIsoDateAtAnyPrecision(value: string): boolean {
  if (YEAR_PATTERN.test(value) || YEAR_MONTH_PATTERN.test(value)) return true
  return z.iso.date().safeParse(value).success
}

export const isoDateSchema = z
  .string(
    // ⚠️ L'année seule est le **seul** des trois formats que YAML transforme en
    // nombre : `startedAt: 2021` sans quotes n'arrive pas ici comme une chaîne.
    // Le message par défaut — « expected string, received number » — n'aide pas
    // à écrire la correction, qui est d'ajouter des quotes.
    "doit être une chaîne. ⚠️ En YAML, une année nue (2021) est un NOMBRE : écrire « '2021' » entre quotes",
  )
  .refine(
    isIsoDateAtAnyPrecision,
    'doit être une date ISO réelle, à la précision connue : année (« 2021 »), mois (« 2021-03 ») ou jour (« 2021-03-14 »)',
  )

// Pas de `precisionOf` exporté : `src/ui` ne peut pas importer `src/content`
// (`architecture.md` §1.2), et c'est le seul qui en aurait l'usage. Il lit la
// forme lui-même, en une ligne. Une fonction sans appelant serait du vocabulaire
// public à maintenir pour rien — la règle que `fr.ts` applique à ses clés.

/**
 * Compare deux dates ISO **sur ce qu'elles affirment toutes les deux**.
 *
 * ⭐⭐ C'est la règle qui rend la précision variable utilisable, et elle est
 * moins évidente qu'il n'y paraît. Comparer les chaînes brutes revient à lire
 * une valeur grossière comme le **début** de sa période : `'2021' < '2021-06'`.
 * C'est la bonne lecture pour une date de début, et la mauvaise pour une date de
 * fin — « terminé en 2021 » passerait alors pour antérieur à « terminé le 5
 * janvier 2021 ». Et cela rejetait un contenu parfaitement juste : commencé en
 * juin 2021, terminé en 2021.
 *
 * Plutôt que d'inventer une convention (fin d'année ? milieu ?) que le contenu
 * ne porte pas, la comparaison est tronquée à la **précision commune**. Deux
 * valeurs qui ne disent pas la même chose sont alors **égales**, et un
 * départage explicite prend le relais.
 */
export function compareAtCommonPrecision(a: string, b: string): number {
  const common = Math.min(a.length, b.length)
  const left = a.slice(0, common)
  const right = b.slice(0, common)

  if (left === right) return 0
  return left < right ? -1 : 1
}

/** Texte obligatoire dont l'auteur pourrait laisser une chaîne vide ou des espaces. */
export const nonEmptyTextSchema = z.string().trim().min(1, 'ne peut pas être vide')

/**
 * Références vers des compétences (`Skill.slug`). L'existence réelle de chaque
 * référence est vérifiée ailleurs (P2-07) : un schéma ne voit qu'un fichier à la
 * fois et ne peut pas savoir ce qui existe autour de lui.
 */
export const technologiesSchema = z
  .array(slugSchema)
  .min(1, 'doit citer au moins une technologie')
  .refine(
    (values) => new Set(values).size === values.length,
    "contient un doublon : chaque technologie ne doit apparaître qu'une fois",
  )

/**
 * Période fermée ou en cours. Ce contrôle est croisé, donc hors de portée d'un
 * champ isolé : une inversion de dates est une faute de frappe silencieuse, les
 * deux dates restant parfaitement valides prises séparément.
 *
 * Le format ISO rend la comparaison lexicographique exacte — aucune conversion
 * en `Date`, donc aucun fuseau horaire dans l'équation.
 */
export function isPeriodOrdered(value: {
  startedAt: string
  endedAt?: string | undefined
}): boolean {
  return (
    value.endedAt === undefined || compareAtCommonPrecision(value.endedAt, value.startedAt) >= 0
  )
}

/** `path` rattache l'erreur au champ fautif : sans lui, elle remonte sur l'objet entier. */
export const PERIOD_ORDER_ERROR: { error: string; path: PropertyKey[] } = {
  error: '`endedAt` est antérieure à `startedAt`',
  path: ['endedAt'],
}
