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
  BoxGeometry,
  type BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  GridHelper,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Line,
  LineLoop,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
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
  helix,
  isoArchitecture,
  particleShell,
} from '@/scene/state/nexus-geometry'

import { pointsGeometry, polylineGeometry, segmentsGeometry } from './buffers'
import { beamMaterial, flowLineMaterial, fresnelMaterial, softPointsMaterial } from './materials'

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

const additiveLines = (color: string, opacity: number) =>
  new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
  })

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

/** Les plaques de la chronologie : du bas (le plus ancien) vers le haut. */
const TIMELINE_PLATES = 6
const PLATE_W = 1.05
const PLATE_H = 0.62

/**
 * Expériences — une chronologie de verre : six plaques translucides, disposées
 * en spirale le long de l'axe du temps, chacune avec son liseré lumineux et
 * quelques traits qui évoquent des lignes de texte. Une hélice parcourue
 * d'impulsions les relie. (Référence « les interfaces » : des panneaux
 * semi-transparents aux bordures fines.)
 *
 * ⛔ Six est un nombre de COMPOSITION, pas le nombre d'expériences : la scène ne
 * lit pas le contenu, et une plaque par poste ferait mentir l'image au premier
 * poste ajouté.
 */
export function buildTimeline(): Built {
  const root = new Group()
  root.rotation.set(0.12, 0, -0.08)
  const spin = new Group()
  root.add(spin)

  const axisMaterial = flowLineMaterial(PALETTE.cyan, PALETTE.violet, 0.3, 0.08)
  root.add(
    new Line(
      polylineGeometry([
        [0, -1.5, 0],
        [0, 1.55, 0],
      ]),
      axisMaterial,
    ),
  )

  const fill = new MeshBasicMaterial({
    color: '#0f2240',
    transparent: true,
    opacity: 0.42,
    side: DoubleSide,
    depthWrite: false,
  })
  const plateGeometry = new PlaneGeometry(PLATE_W, PLATE_H)
  const borderGeometry = new EdgesGeometry(plateGeometry)
  // Trois « lignes de texte » de longueurs différentes, en un seul objet.
  const lines = segmentsGeometry(
    [
      [-0.42, 0.14, 0.001],
      [0.3, 0.14, 0.001],
      [-0.42, 0.02, 0.001],
      [0.12, 0.02, 0.001],
      [-0.42, -0.1, 0.001],
      [0.22, -0.1, 0.001],
    ],
    [
      [0, 1],
      [2, 3],
      [4, 5],
    ],
  )
  const borders = [additiveLines(PALETTE.violet, 0.85), additiveLines(PALETTE.cyan, 0.85)]
  const textLines = additiveLines(PALETTE.text, 0.35)
  for (let i = 0; i < TIMELINE_PLATES; i += 1) {
    const t = i / (TIMELINE_PLATES - 1)
    const angle = t * Math.PI * 2.2
    const plate = new Group()
    plate.position.set(Math.cos(angle) * 0.55, -1.25 + t * 2.5, Math.sin(angle) * 0.55)
    // Chaque plaque regarde vers l'extérieur de la spirale.
    plate.rotation.y = -angle + Math.PI / 2
    plate.add(new Mesh(plateGeometry, fill))
    plate.add(new LineSegments(borderGeometry, borders[i % 2] as LineBasicMaterial))
    plate.add(new LineSegments(lines, textLines))
    spin.add(plate)
  }

  const spiralMaterial = flowLineMaterial(PALETTE.violet, PALETTE.cyan, 0.4, 0.12)
  spin.add(new Line(polylineGeometry(helix(2.2, 2.5, 0.55, 160)), spiralMaterial))

  return {
    root,
    update({ time, delta, animated, highlight }) {
      setTime([axisMaterial, spiralMaterial], time)
      setHighlight([axisMaterial, spiralMaterial], highlight.experiences)
      fill.opacity = 0.36 + 0.2 * highlight.experiences
      for (const border of borders) border.opacity = 0.65 + 0.35 * highlight.experiences
      if (animated) spin.rotation.y += delta * 0.07
    },
    dispose: () => disposeTree(root),
  }
}

/**
 * Projets — une architecture isométrique : des plateaux de verre superposés,
 * des blocs posés dessus comme des composants techniques, et des flux de
 * données qui courent en équerre d'un bloc à l'autre et d'un étage à l'autre.
 * Tous les blocs en un seul draw call.
 */
export function buildArchitecture(density: Density): Built {
  const root = new Group()
  // ⭐ Tourné de 45° : vu de trois quarts, un plateau carré se lit en losange,
  // ce qui donne l'isométrie sans caméra orthographique.
  root.rotation.y = Math.PI / 4
  const { slabs, blocks, links } = isoArchitecture(3, density.projectNodes, 7)

  const slabMaterial = new MeshStandardMaterial({
    color: '#12223d',
    metalness: 0.5,
    roughness: 0.35,
    transparent: true,
    opacity: 0.55,
    emissive: PALETTE.cyan,
    emissiveIntensity: 0.04,
  })
  const slabEdges = new LineBasicMaterial({
    color: PALETTE.cyan,
    transparent: true,
    opacity: 0.7,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  for (const slab of slabs) {
    const geometry = new BoxGeometry(slab.size, 0.06, slab.size)
    const plate = new Mesh(geometry, slabMaterial)
    plate.position.y = slab.y
    root.add(plate)
    const edges = new LineSegments(new EdgesGeometry(geometry), slabEdges)
    edges.position.y = slab.y
    root.add(edges)
  }

  const blockMaterial = new MeshStandardMaterial({
    color: '#16294a',
    metalness: 0.6,
    roughness: 0.3,
    emissive: PALETTE.cyan,
    emissiveIntensity: 0.12,
  })
  const instances = new InstancedMesh(
    new BoxGeometry(0.22, 0.3, 0.22),
    blockMaterial,
    blocks.length,
  )
  const dummy = new Object3D()
  blocks.forEach((block, i) => {
    dummy.position.set(...block)
    dummy.scale.set(1, 0.7 + ((i * 37) % 10) / 15, 1)
    dummy.updateMatrix()
    instances.setMatrixAt(i, dummy.matrix)
    instances.setColorAt(i, new Color(i % 4 === 0 ? PALETTE.violet : '#3f8fa6'))
  })
  root.add(instances)

  const linkMaterial = flowLineMaterial(PALETTE.cyan, PALETTE.violet, 0.8, 0.35)
  const ends = links.flatMap(([a, b]) => [a, b])
  root.add(
    new LineSegments(
      segmentsGeometry(
        ends,
        links.map((_, i) => [i * 2, i * 2 + 1] as const),
      ),
      linkMaterial,
    ),
  )

  return {
    root,
    update({ time, delta, animated, highlight }) {
      setTime([linkMaterial], time)
      setHighlight([linkMaterial], highlight.projects)
      blockMaterial.emissiveIntensity = 0.1 + 0.35 * highlight.projects
      slabEdges.opacity = 0.55 + 0.4 * highlight.projects
      if (animated) root.rotation.y += delta * 0.05
    },
    dispose: () => disposeTree(root),
  }
}

/* ================================================================ plateforme */

/**
 * La plateforme du noyau : trois disques de métal sombre en gradins, chacun
 * cerclé d'une bande lumineuse ; une colonne de lumière qui monte vers le noyau ;
 * et une grille de sol, qui donne l'échelle et s'efface dans le brouillard.
 */
export function buildPlatform(): Built {
  const root = new Group()
  root.position.y = -2.7

  const metal = new MeshStandardMaterial({ color: '#0c1628', metalness: 0.85, roughness: 0.35 })
  const tiers = [
    { radius: 2.8, y: 0 },
    { radius: 2.2, y: 0.09 },
    { radius: 1.5, y: 0.18 },
  ]
  const strips = tiers.map((tier, i) => {
    const disc = new Mesh(new CylinderGeometry(tier.radius, tier.radius * 1.02, 0.09, 72), metal)
    disc.position.y = tier.y
    root.add(disc)
    const strip = additive(i === 1 ? PALETTE.violet : PALETTE.cyan, 0.8)
    const ring = new Mesh(new TorusGeometry(tier.radius * 1.01, 0.012, 6, 160), strip)
    ring.rotation.x = Math.PI / 2
    ring.position.y = tier.y + 0.046
    root.add(ring)
    return strip
  })

  const beam = beamMaterial(PALETTE.cyan, 0.55)
  const column = new Mesh(new CylinderGeometry(0.75, 1.35, 2.6, 48, 1, true), beam)
  column.position.y = 1.5
  root.add(column)

  // ⛔ Axes centraux de la MÊME couleur que la grille : en cyan, l'axe X traçait
  // une ligne d'horizon à travers tout l'écran (quatrième capture).
  const grid = new GridHelper(64, 64, '#1b3a5c', '#1b3a5c')
  const gridMaterial = grid.material as LineBasicMaterial
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.22
  gridMaterial.depthWrite = false
  grid.position.y = -0.05
  root.add(grid)

  return {
    root,
    update({ time }) {
      setTime([beam], time)
      // Les bandes respirent avec le noyau, en léger décalage de l'une à l'autre.
      strips.forEach((strip, i) => {
        strip.opacity = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(time * 0.55 - i * 0.6))
      })
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
  // ⭐ Inclinée vers le visiteur : de profil, l'anneau et le disque de visée
  // s'aplatissaient en traits (cinquième capture, gros plan Compétences).
  root.rotation.set(0.9, 0, 0.18)
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

  /*
   * ⭐ La structure qui fait d'un semis une constellation : un moyeu central
   * relié à chaque domaine par un rayon lumineux, un anneau orbital qui porte
   * les amas, et un disque de visée en dessous — l'organisation se lit avant
   * les points.
   */
  const core = new Mesh(
    new OctahedronGeometry(0.12, 0),
    new MeshBasicMaterial({ color: PALETTE.cyan }),
  )
  root.add(core)
  const spokeMaterial = flowLineMaterial(PALETTE.cyan, PALETTE.violet, 0.35, 0.2)
  root.add(
    new LineSegments(
      segmentsGeometry(
        [[0, 0, 0], ...centers],
        centers.map((_, i) => [0, i + 1] as const),
      ),
      spokeMaterial,
    ),
  )
  const orbit = new Mesh(new TorusGeometry(1.18, 0.006, 6, 160), additive(PALETTE.cyan, 0.45))
  orbit.rotation.x = Math.PI / 2
  root.add(orbit)
  const radar = additiveLines(PALETTE.cyan, 0.18)
  for (const radius of [0.45, 0.8, 1.45]) {
    const ring = new LineLoop(
      polylineGeometry(
        Array.from({ length: 96 }, (_, k) => {
          const angle = (k / 96) * Math.PI * 2
          return [Math.cos(angle) * radius, -0.42, Math.sin(angle) * radius] as Vec3
        }),
      ),
      radar,
    )
    root.add(ring)
  }

  return {
    root,
    update({ time, delta, animated, highlight }) {
      setTime([pointsMaterial, linkMaterial, spokeMaterial], time)
      setHighlight([pointsMaterial, linkMaterial, spokeMaterial], highlight.skills)
      radar.opacity = 0.14 + 0.2 * highlight.skills
      if (animated) core.rotation.y += delta * 0.6
      if (animated) root.rotation.y -= delta * 0.07
    },
    dispose: () => disposeTree(root),
  }
}
