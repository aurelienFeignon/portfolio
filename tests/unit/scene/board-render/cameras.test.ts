import { beforeAll, describe, expect, it } from 'vitest'
import {
  makeBoardContent,
  makeLargeBoard,
  makeRealSizeBoard,
} from '../../../fixtures/builders/board'
import {
  BOARD_FOV,
  boardCameras,
  ELEVATION_DEG,
  FRAME_MARGIN,
  type FrameZone,
  frameRect,
  REFERENCE_ASPECT,
  REFERENCE_ZONE,
  viewRects,
} from '@/scene/state/board-render/cameras'
import { type BoardPlan, planBoard } from '@/scene/state/board/plan'
import { type Rect, rectUnion } from '@/scene/state/plane'
import type { CameraSpec, Vec3, ViewId } from '@/scene/state/layout'

const options = { currentYear: 2026, chipSizing: 'level', tier: 'full' } as const
const DEG = Math.PI / 180

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a)
  return [a[0] / l, a[1] / l, a[2] / l]
}
const dist = (cam: CameraSpec) => Math.hypot(...sub(cam.position, cam.target))

/**
 * La bande de scène d'un téléphone en portrait : 393 × 852, en-tête de 68 px, bande de 306 px
 * (`min(42svh, 78vw)`) — le Xiaomi 14T Pro de la capture du 2026-11-17.
 */
const PORTRAIT: FrameZone = { aspect: 393 / 852, heightFraction: 306 / 852 }

/** La zone réduite de la marge : ce que `frameRect` remplit exactement (`FRAME_MARGIN`). */
const sansMarge = (zone: FrameZone): FrameZone => ({
  aspect: zone.aspect / FRAME_MARGIN,
  heightFraction: zone.heightFraction / FRAME_MARGIN,
})

/** La caméra rapprochée (`k` < 1) ou éloignée de sa cible. */
const recul = (cam: CameraSpec, k: number): CameraSpec => ({
  ...cam,
  position: [
    cam.target[0] + (cam.position[0] - cam.target[0]) * k,
    cam.target[1] + (cam.position[1] - cam.target[1]) * k,
    cam.target[2] + (cam.position[2] - cam.target[2]) * k,
  ],
})

/**
 * Les quatre coins du rectangle sont-ils dans le tronc de pyramide que voit la zone ?
 * `framingFor` centre la projection sur la zone : elle voit `tan(fov/2) × aspect` en
 * demi-largeur et `tan(fov/2) × heightFraction` en demi-hauteur (`FrameZone`).
 */
function cornersInFrustum(cam: CameraSpec, r: Rect, zone: FrameZone = REFERENCE_ZONE): boolean {
  const f = norm(sub(cam.target, cam.position))
  const right = norm(cross(f, [0, 1, 0]))
  const up = cross(right, f)
  const tan = Math.tan((cam.fov / 2) * DEG)
  const tanV = tan * zone.heightFraction
  const tanH = tan * zone.aspect
  const corners: Vec3[] = [
    [r.minX, 0, r.minZ],
    [r.maxX, 0, r.minZ],
    [r.minX, 0, r.maxZ],
    [r.maxX, 0, r.maxZ],
  ]
  return corners.every((c) => {
    const p = sub(c, cam.position)
    const z = dot(p, f)
    return z > 0 && Math.abs(dot(p, right) / z) <= tanH && Math.abs(dot(p, up) / z) <= tanV
  })
}

/** Z du bord PROCHE de l'empreinte au sol : le rayon du milieu du bas de la zone. */
function nearEdgeZ(cam: CameraSpec, zone: FrameZone = REFERENCE_ZONE): number {
  const f = norm(sub(cam.target, cam.position))
  const right = norm(cross(f, [0, 1, 0]))
  const up = cross(right, f)
  const tanV = Math.tan((cam.fov / 2) * DEG) * zone.heightFraction
  const dir: Vec3 = [f[0] - up[0] * tanV, f[1] - up[1] * tanV, f[2] - up[2] * tanV]
  const t = -cam.position[1] / dir[1]
  return cam.position[2] + dir[2] * t
}

const rectsOf = (plan: BoardPlan): Record<ViewId, Rect> => ({
  accueil: plan.bounds,
  competences: rectUnion(plan.zones.map((z) => z.bounds)) as Rect,
  experiences: plan.timeline.bounds,
  projets: plan.district.bounds,
})
const focusOf = {
  accueil: undefined,
  experiences: 'experiences',
  projets: 'projects',
  competences: 'skills',
} as const

describe('constantes', () => {
  it('valeurs de départ', () => {
    expect(BOARD_FOV).toBe(40)
    expect(ELEVATION_DEG).toBe(58)
    expect(FRAME_MARGIN).toBe(1.15)
  })
})

describe('frameRect', () => {
  it('vise à plat, au milieu en X, entre le centre et le bord avant en Z, devant et au-dessus', () => {
    const cam = frameRect({ minX: -4, minZ: -2, maxX: 6, maxZ: 8 })
    expect(cam.target[0]).toBe(1)
    expect(cam.target[1]).toBe(0)
    // ⭐ La perspective tasse le fond : pour centrer l'IMAGE, la visée avance vers le bord avant.
    expect(cam.target[2]).toBeGreaterThan(3)
    expect(cam.target[2]).toBeLessThan(8)
    expect(cam.position[2]).toBeGreaterThan(3)
    expect(cam.position[1]).toBeGreaterThan(0)
    expect(cam.fov).toBe(BOARD_FOV)
    expect(cam.focusNodeId).toBeUndefined()
    expect(Object.hasOwn(cam, 'focusNodeId')).toBe(false)
  })

  it("porte l'élévation demandée", () => {
    const cam = frameRect({ minX: -1, minZ: -1, maxX: 1, maxZ: 1 })
    const v = sub(cam.position, cam.target)
    expect(Math.atan2(v[1], v[2]) / DEG).toBeCloseTo(ELEVATION_DEG, 6)
  })

  it.each([
    ['référence', REFERENCE_ZONE],
    ['portrait', PORTRAIT],
  ] as const)(
    '⛔ zone %s : les bords avant et arrière s’écartent également du centre de l’image (P8-05)',
    (_nom, zone) => {
      const r = { minX: -14, minZ: -15, maxX: 14, maxZ: 7 }
      const cam = frameRect(r, undefined, zone)
      const f = norm(sub(cam.target, cam.position))
      const up = cross(norm(cross(f, [0, 1, 0])), f)
      const rise = (z: number) => {
        const p = sub([0, 0, z], cam.position)
        return dot(p, up) / dot(p, f)
      }
      expect(rise(r.minZ)).toBeCloseTo(-rise(r.maxZ), 9)
    },
  )

  it('rectangle sans profondeur : la visée reste son centre', () => {
    expect(frameRect({ minX: 2, minZ: 5, maxX: 4, maxZ: 5 }).target).toEqual([3, 0, 5])
  })

  it('transmet la section cadrée', () => {
    expect(frameRect({ minX: 0, minZ: 0, maxX: 1, maxZ: 1 }, 'skills').focusNodeId).toBe('skills')
  })

  it('rectangle large ou profond : les coins tiennent toujours', () => {
    for (const r of [
      { minX: -50, minZ: -1, maxX: 50, maxZ: 1 },
      { minX: -1, minZ: -50, maxX: 1, maxZ: 50 },
      { minX: 3, minZ: 4, maxX: 3, maxZ: 4 },
    ]) {
      expect(cornersInFrustum(frameRect(r), r)).toBe(true)
    }
  })

  it('est minimale : les coins remplissent la zone réduite de la marge, 1 % plus près en sort un', () => {
    const r = { minX: -10, minZ: -6, maxX: 10, maxZ: 6 }
    const cam = frameRect(r)
    // ⭐ 1,0001 et non 1 : au recul exact, un coin est SUR le bord, et l'arrondi décide.
    expect(cornersInFrustum(recul(cam, 1.0001), r, sansMarge(REFERENCE_ZONE))).toBe(true)
    expect(cornersInFrustum(recul(cam, 0.99), r, sansMarge(REFERENCE_ZONE))).toBe(false)
  })
})

describe.each([
  ['taille réelle', () => makeRealSizeBoard()],
  ['20 ans, 20 projets, 80 compétences', () => makeLargeBoard()],
])('boardCameras — %s', (_name, make) => {
  let plan: BoardPlan
  beforeAll(() => {
    plan = planBoard(make(), options)
  }, 30_000)

  it('experiences : la frise entière, et rien devant le bord avant de la carte', () => {
    const cam = boardCameras(plan).experiences
    expect(cornersInFrustum(cam, plan.timeline.bounds)).toBe(true)
    expect(nearEdgeZ(cam)).toBeLessThanOrEqual(plan.bounds.maxZ + 1e-9)
  })

  it('experiences : la frise étendue vers −Z, dans la carte', () => {
    const r = viewRects(plan).experiences
    const t = plan.timeline.bounds
    expect(r.minX).toBe(t.minX)
    expect(r.maxX).toBe(t.maxX)
    expect(r.maxZ).toBeGreaterThanOrEqual(t.maxZ)
    expect(r.minZ).toBeLessThan(t.minZ)
    expect(r.minZ).toBeGreaterThanOrEqual(plan.bounds.minZ)
    expect(r.maxZ).toBeLessThanOrEqual(plan.bounds.maxZ)
    // Au format de référence, la bande cadrée a le format de la vue (projetée sous l'élévation).
    const projected = (r.maxZ - r.minZ) * Math.sin(ELEVATION_DEG * DEG)
    expect(projected).toBeLessThanOrEqual((r.maxX - r.minX) / REFERENCE_ASPECT + 1e-9)
  })

  it.each(['accueil', 'experiences', 'projets', 'competences'] as const)(
    '%s : les quatre coins sont dans le tronc de pyramide',
    (view) => {
      const cam = boardCameras(plan)[view]
      expect(cornersInFrustum(cam, rectsOf(plan)[view])).toBe(true)
      expect(cornersInFrustum(cam, viewRects(plan)[view])).toBe(true)
      expect(cam.focusNodeId).toBe(focusOf[view])
    },
  )

  describe('P8-05 — la bande de scène d’un téléphone en portrait', () => {
    it.each(['accueil', 'experiences', 'projets', 'competences'] as const)(
      '%s : les quatre coins tiennent dans la ZONE, pas dans un 16:9',
      (view) => {
        const cam = boardCameras(plan, PORTRAIT)[view]
        expect(cornersInFrustum(cam, rectsOf(plan)[view], PORTRAIT)).toBe(true)
        expect(cornersInFrustum(cam, viewRects(plan, PORTRAIT)[view], PORTRAIT)).toBe(true)
      },
    )

    it('experiences : rien devant le bord avant de la carte, mesuré au bas de la zone', () => {
      const cam = boardCameras(plan, PORTRAIT).experiences
      expect(nearEdgeZ(cam, PORTRAIT)).toBeLessThanOrEqual(plan.bounds.maxZ + 1e-9)
    })

    it('experiences : la frise s’étend plus loin vers −Z que pour le 16:9 — la carte au-dessus', () => {
      expect(viewRects(plan, PORTRAIT).experiences.minZ).toBeLessThan(
        viewRects(plan).experiences.minZ,
      )
    })

    it('accueil : la carte remplit la zone à la marge près, au lieu de garder les marges du 16:9', () => {
      // ⛔ La régression : cadrée pour le 16:9, la carte d'accueil n'occupait que ~65 % de la
      // largeur d'un téléphone. Minimale DANS LA ZONE : 1 % plus près, un coin sort.
      const cam = boardCameras(plan, PORTRAIT).accueil
      const r = plan.bounds
      expect(cornersInFrustum(recul(cam, 1.0001), r, sansMarge(PORTRAIT))).toBe(true)
      expect(cornersInFrustum(recul(cam, 0.99), r, sansMarge(PORTRAIT))).toBe(false)
    })
  })
})

describe('boardCameras — cas limites', () => {
  it('la caméra recule quand le contenu grandit', { timeout: 30_000 }, () => {
    const small = boardCameras(planBoard(makeBoardContent(), options))
    const big = boardCameras(planBoard(makeRealSizeBoard(), options))
    expect(dist(big.accueil)).toBeGreaterThan(dist(small.accueil))
    expect(dist(big.competences)).toBeGreaterThan(dist(small.competences))
  })

  it('une vue sans zone cadre le quartier', () => {
    const plan = planBoard(makeBoardContent({ skills: [] }), options)
    expect(plan.zones).toHaveLength(0)
    const cams = boardCameras(plan)
    expect(cams.competences).toEqual({ ...frameRect(plan.district.bounds, 'skills') })
    expect(cornersInFrustum(cams.competences, plan.district.bounds)).toBe(true)
  })
})
