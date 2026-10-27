/**
 * P6-04 — le mouvement de caméra, éprouvé sans navigateur : interpolation,
 * interruption, orbite bornée, cadrage dans la zone libre.
 */
import { describe, expect, it } from 'vitest'

import {
  approachOrbit,
  clampOrbit,
  dragOrbit,
  easeInOutCubic,
  frameStepS,
  IMAGE_MAX_S,
  framingFor,
  interpolatePose,
  labelPlacement,
  orbitAround,
  parallaxFor,
  poseOf,
  REVEIL_S,
  rigFrame,
  transitionProgress,
  ORBIT_REST,
} from '@/scene/state/camera-motion'
import { fovForAspect } from '@/scene/state/framing'
import { CAMERAS, ORBIT_LIMITS, PARALLAX, type Vec3 } from '@/scene/state/layout'

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
  // Un écran de 1 600 × 900 px tout entier libre, et une étiquette de 224 × 56 px.
  const ecran = { x: 0, y: 0, width: 1600, height: 900 }
  const etiquette = { width: 224, height: 56 }
  const placer = (ndc: readonly [number, number, number], zone = ecran, label = etiquette) =>
    labelPlacement(ndc, 1600, 900, zone, label)

  it('convertit la projection en pixels : le centre de l’écran au centre', () => {
    expect(placer([0, 0, 0.5])).toEqual({ x: 800, y: 450, visible: true })
    const coin = placer([-1, 1, 0.5])
    expect([coin.x, coin.y]).toEqual([0, 0])
  })

  it('⛔ cache une ancre derrière la caméra, ou au-delà du plan lointain', () => {
    expect(placer([0, 0, 1.2]).visible).toBe(false)
    expect(placer([0, 0, -1.2]).visible).toBe(false)
  })

  it('⛔ cache une étiquette qui tomberait sous le panneau de lecture', () => {
    const libre = { x: 600, y: 64, width: 1000, height: 836 }
    // x = 400 px : sous le panneau, à gauche de la zone libre.
    expect(placer([-0.5, 0, 0.5], libre).visible).toBe(false)
    // x = 640 px : à droite du panneau, mais l'étiquette en mordrait le bord.
    expect(placer([-0.2, 0, 0.5], libre).visible).toBe(false)
    // x = 1 200 px : dans la zone libre.
    expect(placer([0.5, 0, 0.5], libre).visible).toBe(true)
  })

  it('cache une étiquette qui déborderait du bord, plutôt que de la couper', () => {
    // L'accroche est dans l'écran, mais la demi-largeur de l'étiquette n'y tient pas.
    expect(placer([0.95, 0, 0.5]).visible).toBe(false)
    // Trop près du haut : l'étiquette, posée au-dessus de son accroche, sortirait.
    expect(placer([0, 0.95, 0.5]).visible).toBe(false)
  })

  it('⛔ cache une étiquette que l’en-tête recouvrirait', () => {
    // y = 113 px : 56 px d'étiquette tiennent sous le haut de l'écran, pas sous 68 px d'en-tête.
    const sousEntete = { ...ecran, y: 68, height: 832 }
    expect(placer([0, 0.75, 0.5]).visible).toBe(true)
    expect(placer([0, 0.75, 0.5], sousEntete).visible).toBe(false)
  })

  it('⭐ juge sur la taille RENDUE : une étiquette étroite tient plus près du bord', () => {
    // x = 1 504 px : 96 px du bord droit, moins que la demi-largeur de 112 px.
    expect(placer([0.88, 0, 0.5]).visible).toBe(false)
    expect(placer([0.88, 0, 0.5], ecran, { width: 120, height: 32 }).visible).toBe(true)
  })
})

describe('le glisser', () => {
  it('vers la droite tourne la vue vers la gauche, vers le bas la penche', () => {
    const apres = dragOrbit({ yawDeg: 0, pitchDeg: 0 }, 10, 10, ORBIT_LIMITS)
    expect(apres.yawDeg).toBeCloseTo(-1.8)
    expect(apres.pitchDeg).toBeCloseTo(1.2)
  })

  it('reste dans les bornes de l’orbite', () => {
    expect(dragOrbit({ yawDeg: 0, pitchDeg: 0 }, -10_000, 10_000, ORBIT_LIMITS)).toEqual({
      yawDeg: ORBIT_LIMITS.yawDeg,
      pitchDeg: ORBIT_LIMITS.pitchDeg,
    })
  })
})

describe('la durée qu’une image fait avancer', () => {
  it('⛔ au réveil d’un repos, une image courte, quelle que soit la durée du repos', () => {
    // En `demand`, la première image après un repos porte tout le repos.
    expect(frameStepS(10, false)).toBe(REVEIL_S)
  })

  it('en mouvement, la durée réelle — un appareil à 20 i/s n’est pas ralenti', () => {
    expect(frameStepS(1 / 20, true)).toBe(1 / 20)
  })

  it('⛔ en mouvement, une image figée ne compte que pour la durée maximale', () => {
    expect(frameStepS(5, true)).toBe(IMAGE_MAX_S)
  })
})

describe('l’orbite qui rattrape sa consigne', () => {
  const consigne = { yawDeg: 10, pitchDeg: 0 }
  const uneSeconde = (cadence: number) => {
    let orbite = ORBIT_REST
    for (let i = 0; i < cadence; i += 1) orbite = approachOrbit(orbite, consigne, 1 / cadence, true)
    return orbite
  }

  it('approche sans dépasser, et ne dépend pas de la cadence — 20 i/s compris', () => {
    // Une seconde à 60, 30 et 20 i/s : le même reste, e^(−5) de l'écart.
    expect(10 - uneSeconde(60).yawDeg).toBeCloseTo(10 * Math.exp(-5), 6)
    expect(uneSeconde(30).yawDeg).toBeCloseTo(uneSeconde(60).yawDeg, 6)
    expect(uneSeconde(20).yawDeg).toBeCloseTo(uneSeconde(60).yawDeg, 6)
  })

  it('sans mouvement (reduced-motion), saute à la consigne : c’est voulu', () => {
    expect(approachOrbit(ORBIT_REST, consigne, 1 / 60, false)).toEqual(consigne)
  })
})

describe('une image du rig', () => {
  const de = poseOf(CAMERAS.accueil)
  const vers = poseOf(CAMERAS.projets)
  const image = (patch: Partial<Parameters<typeof rigFrame>[0]>) =>
    rigFrame({
      from: de,
      goal: vers,
      elapsedMs: 800,
      orbitNow: ORBIT_REST,
      drag: ORBIT_REST,
      parallax: ORBIT_REST,
      limits: ORBIT_LIMITS,
      deltaS: 1 / 60,
      wasMoving: true,
      animated: true,
      aspect: 16 / 9,
      ...patch,
    })

  /** La pose d'arrivée, position et fov. */
  const expectArrivee = (pose: { position: Vec3; fov?: number }) => {
    pose.position.forEach((valeur, i) => expect(valeur).toBeCloseTo(vers.position[i] ?? NaN))
    if (pose.fov !== undefined) expect(pose.fov).toBeCloseTo(vers.fov)
  }

  it('⭐ corrige le format sur le fov INTERPOLÉ, jamais sur celui de l’arrivée', () => {
    // Un écran plus étroit que 16:9 : la correction élargit. À mi-chemin, elle
    // part du fov du milieu de la transition, pas du fov cible (exigence 2).
    // ⛔ Des fov DIFFÉRENTS au départ et à l'arrivée : toutes les caméras de la
    // scène sont à 40°, et un banc sur elles ne distinguerait pas les deux. Et un
    // format de 1,6, pas un portrait : en portrait, les deux butent sur le plafond
    // de 50° et redeviennent indiscernables.
    const etroit = image({ from: { ...de, fov: 30 }, goal: { ...vers, fov: 50 }, aspect: 1.6 })
    expect(etroit.shown.fov).toBeGreaterThan(35)
    expect(etroit.shown.fov).toBeLessThan(45)
    expect(etroit.fov).toBeCloseTo(fovForAspect(etroit.shown.fov, 1.6))
    expect(etroit.fov).not.toBeCloseTo(fovForAspect(50, 1.6))
  })

  it('⭐ demande une image tant qu’une transition est en cours (exigence 3)', () => {
    const enCours = image({})
    expect(enCours.transitioning).toBe(true)
    expect(enCours.moving).toBe(true)
  })

  it('demande une image tant que l’orbite n’a pas rejoint sa consigne, sans être une transition', () => {
    const parallaxe = image({ elapsedMs: 5000, parallax: { yawDeg: 5, pitchDeg: 0 } })
    expect(parallaxe.transitioning).toBe(false)
    expect(parallaxe.moving).toBe(true)
  })

  it('au repos, ne demande plus rien', () => {
    const arrivee = image({ elapsedMs: 5000 })
    expect(arrivee.transitioning).toBe(false)
    expect(arrivee.moving).toBe(false)
    expectArrivee({ position: arrivee.position })
  })

  it('⛔⛔ une transition finie ne se rejoue pas, quel que soit le temps passé hors image', () => {
    // Le retour d'une fiche : la boucle repasse par `never`, et R3F remet son
    // horloge à zéro. Le temps est accumulé, pas lu sur l'horloge : une image de
    // réveil, même après 12 s de fiche, laisse la transition finie.
    const retour = image({ elapsedMs: 1600, deltaS: 12, wasMoving: false })
    expect(retour.transitioning).toBe(false)
    expectArrivee(retour.shown)
  })

  it('accumule le temps de transition, et le rend à l’image suivante', () => {
    expect(image({ elapsedMs: 800, deltaS: 1 / 60 }).elapsedMs).toBeCloseTo(800 + 1000 / 60)
  })

  it('sous reduced-motion, la première image est déjà l’arrivée', () => {
    const coupe = image({ elapsedMs: 0, animated: false })
    expect(coupe.transitioning).toBe(false)
    expectArrivee(coupe.shown)
  })
})
