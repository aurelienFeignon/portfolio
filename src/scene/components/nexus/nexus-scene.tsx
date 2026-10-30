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
 * `content` (`architecture.md` §1.2) : ces formes sont des emblèmes — une pile
 * de couches, un prisme, un gyroscope —, pas des graphiques qui prétendraient
 * compter les expériences ou les projets.
 */
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { type Group, MeshBasicMaterial, SphereGeometry } from 'three'

import { SECTIONS, type Section } from '@/routing/sections'
import { type AmbientState, ambientFrame } from '@/scene/state/ambient-motion'
import { CLICK_TOLERANCE_PX } from '@/scene/state/board-render/targets'
import { type Density, PALETTE, UNIVERSES } from '@/scene/state/layout'
import type { SceneFocus } from '@/scene/state/scene-state'

import {
  type Built,
  buildConnections,
  buildCore,
  buildGyroscope,
  buildParticles,
  buildPlatform,
  buildPrism,
  buildStack,
} from './builders'

const BUILD_UNIVERSE: Readonly<Record<Section, () => Built>> = {
  experiences: buildStack,
  projects: buildPrism,
  skills: buildGyroscope,
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

  const ambient = useMemo(
    () => [
      buildPlatform(),
      buildCore(density),
      buildParticles(density, pixelRatio),
      buildConnections(),
    ],
    [density, pixelRatio],
  )
  // ⭐ Les univers ne dépendent ni de la densité ni de la résolution : un écran
  // changé ne les reconstruit pas, ni ne recompile leurs shaders.
  const universes = useMemo(
    () => SECTIONS.map((section) => ({ section, built: BUILD_UNIVERSE[section]() })),
    [],
  )

  // ⭐ La mémoire du GPU est rendue au démontage, et à chaque reconstruction.
  useEffect(
    () => () => {
      for (const built of ambient) built.dispose()
    },
    [ambient],
  )
  useEffect(
    () => () => {
      for (const { built } of universes) built.dispose()
    },
    [universes],
  )

  // ⛔ Le temps de scène s'accumule ici, jamais sur `state.clock` : l'horloge de
  // R3F repart de zéro à chaque changement de boucle (`ambient-motion.ts`).
  const ambience = useRef<AmbientState>({
    timeS: 0,
    highlight: { experiences: 0, projects: 0, skills: 0 },
    scale: { experiences: 1, projects: 1, skills: 1 },
  })

  useFrame((_, delta) => {
    const next = ambientFrame(ambience.current, {
      deltaS: delta,
      animated,
      hovered,
      focus,
    })
    ambience.current = next.state
    const frame = {
      time: next.shaderTimeS,
      delta: next.stepS,
      animated,
      highlight: next.state.highlight,
    }
    for (const built of ambient) built.update(frame)
    for (const { built } of universes) built.update(frame)
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

      {ambient.map((built, i) => (
        <primitive key={i} object={built.root} />
      ))}

      {universes.map(({ section, built }) => {
        const spec = UNIVERSES[section]
        return (
          <group key={section} position={spec.position as unknown as [number, number, number]}>
            <UniverseScale section={section} ambience={ambience}>
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
  ambience,
  children,
}: {
  readonly section: Section
  readonly ambience: { readonly current: AmbientState }
  readonly children: ReactNode
}) {
  const group = useRef<Group>(null)
  useFrame(() => {
    group.current?.scale.setScalar(ambience.current.scale[section])
  })
  return <group ref={group}>{children}</group>
}
