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
  CircleGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  EdgesGeometry,
  GridHelper,
  Group,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  OctahedronGeometry,
  Points,
  type ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  WireframeGeometry,
} from 'three'

import { SECTIONS, type Section } from '@/routing/sections'
import {
  CORE_RADIUS,
  type Density,
  HOVER_SCALE,
  PALETTE,
  UNIVERSES,
  type Vec3,
} from '@/scene/state/layout'
import { arc, particleShell, plateStack, polylineLength } from '@/scene/state/nexus-geometry'

import { pointsGeometry, polylineGeometry } from './buffers'
import {
  beamMaterial,
  dashedBeamMaterial,
  flowLineMaterial,
  fresnelMaterial,
  softPointsMaterial,
} from './materials'

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
function radialTexture(stops: readonly (readonly [number, string])[]): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context !== null) {
    const half = size / 2
    const gradient = context.createRadialGradient(half, half, 0, half, half, half)
    for (const [offset, color] of stops) gradient.addColorStop(offset, color)
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }
  return new CanvasTexture(canvas)
}

const haloTexture = (): CanvasTexture =>
  radialTexture([
    [0, 'rgba(120, 236, 255, 0.55)'],
    [0.25, 'rgba(40, 217, 245, 0.2)'],
    [0.6, 'rgba(137, 115, 245, 0.06)'],
    [1, 'rgba(0, 0, 0, 0)'],
  ])

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
 * Les faisceaux du noyau vers chaque univers : des **arcs** soulevés — trois
 * traits droits issus d'un centre se lisent comme un schéma, trois courbes comme
 * des flux —, en **pointillés** qui courent vers l'univers, chacun dans sa teinte.
 */
export function buildConnections(): Built {
  const root = new Group()
  const byUniverse = SECTIONS.map((section) => {
    const to = UNIVERSES[section].position
    const length = Math.hypot(...to)
    // Le trait naît à la surface des coques et s'arrête au voile de l'univers —
    // au voile agrandi par le survol : il relie deux objets, il ne traverse ni
    // l'un ni l'autre, même quand l'univers grandit.
    const from = scaled(to, (CORE_RADIUS * 2.3) / length)
    const end = scaled(to, (length - VEIL_RADIUS * HOVER_SCALE) / length)
    const points = arc(from, end, 1.1, 96)
    const material = dashedBeamMaterial(tone(section), 0.9, polylineLength(points))
    root.add(new Line(polylineGeometry(points), material))
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

/**
 * Le rayon du voile filaire qui enveloppe chaque univers, sous sa sphère de
 * sélection. ⛔ Tout emblème tient dedans : c'est la borne où s'arrêtent les
 * faisceaux.
 */
const VEIL_RADIUS = 1.6

const tone = (section: Section): string => PALETTE[UNIVERSES[section].tone]

const scaled = (point: Vec3, factor: number): Vec3 => [
  point[0] * factor,
  point[1] * factor,
  point[2] * factor,
]

/**
 * Le voile d'un univers : une sphère filaire à peine visible, qui s'éclaire quand
 * l'univers est survolé ou cadré — elle dit où cliquer sans rien écrire.
 */
function buildVeil(color: string): {
  readonly object: LineSegments
  readonly material: LineBasicMaterial
} {
  const sphere = new SphereGeometry(VEIL_RADIUS, 18, 12)
  const material = additiveLines(color, 0.05)
  const object = new LineSegments(new WireframeGeometry(sphere), material)
  // ⭐ La sphère n'a servi qu'à tracer le fil : elle est rendue tout de suite.
  sphere.dispose()
  return { object, material }
}

/** Un léger flottement vertical, propre à chaque univers. */
const bob = (time: number, speed: number, phase: number): number =>
  Math.sin(time * speed + phase) * 0.12

/**
 * Expériences — une pile de plateaux de verre, du plus large au plus étroit :
 * une architecture en couches, chaque couche cerclée de lumière et traversée par
 * un axe parcouru d'impulsions.
 *
 * ⛔ Trois est un nombre de COMPOSITION, pas le nombre d'expériences : la scène
 * ne lit pas le contenu, et une plaque par poste ferait mentir l'image au premier
 * poste ajouté.
 */
export function buildStack(): Built {
  const color = tone('experiences')
  const root = new Group()
  root.rotation.set(0.1, 0, -0.06)
  const spin = new Group()
  root.add(spin)

  const glass = new MeshStandardMaterial({
    color: '#0f2240',
    metalness: 0.4,
    roughness: 0.3,
    transparent: true,
    opacity: 0.45,
    emissive: color,
    emissiveIntensity: 0.05,
    depthWrite: false,
  })
  const edges = additiveLines(color, 0.75)
  const plates = plateStack(3, 1.8, 0.35, 0.75).map((level, i) => {
    const geometry = new BoxGeometry(level.size, 0.1, level.size)
    const plate = new Group()
    plate.position.y = level.y
    plate.add(new Mesh(geometry, glass))
    plate.add(new LineSegments(new EdgesGeometry(geometry), edges))
    spin.add(plate)
    return { plate, y: level.y, phase: i * 1.3 }
  })

  const axisMaterial = flowLineMaterial(color, PALETTE.violet, 0.35, 0.12)
  spin.add(
    new Line(
      polylineGeometry([
        [0, -1.25, 0],
        [0, 1.25, 0],
      ]),
      axisMaterial,
    ),
  )

  const veil = buildVeil(color)
  root.add(veil.object)

  return {
    root,
    update({ time, delta, animated, highlight }) {
      const h = highlight.experiences
      setTime([axisMaterial], time)
      setHighlight([axisMaterial], h)
      glass.opacity = 0.4 + 0.2 * h
      edges.opacity = 0.65 + 0.35 * h
      veil.material.opacity = 0.04 + 0.06 * h
      root.position.y = bob(time, 1.2, 0)
      // Les plateaux respirent chacun à leur rythme : la pile vit sans se défaire.
      for (const { plate, y, phase } of plates)
        plate.position.y = y + Math.sin(time * 1.1 + phase) * 0.06
      if (animated) spin.rotation.y += delta * 0.12
    },
    dispose: () => disposeTree(root),
  }
}

/**
 * Projets — un prisme : un octaèdre de métal sombre à facettes, doublé de ses
 * arêtes lumineuses, que ceint un anneau portant une perle.
 */
export function buildPrism(): Built {
  const color = tone('projects')
  const root = new Group()

  const prism = new Group()
  root.add(prism)
  const facetsMaterial = new MeshStandardMaterial({
    color: '#140f30',
    metalness: 0.85,
    roughness: 0.3,
    flatShading: true,
    emissive: color,
    emissiveIntensity: 0.14,
  })
  prism.add(new Mesh(new OctahedronGeometry(1.1, 0), facetsMaterial))
  const edges = additiveLines(color, 0.8)
  prism.add(new LineSegments(new EdgesGeometry(new OctahedronGeometry(1.13, 0)), edges))

  const tilt = new Group()
  tilt.rotation.set(Math.PI / 3, 0, 0.2)
  root.add(tilt)
  const ring = new Group()
  tilt.add(ring)
  const ringMaterial = additive(color, 0.6)
  ring.add(new Mesh(new TorusGeometry(1.5, 0.012, 6, 160), ringMaterial))
  const pearl = new Mesh(
    new SphereGeometry(0.06, 12, 8),
    new MeshBasicMaterial({ color: PALETTE.text }),
  )
  pearl.position.set(1.5, 0, 0)
  ring.add(pearl)

  const veil = buildVeil(color)
  root.add(veil.object)

  return {
    root,
    update({ time, delta, animated, highlight }) {
      const h = highlight.projects
      // ⛔ Une réponse plus forte fait du prisme un aplat violet en gros plan.
      facetsMaterial.emissiveIntensity = 0.14 + 0.1 * h
      edges.opacity = 0.75 + 0.25 * h
      ringMaterial.opacity = 0.5 + 0.4 * h
      veil.material.opacity = 0.04 + 0.06 * h
      root.position.y = bob(time, 1.1, 2)
      if (!animated) return
      prism.rotation.y += delta * 0.3
      prism.rotation.x += delta * 0.18
      ring.rotation.z -= delta * 0.25
    },
    dispose: () => disposeTree(root),
  }
}

/* ================================================================ plateforme */

/** Un disque de lumière peint une fois : clair au centre, évanoui au bord. */
const floorGlowTexture = (): CanvasTexture =>
  radialTexture([
    [0, 'rgba(40, 217, 245, 0.35)'],
    [0.45, 'rgba(40, 217, 245, 0.12)'],
    [0.8, 'rgba(137, 115, 245, 0.05)'],
    [1, 'rgba(0, 0, 0, 0)'],
  ])

/**
 * La plateforme du noyau : un socle **holographique** — trois anneaux lumineux
 * posés au sol, une nappe de lumière qui s'évanouit vers le bord, une colonne de
 * lumière qui monte vers le noyau — et une grille de sol, qui donne l'échelle et
 * s'efface dans le brouillard.
 *
 * ⛔ Plus de disques de métal opaques : ils se lisaient comme des trous noirs
 * sous le noyau, et alourdissaient une scène faite de lumière (retour de
 * l'utilisateur, 2026-10-26).
 */
export function buildPlatform(): Built {
  const root = new Group()
  root.position.y = -2.7

  const glowMaterial = new MeshBasicMaterial({
    map: floorGlowTexture(),
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  const glow = new Mesh(new CircleGeometry(3.4, 64), glowMaterial)
  glow.rotation.x = -Math.PI / 2
  root.add(glow)

  const tiers = [
    { radius: 2.8, y: 0.01 },
    { radius: 2.2, y: 0.06 },
    { radius: 1.5, y: 0.11 },
  ]
  const strips = tiers.map((tier, i) => {
    const strip = additive(i === 1 ? PALETTE.violet : PALETTE.cyan, 0.8)
    const ring = new Mesh(new TorusGeometry(tier.radius, 0.014, 6, 160), strip)
    ring.rotation.x = Math.PI / 2
    ring.position.y = tier.y
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
      glowMaterial.opacity = 0.75 + 0.25 * (0.5 + 0.5 * Math.sin(time * 0.55))
      // Les bandes respirent avec le noyau, en léger décalage de l'une à l'autre.
      strips.forEach((strip, i) => {
        strip.opacity = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(time * 0.55 - i * 0.6))
      })
    },
    dispose: () => disposeTree(root),
  }
}

/** Les anneaux du gyroscope : rayon, teinte, axe de rotation, vitesse (rad/s). */
const GIMBALS = [
  { radius: 1.45, color: PALETTE.sky, axis: 'x', speed: 0.45 },
  { radius: 1.05, color: PALETTE.cyan, axis: 'y', speed: 0.35 },
] as const

/**
 * Compétences — un gyroscope : deux anneaux de métal lumineux qui tournent
 * chacun sur son axe autour d'un dodécaèdre taillé. Des savoir-faire distincts
 * qui tournent autour d'un même centre.
 */
export function buildGyroscope(): Built {
  const color = tone('skills')
  const root = new Group()
  root.rotation.set(0.25, 0, 0.15)

  const gimbalMaterials = GIMBALS.map(
    (gimbal) =>
      new MeshStandardMaterial({
        color: gimbal.color,
        metalness: 0.6,
        roughness: 0.3,
        emissive: gimbal.color,
        emissiveIntensity: 0.3,
      }),
  )
  const bead = new SphereGeometry(0.06, 12, 8)
  const beadMaterial = new MeshBasicMaterial({ color: PALETTE.text })
  const gimbals = GIMBALS.map((gimbal, i) => {
    const holder = new Group()
    holder.add(
      new Mesh(new TorusGeometry(gimbal.radius, 0.03, 12, 120), gimbalMaterials[i] as Material),
    )
    const pearl = new Mesh(bead, beadMaterial)
    pearl.position.set(gimbal.radius, 0, 0)
    holder.add(pearl)
    // Le second anneau part déjà de biais : à l'arrêt, les deux ne se confondent pas.
    if (i === 1) holder.rotation.y = Math.PI / 2.5
    root.add(holder)
    return holder
  })

  const heart = new Group()
  root.add(heart)
  const facetsMaterial = new MeshStandardMaterial({
    color: '#0d1830',
    metalness: 0.85,
    roughness: 0.3,
    flatShading: true,
    emissive: color,
    emissiveIntensity: 0.08,
  })
  heart.add(new Mesh(new DodecahedronGeometry(0.55, 0), facetsMaterial))
  const edges = additiveLines(PALETTE.cyan, 0.8)
  heart.add(new LineSegments(new EdgesGeometry(new DodecahedronGeometry(0.57, 0)), edges))

  const veil = buildVeil(color)
  root.add(veil.object)

  return {
    root,
    update({ time, delta, animated, highlight }) {
      const h = highlight.skills
      for (const material of gimbalMaterials) material.emissiveIntensity = 0.25 + 0.45 * h
      facetsMaterial.emissiveIntensity = 0.06 + 0.25 * h
      edges.opacity = 0.65 + 0.35 * h
      veil.material.opacity = 0.04 + 0.06 * h
      root.position.y = bob(time, 0.9, 1)
      if (!animated) return
      GIMBALS.forEach((gimbal, i) => {
        const holder = gimbals[i]
        if (holder) holder.rotation[gimbal.axis] += delta * gimbal.speed
      })
      heart.rotation.y -= delta * 0.4
    },
    dispose: () => disposeTree(root),
  }
}
