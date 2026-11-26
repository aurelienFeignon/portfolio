/**
 * `RateLimiter` en mémoire, fenêtre glissante, horloge injectée (P10-04).
 */
import { describe, expect, it } from 'vitest'

import { MemoryRateLimiter } from '@/features/resume/memory-rate-limiter'

const HOUR = 3_600_000

function setup(start = 1_000_000) {
  let now = start
  const limiter = new MemoryRateLimiter(() => now)
  return {
    limiter,
    advance: (ms: number) => {
      now += ms
    },
  }
}

describe('MemoryRateLimiter', () => {
  const rule = { limit: 3, windowMs: HOUR }

  it('admet sous le seuil et au seuil, refuse au-delà', async () => {
    const { limiter } = setup()
    const results = []
    for (let i = 0; i < 4; i++) results.push((await limiter.consume('ip:a', rule)).allowed)
    expect(results).toEqual([true, true, true, false])
  })

  it('ne dit que oui ou non', async () => {
    const { limiter } = setup()
    expect(await limiter.consume('ip:a', rule)).toEqual({ allowed: true })
  })

  it('libère une place quand la plus ancienne consommation sort de la fenêtre (glissante)', async () => {
    const { limiter, advance } = setup()
    await limiter.consume('ip:a', rule)
    advance(HOUR / 2)
    await limiter.consume('ip:a', rule)
    await limiter.consume('ip:a', rule)
    expect((await limiter.consume('ip:a', rule)).allowed).toBe(false)

    advance(HOUR / 2) // la première sort tout juste de la fenêtre
    expect((await limiter.consume('ip:a', rule)).allowed).toBe(true)
    expect((await limiter.consume('ip:a', rule)).allowed).toBe(false)
  })

  it('ne compte pas une consommation refusée : un abus ne prolonge pas son blocage', async () => {
    const { limiter, advance } = setup()
    for (let i = 0; i < 3; i++) await limiter.consume('ip:a', rule)
    for (let i = 0; i < 10; i++) {
      advance(60_000)
      await limiter.consume('ip:a', rule)
    }
    advance(HOUR - 10 * 60_000) // une heure après les trois admises
    expect((await limiter.consume('ip:a', rule)).allowed).toBe(true)
  })

  it('compte chaque clé à part (IP et adresse e-mail)', async () => {
    const { limiter } = setup()
    for (let i = 0; i < 3; i++) await limiter.consume('ip:a', rule)
    expect((await limiter.consume('ip:a', rule)).allowed).toBe(false)
    expect((await limiter.consume('email:a', rule)).allowed).toBe(true)
  })

  it('oublie les clés inactives, pour que la mémoire reste bornée', async () => {
    const { limiter, advance } = setup()
    await limiter.consume('ip:a', rule)
    await limiter.consume('ip:b', rule)
    expect(limiter.size).toBe(2)

    advance(HOUR)
    await limiter.consume('ip:c', rule)
    expect(limiter.size).toBe(1)
  })

  it('ne purge pas plus d’une fois par minute', async () => {
    const { limiter, advance } = setup()
    await limiter.consume('ip:a', { limit: 1, windowMs: 1_000 })
    advance(30_000)
    await limiter.consume('ip:b', rule)
    expect(limiter.size).toBe(2)
  })

  it('refuse de suivre une même clé sous deux règles', async () => {
    const { limiter } = setup()
    await limiter.consume('k', { limit: 1, windowMs: 24 * HOUR })
    await expect(limiter.consume('k', { limit: 5, windowMs: 1_000 })).rejects.toThrow(RangeError)
    await expect(limiter.consume('k', { limit: 2, windowMs: 24 * HOUR })).rejects.toThrow(
      RangeError,
    )
  })

  it('purge encore quand l’horloge recule (correction NTP)', async () => {
    const { limiter, advance } = setup()
    advance(-HOUR) // l'horloge recule d'une heure
    await limiter.consume('ip:a', { limit: 1, windowMs: 1_000 })
    advance(2 * 60_000) // toujours avant l'instant de départ
    await limiter.consume('ip:b', { limit: 1, windowMs: 1_000 })
    expect(limiter.size).toBe(1) // ip:a, expirée, a été purgée
  })

  it.each([
    { limit: 0, windowMs: HOUR },
    { limit: 1.5, windowMs: HOUR },
    { limit: 1, windowMs: 0 },
    { limit: 1, windowMs: Number.POSITIVE_INFINITY },
  ])('refuse une règle incohérente %o', async (bad) => {
    const { limiter } = setup()
    await expect(limiter.consume('ip:a', bad)).rejects.toThrow(RangeError)
  })

  it('prend Date.now par défaut', async () => {
    expect((await new MemoryRateLimiter().consume('ip:a', rule)).allowed).toBe(true)
  })

  describe('release (P10-07)', () => {
    it('rend la dernière consommation admise : la place est de nouveau libre', async () => {
      const { limiter } = setup()
      for (let i = 0; i < 3; i++) await limiter.consume('k', rule)
      await limiter.release('k')
      expect((await limiter.consume('k', rule)).allowed).toBe(true)
      expect((await limiter.consume('k', rule)).allowed).toBe(false)
    })

    it('oublie la clé quand sa seule consommation est rendue', async () => {
      const { limiter } = setup()
      await limiter.consume('k', rule)
      await limiter.release('k')
      expect(limiter.size).toBe(0)
    })

    it('ne fait rien sur une clé inconnue', async () => {
      const { limiter } = setup()
      await expect(limiter.release('inconnue')).resolves.toBeUndefined()
      expect(limiter.size).toBe(0)
    })
  })
})
