/**
 * Validation de la demande de CV : schéma Zod, honeypot et time-trap (P10-03).
 *
 * Trois verdicts, et pas deux, parce que l'appelant ne répond pas pareil :
 * - `valid` : la demande peut passer au rate limit ;
 * - `invalid` : erreur de saisie, à signaler au visiteur ;
 * - `bot` : honeypot rempli ou formulaire soumis trop vite. L'appelant répond
 *   **comme à un succès**, sans rien envoyer — dire au robot qu'il est repéré
 *   lui apprendrait à contourner.
 *
 * Ces deux pièges arrêtent les robots simples, pas un attaquant déterminé : le
 * vrai garde-fou reste le plafond global (ADR-0006). L'horodatage du time-trap
 * n'est pas signé, donc un robot qui le forge passe — c'est assumé à ce niveau.
 */
import { z } from 'zod'

import { LOCALES, type Locale } from '@/i18n/locales'

/** Champ invisible pour un humain ; un robot qui remplit tout le remplit aussi. */
export const HONEYPOT_FIELD = 'website'

/** Horodatage (ms) du rendu du formulaire, posé en champ caché par le serveur. */
export const RENDERED_AT_FIELD = 'renderedAt'

/** En dessous, aucun humain n'a pu lire la page, saisir une adresse et valider. */
export const MIN_FILL_MS = 3_000

/** Longueur maximale d'une adresse e-mail (RFC 5321, chemin complet). */
const EMAIL_MAX_LENGTH = 254

const requestSchema = z.object({
  email: z.string().trim().max(EMAIL_MAX_LENGTH).pipe(z.email()),
  locale: z.enum(LOCALES),
})

const trapSchema = z.object({
  [HONEYPOT_FIELD]: z.string().optional(),
  // Des chiffres seulement : `z.coerce.number()` ferait d'une chaîne vide un 0,
  // donc un formulaire « rendu en 1970 », qui passerait le piège.
  [RENDERED_AT_FIELD]: z.string().regex(/^\d+$/).transform(Number),
})

export interface ResumeRequest {
  readonly email: string
  readonly locale: Locale
}

export type ResumeRequestVerdict =
  | { readonly kind: 'valid'; readonly request: ResumeRequest }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'bot' }

/**
 * `input` est le contenu du formulaire (`Object.fromEntries(formData)`),
 * `now` l'instant de réception en millisecondes.
 *
 * Les pièges sont jugés **avant** la saisie : un robot ne doit pas apprendre, par
 * un message d'erreur, quelle adresse aurait été acceptée.
 */
export function parseResumeRequest(input: unknown, now: number): ResumeRequestVerdict {
  const traps = trapSchema.safeParse(input)
  if (!traps.success) return { kind: 'bot' }
  if ((traps.data[HONEYPOT_FIELD] ?? '') !== '') return { kind: 'bot' }

  const elapsed = now - traps.data[RENDERED_AT_FIELD]
  if (elapsed < MIN_FILL_MS) return { kind: 'bot' }

  const request = requestSchema.safeParse(input)
  if (!request.success) return { kind: 'invalid' }
  return { kind: 'valid', request: request.data }
}
