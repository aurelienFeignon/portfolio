/**
 * L'assemblage de production du parcours de demande (P10-06, P10-07) — le seul fichier qui lit
 * l'environnement. **Toute** la configuration de l'envoi vient du fichier d'environnement (`.env`
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

import { z } from 'zod'

import { ConsoleResumeSender } from './console-resume-sender'
import { FileRateLimiter } from './file-rate-limiter'
import { MailjetResumeSender, type MailjetConfig } from './mailjet-resume-sender'
import { MemoryRateLimiter } from './memory-rate-limiter'
import type { ResumeRequestDeps } from './request-resume'
import type { ResumeSender } from './resume-sender'

export const DAILY_CAP_FILE_ENV = 'RESUME_DAILY_CAP_FILE'

/** Les variables de l'envoi, et leur forme. Les noms sont ceux du fichier d'environnement. */
const mailjetEnvSchema = z.object({
  MAILJET_API_KEY: z.string().trim().min(1),
  MAILJET_SECRET_KEY: z.string().trim().min(1),
  RESUME_SENDER_EMAIL: z.email(),
  RESUME_SENDER_NAME: z.string().trim().min(1),
  // Un entier de millisecondes, borné : trop court, tout échoue ; trop long, la requête du
  // visiteur reste pendue.
  RESUME_SEND_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000),
})

export const MAILJET_ENV = mailjetEnvSchema.keyof().options

/**
 * La configuration Mailjet, ou les **noms** des variables absentes ou invalides. Les valeurs ne
 * sortent jamais d'ici : une clé d'API mal collée ne finit pas dans le journal.
 */
export function readMailjetConfig(
  env: Readonly<Record<string, string | undefined>>,
): { readonly config: MailjetConfig } | { readonly invalid: readonly string[] } {
  const parsed = mailjetEnvSchema.safeParse(env)
  if (!parsed.success) {
    return { invalid: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))] }
  }
  const e = parsed.data
  return {
    config: {
      apiKey: e.MAILJET_API_KEY,
      secretKey: e.MAILJET_SECRET_KEY,
      senderEmail: e.RESUME_SENDER_EMAIL,
      senderName: e.RESUME_SENDER_NAME,
      timeoutMs: e.RESUME_SEND_TIMEOUT_MS,
    },
  }
}

/** Les limiteurs survivent aux requêtes : ils vivent avec le processus. */
let runtime: ResumeRequestDeps | undefined

export function createResumeDeps(env: NodeJS.ProcessEnv = process.env): ResumeRequestDeps {
  const production = env.NODE_ENV === 'production'
  const log = (message: string) => console.error(message)

  const mailjet = readMailjetConfig(env)
  let sender: ResumeSender | null
  if ('config' in mailjet) sender = new MailjetResumeSender(mailjet.config)
  else if (production) {
    sender = null
    log(
      `[resume] envoi désactivé, configuration Mailjet incomplète : ${mailjet.invalid.join(', ')}`,
    )
  } else sender = new ConsoleResumeSender()

  const capFile = env[DAILY_CAP_FILE_ENV]
  // Un fichier persisté si configuré ; sinon la mémoire hors production, et rien en production.
  const globalLimiter = capFile
    ? new FileRateLimiter(capFile)
    : production
      ? null
      : new MemoryRateLimiter()
  if (globalLimiter === null) log(`[resume] envoi désactivé : ${DAILY_CAP_FILE_ENV} absente`)

  return {
    sender,
    visitorLimiter: new MemoryRateLimiter(),
    globalLimiter,
    now: Date.now,
    hash: (value) => createHash('sha256').update(value).digest('hex'),
    log,
  }
}

export function resumeDeps(): ResumeRequestDeps {
  runtime ??= createResumeDeps()
  return runtime
}
