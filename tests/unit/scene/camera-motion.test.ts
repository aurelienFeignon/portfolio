/**
 * P6-04 — le mouvement de caméra, éprouvé sans navigateur : interpolation,
 * interruption, orbite bornée, cadrage dans la zone libre.
 */
import { describe, expect, it } from 'vitest'

import {
  clampOrbit,
  easeInOutCubic,
  framingFor,
  interpolatePose,
  labelPlacement,
  orbitAround,
  parallaxFor,
  poseOf,
  transitionProgress,
} from '@/scene/state/camera-motion'
import { CAMERAS, PARALLAX } from '@/scene/state/layout'

const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0))

describe('l’adoucissement', () => {
  it('part de 0, arrive à 1, passe par 0,5 au milieu, et borne ses entrées', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
    expect(easeInOutCubic(-1)).toBe(0)
    expect(easeInOutCubic(2)).toBe(1)
  })

  it('est lente au départ : à 10 % du temps, moins de 1 % du chemin', () => {
    expect(easeInOutCubic(0.1)).toBeLessThan(0.01)
  })
})

describe('l’avancement', () => {
  it('va de 0 à 1 sur la durée, et s’y tient', () => {
    expect(transitionProgress(0, 1000)).toBe(0)
    expect(transitionProgress(500, 1000)).toBe(0.5)
    expect(transitionProgress(5000, 1000)).toBe(1)
    expect(transitionProgress(-10, 1000)).toBe(0)
  })

  it('⛔ une durée nulle — `prefers-reduced-motion` — est une coupe : 1 tout de suite', () => {
    expect(transitionProgress(0, 0)).toBe(1)
  })
})

describe('l’interpolation', () => {
  const de = poseOf(CAMERAS.accueil)
  const vers = poseOf(CAMERAS.projets)

  it('rend la pose de départ à 0 et la pose d’arrivée à 1', () => {
    expect(interpolatePose(de, vers, 0)).toEqual(de)
    const fin = interpolatePose(de, vers, 1)
    fin.position.forEach((v, i) => expect(v).toBeCloseTo(vers.position[i]!))
    expect(fin.fov).toBeCloseTo(vers.fov)
  })

  it('⭐ une interruption repart de la pose AFFICHÉE, sans saut', () => {
    const milieu = interpolatePose(de, vers, 0.5)
    const nouvelle = poseOf(CAMERAS.competences)
    // La nouvelle transition commence exactement là où la caméra se trouvait.
    expect(interpolatePose(milieu, nouvelle, 0)).toEqual(milieu)
  })
})

describe('l’orbite', () => {
  const { position, target } = CAMERAS.accueil

  it('borne lacet et tangage', () => {
    expect(clampOrbit(90, -40, { yawDeg: 28, pitchDeg: 12 })).toEqual({ yawDeg: 28, pitchDeg: -12 })
    expect(clampOrbit(5, 3, { yawDeg: 28, pitchDeg: 12 })).toEqual({ yawDeg: 5, pitchDeg: 3 })
  })

  it('sans rotation, ne déplace pas la caméra', () => {
    orbitAround(position, target, 0, 0).forEach((v, i) => expect(v).toBeCloseTo(position[i]!))
  })

  it('tourne en conservant la distance à la cible — elle ne zoome pas', () => {
    const tournee = orbitAround(position, target, 25, 10)
    expect(distance(tournee, target)).toBeCloseTo(distance(position, target))
    expect(distance(tournee, position)).toBeGreaterThan(0.5)
  })

  it('ne bascule jamais au zénith', () => {
    const haut = orbitAround(position, target, 0, 179)
    expect(haut[1] - target[1]).toBeLessThan(distance(position, target))
  })

  it('rend la position telle quelle si elle est sur la cible', () => {
    expect(orbitAround([1, 2, 3], [1, 2, 3], 10, 10)).toEqual([1, 2, 3])
  })
})

describe('le cadrage dans la zone libre', () => {
  it('sans panneau, ne décale rien', () => {
    expect(framingFor(null, 1600, 900)).toEqual({ offsetX: 0, offsetY: 0, aspect: 1600 / 900 })
  })

  it('centre la scène dans la zone à droite du panneau', () => {
    // Panneau de 600 px à gauche : la zone libre est centrée à 1 100 px.
    const cadrage = framingFor({ x: 600, y: 0, width: 1000, height: 900 }, 1600, 900)
    expect(cadrage.offsetX).toBe(800 - 1100)
    expect(cadrage.offsetY).toBe(0)
    expect(cadrage.aspect).toBeCloseTo(1000 / 900)
  })

  it('centre la scène dans la bande du haut, sur mobile', () => {
    const cadrage = framingFor({ x: 0, y: 70, width: 390, height: 300 }, 390, 844)
    expect(cadrage.offsetX).toBe(0)
    expect(cadrage.offsetY).toBe(422 - 220)
  })

  it('une zone vide est traitée comme une absence de panneau', () => {
    expect(framingFor({ x: 0, y: 0, width: 0, height: 0 }, 100, 0)).toEqual({
      offsetX: 0,
      offsetY: 0,
      aspect: 1,
    })
  })
})

describe('la parallaxe', () => {
  it('au centre de la fenêtre, ne tourne rien', () => {
    expect(parallaxFor(0, 0, PARALLAX)).toEqual({ yawDeg: 0, pitchDeg: 0 })
  })

  it('va vers le pointeur, jusqu’à ses limites aux bords', () => {
    expect(parallaxFor(1, 1, PARALLAX)).toEqual(PARALLAX)
    expect(parallaxFor(-1, -1, PARALLAX)).toEqual({
      yawDeg: -PARALLAX.yawDeg,
      pitchDeg: -PARALLAX.pitchDeg,
    })
    expect(parallaxFor(0.5, 0, PARALLAX).yawDeg).toBeCloseTo(PARALLAX.yawDeg / 2)
  })

  it('⛔ un pointeur hors de la fenêtre ne dépasse pas les limites', () => {
    expect(parallaxFor(7, -3, PARALLAX)).toEqual({
      yawDeg: PARALLAX.yawDeg,
      pitchDeg: -PARALLAX.pitchDeg,
    })
  })

  it('tourne la caméra du côté du pointeur', () => {
    const { position, target } = CAMERAS.accueil
    const { yawDeg, pitchDeg } = parallaxFor(1, 1, PARALLAX)
    const tournee = orbitAround(position, target, yawDeg, pitchDeg)
    expect(tournee[0]).toBeGreaterThan(position[0])
    expect(tournee[1]).toBeGreaterThan(position[1])
  })
})

describe('le placement des étiquettes', () => {
  it('convertit la projection en pixels : le centre de l’écran au centre', () => {
    expect(labelPlacement([0, 0, 0.5], 1600, 900, null)).toEqual({ x: 800, y: 450, visible: true })
    const coin = labelPlacement([-1, 1, 0.5], 1600, 900, null)
    expect([coin.x, coin.y]).toEqual([0, 0])
  })

  it('⛔ cache une ancre derrière la caméra, ou au-delà du plan lointain', () => {
    expect(labelPlacement([0, 0, 1.2], 1600, 900, null).visible).toBe(false)
    expect(labelPlacement([0, 0, -1.2], 1600, 900, null).visible).toBe(false)
  })

  it('⛔ cache une étiquette qui tomberait sous le panneau de lecture', () => {
    const libre = { x: 600, y: 64, width: 1000, height: 836 }
    // x = 400 px : sous le panneau, à gauche de la zone libre.
    expect(labelPlacement([-0.5, 0, 0.5], 1600, 900, libre).visible).toBe(false)
    // x = 640 px : à droite du panneau, mais l'étiquette en mordrait le bord.
    expect(labelPlacement([-0.2, 0, 0.5], 1600, 900, libre).visible).toBe(false)
    // x = 1 200 px : dans la zone libre.
    expect(labelPlacement([0.5, 0, 0.5], 1600, 900, libre).visible).toBe(true)
  })

  it('cache une étiquette qui déborderait du bord, plutôt que de la couper', () => {
    // L'accroche est dans l'écran, mais la demi-largeur de l'étiquette n'y tient pas.
    expect(labelPlacement([0.95, 0, 0.5], 1600, 900, null).visible).toBe(false)
    // Trop près du haut : l'étiquette, posée au-dessus de son accroche, sortirait.
    expect(labelPlacement([0, 0.95, 0.5], 1600, 900, null).visible).toBe(false)
  })
})
