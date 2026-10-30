/**
 * Le générateur à graine : déterministe, et dans [0, 1).
 */
import { describe, expect, it } from 'vitest'

import { seededRandom } from '@/scene/state/seeded-random'

describe('le générateur à graine', () => {
  it('rend la même suite pour la même graine, une autre pour une autre', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const c = seededRandom(43)
    const suiteA = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(suiteA)
    expect([c(), c(), c()]).not.toEqual(suiteA)
  })

  it('reste dans [0, 1)', () => {
    const random = seededRandom(1)
    for (let i = 0; i < 1000; i += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
