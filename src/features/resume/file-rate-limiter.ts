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
 * - **Écriture atomique** (fichier temporaire puis `rename`) : une coupure en
 *   plein écrit laisse l'ancien état ou le nouveau, jamais un fichier tronqué.
 * - **Consommations sérialisées** dans le processus : deux requêtes simultanées
 *   ne lisent pas le même état pour écrire chacune le sien.
 * - **Fichier illisible ⇒ refus** (on ferme). Le fichier est laissé tel quel pour
 *   examen. Mieux vaut un formulaire coupé que le quota d'Augure épuisé ; le
 *   téléchargement direct du PDF reste disponible (P10-08).
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { Clock } from './memory-rate-limiter'
import type { RateLimiter, RateResult, RateRule } from './rate-limiter'
import { decide, isExpired, type WindowEntry } from './sliding-window'

const FORMAT_VERSION = 1

interface State {
  readonly version: typeof FORMAT_VERSION
  readonly keys: Readonly<Record<string, WindowEntry>>
}

const EMPTY: State = { version: FORMAT_VERSION, keys: {} }

export class FileRateLimiter implements RateLimiter {
  readonly #path: string
  readonly #now: Clock
  #queue: Promise<unknown> = Promise.resolve()

  constructor(path: string, now: Clock = Date.now) {
    this.#path = path
    this.#now = now
  }

  consume(key: string, rule: RateRule): Promise<RateResult> {
    const run = this.#queue.then(() => this.#consume(key, rule))
    this.#queue = run.catch(() => undefined)
    return run
  }

  async #consume(key: string, rule: RateRule): Promise<RateResult> {
    const state = await this.#read()
    if (state === null) return { allowed: false }

    const now = this.#now()
    const { allowed, entry } = decide(state.keys[key], rule, now)
    if (!allowed) return { allowed }

    const keys: Record<string, WindowEntry> = { [key]: entry }
    for (const [other, previous] of Object.entries(state.keys)) {
      if (other !== key && !isExpired(previous, now)) keys[other] = previous
    }
    await this.#write({ version: FORMAT_VERSION, keys })
    return { allowed }
  }

  /** L'état sur disque ; vide si le fichier n'existe pas encore, `null` s'il est illisible. */
  async #read(): Promise<State | null> {
    let raw: string
    try {
      raw = await readFile(this.#path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return EMPTY
      return null
    }
    try {
      const parsed: unknown = JSON.parse(raw)
      return isState(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  async #write(state: State): Promise<void> {
    await mkdir(dirname(this.#path), { recursive: true })
    const temporary = `${this.#path}.${process.pid}.tmp`
    await writeFile(temporary, JSON.stringify(state), 'utf8')
    await rename(temporary, this.#path)
  }
}

function isState(value: unknown): value is State {
  if (typeof value !== 'object' || value === null) return false
  const { version, keys } = value as { version?: unknown; keys?: unknown }
  if (version !== FORMAT_VERSION || typeof keys !== 'object' || keys === null) return false
  return Object.values(keys).every(isEntry)
}

function isEntry(value: unknown): value is WindowEntry {
  if (typeof value !== 'object' || value === null) return false
  const { hits, windowMs, limit } = value as Record<string, unknown>
  return (
    Array.isArray(hits) &&
    hits.every((hit) => typeof hit === 'number') &&
    typeof windowMs === 'number' &&
    typeof limit === 'number'
  )
}
