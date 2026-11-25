/**
 * Plafond global journalier persisté sur disque (P10-05).
 *
 * Exerce le vrai système de fichiers, dans un répertoire temporaire jetable :
 * c'est la persistance qui est sous test, un faux la masquerait.
 */
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FileRateLimiter } from '@/features/resume/file-rate-limiter'

const DAY = 86_400_000
const CAP = { limit: 3, windowMs: DAY }

let dir: string
let path: string
let now: number

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'resume-cap-'))
  path = join(dir, 'state', 'daily-cap.json')
  now = 1_800_000_000_000
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const limiter = () => new FileRateLimiter(path, () => now)

describe('FileRateLimiter', () => {
  it('admet jusqu’au plafond, puis refuse', async () => {
    const cap = limiter()
    const results = []
    for (let i = 0; i < 4; i++) results.push((await cap.consume('global', CAP)).allowed)
    expect(results).toEqual([true, true, true, false])
  })

  it('survit à un redémarrage : une nouvelle instance relit le disque', async () => {
    for (let i = 0; i < 3; i++) await limiter().consume('global', CAP)
    expect((await limiter().consume('global', CAP)).allowed).toBe(false)
  })

  it('libère une place quand la plus ancienne sort des 24 h glissantes', async () => {
    const cap = limiter()
    await cap.consume('global', CAP)
    now += DAY / 2
    await cap.consume('global', CAP)
    await cap.consume('global', CAP)
    now += DAY / 2
    expect((await cap.consume('global', CAP)).allowed).toBe(true)
    expect((await cap.consume('global', CAP)).allowed).toBe(false)
  })

  it('sérialise les consommations simultanées : jamais plus que le plafond', async () => {
    const cap = limiter()
    const results = await Promise.all(Array.from({ length: 10 }, () => cap.consume('global', CAP)))
    expect(results.filter((r) => r.allowed)).toHaveLength(3)
  })

  it('ferme sur un fichier illisible, et le laisse intact pour examen', async () => {
    await limiter().consume('global', CAP)
    await writeFile(path, '{ tronqué', 'utf8')
    expect((await limiter().consume('global', CAP)).allowed).toBe(false)
    expect(await readFile(path, 'utf8')).toBe('{ tronqué')
  })

  it.each([
    ['version inconnue', { version: 2, keys: {} }],
    ['clés absentes', { version: 1 }],
    [
      'entrée malformée',
      { version: 1, keys: { global: { hits: ['x'], windowMs: DAY, limit: 3 } } },
    ],
    ['entrée non objet', { version: 1, keys: { global: 3 } }],
    ['racine non objet', 42],
  ])('ferme sur un état invalide : %s', async (_cas, state) => {
    await limiter().consume('global', CAP)
    await writeFile(path, JSON.stringify(state), 'utf8')
    expect((await limiter().consume('global', CAP)).allowed).toBe(false)
  })

  it('ferme si le fichier ne peut pas être lu (autre erreur que son absence)', async () => {
    // Un répertoire à la place du fichier : lecture en EISDIR.
    const cap = new FileRateLimiter(dir, () => now)
    expect((await cap.consume('global', CAP)).allowed).toBe(false)
  })

  it('écrit atomiquement : aucun fichier temporaire ne reste', async () => {
    await limiter().consume('global', CAP)
    expect(await readdir(join(dir, 'state'))).toEqual(['daily-cap.json'])
  })

  it('n’écrit rien sur un refus', async () => {
    const cap = limiter()
    for (let i = 0; i < 3; i++) await cap.consume('global', CAP)
    const avant = await readFile(path, 'utf8')
    now += 1
    await cap.consume('global', CAP)
    expect(await readFile(path, 'utf8')).toBe(avant)
  })

  it('oublie les clés expirées à l’écriture suivante', async () => {
    const cap = limiter()
    await cap.consume('ancienne', { limit: 1, windowMs: 1_000 })
    now += 2_000
    await cap.consume('global', CAP)
    const state = JSON.parse(await readFile(path, 'utf8')) as { keys: Record<string, unknown> }
    expect(Object.keys(state.keys)).toEqual(['global'])
  })

  it('garde les autres clés encore dans leur fenêtre', async () => {
    const cap = limiter()
    await cap.consume('autre', CAP)
    await cap.consume('global', CAP)
    const state = JSON.parse(await readFile(path, 'utf8')) as { keys: Record<string, unknown> }
    expect(Object.keys(state.keys).sort()).toEqual(['autre', 'global'])
  })

  it('refuse une règle incohérente sans bloquer les consommations suivantes', async () => {
    const cap = limiter()
    await expect(cap.consume('global', { limit: 0, windowMs: DAY })).rejects.toThrow(RangeError)
    expect((await cap.consume('global', CAP)).allowed).toBe(true)
  })

  it('prend Date.now par défaut', async () => {
    expect((await new FileRateLimiter(path).consume('global', CAP)).allowed).toBe(true)
  })
})
