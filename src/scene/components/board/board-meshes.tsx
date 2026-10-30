'use client'

/**
 * Les maillages de la carte mère : la plaque, la sérigraphie, les pistes, le bus, et **un
 * `InstancedMesh` par forme** (`SHAPES`). Tout ce qui se calcule vient du module pur
 * (`board-render/geometry.ts`) ; ce composant ne fait que poser des tampons dans des géométries.
 *
 * ⭐ Les objets sont construits hors de React, comme ceux de NEXUS (`nexus/builders.ts`) : une
 * fonction rend `{ root, update, dispose }` — React monte `root`, avance les uniformes à chaque
 * image, et **rend la mémoire du GPU** au démontage : géométries, matériaux, texture.
 */
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  type Material,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
} from 'three'

import type { BoardFile } from '@/scene/state/board-render/file-format'
import {
  type BoardInstances,
  boardMeshes,
  busRibbons,
  type FixedMesh,
  hexToLinear,
  instances,
  type Ribbons,
  routeTones,
  type Shape,
  traceRibbons,
  traceWidth,
} from '@/scene/state/board-render/geometry'
import { BOARD_DENSITY, type DensityTier, PALETTE } from '@/scene/state/layout'

import {
  type BoardUniforms,
  capacitorMaterial,
  chipBodyMaterial,
  darkBodyMaterial,
  emitterMaterial,
  glowMaterial,
  goldMaterial,
  lidMaterial,
  ribbonMaterial,
  tinMaterial,
} from './board-materials'
import { paintSilkscreen } from './board-silkscreen'

/** Épaisseur de la plaque, et hauteurs des couches posées dessus (pas de combat de profondeur). */
const PLATE_THICKNESS = 0.24
const LAYER = { silkscreen: 0.002, traces: 0.006, bus: 0.008 } as const

/** Ce que la scène transmet à chaque image. */
export interface BoardFrame {
  readonly time: number
  /** Mise en valeur de chaque section, de 0 à 1 (`ambientFrame`) : focus de la route ou survol. */
  readonly highlight: {
    readonly skills: number
    readonly experiences: number
    readonly projects: number
  }
}

export interface BuiltBoard {
  readonly root: Group
  update(frame: BoardFrame): void
  dispose(): void
}

/** Les géométries unitaires des formes, posées à plat sur XZ quand elles le sont. */
function unitGeometry(shape: Shape): BufferGeometry {
  switch (shape) {
    case 'capacitors':
      return new CylinderGeometry(0.5, 0.5, 1, 18)
    case 'leds':
    case 'milestones':
      return new CylinderGeometry(0.5, 0.5, 1, 20)
    case 'vias':
    case 'holes':
      return new RingGeometry(0.28, 0.5, 24).rotateX(-Math.PI / 2)
    case 'glows':
      return new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    default:
      return new BoxGeometry(1, 1, 1)
  }
}

/** Le matériau de chaque forme ; `all` les liste une fois chacun (l'or et l'émetteur sont partagés). */
function shapeMaterials(): { readonly byShape: Record<Shape, Material>; readonly all: Material[] } {
  const gold = goldMaterial()
  const emitter = emitterMaterial()
  const chip = chipBodyMaterial()
  const byShape: Record<Shape, Material> = {
    chips: chip,
    chipPins: gold,
    leds: emitter,
    processors: darkBodyMaterial('#151A26', 0.5),
    lids: lidMaterial(),
    processorPins: gold,
    resistors: darkBodyMaterial('#1A1C22'),
    capacitors: capacitorMaterial(),
    terminals: tinMaterial(),
    pads: gold,
    vias: gold,
    holes: gold,
    milestones: emitter,
    glows: glowMaterial(),
  }
  return { byShape, all: [...new Set(Object.values(byShape))] }
}

/** Un tampon de rubans en géométrie, avec les attributs que lit `ribbonMaterial`. */
function ribbonGeometry(
  ribbons: Ribbons,
  colors: Float32Array,
  idle?: Float32Array,
): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(ribbons.positions, 3))
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3))
  geometry.setAttribute('aAcross', new BufferAttribute(ribbons.across, 1))
  geometry.setAttribute('aAlong', new BufferAttribute(ribbons.along, 1))
  geometry.setAttribute(
    'aIdle',
    new BufferAttribute(idle ?? new Float32Array(ribbons.across.length), 1),
  )
  geometry.setIndex(new BufferAttribute(ribbons.indices, 1))
  geometry.computeBoundingSphere()
  return geometry
}

/** Une couleur par sommet, lue dans une table par élément (`index` = route ou tronçon, −1 = rien). */
function expandColors(
  index: Float32Array,
  table: readonly (readonly number[])[],
  fallback: readonly number[],
): Float32Array {
  const out = new Float32Array(index.length * 3)
  index.forEach((i, v) => out.set(table[i] ?? fallback, v * 3))
  return out
}

function instancedMesh(
  geometry: BufferGeometry,
  material: Material,
  set: BoardInstances[Shape],
): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, set.count)
  mesh.instanceMatrix = new InstancedBufferAttribute(set.matrices, 16)
  if (set.colors !== null) mesh.instanceColor = new InstancedBufferAttribute(set.colors, 3)
  // ⭐ Les boîtes englobantes viennent des instances : sans elles, la sélection et l'élagage
  // raisonneraient sur la géométrie unité, posée à l'origine.
  mesh.computeBoundingBox()
  mesh.computeBoundingSphere()
  return mesh
}

export function buildBoard(file: BoardFile, tier: DensityTier, anisotropy: number): BuiltBoard {
  const { plan } = file
  const root = new Group()
  const geometries: BufferGeometry[] = []
  const b = plan.bounds
  const width = b.maxX - b.minX
  const depth = b.maxZ - b.minZ
  const cx = (b.minX + b.maxX) / 2
  const cz = (b.minZ + b.maxZ) / 2

  // La plaque : époxy sombre, son dessus en y = 0.
  const plateGeometry = new BoxGeometry(width, PLATE_THICKNESS, depth)
  const plateMaterial = darkBodyMaterial('#0B1626', 0.62)
  const plate = new Mesh(plateGeometry, plateMaterial)
  plate.position.set(cx, -PLATE_THICKNESS / 2, cz)
  geometries.push(plateGeometry)

  // La sérigraphie : une texture pour toute la carte.
  const passives = Math.min(plan.passives.length, BOARD_DENSITY[tier].passives)
  const texture = paintSilkscreen(file, tier, passives, anisotropy)
  const silkGeometry = new PlaneGeometry(width, depth).rotateX(-Math.PI / 2)
  const silkMaterial = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  const silkscreen = new Mesh(silkGeometry, silkMaterial)
  silkscreen.position.set(cx, LAYER.silkscreen, cz)
  geometries.push(silkGeometry)

  // Les pistes : une géométrie, une teinte par route.
  const tones = routeTones(plan).map((tone) => hexToLinear(PALETTE[tone]))
  const traces = traceRibbons(plan.traces.routes, traceWidth)
  const traceGeometry = ribbonGeometry(traces, expandColors(traces.routeIndex, tones, [1, 1, 1]))
  const traceMaterial = ribbonMaterial({ core: 0.36, halo: 0.28, idleColor: '#3A4658' })
  traceMaterial.uniforms.uIntensity.value = 0.75
  const traceMesh = new Mesh(traceGeometry, traceMaterial)
  traceMesh.position.y = LAYER.traces
  geometries.push(traceGeometry)

  // Le bus : une géométrie, une teinte par tronçon, les années éteintes en gris.
  const segmentTones = plan.timeline.segments.map((s) => hexToLinear(PALETTE[s.tone]))
  const bus = busRibbons(plan.timeline)
  const busGeometry = ribbonGeometry(
    bus,
    expandColors(bus.segmentIndex, segmentTones, [0, 0, 0]),
    bus.idle,
  )
  const busMaterial = ribbonMaterial({ core: 0.44, halo: 0.2, idleColor: '#55647A' })
  const busMesh = new Mesh(busGeometry, busMaterial)
  busMesh.position.y = LAYER.bus
  geometries.push(busGeometry)

  // ⭐ Monté dans l'ordre de `boardMeshes`, la liste même que compte `drawCallBudget`.
  const fixed: Record<FixedMesh, Mesh> = {
    plate,
    silkscreen,
    traces: traceMesh,
    bus: busMesh,
  }
  const sets = instances(plan, tier)
  const materials = shapeMaterials()
  const meshes: InstancedMesh[] = []
  for (const name of boardMeshes(sets)) {
    if (name in fixed) {
      fixed[name as FixedMesh].name = name
      root.add(fixed[name as FixedMesh])
      continue
    }
    const shape = name as Shape
    const geometry = unitGeometry(shape)
    geometries.push(geometry)
    const mesh = instancedMesh(geometry, materials.byShape[shape], sets[shape])
    mesh.name = shape
    meshes.push(mesh)
    root.add(mesh)
  }

  const chip = materials.byShape.chips as ReturnType<typeof chipBodyMaterial>
  const lid = materials.byShape.lids as ReturnType<typeof lidMaterial>
  const animated: BoardUniforms[] = [
    traceMaterial.uniforms,
    busMaterial.uniforms,
    (materials.byShape.glows as ReturnType<typeof glowMaterial>).uniforms,
  ]

  return {
    root,
    update({ time, highlight }) {
      for (const uniforms of animated) uniforms.uTime.value = time
      busMaterial.uniforms.uIntensity.value = 0.95 + 0.35 * highlight.experiences
      traceMaterial.uniforms.uIntensity.value = 0.75 + 0.2 * highlight.projects
      chip.userData.rim.value = 0.85 + 0.6 * highlight.skills
      lid.userData.glow.value = 0.8 + 1.2 * highlight.projects
    },
    dispose() {
      // ⭐ `InstancedMesh.dispose` rend les tampons d'instances ; la géométrie ne les porte pas.
      for (const mesh of meshes) mesh.dispose()
      for (const geometry of geometries) geometry.dispose()
      for (const material of [
        plateMaterial,
        silkMaterial,
        traceMaterial,
        busMaterial,
        ...materials.all,
      ])
        material.dispose()
      texture.dispose()
    },
  }
}

/** Monte la carte construite ; la reconstruit si le plan, le palier ou l'anisotropie changent. */
export function useBoard(file: BoardFile, tier: DensityTier): BuiltBoard {
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
  const built = useMemo(
    () => buildBoard(file, tier, Math.min(8, anisotropy)),
    [file, tier, anisotropy],
  )
  useEffect(() => () => built.dispose(), [built])
  return built
}

/** La carte construite, posée dans la scène. */
export function BoardMeshes({ built }: { readonly built: BuiltBoard }) {
  return <primitive object={built.root} />
}
