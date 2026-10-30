'use client'

/**
 * La carte mère assemblée (P8-15d) : la carte construite depuis le plan versionné, la lumière,
 * et l'horloge de scène — à la place de NEXUS (`carte-mere.md` §12.3).
 *
 * ⭐ Le temps des shaders s'accumule par `ambientFrame` (P8-12), jamais sur l'horloge de R3F ;
 * la mise en valeur d'une section (sa route ou son survol) avive ce qui la porte : le bus pour
 * les expériences, les liserés des puces pour les compétences, les capots pour les projets.
 *
 * Survol et clic arrivent avec P8-15f : les props sont déjà celles que la scène recevra.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import type { Section } from '@/routing/sections'
import { type AmbientState, ambientFrame } from '@/scene/state/ambient-motion'
import type { BoardFile } from '@/scene/state/board-render/file-format'
import { type DensityTier, PALETTE } from '@/scene/state/layout'
import type { SceneFocus } from '@/scene/state/scene-state'

import { BoardMeshes, useBoard } from './board-meshes'

export function BoardScene({
  file,
  tier,
  animated,
  hovered,
  focus,
}: {
  readonly file: BoardFile
  readonly tier: DensityTier
  readonly animated: boolean
  readonly hovered: SceneFocus | null
  readonly focus: SceneFocus
  /** P8-15f : le survol d'une puce, d'un processeur, d'une année. */
  readonly onHover?: (section: Section | null) => void
  /** P8-15f : le clic qui navigue. */
  readonly onSelect?: (section: Section) => void
}) {
  const built = useBoard(file, tier)

  // ⛔ Accumulé ici, jamais lu sur `state.clock` (`ambient-motion.ts`).
  const ambience = useRef<AmbientState>({
    timeS: 0,
    highlight: { experiences: 0, projects: 0, skills: 0 },
    scale: { experiences: 1, projects: 1, skills: 1 },
  })

  useFrame((_, delta) => {
    const next = ambientFrame(ambience.current, { deltaS: delta, animated, hovered, focus })
    ambience.current = next.state
    built.update({ time: next.shaderTimeS, highlight: next.state.highlight })
  })

  const { bounds, district } = file.plan
  const cx = (bounds.minX + bounds.maxX) / 2
  const cz = (bounds.minZ + bounds.maxZ) / 2
  const [px, pz] = (district.processors.find((p) => p.primary) ?? district.processors[0])
    ?.center ?? [cx, cz]

  return (
    <>
      <hemisphereLight args={['#8FA9DA', '#05080F', 0.75]} />
      {/*
       * Une lumière principale froide, haute et de face gauche, qui pose les boîtiers sur la
       * plaque et accroche l'or des broches ; un contre-jour violet de l'arrière droite, qui
       * dessine les arêtes. Le processeur central éclaire son quartier, comme le noyau de NEXUS.
       */}
      <directionalLight color="#D6E6FF" intensity={1.9} position={[cx - 9, 16, cz + 12]} />
      <directionalLight color={PALETTE.violet} intensity={0.9} position={[cx + 12, 6, cz - 14]} />
      {/* Devant le processeur et non au-dessus : un dégradé sur le capot, pas un point chaud. */}
      <pointLight
        color="#B4A6FF"
        intensity={3.2}
        distance={14}
        decay={1.6}
        position={[px, 3, pz + 2.6]}
      />
      <BoardMeshes built={built} />
    </>
  )
}
