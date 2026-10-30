'use client'

/**
 * Les maillages de la carte mère : la plaque, la sérigraphie, les pistes, le bus, et **un
 * `InstancedMesh` par forme** (`SHAPES`). Tout ce qui se calcule vient du module pur
 * (`board-render/geometry.ts`) ; ce composant ne fait que poser des tampons dans des géométries.
 *
 * ⭐ Les objets sont construits hors de React, comme l'étaient ceux de NEXUS (D11) : une
 * fonction rend `{ root, update, dispose }` — React monte `root`, avance les uniformes à chaque
 * image, et **rend la mémoire du GPU** au démontage : géométries, matériaux, texture.
 */
import { type ThreeElements, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
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
import { type PulsePath, pulseFrame, pulsePaths } from '@/scene/state/board-render/pulses'
import {
  instanceLevels,
  LIT_SHAPES,
  type LitShape,
  litSegments,
  PICKABLE_MESHES,
  type Relations,
  ribbonLevels,
} from '@/scene/state/board-render/relations'

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
const LAYER = { silkscreen: 0.002, traces: 0.006, bus: 0.008, pulses: 0.03 } as const

/** Rayon d'une impulsion (un point lumineux) et sa teinte, froide et claire. */
const PULSE_RADIUS = 0.1
const PULSE_COLOR = '#BFE0FF'

/**
 * Les impulsions : un `InstancedMesh` de disques à plat. Seules les colonnes de translation
 * (x, z) de chaque matrice changent ; l'échelle est posée une fois. `place` écrit dans le tampon
 * de l'instance, sans allocation par image.
 */
function pulseMesh(
  paths: readonly PulsePath[],
  count: number,
): {
  mesh: InstancedMesh
  geometry: BufferGeometry
  material: MeshBasicMaterial
  place(t: number): void
} {
  const geometry = new CircleGeometry(PULSE_RADIUS, 16).rotateX(-Math.PI / 2)
  const material = new MeshBasicMaterial({
    color: PULSE_COLOR,
    toneMapped: false,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  const mesh = new InstancedMesh(geometry, material, count)
  const matrices = mesh.instanceMatrix.array as Float32Array
  for (let i = 0; i < count; i++) {
    matrices[i * 16] = 1
    matrices[i * 16 + 5] = 1
    matrices[i * 16 + 10] = 1
    matrices[i * 16 + 15] = 1
  }
  mesh.position.y = LAYER.pulses
  // Les instances bougent à chaque image : la sphère englobante initiale ne vaut rien.
  mesh.frustumCulled = false
  const scratch = new Float32Array(count * 2)
  return {
    mesh,
    geometry,
    material,
    place(t) {
      pulseFrame(paths, count, t, scratch)
      for (let i = 0; i < count; i++) {
        matrices[i * 16 + 12] = scratch[i * 2]!
        matrices[i * 16 + 14] = scratch[i * 2 + 1]!
      }
      mesh.instanceMatrix.needsUpdate = true
    },
  }
}

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
  /**
   * L'état de survol (P8-15f) : allume ce que `relations` désigne et atténue le reste ; `null`
   * rend tout au neutre. ⭐ Écrit dans des attributs (`aLevel` des rubans, `instanceColor` des
   * formes), jamais par un matériau de plus.
   */
  highlight(relations: Relations | null): void
  dispose(): void
}

const noRaycast = (): void => {}

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
  level: Float32Array,
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
  geometry.setAttribute('aLevel', new BufferAttribute(level, 1))
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
  lit: boolean,
): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, set.count)
  mesh.instanceMatrix = new InstancedBufferAttribute(set.matrices, 16)
  /*
   * ⭐ Une forme qui porte un niveau de survol a TOUJOURS une teinte d'instance, blanche à défaut :
   * le programme se compile avec elle dès la première image, et le survol n'a qu'à l'écrire.
   */
  const colors = set.colors ?? (lit ? new Float32Array(set.count * 3).fill(1) : null)
  if (colors !== null) mesh.instanceColor = new InstancedBufferAttribute(colors.slice(), 3)
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
  const traceLevel = new Float32Array(traces.routeIndex.length).fill(1)
  const traceGeometry = ribbonGeometry(
    traces,
    expandColors(traces.routeIndex, tones, [1, 1, 1]),
    traceLevel,
  )
  const traceMaterial = ribbonMaterial({ core: 0.36, halo: 0.28, idleColor: '#3A4658' })
  traceMaterial.uniforms.uIntensity.value = 0.75
  const traceMesh = new Mesh(traceGeometry, traceMaterial)
  traceMesh.position.y = LAYER.traces
  geometries.push(traceGeometry)

  // Le bus : une géométrie, une teinte par tronçon, les années éteintes en gris.
  const segmentTones = plan.timeline.segments.map((s) => hexToLinear(PALETTE[s.tone]))
  const bus = busRibbons(plan.timeline)
  const busLevel = new Float32Array(bus.segmentIndex.length).fill(1)
  const busGeometry = ribbonGeometry(
    bus,
    expandColors(bus.segmentIndex, segmentTones, [0, 0, 0]),
    busLevel,
    bus.idle,
  )
  const busMaterial = ribbonMaterial({ core: 0.44, halo: 0.2, idleColor: '#55647A' })
  const busMesh = new Mesh(busGeometry, busMaterial)
  busMesh.position.y = LAYER.bus
  geometries.push(busGeometry)

  // Les impulsions : le bus dans le sens du temps, les liaisons vers les processeurs.
  const paths = pulsePaths(file)
  const pulses = pulseMesh(paths, paths.length === 0 ? 0 : BOARD_DENSITY[tier].pulses)
  geometries.push(pulses.geometry)
  pulses.place(0)

  // ⭐ Monté dans l'ordre de `boardMeshes`, la liste même que compte `drawCallBudget`.
  const fixed: Record<FixedMesh, Mesh> = {
    plate,
    silkscreen,
    traces: traceMesh,
    bus: busMesh,
    pulses: pulses.mesh,
  }
  const sets = instances(plan, tier)
  const materials = shapeMaterials()
  const meshes: InstancedMesh[] = []
  const litMeshes: { shape: LitShape; mesh: InstancedMesh; base: Float32Array }[] = []
  for (const name of boardMeshes(sets)) {
    let object: Mesh
    if (name in fixed) {
      object = fixed[name as FixedMesh]
    } else {
      const shape = name as Shape
      const geometry = unitGeometry(shape)
      geometries.push(geometry)
      const lit = (LIT_SHAPES as readonly string[]).includes(shape)
      const mesh = instancedMesh(geometry, materials.byShape[shape], sets[shape], lit)
      meshes.push(mesh)
      if (lit && mesh.instanceColor !== null) {
        const base = (mesh.instanceColor.array as Float32Array).slice()
        litMeshes.push({ shape: shape as LitShape, mesh, base })
      }
      object = mesh
    }
    object.name = name
    if (!PICKABLE_MESHES.has(name)) object.raycast = noRaycast
    root.add(object)
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
      pulses.place(time)
    },
    highlight(relations) {
      ribbonLevels(traces.routeIndex, relations?.routes ?? null, traceLevel)
      traceGeometry.getAttribute('aLevel').needsUpdate = true
      ribbonLevels(
        bus.segmentIndex,
        relations === null ? null : litSegments(plan, relations),
        busLevel,
      )
      busGeometry.getAttribute('aLevel').needsUpdate = true
      const levels = instanceLevels(plan, relations)
      for (const { shape, mesh, base } of litMeshes) {
        const colors = mesh.instanceColor!.array as Float32Array
        const level = levels[shape]
        for (let i = 0; i < level.length; i++) {
          for (let c = 0; c < 3; c++) colors[i * 3 + c] = base[i * 3 + c]! * level[i]!
        }
        mesh.instanceColor!.needsUpdate = true
      }
    },
    dispose() {
      // ⭐ `InstancedMesh.dispose` rend les tampons d'instances ; la géométrie ne les porte pas.
      for (const mesh of meshes) mesh.dispose()
      pulses.mesh.dispose()
      for (const geometry of geometries) geometry.dispose()
      for (const material of [
        plateMaterial,
        silkMaterial,
        traceMaterial,
        busMaterial,
        pulses.material,
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

/** La carte construite, posée dans la scène, avec les gestionnaires de pointeur de `BoardScene`. */
export function BoardMeshes({
  built,
  ...handlers
}: { readonly built: BuiltBoard } & Pick<
  ThreeElements['group'],
  'onPointerDown' | 'onPointerMove' | 'onPointerOut' | 'onClick' | 'onPointerMissed'
>) {
  return <primitive object={built.root} {...handlers} />
}
