/**
 * P8-15 — la clé de programme des matériaux retouchés (`withLocalFrame`) : three range les
 * programmes sous cette clé, et deux retouches qui la partageraient seraient rendues avec le même
 * programme (les condensateurs l'ont été avec celui des capots). Elle est tirée du code injecté :
 * ce banc tient qu'elle diffère bien d'une retouche à l'autre, et qu'elle est stable.
 */
import { describe, expect, it } from 'vitest'

import {
  capacitorMaterial,
  chipBodyMaterial,
  lidMaterial,
} from '@/scene/components/board/board-materials'

const keyOf = (material: { customProgramCacheKey: () => string }): string =>
  material.customProgramCacheKey()

describe('customProgramCacheKey des matériaux retouchés', () => {
  it('puce, capot et condensateur ont chacun leur clé', () => {
    const keys = [chipBodyMaterial(), lidMaterial(), capacitorMaterial()].map(keyOf)
    expect(new Set(keys).size).toBe(3)
    for (const key of keys) expect(key).toMatch(/^board:/)
  })

  it('la même retouche rend la même clé (un programme partagé entre instances)', () => {
    expect(keyOf(lidMaterial())).toBe(keyOf(lidMaterial()))
  })
})
