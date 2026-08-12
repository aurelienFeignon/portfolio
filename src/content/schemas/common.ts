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
 * Date calendaire ISO, jour compris. `z.iso.date()` refuse un jour qui n'existe
 * pas (`2026-02-30`), là où une simple expression rationnelle l'accepterait.
 *
 * La précision au jour est conservée même quand seul le mois a du sens (une prise
 * de poste). Motif : une seule forme à écrire, à trier et à comparer. La
 * précision d'affichage — « mars 2022 » plutôt qu'une date complète — est une
 * décision de rendu, prise en Phase 4, pas une décision de stockage.
 */
export const isoDateSchema = z.iso.date(
  'doit être une date ISO complète et réelle, au format AAAA-MM-JJ (ex. « 2022-03-01 »)',
)

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
  return value.endedAt === undefined || value.endedAt >= value.startedAt
}

/** `path` rattache l'erreur au champ fautif : sans lui, elle remonte sur l'objet entier. */
export const PERIOD_ORDER_ERROR: { error: string; path: PropertyKey[] } = {
  error: '`endedAt` est antérieure à `startedAt`',
  path: ['endedAt'],
}
