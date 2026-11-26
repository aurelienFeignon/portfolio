/**
 * L'assemblage de production du parcours de demande (P10-06, P10-07) — le seul fichier qui lit
 * l'environnement, en une décision pure (`planResume`). **Toute** la configuration de l'envoi vient du fichier d'environnement (`.env`
 * du serveur, chargé au démarrage du conteneur) : rien n'est gravé dans l'image, et les secrets
 * Mailjet ne passent donc jamais par le build ni par GHCR.
 *
 * - **Expéditeur** : `MailjetResumeSender` dès que la configuration Mailjet est **complète et
 *   valide**. Sinon : en production, **aucun** — le formulaire répond `unavailable`, et le journal
 *   nomme les variables en cause (jamais leur valeur) ; hors production, `ConsoleResumeSender`.
 *   ⛔ Jamais la console en production : elle écrirait les adresses des visiteurs au journal.
 * - **Plafond global** : persisté dans `RESUME_DAILY_CAP_FILE` (P10-05). Sans ce fichier, la
 *   production est **indisponible** — un plafond en mémoire repartirait de zéro à chaque
 *   redémarrage et cesserait de protéger le quota d'Augure. Hors production, la mémoire suffit.
 * - **Limites par visiteur** : en mémoire, une instance par processus (ADR-0006, assumé).
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'

import { z } from 'zod'

import { ConsoleResumeSender } from './console-resume-sender'
import { FileRateLimiter } from './file-rate-limiter'
import { LOCALES, type Locale } from '@/i18n/locales'

import { MailjetResumeSender, resumePdfPath, type MailjetConfig } from './mailjet-resume-sender'
import { MemoryRateLimiter } from './memory-rate-limiter'
import type { ResumeRequestDeps } from './request-resume'

export const DAILY_CAP_FILE_ENV = 'RESUME_DAILY_CAP_FILE'

/**
 * Les variables de l'envoi, et leur forme. Les noms sont ceux du fichier d'environnement ; la
 * transformation rend directement la configuration de l'adaptateur.
 */
const mailjetEnvSchema = z
  .object({
    MAILJET_API_KEY: z.string().trim().min(1),
    MAILJET_SECRET_KEY: z.string().trim().min(1),
    RESUME_SENDER_EMAIL: z.email(),
    RESUME_SENDER_NAME: z.string().trim().min(1),
    // Un entier de millisecondes, borné : trop court, tout échoue ; trop long, la requête du
    // visiteur reste pendue.
    RESUME_SEND_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000),
  })
  .transform(
    (e) =>
      ({
        apiKey: e.MAILJET_API_KEY,
        secretKey: e.MAILJET_SECRET_KEY,
        senderEmail: e.RESUME_SENDER_EMAIL,
        senderName: e.RESUME_SENDER_NAME,
        timeoutMs: e.RESUME_SEND_TIMEOUT_MS,
      }) satisfies MailjetConfig,
  )

/**
 * La configuration Mailjet, ou les **noms** des variables absentes ou invalides. Les valeurs ne
 * sortent jamais d'ici : une clé d'API mal collée ne finit pas dans le journal.
 */
export function readMailjetConfig(
  env: Readonly<Record<string, string | undefined>>,
): { readonly config: MailjetConfig } | { readonly invalid: readonly string[] } {
  const parsed = mailjetEnvSchema.safeParse(env)
  if (parsed.success) return { config: parsed.data }
  return { invalid: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))] }
}

/**
 * **La** décision de l'assemblage, pure et sans effet : quel expéditeur, quel plafond, et ce qui
 * manque. `createResumeDeps` construit d'après elle ; le démarrage (`src/instrumentation.ts`) la
 * décrit sans rien construire. Un seul endroit décide, donc la ligne du journal ne peut pas
 * décrire autre chose que ce qui sert.
 */
export interface ResumePlan {
  readonly sender: 'mailjet' | 'console' | 'aucun'
  readonly mailjet: MailjetConfig | null
  /** Variables absentes ou invalides, et PDF manquants — des noms, jamais des valeurs. */
  readonly missing: readonly string[]
  readonly cap: 'fichier' | 'mémoire' | 'aucun'
  readonly capFile: string | null
}

export function planResume(
  env: NodeJS.ProcessEnv,
  pdfExists: (locale: Locale) => boolean = (locale) => existsSync(resumePdfPath(locale)),
): ResumePlan {
  const production = env.NODE_ENV === 'production'
  const read = readMailjetConfig(env)
  // Un PDF absent ferait échouer chaque envoi : c'est une faute de configuration, dite ici.
  const pdfs = LOCALES.filter((locale) => !pdfExists(locale)).map(
    (locale) => `public/resume/cv-${locale}.pdf`,
  )
  const missing = ['invalid' in read ? read.invalid : [], pdfs].flat()

  let sender: ResumePlan['sender']
  if ('config' in read && pdfs.length === 0) sender = 'mailjet'
  else if (production) sender = 'aucun'
  else sender = 'console'

  const capFile = env[DAILY_CAP_FILE_ENV] || null
  let cap: ResumePlan['cap']
  if (capFile !== null) cap = 'fichier'
  else if (production) cap = 'aucun'
  else cap = 'mémoire'

  return { sender, mailjet: 'config' in read ? read.config : null, missing, cap, capFile }
}

/** La ligne du journal : noms seulement, jamais une valeur. */
export function describeResumePlan(plan: ResumePlan): string {
  const missing = plan.missing.length > 0 ? ` (en défaut : ${plan.missing.join(', ')})` : ''
  const cap = plan.cap === 'aucun' ? `aucun (${DAILY_CAP_FILE_ENV})` : plan.cap
  return `[resume] expéditeur : ${plan.sender}${missing} ; plafond global : ${cap}`
}

/** Les limiteurs survivent aux requêtes : ils vivent avec le processus. */
let runtime: ResumeRequestDeps | undefined

/** Construit d'après le plan, sans rien journaliser : le démarrage l'a déjà dit. */
export function createResumeDeps(plan: ResumePlan = planResume(process.env)): ResumeRequestDeps {
  const sender = {
    mailjet: () => new MailjetResumeSender(plan.mailjet as MailjetConfig),
    console: () => new ConsoleResumeSender(),
    aucun: () => null,
  }[plan.sender]()
  const globalLimiter = {
    fichier: () => new FileRateLimiter(plan.capFile as string),
    mémoire: () => new MemoryRateLimiter(),
    aucun: () => null,
  }[plan.cap]()

  return {
    sender,
    visitorLimiter: new MemoryRateLimiter(),
    globalLimiter,
    now: Date.now,
    hash: (value) => createHash('sha256').update(value).digest('hex'),
    log: (message) => console.error(message),
  }
}

export function resumeDeps(): ResumeRequestDeps {
  runtime ??= createResumeDeps()
  return runtime
}
