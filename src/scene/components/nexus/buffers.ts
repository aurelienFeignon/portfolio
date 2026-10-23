/**
 * Des tableaux de nombres vers des `BufferGeometry` — les seules conversions dont
 * les constructeurs de NEXUS ont besoin. Chaque géométrie de ligne porte `aT`, de
 * 0 à 1 le long du tracé, que lit le shader de flux.
 */
import { BufferGeometry, Float32BufferAttribute } from 'three'

import type { Vec3 } from '@/scene/state/layout'

/** Une polyligne continue, avec `aT` de 0 à 1 le long de son tracé. */
export function polylineGeometry(points: readonly Vec3[]): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(points.flat(), 3))
  geometry.setAttribute(
    'aT',
    new Float32BufferAttribute(
      points.map((_, i) => (points.length === 1 ? 0 : i / (points.length - 1))),
      1,
    ),
  )
  return geometry
}

/** Des segments indépendants, chacun avec `aT` de 0 à 1. */
export function segmentsGeometry(
  points: readonly Vec3[],
  edges: ReadonlyArray<readonly [number, number]>,
): BufferGeometry {
  const positions: number[] = []
  const t: number[] = []
  for (const [a, b] of edges) {
    positions.push(...(points[a] as Vec3), ...(points[b] as Vec3))
    t.push(0, 1)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aT', new Float32BufferAttribute(t, 1))
  return geometry
}

/** Des points, avec une phase de scintillement chacun. */
export function pointsGeometry(positions: Float32Array, phases: Float32Array): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1))
  return geometry
}
