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
  frameRect,
  viewRects,
} from '@/scene/state/board/cameras'
import { type BoardPlan, planBoard } from '@/scene/state/board/plan'
import { type Rect, rectUnion } from '@/scene/state/board/rect'
import { REFERENCE_ASPECT } from '@/scene/state/framing'
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

/** Les quatre coins du rectangle sont-ils dans le tronc de pyramide ? */
function cornersInFrustum(cam: CameraSpec, r: Rect): boolean {
  const f = norm(sub(cam.target, cam.position))
  const right = norm(cross(f, [0, 1, 0]))
  const up = cross(right, f)
  const tanV = Math.tan((cam.fov / 2) * DEG)
  const tanH = tanV * REFERENCE_ASPECT
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

/** Z du bord PROCHE de l'empreinte au sol : le rayon du milieu du bas de l'image (16:9). */
function nearEdgeZ(cam: CameraSpec): number {
  const f = norm(sub(cam.target, cam.position))
  const right = norm(cross(f, [0, 1, 0]))
  const up = cross(right, f)
  const tanV = Math.tan((cam.fov / 2) * DEG)
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
  it('vise le centre, à plat, devant et au-dessus', () => {
    const cam = frameRect({ minX: -4, minZ: -2, maxX: 6, maxZ: 8 })
    expect(cam.target).toEqual([1, 0, 3])
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

  it('est minimale : la marge retirée, un recul de 1 % de moins laisse sortir un coin', () => {
    const r = { minX: -10, minZ: -6, maxX: 10, maxZ: 6 }
    const cam = frameRect(r)
    const scaled = (s: number): CameraSpec => ({
      ...cam,
      position: [
        cam.target[0] + (cam.position[0] - cam.target[0]) * s,
        cam.position[1] * s,
        cam.target[2] + (cam.position[2] - cam.target[2]) * s,
      ],
    })
    expect(cornersInFrustum(scaled(1), r)).toBe(true)
    expect(cornersInFrustum(scaled(1 / FRAME_MARGIN), r)).toBe(true)
    expect(cornersInFrustum(scaled(0.99 / FRAME_MARGIN), r)).toBe(false)
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
