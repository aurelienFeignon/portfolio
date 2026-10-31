'use client'

/**
 * La carte mère assemblée (P8-15d) : la carte construite depuis le plan versionné, la lumière,
 * et l'horloge de scène — à la place de NEXUS (`carte-mere.md` §12.3).
 *
 * ⭐ Le temps des shaders s'accumule par `ambientFrame` (P8-12), jamais sur l'horloge de R3F ;
 * la mise en valeur d'une section (sa route ou son survol) avive ce qui la porte : le bus pour
 * les expériences, les liserés des puces pour les compétences, les capots pour les projets.
 *
 * Survol et clic (P8-15f, §8) : le pointeur désigne une puce, un processeur, une année ou un
 * tronçon du bus (`relations.ts`) ; la cible allume ses relations et le reste s'atténue. Un clic
 * rend un `href` que `SceneMount` confie à `router.push` — jamais la caméra (§3). Au toucher, le
 * premier appui allume et le second, sur la même cible, navigue ; le défilement reste au doigt
 * (aucun `preventDefault` : `touch-action: pan-y` sur la couche).
 */
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'

import type { Locale } from '@/i18n/locales'
import { type AmbientState, ambientFrame } from '@/scene/state/ambient-motion'
import type { BoardFile } from '@/scene/state/board-render/file-format'
import { SHAPES, type Shape } from '@/scene/state/board-render/geometry'
import { offerHover } from '@/scene/state/board-render/hover-gate'
import { relationsOf, targetAtPoint, targetOfInstance } from '@/scene/state/board-render/relations'
import {
  type BoardTarget,
  CLICK_TOLERANCE_PX,
  hrefOf,
  sectionOf,
  tap,
  targetKey,
} from '@/scene/state/board-render/targets'
import { type DensityTier, PALETTE } from '@/scene/state/layout'
import type { SceneFocus } from '@/scene/state/scene-state'

import { BoardMeshes, type BuiltBoard, useBoard } from './board-meshes'

/** La cible sous le pointeur : l'instance touchée, sinon le bus sous le point de la plaque. */
function pick(file: BoardFile, event: ThreeEvent<PointerEvent | MouseEvent>): BoardTarget | null {
  const name = event.object.name
  const shape = (SHAPES as readonly string[]).includes(name) ? (name as Shape) : null
  return (
    (shape === null ? null : targetOfInstance(file.plan, shape, event.instanceId)) ??
    targetAtPoint(file.plan, event.point.x, event.point.z)
  )
}

interface BoardSceneProps {
  readonly file: BoardFile
  readonly tier: DensityTier
  readonly animated: boolean
  /** La locale de la page : les `href` des clics y restent. */
  readonly locale: Locale
  /** La cible survolée (ou touchée une fois), effacée par `SceneMount` à tout changement de route. */
  readonly hovered: BoardTarget | null
  readonly focus: SceneFocus
  readonly onHover: (target: BoardTarget | null) => void
  /** Le clic qui navigue : un chemin du site, à pousser dans le routeur. */
  readonly onSelect: (href: string) => void
}

/** La carte n'existe qu'une fois construite (`useBoard`) : rien n'est dessiné avant. */
export function BoardScene(props: BoardSceneProps) {
  const built = useBoard(props.file, props.tier)
  return built === null ? null : <BuiltBoardScene {...props} built={built} />
}

function BuiltBoardScene({
  built,
  file,
  animated,
  locale,
  hovered,
  focus,
  onHover,
  onSelect,
}: BoardSceneProps & { readonly built: BuiltBoard }) {
  const invalidate = useThree((state) => state.invalidate)

  // L'état de survol, écrit dans les attributs à chaque changement de cible — pas à chaque image.
  const relations = useMemo(
    () => (hovered === null ? null : relationsOf(file, hovered)),
    [file, hovered],
  )
  useEffect(() => {
    built.highlight(relations)
    // En boucle `demand`, rien ne redessinerait l'état nouveau.
    invalidate()
  }, [built, relations, invalidate])

  const hoveredSection = hovered === null ? null : sectionOf(hovered)
  // Le type du dernier appui : un `click` ne le porte pas partout (Safari).
  const pointerType = useRef('mouse')
  // ⛔ Filtré sur la dernière valeur ENVOYÉE, pas sur la prop (`hover-gate.ts`) : une sortie puis
  // un mouvement dans le même événement laisseraient sinon le survol éteint sous le pointeur.
  const lastSent = useRef(targetKey(hovered))
  useEffect(() => {
    lastSent.current = targetKey(hovered)
  }, [hovered])
  const hover = (target: BoardTarget | null) => {
    if (offerHover(lastSent, target)) onHover(target)
  }

  // ⛔ Accumulé ici, jamais lu sur `state.clock` (`ambient-motion.ts`).
  const ambience = useRef<AmbientState>({
    timeS: 0,
    highlight: { experiences: 0, projects: 0, skills: 0 },
  })

  useFrame((_, delta) => {
    const next = ambientFrame(ambience.current, {
      deltaS: delta,
      animated,
      hovered: hoveredSection,
      focus,
    })
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
       * dessine les arêtes. Le processeur central éclaire son quartier.
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
      <BoardMeshes
        built={built}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          pointerType.current = event.pointerType
        }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          // ⛔ Au toucher, pas de survol : un doigt qui défile n'allume rien.
          if (event.pointerType === 'touch') return
          event.stopPropagation()
          hover(pick(file, event))
        }}
        onPointerOut={(event: ThreeEvent<PointerEvent>) => {
          // Le doigt levé « sort » de la carte : l'allumage du premier toucher doit rester.
          if (event.pointerType !== 'touch') hover(null)
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation()
          if (event.delta > CLICK_TOLERANCE_PX) return
          const decision = tap(hovered, pick(file, event), pointerType.current)
          hover(decision.hover)
          const href =
            decision.navigate && decision.hover !== null ? hrefOf(decision.hover, locale) : null
          if (href !== null) onSelect(href)
        }}
        // Un toucher à côté de la carte éteint ce que le premier toucher avait allumé.
        onPointerMissed={() => hover(null)}
      />
    </>
  )
}
