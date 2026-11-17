/**
 * P6-04 — le mouvement de caméra, éprouvé sans navigateur : interpolation,
 * interruption, orbite bornée, cadrage dans la zone libre.
 */
import { describe, expect, it } from 'vitest'

import {
  approachFactor,
  approachOrbit,
  clampOrbit,
  dragOrbit,
  easeInOutCubic,
  frameStepS,
  IMAGE_MAX_S,
  framingFor,
  interpolatePose,
  orbitAround,
  parallaxFor,
  poseOf,
  REVEIL_S,
  retarget,
  rigFrame,
  TRANSITION_IMAGE_MAX_S,
  transitionProgress,
  ORBIT_REST,
  fogRange,
  type Rect as ScreenRect,
} from '@/scene/state/camera-motion'
import { buildBoardFile } from '@/scene/state/board/file'
import { boardCameras, viewRects } from '@/scene/state/board-render/cameras'
import type { Rect as BoardRect } from '@/scene/state/plane'
import { makeLargeBoard, makeRealSizeBoard } from '../../fixtures/builders/board'
import { ORBIT_LIMITS, PARALLAX, transitionMs, type Vec3, type ViewId } from '@/scene/state/layout'

/**
 * Les cadrages d'un plan de carte réel (P8-15h) : ceux que le rig reçoit en
 * production, dans la zone de référence. Les bancs de mouvement ci-dessous n'affirment rien
 * sur leurs cotes, seulement sur ce que l'interpolation et l'orbite en font.
 */
const CAMERAS = boardCameras(
  buildBoardFile(makeRealSizeBoard(), { locale: 'fr', year: 2026, chipSizing: 'uniform' }).plan,
)

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
    expect(framingFor(null, 1600, 900)).toEqual({
      offsetX: 0,
      offsetY: 0,
      aspect: 1600 / 900,
      heightFraction: 1,
    })
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

  it('⛔ le format se mesure contre la hauteur du CANVAS : le champ vertical couvre tout le canvas', () => {
    // `setViewOffset` ne fait que déplacer le point principal : la zone libre voit, en largeur,
    // `free.width / height` du champ — jamais `free.width / free.height`.
    const cadrage = framingFor({ x: 0, y: 70, width: 390, height: 300 }, 390, 844)
    expect(cadrage.aspect).toBeCloseTo(390 / 844)
    expect(cadrage.heightFraction).toBeCloseTo(300 / 844)
  })

  it('une zone vide est traitée comme une absence de panneau', () => {
    expect(framingFor({ x: 0, y: 0, width: 0, height: 0 }, 100, 0)).toEqual({
      offsetX: 0,
      offsetY: 0,
      aspect: 1,
      heightFraction: 1,
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

describe('le facteur d’approche', () => {
  it('ne dépend pas de la cadence : deux demi-pas valent un pas', () => {
    const unPas = approachFactor(4, 0.1, true)
    const demi = approachFactor(4, 0.05, true)
    // Reste après un pas = reste après deux demi-pas.
    expect(1 - unPas).toBeCloseTo((1 - demi) ** 2, 12)
  })

  it('sans mouvement (reduced-motion), vaut 1 : on saute', () => {
    expect(approachFactor(4, 1 / 60, false)).toBe(1)
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
      ...patch,
    })

  it('⭐ à 300 ms par image, la transition dure 1,6 s RÉELLES, pas seize images', () => {
    // Mesuré en CI (rendu WebGL logiciel, 2026-10-31) : ~300 ms par image. Comptée
    // en images bornées à `IMAGE_MAX_S`, une transition y durait ~5 s.
    let elapsedMs = 0
    let images = 0
    while (elapsedMs < transitionMs(false)) {
      elapsedMs = image({ elapsedMs, deltaS: 0.3 }).elapsedMs
      images += 1
    }
    expect(images).toBeLessThanOrEqual(Math.ceil(transitionMs(false) / 300))
  })

  it('⛔ une image figée de 5 s ne fait avancer la transition que de la borne', () => {
    const avant = 200
    const apres = image({ elapsedMs: avant, deltaS: 5 }).elapsedMs
    expect(apres - avant).toBeCloseTo(TRANSITION_IMAGE_MAX_S * 1000, 9)
  })

  /** La pose d'arrivée, position et fov. */
  const expectArrivee = (pose: { position: Vec3; fov?: number }) => {
    pose.position.forEach((valeur, i) => expect(valeur).toBeCloseTo(vers.position[i] ?? NaN))
    if (pose.fov !== undefined) expect(pose.fov).toBeCloseTo(vers.fov)
  }

  it('⭐ rend le fov INTERPOLÉ tel quel : le cadrage est déjà celui de la zone (P8-05)', () => {
    // ⛔ Des fov DIFFÉRENTS au départ et à l'arrivée : toutes les caméras de la scène sont
    // à 40°, et un banc sur elles ne distinguerait pas le fov interpolé de celui d'arrivée.
    const milieu = image({ from: { ...de, fov: 30 }, goal: { ...vers, fov: 50 } })
    expect(milieu.shown.fov).toBeGreaterThan(35)
    expect(milieu.shown.fov).toBeLessThan(45)
    expect(milieu.fov).toBe(milieu.shown.fov)
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

/* ------------------------------------------------- la carte dans la zone libre */

/**
 * Projette un point du sol en pixels du canvas, comme `PerspectiveCamera` avec
 * `setViewOffset(W, H, offsetX, offsetY, W, H)` : le champ vertical couvre tout le canvas, le
 * point principal est déplacé de l'opposé du décalage.
 */
function projectToPx(
  point: Vec3,
  camera: { position: Vec3; target: Vec3; fov: number },
  W: number,
  H: number,
  offsetX: number,
  offsetY: number,
): [number, number] {
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const norm = (a: Vec3): Vec3 => {
    const l = Math.hypot(...a)
    return [a[0] / l, a[1] / l, a[2] / l]
  }
  const f = norm(sub(camera.target, camera.position))
  const right = norm([-f[2], 0, f[0]])
  const up: Vec3 = [
    right[1] * f[2] - right[2] * f[1],
    right[2] * f[0] - right[0] * f[2],
    right[0] * f[1] - right[1] * f[0],
  ]
  const p = sub(point, camera.position)
  const z = dot(p, f)
  const tanV = Math.tan((camera.fov * Math.PI) / 360)
  const x = W / 2 + (dot(p, right) / z / tanV) * (H / 2) - offsetX
  const y = H / 2 - (dot(p, up) / z / tanV) * (H / 2) - offsetY
  return [x, y]
}

/**
 * Les deux écrans que la scène doit servir : l'ordinateur, panneau fixe à gauche, et le
 * téléphone en portrait, bande de scène sous l'en-tête (393 × 852, le Xiaomi 14T Pro de la
 * capture du 2026-11-17 ; en-tête 68 px, bande `min(42svh, 78vw)` = 306 px).
 */
const ECRANS = [
  { nom: '1440 × 900', W: 1440, H: 900, libre: { x: 584, y: 72, width: 840, height: 808 } },
  { nom: '393 × 852, portrait', W: 393, H: 852, libre: { x: 0, y: 68, width: 393, height: 306 } },
] as const

describe.each([
  ['taille réelle', makeRealSizeBoard],
  ['grand banc', makeLargeBoard],
])('la carte dans la zone libre — %s', (_name, make) => {
  const file = buildBoardFile(make(), { locale: 'fr', year: 2026, chipSizing: 'uniform' })

  describe.each(ECRANS)('$nom', ({ W, H, libre }) => {
    const free: ScreenRect = libre
    const framing = framingFor(free, W, H)
    const zone = { aspect: framing.aspect, heightFraction: framing.heightFraction }
    const cameras = boardCameras(file.plan, zone)
    const rects = viewRects(file.plan, zone)

    /** Les quatre coins du rectangle de la vue, projetés en pixels. */
    const coins = (view: ViewId) => {
      const goal = poseOf(cameras[view])
      const image = rigFrame({
        from: goal,
        goal,
        elapsedMs: 5000,
        orbitNow: ORBIT_REST,
        drag: ORBIT_REST,
        parallax: ORBIT_REST,
        limits: ORBIT_LIMITS,
        deltaS: 1 / 60,
        wasMoving: false,
        animated: false,
      })
      const r: BoardRect = rects[view]
      return (
        [
          [r.minX, r.minZ],
          [r.maxX, r.minZ],
          [r.minX, r.maxZ],
          [r.maxX, r.maxZ],
        ] as const
      ).map(([x, z]) =>
        projectToPx(
          [x, 0, z],
          { position: image.position, target: image.shown.target, fov: image.fov },
          W,
          H,
          framing.offsetX,
          framing.offsetY,
        ),
      )
    }

    it.each(['accueil', 'experiences', 'projets', 'competences'] as const)(
      '%s : chaque coin de son rectangle se projette DANS la zone libre',
      (view: ViewId) => {
        for (const [px, py] of coins(view)) {
          expect(px).toBeGreaterThanOrEqual(free.x - 1e-6)
          expect(px).toBeLessThanOrEqual(free.x + free.width + 1e-6)
          expect(py).toBeGreaterThanOrEqual(free.y - 1e-6)
          expect(py).toBeLessThanOrEqual(free.y + free.height + 1e-6)
        }
      },
    )

    /*
     * ⛔⛔ La régression que P8-05 corrige : le cadrage gardait le champ horizontal du 16:9,
     * et la carte d'accueil n'occupait que ~65 % de la largeur d'un téléphone. Cadrée dans la
     * zone, elle la remplit à la marge près (`FRAME_MARGIN` = 1,15, soit ≥ 1/1,15 ≈ 87 %),
     * ou c'est la hauteur qui la borne.
     */
    it('accueil : la carte remplit la zone en largeur OU en hauteur, à la marge près', () => {
      const xs = coins('accueil').map(([x]) => x)
      const ys = coins('accueil').map(([, y]) => y)
      const largeur = (Math.max(...xs) - Math.min(...xs)) / free.width
      const hauteur = (Math.max(...ys) - Math.min(...ys)) / free.height
      expect(Math.max(largeur, hauteur)).toBeGreaterThan(0.85)
    })
  })
})

describe('retarget — une nouvelle cible, par la route ou par la zone (P8-05)', () => {
  const affichee = poseOf(CAMERAS.accueil)
  const cible = poseOf(CAMERAS.projets)
  const glisse = { yawDeg: 12, pitchDeg: -4 }

  it('par la route : la transition repart de la pose AFFICHÉE, l’orbite revient au repos', () => {
    const start = retarget({ sameView: false, shown: affichee, goal: cible, drag: glisse })
    expect(start.from).toBe(affichee)
    expect(start.elapsedMs).toBe(0)
    expect(start.drag).toBe(ORBIT_REST)
  })

  it('⛔ par la zone seule : recadrée sur place, transition finie, orbite gardée', () => {
    const start = retarget({ sameView: true, shown: affichee, goal: cible, drag: glisse })
    expect(start.from).toBe(cible)
    expect(start.shown).toBe(cible)
    expect(start.drag).toBe(glisse)
    // Rendue à l'image suivante : la pose est la cible, et rien ne bouge plus.
    const image = rigFrame({
      from: start.from,
      goal: cible,
      elapsedMs: start.elapsedMs,
      orbitNow: glisse,
      drag: start.drag,
      parallax: ORBIT_REST,
      limits: ORBIT_LIMITS,
      deltaS: 1 / 60,
      wasMoving: false,
      animated: true,
    })
    expect(image.transitioning).toBe(false)
    expect(image.shown.position).toEqual(cible.position)
  })
})

describe('la distance rendue est celle du cadrage, sans recul', () => {
  const goal = poseOf(CAMERAS.accueil)
  const image = rigFrame({
    from: goal,
    goal,
    elapsedMs: 5000,
    orbitNow: ORBIT_REST,
    drag: ORBIT_REST,
    parallax: ORBIT_REST,
    limits: ORBIT_LIMITS,
    deltaS: 1 / 60,
    wasMoving: false,
    animated: false,
  })

  it('distance = |position − cible| du cadrage', () => {
    expect(image.distance).toBeCloseTo(distance(goal.position, goal.target))
    expect(distance(image.position, image.shown.target)).toBeCloseTo(image.distance)
  })

  it('la pose interpolée reste celle du cadrage', () => {
    expect(image.shown.position).toEqual(goal.position)
  })
})

describe('le brouillard suit la distance de cadrage', () => {
  it('commence au-delà de la cible et finit loin derrière, proportionnellement', () => {
    const near = fogRange(30)
    const far = fogRange(60)
    expect(near.near).toBeGreaterThan(30)
    expect(near.far).toBeGreaterThan(near.near)
    expect(far.near).toBeCloseTo(near.near * 2)
    expect(far.far).toBeCloseTo(near.far * 2)
  })
})
