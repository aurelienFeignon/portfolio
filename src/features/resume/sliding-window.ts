/**
 * La décision de fenêtre glissante, commune aux deux limiteurs (P10-04, P10-05).
 *
 * Pure : elle reçoit l'historique d'une clé et rend le nouveau. Le stockage —
 * en mémoire ou sur disque — est l'affaire de l'appelant.
 */
import type { RateRule } from './rate-limiter'

/** Historique d'une clé. Une clé appartient à une seule règle. */
export interface WindowEntry {
  readonly hits: readonly number[]
  readonly windowMs: number
  readonly limit: number
}

export interface WindowDecision {
  readonly allowed: boolean
  readonly entry: WindowEntry
}

export function assertRule(rule: RateRule): void {
  if (!Number.isInteger(rule.limit) || rule.limit < 1) {
    throw new RangeError(`limit doit être un entier ≥ 1, reçu ${rule.limit}`)
  }
  if (!Number.isFinite(rule.windowMs) || rule.windowMs <= 0) {
    throw new RangeError(`windowMs doit être un nombre > 0, reçu ${rule.windowMs}`)
  }
}

/**
 * Oublie les consommations sorties de la fenêtre, puis admet ou refuse. Une
 * consommation refusée n'est **pas** enregistrée : un abus bloqué ne prolonge
 * pas son blocage. Réutiliser une clé sous une autre règle raccourcirait en
 * silence l'historique d'une limite longue : c'est refusé.
 */
export function decide(
  previous: WindowEntry | undefined,
  rule: RateRule,
  now: number,
): WindowDecision {
  assertRule(rule)
  if (previous && (previous.windowMs !== rule.windowMs || previous.limit !== rule.limit)) {
    // Sans la clé dans le message : elle peut dériver d'une adresse e-mail.
    throw new RangeError('cette clé est déjà suivie sous une autre règle')
  }
  const hits = (previous?.hits ?? []).filter((hit) => hit > now - rule.windowMs)
  const base = { windowMs: rule.windowMs, limit: rule.limit }
  if (hits.length >= rule.limit) return { allowed: false, entry: { ...base, hits } }
  return { allowed: true, entry: { ...base, hits: [...hits, now] } }
}

/** Vrai quand plus aucune consommation de la clé n'est dans sa fenêtre. */
export function isExpired(entry: WindowEntry, now: number): boolean {
  const last = entry.hits.at(-1)
  return last === undefined || last <= now - entry.windowMs
}
