/**
 * Les objets de NEXUS, construits en three **hors de React**.
 *
 * ⭐⭐ **Pourquoi des constructeurs et non des composants qui mutent.** Une scène
 * animée modifie ses objets à chaque image — uniformes, rotations, intensités.
 * Le compilateur React refuse, à raison dans le cas général, qu'une valeur
 * rendue par un hook soit modifiée après le rendu. Ici, ces objets ne sont pas
 * de l'état React : ce sont des objets impératifs dont la mutation **est** l'API
 * (même raisonnement que `get()` pour la caméra en P5-06). Les isoler dans des
 * fonctions qui rendent `{ root, update, dispose }` le dit exactement : React
 * monte `root`, appelle `update` à chaque image, `dispose` au démontage.
 *
 * ⭐ `dispose` n'est pas décoratif : géométries, matériaux et textures vivent
 * dans la mémoire du GPU, et un démontage qui ne les rend pas les y laisse.
 */
import {
  AdditiveBlending,
  type BufferGeometry,
  CanvasTexture,
  Color,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  Points,
  type ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
} from 'three'

import { SECTIONS, type Section } from '@/routing/sections'
import { CORE_RADIUS, type Density, PALETTE, UNIVERSES, type Vec3 } from '@/scene/state/layout'
import {
  arc,
  constellation,
  fibonacciSphere,
  helix,
  nearestEdges,
  particleShell,
} from '@/scene/state/nexus-geometry'

import { pointsGeometry, polylineGeometry, segmentsGeometry } from './buffers'
import { flowLineMaterial, fresnelMaterial, softPointsMaterial } from './materials'

/** Ce qu'une image transmet à chaque objet. */
export interface Frame {
  /** L'heure des shaders — figée sous `prefers-reduced-motion`. */
  readonly time: number
  readonly delta: number
  readonly animated: boolean
  /** La mise en valeur de chaque univers, de 0 à 1, déjà adoucie. */
  readonly highlight: Readonly<Record<Section, number>>
}

export interface Built {
  readonly root: Object3D
  update(frame: Frame): void
  dispose(): void
}

const DEG = Math.PI / 180

/** Rend géométries, matériaux et textures d'un sous-arbre. */
function disposeTree(root: Object3D): void {
  root.traverse((node) => {
    const holder = node as Object3D & {
      geometry?: BufferGeometry
      material?: Material | Material[]
    }
    holder.geometry?.dispose()
    const materials = Array.isArray(holder.material) ? holder.material : [holder.material]
    for (const material of materials) {
      if (!material) continue
      const map = (material as Material & { map?: { dispose(): void } | null }).map
      map?.dispose()
      material.dispose()
    }
  })
}

function setTime(materials: readonly ShaderMaterial[], time: number): void {
  for (const material of materials) {
    const uniform = material.uniforms['uTime']
    if (uniform) uniform.value = time
  }
}

function setHighlight(materials: readonly ShaderMaterial[], value: number): void {
  for (const material of materials) {
    const uniform = material.uniforms['uHighlight']
    if (uniform) uniform.value = value
  }
}

const additive = (color: string, opacity: number) =>
  new MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
  })

/* ===================================================================== noyau */

/** Un dégradé radial peint une fois dans un canvas 2D : la texture du halo. */
function haloTexture(): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context !== null) {
    const half = size / 2
    const gradient = context.createRadialGradient(half, half, 0, half, half, half)
    gradient.addColorStop(0, 'rgba(120, 236, 255, 0.55)')
    gradient.addColorStop(0.25, 'rgba(40, 217, 245, 0.2)')
    gradient.addColorStop(0.6, 'rgba(137, 115, 245, 0.06)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }
  return new CanvasTexture(canvas)
}

/** Les anneaux : rayon, épaisseur, inclinaison (degrés), vitesse (rad/s), teinte. */
const RINGS = [
  { radius: 2.15, tube: 0.007, tilt: [72, 0, 18], speed: 0.05, tone: PALETTE.cyan },
  { radius: 2.7, tube: 0.009, tilt: [96, 24, -12], speed: -0.035, tone: PALETTE.violet },
  { radius: 3.25, tube: 0.006, tilt: [58, -32, 40], speed: 0.025, tone: PALETTE.cyan },
  { radius: 3.9, tube: 0.005, tilt: [84, 48, -6], speed: -0.018, tone: PALETTE.violet },
] as const

/**
 * Le noyau, de l'intérieur vers l'extérieur : un cœur émissif ; un polyèdre
 * facetté de métal sombre, qui porte la silhouette ; une structure filaire ; des
 * coques de Fresnel ; un halo ; quatre anneaux orbitaux portant chacun une perle.
 */
export function buildCore(density: Density): Built {
  const root = new Group()

  /*
   * ⛔ Opaque, et c'est une correction : translucide, il laissait voir un cœur
   * cyan uniforme, et le polyèdre se lisait comme un aplat turquoise sur la
   * première capture. Opaque et métallique, chaque facette prend SA lumière —
   * c'est la silhouette taillée qui fait le noyau.
   */
  const facetsMaterial = new MeshStandardMaterial({
    color: '#0d1830',
    metalness: 0.85,
    roughness: 0.3,
    flatShading: true,
    emissive: PALETTE.cyan,
    emissiveIntensity: 0.06,
  })
  const facets = new Mesh(new IcosahedronGeometry(CORE_RADIUS, 1), facetsMaterial)
  root.add(facets)

  const frame = new LineSegments(
    new EdgesGeometry(new IcosahedronGeometry(CORE_RADIUS * 1.42, 1)),
    new LineBasicMaterial({
      color: PALETTE.cyan,
      transparent: true,
      opacity: 0.32,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  )
  root.add(frame)

  const shells = [
    { radius: 1.75, detail: 3, material: fresnelMaterial(PALETTE.cyan, 0.9, 2.6) },
    { radius: 2.35, detail: 2, material: fresnelMaterial(PALETTE.violet, 0.55, 3.2) },
  ].slice(0, density.shells)
  for (const shell of shells) {
    root.add(
      new Mesh(new IcosahedronGeometry(CORE_RADIUS * shell.radius, shell.detail), shell.material),
    )
  }
  const shellMaterials = shells.map((shell) => shell.material)

  const haloMaterial = new SpriteMaterial({
    map: haloTexture(),
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  })
  const halo = new Sprite(haloMaterial)
  halo.scale.set(7.5, 7.5, 1)
  root.add(halo)

  const bead = new SphereGeometry(0.05, 12, 8)
  const beadMaterial = new MeshBasicMaterial({ color: PALETTE.text })
  const spinners = RINGS.map((ring) => {
    const tilt = new Group()
    tilt.rotation.set(ring.tilt[0] * DEG, ring.tilt[1] * DEG, ring.tilt[2] * DEG)
    const spinner = new Group()
    spinner.add(
      new Mesh(new TorusGeometry(ring.radius, ring.tube, 6, 160), additive(ring.tone, 0.55)),
    )
    const pearl = new Mesh(bead, beadMaterial)
    pearl.position.set(ring.radius, 0, 0)
    spinner.add(pearl)
    tilt.add(spinner)
    root.add(tilt)
    return spinner
  })

  return {
    root,
    update({ time, delta, animated }) {
      // ⭐ Pulsation à ~0,09 Hz : une respiration, pas un clignotement.
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.55)
      facetsMaterial.emissiveIntensity = 0.04 + 0.12 * pulse
      haloMaterial.opacity = 0.75 + 0.25 * pulse
      setTime(shellMaterials, time)
      if (!animated) return
      facets.rotation.y += delta * 0.06
      frame.rotation.y -= delta * 0.035
      frame.rotation.x += delta * 0.012
      spinners.forEach((spinner, i) => {
        spinner.rotation.z += delta * (RINGS[i]?.speed ?? 0)
      })
    },
    dispose: () => disposeTree(root),
  }
}

/* ================================================================== ambiance */

/** Les particules : une galaxie aplatie autour de tout, dérivant à peine. */
export function buildParticles(density: Density, pixelRatio: number): Built {
  const { positions, phases } = particleShell(density.particles, 4.5, 24, 3)
  const material = softPointsMaterial(PALETTE.cyan, PALETTE.violet, 26, pixelRatio)
  const points = new Points(pointsGeometry(positions, phases), material)
  const root = new Group()
  root.add(points)

  return {
    root,
    update({ time, delta, animated }) {
      setTime([material], time)
      // ⭐ ~1° toutes les 9 s : une dérive, pas une rotation.
      if (animated) root.rotation.y += delta * 0.002
    },
    dispose: () => disposeTree(root),
  }
}

/**
 * Les connexions du noyau vers chaque univers : des **arcs** soulevés — trois
 * traits droits issus d'un centre se lisent comme un schéma, trois courbes comme
 * des flux.
 */
export function buildConnections(): Built {
  const root = new Group()
  const byUniverse = SECTIONS.map((section, i) => {
    const to = UNIVERSES[section].position
    const length = Math.hypot(...to)
    // Départ à la surface des coques : le trait naît du noyau, pas de son centre.
    const scale = (CORE_RADIUS * 2.3) / length
    const from: Vec3 = [to[0] * scale, to[1] * scale, to[2] * scale]
    const material = flowLineMaterial(PALETTE.cyan, PALETTE.violet, 0.28, 0.16 + i * 0.03)
    root.add(new Line(polylineGeometry(arc(from, to, 1.1, 64)), material))
    return { section, material }
  })

  return {
    root,
    update({ time, highlight }) {
      for (const { section, material } of byUniverse) {
        setTime([material], time)
        setHighlight([material], highlight[section])
      }
    },
    dispose: () => disposeTree(root),
  }
}

/* =================================================================== univers */

const TIMELINE_RINGS = [
  { y: -0.95, radius: 1.05 },
  { y: -0.45, radius: 0.92 },
  { y: 0.05, radius: 0.78 },
  { y: 0.55, radius: 0.62 },
  { y: 1.0, radius: 0.45 },
] as const

/**
 * Expériences — une chronologie orbitale : des anneaux empilés le long d'un axe,
 * du plus large au plus serré, reliés par une hélice parcourue d'impulsions.
 */
export function buildTimeline(): Built {
  const root = new Group()
  root.rotation.set(0.18, 0, -0.12)
  const spin = new Group()
  root.add(spin)

  const axisMaterial = flowLineMaterial(PALETTE.cyan, PALETTE.violet, 0.25, 0.08)
  root.add(
    new Line(
      polylineGeometry([
        [0, -1.35, 0],
        [0, 1.4, 0],
      ]),
      axisMaterial,
    ),
  )

  const ringMaterial = additive(PALETTE.violet, 0.7)
  const bead = new SphereGeometry(0.06, 12, 8)
  const beadMaterial = new MeshBasicMaterial({ color: PALETTE.text })
  TIMELINE_RINGS.forEach((ring, i) => {
    const holder = new Group()
    holder.position.y = ring.y
    holder.rotation.x = Math.PI / 2 + 0.08 * i
    holder.add(new Mesh(new TorusGeometry(ring.radius, 0.012, 6, 120), ringMaterial))
    const pearl = new Mesh(bead, beadMaterial)
    pearl.position.set(Math.cos(i * 1.3) * ring.radius, Math.sin(i * 1.3) * ring.radius, 0)
    holder.add(pearl)
    spin.add(holder)
  })

  const spiralMaterial = flowLineMaterial(PALETTE.violet, PALETTE.cyan, 0.35, 0.12)
  spin.add(new Line(polylineGeometry(helix(3.2, 2.1, 0.5, 160)), spiralMaterial))

  return {
    root,
    update({ time, delta, animated, highlight }) {
      setTime([axisMaterial, spiralMaterial], time)
      setHighlight([axisMaterial, spiralMaterial], highlight.experiences)
      ringMaterial.opacity = 0.55 + 0.35 * highlight.experiences
      if (animated) spin.rotation.y += delta * 0.09
    },
    dispose: () => disposeTree(root),
  }
}

/**
 * Projets — un réseau : des nœuds sur une sphère, reliés à leurs trois plus
 * proches voisins, parcourus d'impulsions. Tous les nœuds en un seul draw call.
 */
export function buildNetwork(density: Density): Built {
  const root = new Group()
  const nodes = fibonacciSphere(density.projectNodes, 1.15, 0.22, 7)

  const nodeMaterial = new MeshStandardMaterial({
    color: '#16294a',
    emissive: PALETTE.cyan,
    emissiveIntensity: 0.3,
    metalness: 0.6,
    roughness: 0.3,
    flatShading: true,
  })
  const instances = new InstancedMesh(new OctahedronGeometry(0.11, 0), nodeMaterial, nodes.length)
  const dummy = new Object3D()
  nodes.forEach((node, i) => {
    dummy.position.set(...node)
    dummy.rotation.set(i * 0.7, i * 1.1, 0)
    dummy.scale.setScalar(i === 0 ? 1.9 : 0.8 + ((i * 37) % 10) / 20)
    dummy.updateMatrix()
    instances.setMatrixAt(i, dummy.matrix)
    instances.setColorAt(i, new Color(i % 4 === 0 ? PALETTE.violet : '#8fdcec'))
  })
  root.add(instances)

  const edgeMaterial = flowLineMaterial(PALETTE.cyan, PALETTE.violet, 0.4, 0.22)
  root.add(new LineSegments(segmentsGeometry(nodes, nearestEdges(nodes, 3)), edgeMaterial))

  return {
    root,
    update({ time, delta, animated, highlight }) {
      setTime([edgeMaterial], time)
      setHighlight([edgeMaterial], highlight.projects)
      nodeMaterial.emissiveIntensity = 0.25 + 0.45 * highlight.projects
      if (animated) {
        root.rotation.y += delta * 0.06
        root.rotation.x += delta * 0.015
      }
    },
    dispose: () => disposeTree(root),
  }
}

const SKILL_DOMAINS = 5

/**
 * Compétences — une constellation : un amas de points par domaine, des moyeux
 * reliés en anneau, le tout scintillant lentement.
 */
export function buildConstellation(density: Density): Built {
  const root = new Group()
  root.rotation.set(0.35, 0, 0.1)
  const { points, centers } = constellation(SKILL_DOMAINS, density.skillPointsPerCluster, 11)

  // ⭐ Des points plus gros que les particules d’ambiance : la constellation se lit
  // comme une matière, pas comme un semis (troisième capture).
  const pointsMaterial = softPointsMaterial(PALETTE.cyan, PALETTE.violet, 120, 1)
  root.add(
    new Points(
      pointsGeometry(
        new Float32Array(points.flat()),
        new Float32Array(points.map((_, i) => (i * 2.399) % (Math.PI * 2))),
      ),
      pointsMaterial,
    ),
  )

  const linkMaterial = flowLineMaterial(PALETTE.cyan, PALETTE.violet, 0.3, 0.15)
  root.add(
    new LineSegments(
      segmentsGeometry(
        centers,
        centers.map((_, i) => [i, (i + 1) % centers.length] as const),
      ),
      linkMaterial,
    ),
  )

  const hub = new SphereGeometry(0.05, 12, 8)
  const hubMaterial = new MeshBasicMaterial({ color: PALETTE.text })
  for (const center of centers) {
    const mesh = new Mesh(hub, hubMaterial)
    mesh.position.set(...center)
    root.add(mesh)
  }

  return {
    root,
    update({ time, delta, animated, highlight }) {
      setTime([pointsMaterial, linkMaterial], time)
      setHighlight([pointsMaterial, linkMaterial], highlight.skills)
      if (animated) root.rotation.y -= delta * 0.07
    },
    dispose: () => disposeTree(root),
  }
}
