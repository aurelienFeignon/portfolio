/**
 * La décision de fenêtre glissante, commune aux deux limiteurs (P10-04, P10-05).
 *
 * Pure : elle reçoit l'historique d'une clé et rend le nouveau. Le stockage —
 * en mémoire ou sur disque — est l'affaire de l'appelant.
 */
import type { RateRule } from './rate-limiter'

/** Une horloge en millisecondes depuis l'époque Unix, injectée pour les tests. */
export type Clock = () => number

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
 * pas son blocage. Réutiliser une clé **encore active** sous une autre règle
 * raccourcirait en silence l'historique d'une limite longue : c'est refusé. Une
 * clé expirée, elle, est oubliée — sans quoi changer le plafond dans le code
 * bloquerait pour toujours une clé persistée sous l'ancienne règle.
 *
 * Une consommation « dans le futur » (horloge corrigée en arrière, fichier
 * retouché) est ignorée : elle ne doit pas saturer une limite jusqu'à ce que
 * l'horloge la rattrape.
 */
export function decide(
  previous: WindowEntry | undefined,
  rule: RateRule,
  now: number,
): WindowDecision {
  assertRule(rule)
  const active = previous && !isExpired(previous, now) ? previous : undefined
  if (active && (active.windowMs !== rule.windowMs || active.limit !== rule.limit)) {
    // Sans la clé dans le message : elle peut dériver d'une adresse e-mail.
    throw new RangeError('cette clé est déjà suivie sous une autre règle')
  }
  const hits = (active?.hits ?? []).filter((hit) => hit > now - rule.windowMs && hit <= now)
  const base = { windowMs: rule.windowMs, limit: rule.limit }
  if (hits.length >= rule.limit) return { allowed: false, entry: { ...base, hits } }
  return { allowed: true, entry: { ...base, hits: [...hits, now] } }
}

/** L'historique sans sa dernière consommation ; `undefined` s'il n'en reste aucune. */
export function withoutLastHit(entry: WindowEntry | undefined): WindowEntry | undefined {
  if (entry === undefined || entry.hits.length <= 1) return undefined
  return { ...entry, hits: entry.hits.slice(0, -1) }
}

/** Vrai quand plus aucune consommation de la clé n'est dans sa fenêtre. */
export function isExpired(entry: WindowEntry, now: number): boolean {
  const last = entry.hits.at(-1)
  return last === undefined || last <= now - entry.windowMs
}
