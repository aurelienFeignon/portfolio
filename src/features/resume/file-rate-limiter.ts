/**
 * `RateLimiter` persisté sur disque, pour le plafond global journalier (P10-05).
 *
 * Le plafond (20 envois sur 24 h glissantes, ADR-0006) protège le quota Mailjet
 * partagé avec Augure. En mémoire, un redémarrage du conteneur le remettrait à
 * zéro — un déploiement, ou un abus qui ferait redémarrer le processus, suffirait
 * à le contourner. Il vit donc dans un fichier JSON, sur un volume.
 *
 * Choix assumés :
 * - **Relu à chaque consommation.** Quelques dizaines d'octets, quelques
 *   lectures par jour : aucune raison de tenir un cache qui pourrait diverger du
 *   disque.
 * - **Écriture durable** : fichier temporaire au nom unique, `fsync`, `rename`,
 *   puis `fsync` du répertoire. Sans les `fsync`, une coupure de courant peut
 *   laisser le `rename` sur disque et les données non — un fichier vide, donc un
 *   formulaire coupé.
 * - **Consommations sérialisées par chemin**, pour tout le processus : deux
 *   instances sur le même fichier (rechargement de module, instance par requête)
 *   ne lisent pas le même état pour écrire chacune le sien.
 * - **Stockage en échec ⇒ refus** (on ferme), en lecture comme en écriture, et
 *   **signalé** dans le journal : sinon un formulaire coupé ressemblerait à un
 *   jour de plafond atteint. Un fichier illisible est laissé tel quel pour
 *   examen. Mieux vaut un formulaire coupé que le quota d'Augure épuisé ; le
 *   téléchargement direct du PDF reste disponible (P10-08).
 */
import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import type { RateLimiter, RateResult, RateRule } from './rate-limiter'
import {
  assertRule,
  type Clock,
  decide,
  isExpired,
  releaseLastHit,
  type WindowEntry,
} from './sliding-window'

const FORMAT_VERSION = 1

const REFUSED: RateResult = { allowed: false }

/** Une file par fichier, partagée par toutes les instances du processus. */
const queues = new Map<string, Promise<unknown>>()

type Log = (message: string) => void

export class FileRateLimiter implements RateLimiter {
  readonly #path: string
  readonly #now: Clock
  readonly #log: Log

  constructor(path: string, now: Clock = Date.now, log: Log = (message) => console.error(message)) {
    this.#path = resolve(path)
    this.#now = now
    this.#log = log
  }

  async consume(key: string, rule: RateRule): Promise<RateResult> {
    // Une règle incohérente est une erreur de programmation : elle rejette tout
    // de suite, sans passer pour une panne de stockage.
    assertRule(rule)
    return this.#enqueue(() => this.#consume(key, rule))
  }

  /** Dans la même file que les consommations : une restitution ne croise jamais une écriture. */
  release(key: string): Promise<void> {
    return this.#enqueue(() => this.#release(key))
  }

  #enqueue<T>(task: () => Promise<T>): Promise<T> {
    const previous = queues.get(this.#path) ?? Promise.resolve()
    const run = previous.then(task)
    queues.set(
      this.#path,
      run.catch(() => undefined),
    )
    return run
  }

  /** Stockage en échec ⇒ le créneau reste consommé (côté sûr), signalé, jamais une exception. */
  async #release(key: string): Promise<void> {
    const state = await this.#read()
    if (state === null || !state.has(key)) return
    releaseLastHit(state, key)
    try {
      await this.#write(state)
    } catch (error) {
      this.#log(`[FileRateLimiter] restitution impossible, créneau conservé : ${describe(error)}`)
    }
  }

  async #consume(key: string, rule: RateRule): Promise<RateResult> {
    const state = await this.#read()
    if (state === null) return REFUSED

    const now = this.#now()
    const { allowed, entry } = decide(state.get(key), rule, now)
    if (!allowed) return REFUSED

    const keys = new Map([[key, entry]])
    for (const [other, kept] of state) {
      if (other !== key && !isExpired(kept, now)) keys.set(other, kept)
    }
    try {
      await this.#write(keys)
    } catch (error) {
      this.#log(`[FileRateLimiter] écriture impossible, refus : ${describe(error)}`)
      return REFUSED
    }
    return { allowed }
  }

  /** Les clés sur disque ; vide si le fichier n'existe pas encore, `null` en cas de doute. */
  async #read(): Promise<Map<string, WindowEntry> | null> {
    let raw: string
    try {
      raw = await readFile(this.#path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Map()
      this.#log(`[FileRateLimiter] lecture impossible, refus : ${describe(error)}`)
      return null
    }
    const keys = parseState(raw)
    if (keys === null) this.#log('[FileRateLimiter] état illisible, refus ; fichier conservé')
    return keys
  }

  async #write(keys: Map<string, WindowEntry>): Promise<void> {
    const directory = dirname(this.#path)
    await mkdir(directory, { recursive: true })
    const temporary = `${this.#path}.${randomUUID()}.tmp`
    const file = await open(temporary, 'w')
    try {
      await file.writeFile(
        JSON.stringify({ version: FORMAT_VERSION, keys: Object.fromEntries(keys) }),
        'utf8',
      )
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temporary, this.#path)
    const dir = await open(directory, 'r')
    try {
      await dir.sync()
    } finally {
      await dir.close()
    }
  }
}

function describe(error: unknown): string {
  return (error as NodeJS.ErrnoException).code ?? String(error)
}

/** Les clés d'un état valide ; `null` au moindre doute sur sa forme ou ses valeurs. */
function parseState(raw: string): Map<string, WindowEntry> | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const { version, keys } = value as { version?: unknown; keys?: unknown }
  if (version !== FORMAT_VERSION || typeof keys !== 'object' || keys === null) return null
  // Une `Map` plutôt qu'un objet : une clé `constructor` ou `__proto__` ne doit
  // ni lire un membre hérité, ni disparaître à l'écriture suivante.
  const entries = new Map<string, WindowEntry>()
  for (const [key, entry] of Object.entries(keys)) {
    if (!isEntry(entry)) return null
    entries.set(key, entry)
  }
  return entries
}

function isEntry(value: unknown): value is WindowEntry {
  if (typeof value !== 'object' || value === null) return false
  const { hits, windowMs, limit } = value as Record<string, unknown>
  return (
    Array.isArray(hits) &&
    hits.every((hit) => Number.isFinite(hit)) &&
    Number.isInteger(limit) &&
    (limit as number) >= 1 &&
    Number.isFinite(windowMs) &&
    (windowMs as number) > 0
  )
}
