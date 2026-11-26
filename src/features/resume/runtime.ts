/**
 * L'assemblage de production du parcours de demande (P10-06) — le seul fichier qui lit
 * l'environnement.
 *
 * - **Expéditeur** : `ConsoleResumeSender` hors production ; en production, **aucun** tant que
 *   `MailjetResumeSender` n'existe pas (P10-07). Le formulaire répond alors `unavailable` plutôt
 *   que de se rabattre sur la console, qui écrirait les adresses des visiteurs au journal (CF-08).
 * - **Plafond global** : persisté dans `RESUME_DAILY_CAP_FILE` (P10-05). Sans ce fichier, la
 *   production est **indisponible** — un plafond en mémoire repartirait de zéro à chaque
 *   redémarrage et cesserait de protéger le quota d'Augure. Hors production, la mémoire suffit.
 * - **Limites par visiteur** : en mémoire, une instance par processus (ADR-0006, assumé).
 */
import { createHash } from 'node:crypto'

import { ConsoleResumeSender } from './console-resume-sender'
import { FileRateLimiter } from './file-rate-limiter'
import { MemoryRateLimiter } from './memory-rate-limiter'
import type { ResumeRequestDeps } from './request-resume'

export const DAILY_CAP_FILE_ENV = 'RESUME_DAILY_CAP_FILE'

/** Les limiteurs survivent aux requêtes : ils vivent avec le processus. */
let runtime: ResumeRequestDeps | undefined

export function createResumeDeps(env: NodeJS.ProcessEnv = process.env): ResumeRequestDeps {
  const production = env.NODE_ENV === 'production'
  const capFile = env[DAILY_CAP_FILE_ENV]
  const log = (message: string) => console.error(message)

  return {
    sender: production ? null : new ConsoleResumeSender(),
    visitorLimiter: new MemoryRateLimiter(),
    globalLimiter:
      capFile !== undefined && capFile !== ''
        ? new FileRateLimiter(capFile)
        : production
          ? null
          : new MemoryRateLimiter(),
    now: Date.now,
    hash: (value) => createHash('sha256').update(value).digest('hex'),
    log,
  }
}

export function resumeDeps(): ResumeRequestDeps {
  runtime ??= createResumeDeps()
  return runtime
}
