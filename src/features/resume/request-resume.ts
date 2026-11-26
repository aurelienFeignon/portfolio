/**
 * Le parcours d'une demande de CV, de la saisie à l'envoi (P10-06, ADR-0006).
 *
 * form ▶ validation Zod ▶ honeypot + time-trap ▶ rate limit (IP, e-mail, plafond global) ▶ envoi
 *
 * Fonction **pure de ses dépendances** : l'expéditeur, les limiteurs, l'horloge et le hachage sont
 * injectés. C'est ce qui rend tout le parcours testable sans réseau ni disque, et ce qui laisse la
 * Server Action ne faire que l'assemblage.
 *
 * ## Quatre issues, et ce qu'elles taisent
 *
 * - `sent` : le CV est parti — **ou** la demande a été écartée sans qu'il soit utile de le dire.
 *   Un robot (honeypot, time-trap) reçoit `sent` : lui dire qu'il est repéré lui apprendrait à
 *   contourner. Une adresse qui a atteint sa limite reçoit `sent` aussi : un refus révélerait que
 *   quelqu'un a déjà demandé le CV pour elle (`architecture.md` §6).
 * - `invalid` : l'adresse saisie n'en est pas une — la seule erreur imputable au visiteur.
 * - `limited` : trop de demandes depuis cette IP. Ne révèle rien d'un tiers.
 * - `unavailable` : plafond global atteint, stockage en échec, expéditeur absent ou en panne. Une
 *   réponse **neutre**, sans détail de la panne.
 *
 * ## L'ordre des limites est une décision
 *
 * Une consommation refusée n'est pas comptée par le limiteur qui refuse, mais celles qui la
 * précèdent le sont. Le plafond global vient donc **en dernier** : une demande écartée par l'IP ou
 * par l'adresse ne doit pas entamer le quota partagé avec Augure.
 */
import type { Locale } from '@/i18n/locales'

import type { RateLimiter, RateRule } from './rate-limiter'
import type { ResumeSender } from './resume-sender'
import { parseResumeRequest } from './schema'

export type ResumeOutcome = 'sent' | 'invalid' | 'limited' | 'unavailable'

export const RESUME_OUTCOMES: readonly ResumeOutcome[] = [
  'sent',
  'invalid',
  'limited',
  'unavailable',
]

/**
 * Le paramètre d'URL qui porte l'issue après la redirection (Post-Redirect-Get) — partagé par la
 * Server Action et la page. ⛔ Seule l'issue y voyage, jamais l'adresse saisie.
 */
export const OUTCOME_PARAM = 'envoi'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/**
 * Les valeurs de l'ADR-0006 (§ Calibrage retenu). Une clé par règle : le limiteur refuse qu'une
 * même clé change de fenêtre, d'où deux clés pour les deux limites par IP.
 */
export const RESUME_LIMITS = {
  ipPerHour: { limit: 3, windowMs: HOUR_MS },
  ipPerDay: { limit: 5, windowMs: DAY_MS },
  emailPerDay: { limit: 2, windowMs: DAY_MS },
  globalPerDay: { limit: 20, windowMs: DAY_MS },
} as const satisfies Record<string, RateRule>

export interface ResumeRequestDeps {
  /** `null` quand aucun expéditeur n'est configuré : le service est alors indisponible. */
  readonly sender: ResumeSender | null
  /** Limites par IP et par adresse : en mémoire, perdues au redémarrage (ADR-0006, assumé). */
  readonly visitorLimiter: RateLimiter
  /** Plafond global journalier, persisté — `null` si son stockage n'est pas configuré. */
  readonly globalLimiter: RateLimiter | null
  readonly now: () => number
  /** Hache une donnée personnelle avant d'en faire une clé : le limiteur ne voit jamais d'adresse. */
  readonly hash: (value: string) => string
  /** Journal des pannes. ⛔ Ne reçoit jamais l'adresse du visiteur (CF-08). */
  readonly log: (message: string) => void
}

export interface ResumeSubmission {
  /** Le contenu du formulaire, tel quel. */
  readonly form: Readonly<Record<string, unknown>>
  /** La langue de la page, liée par le serveur et non lue dans le formulaire. */
  readonly locale: Locale
  /** L'IP du visiteur, ou `null` si l'en-tête manque (développement local). */
  readonly ip: string | null
}

export async function requestResume(
  submission: ResumeSubmission,
  deps: ResumeRequestDeps,
): Promise<ResumeOutcome> {
  // La langue vient du serveur : un champ `locale` saisi ne peut ni l'écraser, ni faire échouer
  // la validation d'une adresse correcte.
  const verdict = parseResumeRequest({ ...submission.form, locale: submission.locale }, deps.now())
  if (verdict.kind === 'bot') return 'sent'
  if (verdict.kind === 'invalid') return 'invalid'
  const { email, locale } = verdict.request

  if (deps.sender === null || deps.globalLimiter === null) return 'unavailable'

  try {
    const ip = deps.hash(submission.ip ?? 'inconnue')
    const perHour = await deps.visitorLimiter.consume(`ip-h:${ip}`, RESUME_LIMITS.ipPerHour)
    if (!perHour.allowed) return 'limited'
    const perDay = await deps.visitorLimiter.consume(`ip-j:${ip}`, RESUME_LIMITS.ipPerDay)
    if (!perDay.allowed) return 'limited'

    const address = await deps.visitorLimiter.consume(
      `email:${deps.hash(email)}`,
      RESUME_LIMITS.emailPerDay,
    )
    if (!address.allowed) return 'sent'

    const global = await deps.globalLimiter.consume('global', RESUME_LIMITS.globalPerDay)
    if (!global.allowed) return 'unavailable'
  } catch (error) {
    deps.log(`[resume] limitation de débit en échec : ${describe(error)}`)
    return 'unavailable'
  }

  try {
    await deps.sender.sendResume(email, locale)
    return 'sent'
  } catch (error) {
    deps.log(`[resume] envoi en échec : ${describe(error)}`)
    return 'unavailable'
  }
}

/** Le nom de l'erreur seulement : son message pourrait porter l'adresse saisie. */
function describe(error: unknown): string {
  return error instanceof Error ? error.name : typeof error
}

/** Lit une issue depuis l'URL ; toute autre valeur est ignorée plutôt qu'affichée. */
export function parseResumeOutcome(value: unknown): ResumeOutcome | null {
  return RESUME_OUTCOMES.find((outcome) => outcome === value) ?? null
}
