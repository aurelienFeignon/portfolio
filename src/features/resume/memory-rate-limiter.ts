/**
 * `RateLimiter` en mémoire, fenêtre glissante, horloge injectée (P10-04).
 *
 * Correct **parce que** le site tourne en un seul processus Node durable
 * (`architecture.md` §6) : en serverless ou à plusieurs répliques, chaque
 * instance compterait de son côté. Un redémarrage remet les compteurs à zéro ;
 * c'est pourquoi le plafond global journalier est persisté à part (P10-05,
 * `file-rate-limiter.ts`).
 *
 * La décision elle-même (`sliding-window.ts`) est commune aux deux limiteurs :
 * fenêtre glissante exacte, refus non comptés, une clé pour une seule règle.
 */
import type { RateLimiter, RateResult, RateRule } from './rate-limiter'
import { type Clock, decide, isExpired, type WindowEntry, withoutLastHit } from './sliding-window'

export type { Clock } from './sliding-window'

/** Intervalle minimal entre deux purges des clés inactives. */
const SWEEP_INTERVAL_MS = 60_000

export class MemoryRateLimiter implements RateLimiter {
  readonly #now: Clock
  readonly #entries = new Map<string, WindowEntry>()
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
    const now = this.#now()
    const { allowed, entry } = decide(this.#entries.get(key), rule, now)
    this.#sweep(now)
    this.#entries.set(key, entry)
    return { allowed }
  }

  async release(key: string): Promise<void> {
    const entry = withoutLastHit(this.#entries.get(key))
    if (entry === undefined) this.#entries.delete(key)
    else this.#entries.set(key, entry)
  }

  /**
   * Oublie les clés dont la dernière consommation est sortie de la fenêtre : sans
   * cela, chaque IP de passage resterait en mémoire pour la vie du processus.
   */
  #sweep(now: number): void {
    // Une horloge qui recule (correction NTP) ne doit pas suspendre la purge.
    if (now >= this.#lastSweep && now - this.#lastSweep < SWEEP_INTERVAL_MS) return
    this.#lastSweep = now
    for (const [key, entry] of this.#entries) {
      if (isExpired(entry, now)) this.#entries.delete(key)
    }
  }
}
