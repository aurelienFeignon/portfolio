/**
 * Accès aux dictionnaires d'interface (P3-04).
 *
 * Table exhaustive **par construction** : ajouter une locale à `LOCALES` sans lui
 * donner de dictionnaire ne compile pas. C'est la même mécanique que
 * `FRONTMATTER_SCHEMAS` dans la couche Content, et pour la même raison — une
 * table incomplète produirait un `undefined` là où l'appelant attend des chaînes,
 * c'est-à-dire une page rendue sans ses libellés.
 *
 * Aucune bibliothèque i18n n'est introduite (ADR-0005) : `Intl` fournit le
 * formatage, le compilateur fournit la complétude, et il ne reste rien à ajouter
 * tant que les messages n'ont ni pluriel ni interpolation. Le déclencheur pour
 * adopter `next-intl` est écrit dans l'ADR.
 */
import type { Locale } from '../locales.ts'

import { en } from './en.ts'
import { fr, type Messages } from './fr.ts'

export type { Messages }

const MESSAGES = { fr, en } satisfies Record<Locale, Messages>

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale]
}
