'use client'

/**
 * La scène NEXUS assemblée : le noyau, les trois univers, l'ambiance, la lumière.
 *
 * Les objets sont construits par `builders.ts`, hors de React ; ce composant ne
 * fait que trois choses — les monter, faire avancer leur horloge à chaque image,
 * et porter les sphères de sélection des univers, invisibles, qui reçoivent le
 * pointeur.
 *
 * ⛔ **Aucun univers ne porte de donnée de contenu.** `scene` ne lit pas
 * `content` (`architecture.md` §1.2) : ces formes sont des emblèmes — une
 * chronologie, un réseau, une constellation —, pas des graphiques qui
 * prétendraient compter les expériences ou les projets.
 */
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { type Group, MeshBasicMaterial, SphereGeometry } from 'three'

import { SECTIONS, type Section } from '@/routing/sections'
import { type Density, PALETTE, UNIVERSES } from '@/scene/state/layout'
import type { SceneFocus } from '@/scene/state/scene-state'

import {
  type Built,
  buildConnections,
  buildConstellation,
  buildCore,
  buildNetwork,
  buildParticles,
  buildTimeline,
} from './builders'

/** L'heure des shaders sous `prefers-reduced-motion` : impulsions visibles à l'arrêt. */
const FROZEN_TIME = 2.4

/** Au-delà de ce déplacement (pixels), un appui est une rotation, pas un clic. */
const CLICK_TOLERANCE_PX = 6

const BUILD_UNIVERSE: Readonly<Record<Section, (density: Density) => Built>> = {
  experiences: () => buildTimeline(),
  projects: buildNetwork,
  skills: buildConstellation,
}

export function NexusScene({
  density,
  animated,
  hovered,
  focus,
  onHover,
  onSelect,
}: {
  readonly density: Density
  readonly animated: boolean
  readonly hovered: SceneFocus | null
  readonly focus: SceneFocus
  readonly onHover: (section: Section | null) => void
  readonly onSelect: (section: Section) => void
}) {
  const pixelRatio = useThree((state) => state.viewport.dpr)

  const world = useMemo(() => {
    const ambient = [buildCore(density), buildParticles(density, pixelRatio), buildConnections()]
    const universes = SECTIONS.map((section) => ({
      section,
      built: BUILD_UNIVERSE[section](density),
    }))
    return { ambient, universes }
  }, [density, pixelRatio])

  // ⭐ La mémoire du GPU est rendue au démontage, et à chaque reconstruction.
  useEffect(
    () => () => {
      for (const built of world.ambient) built.dispose()
      for (const { built } of world.universes) built.dispose()
    },
    [world],
  )

  const highlight = useRef<Record<Section, number>>({ experiences: 0, projects: 0, skills: 0 })
  const scale = useRef<Record<Section, number>>({ experiences: 1, projects: 1, skills: 1 })

  useFrame((state, delta) => {
    const ease = animated ? Math.min(1, delta * 4) : 1
    for (const section of SECTIONS) {
      const goal = hovered === section || focus === section ? 1 : 0
      highlight.current[section] += (goal - highlight.current[section]) * ease
      // ⭐ Le survol grandit l'univers d'un dixième — doucement, jamais d'un coup.
      const scaleGoal = hovered === section ? 1.1 : 1
      scale.current[section] +=
        (scaleGoal - scale.current[section]) * (animated ? Math.min(1, delta * 6) : 1)
    }
    const frame = {
      time: animated ? state.clock.elapsedTime : FROZEN_TIME,
      delta,
      animated,
      highlight: highlight.current,
    }
    for (const built of world.ambient) built.update(frame)
    for (const { built } of world.universes) built.update(frame)
  })

  const hit = useMemo(
    () => ({
      geometry: new SphereGeometry(1, 16, 12),
      material: new MeshBasicMaterial({ visible: false }),
    }),
    [],
  )

  return (
    <>
      <ambientLight color="#3b4d72" intensity={0.55} />
      {/* ⭐ Le noyau est une source : sa lumière cyan éclaire les nœuds de Projets. */}
      <pointLight color={PALETTE.cyan} intensity={22} distance={16} decay={2} />
      {/*
       * Une lumière principale froide, de face et de droite, qui taille les
       * facettes ; un contre-jour violet, de l'arrière gauche, qui dessine la
       * silhouette. Le noyau n'est éclairé par sa propre lumière que de
       * l'intérieur — sans ces deux-là, il serait un trou noir.
       */}
      <directionalLight color="#9fe9ff" intensity={1.6} position={[7, 6, 10]} />
      <directionalLight color={PALETTE.violet} intensity={1.4} position={[-8, 4, -6]} />

      {world.ambient.map((built, i) => (
        <primitive key={i} object={built.root} />
      ))}

      {world.universes.map(({ section, built }) => {
        const spec = UNIVERSES[section]
        return (
          <group key={section} position={spec.position as unknown as [number, number, number]}>
            <UniverseScale section={section} scale={scale}>
              <primitive object={built.root} />
            </UniverseScale>
            {/*
             * ⭐ La sélection passe par une sphère INVISIBLE : viser au pointeur
             * des points ou des lignes d'un pixel serait une épreuve.
             */}
            <mesh
              geometry={hit.geometry}
              material={hit.material}
              scale={spec.hitRadius}
              onPointerOver={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation()
                onHover(section)
              }}
              onPointerOut={() => onHover(null)}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation()
                if (event.delta <= CLICK_TOLERANCE_PX) onSelect(section)
              }}
            />
          </group>
        )
      })}
    </>
  )
}

/** Applique l'échelle de survol, lue dans un `ref` à chaque image. */
function UniverseScale({
  section,
  scale,
  children,
}: {
  readonly section: Section
  readonly scale: { readonly current: Readonly<Record<Section, number>> }
  readonly children: ReactNode
}) {
  const group = useRef<Group>(null)
  useFrame(() => {
    group.current?.scale.setScalar(scale.current[section])
  })
  return <group ref={group}>{children}</group>
}
