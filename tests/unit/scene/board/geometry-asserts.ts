/**
 * Assertions géométriques partagées par les bancs de la carte mère.
 */
import { expect } from 'vitest'

import type { Vec2 } from '@/scene/state/board/rect'

const EPS = 1e-9

/**
 * Chaque segment de la polyligne est horizontal, vertical ou à 45°, et aucun
 * n'est nul (un point dupliqué cacherait un coude dégénéré).
 */
export function expectOctilinear(points: readonly Vec2[]): void {
  expect(points.length).toBeGreaterThanOrEqual(2)
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i]![0] - points[i - 1]![0]
    const dz = points[i]![1] - points[i - 1]![1]
    const length = Math.hypot(dx, dz)
    const octilinear =
      Math.abs(dx) < EPS || Math.abs(dz) < EPS || Math.abs(Math.abs(dx) - Math.abs(dz)) < EPS
    expect(length > EPS && octilinear, `segment ${i - 1}→${i} : dx=${dx}, dz=${dz}`).toBe(true)
  }
}
