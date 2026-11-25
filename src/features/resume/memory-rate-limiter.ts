/**
 * `RateLimiter` en mémoire, fenêtre glissante, horloge injectée (P10-04).
 *
 * Correct **parce que** le site tourne en un seul processus Node durable
 * (`architecture.md` §6) : en serverless ou à plusieurs répliques, chaque
 * instance compterait de son côté. Un redémarrage remet les compteurs à zéro ;
 * c'est pourquoi le plafond global journalier est persisté à part (P10-05).
 *
 * Fenêtre glissante exacte : on garde l'instant de chaque consommation admise et
 * l'on oublie celles qui sortent de la fenêtre. Les volumes sont minuscules
 * (quelques unités par clé), donc la liste est le bon compromis.
 *
 * Deux règles du contrat (`rate-limiter.ts`) tenues ici :
 * - une consommation **refusée n'est pas enregistrée** ;
 * - le résultat ne dit que oui ou non.
 */
import type { RateLimiter, RateResult, RateRule } from './rate-limiter'

/** Une horloge en millisecondes depuis l'époque Unix, injectée pour les tests. */
export type Clock = () => number

/** Intervalle minimal entre deux purges des clés inactives. */
const SWEEP_INTERVAL_MS = 60_000

interface Entry {
  hits: number[]
  windowMs: number
}

const ALLOWED: RateResult = { allowed: true }
const REFUSED: RateResult = { allowed: false }

export class MemoryRateLimiter implements RateLimiter {
  readonly #now: Clock
  readonly #entries = new Map<string, Entry>()
  #lastSweep: number

  constructor(now: Clock = Date.now) {
    this.#now = now
    this.#lastSweep = now()
  }

  /** Nombre de clés suivies — exposé pour vérifier que la mémoire reste bornée. */
  get size(): number {
    return this.#entries.size
  }

  async consume(key: string, rule: RateRule): Promise<RateResult> {
    assertRule(rule)
    const now = this.#now()
    this.#sweep(now)

    const entry = this.#entries.get(key) ?? { hits: [], windowMs: rule.windowMs }
    entry.windowMs = rule.windowMs
    entry.hits = entry.hits.filter((hit) => hit > now - rule.windowMs)

    if (entry.hits.length >= rule.limit) {
      this.#entries.set(key, entry)
      return REFUSED
    }
    entry.hits.push(now)
    this.#entries.set(key, entry)
    return ALLOWED
  }

  /**
   * Oublie les clés dont la dernière consommation est sortie de la fenêtre : sans
   * cela, chaque IP de passage resterait en mémoire pour la vie du processus.
   */
  #sweep(now: number): void {
    if (now - this.#lastSweep < SWEEP_INTERVAL_MS) return
    this.#lastSweep = now
    for (const [key, entry] of this.#entries) {
      const last = entry.hits.at(-1)
      if (last === undefined || last <= now - entry.windowMs) this.#entries.delete(key)
    }
  }
}

function assertRule(rule: RateRule): void {
  if (!Number.isInteger(rule.limit) || rule.limit < 1) {
    throw new RangeError(`limit doit être un entier ≥ 1, reçu ${rule.limit}`)
  }
  if (!Number.isFinite(rule.windowMs) || rule.windowMs <= 0) {
    throw new RangeError(`windowMs doit être un nombre > 0, reçu ${rule.windowMs}`)
  }
}
