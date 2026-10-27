'use client'

/**
 * Le `<canvas>` React Three Fiber — **le seul endroit du site qui touche Three.js**.
 *
 * Il porte la scène NEXUS (D11) : le noyau, les trois univers, l'ambiance, et le
 * rig de caméra qui suit la route. Ni texte, ni information : les étiquettes des
 * univers sont du HTML rendu **hors** du canvas, par `SceneMount` (ADR-0003) — la
 * scène ne fait que leur donner leur position (`LabelProjector`).
 *
 * ⛔ `drei` s'importe composant par composant, jamais en entier (ADR-0016) — et
 * NEXUS n'en importe aucun.
 */
import { Canvas } from '@react-three/fiber'
import { type ComponentType, type RefObject, useCallback, useEffect, useState } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'

import type { Section } from '@/routing/sections'
import type { Capability } from '@/scene/capability/resolve'
import type { Rect } from '@/scene/state/camera-motion'
import type { SceneReadings } from '@/scene/state/diagnostics'
import { getCameraTarget } from '@/scene/state/camera-target'
import { DENSITY, PALETTE } from '@/scene/state/layout'
import type { SceneFocus, SceneState } from '@/scene/state/scene-state'

import { CameraRig } from './nexus/camera-rig'
import { type LabelAnchors, LabelProjector } from './nexus/label-projector'
import { NexusScene } from './nexus/nexus-scene'
import { ShaderWarmup } from './nexus/shader-warmup'

export default function SceneCanvas({
  capability,
  state,
  free,
  visible,
  hovered,
  labelAnchors,
  labelZone,
  onHover,
  onSelect,
  onContextLost,
  onReadings,
}: {
  readonly capability: Capability
  readonly state: SceneState
  /** La zone de l'écran que le panneau de lecture laisse à la scène. */
  readonly free: Rect | null
  /** Faux sur une fiche : la scène est cachée et ne calcule plus d'image. */
  readonly visible: boolean
  readonly hovered: SceneFocus | null
  /** Les étiquettes HTML des univers, que la scène place à chaque image. */
  readonly labelAnchors: RefObject<LabelAnchors>
  /** Où les étiquettes peuvent se poser : hors du panneau, sous l'en-tête. */
  readonly labelZone: Rect | null
  readonly onHover: (section: Section | null) => void
  readonly onSelect: (section: Section) => void
  readonly onContextLost: () => void
  /** Présent sous `?debug=scene` seulement : la scène se mesure et rend ses relevés. */
  readonly onReadings?: (readings: SceneReadings) => void
}) {
  const Sonde = useSonde(onReadings !== undefined)
  // `none` ne monte jamais ce composant (`shouldMountScene`).
  const tier = capability.tier === 'none' ? 'lite' : capability.tier
  const animated = capability.motion === 'animated'
  /*
   * Au palier `lite`, l'ambiance est une image FIXE : ADR-0003 définit `lite`
   * comme « scène décorative, ou visuel statique », et une boucle continue use
   * la batterie d'un téléphone pour une pulsation. Les transitions de caméra
   * restent fluides : le rig demande ses images.
   * ⚠️ Ce n'était PAS la cause du TBT mobile (mesuré : 1 126 → 1 231 ms, sans
   * effet). La cause désignée par la mesure est la compilation des shaders au
   * premier rendu — voir `ShaderWarmup` et `nexus-prototype.md` §6.
   */
  const ambient = animated && tier !== 'lite'
  const initial = getCameraTarget(state)
  // Aucune image avant que les shaders soient compilés (`ShaderWarmup`).
  const [pret, setPret] = useState(false)
  const quandPret = useCallback(() => setPret(true), [])

  return (
    <Canvas
      /*
       * ⭐ `always` seulement quand l'ambiance a quelque chose à montrer :
       * - scène cachée (fiche) ou shaders en compilation : `never`, aucune image ;
       * - mouvement refusé ou palier `lite` : `demand`, le rig demande les
       *   images d'une transition ;
       * - sinon `always` — la pulsation et les flux sont l'objet même de la scène.
       */
      frameloop={!visible || !pret ? 'never' : ambient ? 'always' : 'demand'}
      // ⭐ Lu par la feuille de style : la scène apparaît en fondu une fois prête.
      data-ready={pret}
      dpr={tier === 'full' ? [1, 2] : [1, 1.5]}
      gl={{ antialias: tier === 'full', alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.outputColorSpace = SRGBColorSpace
        // ⭐ Fond transparent : le dégradé CSS du site passe derrière la scène,
        // donc aucun saut de couleur quand le canvas apparaît après `idle`.
        gl.setClearColor(PALETTE.background, 0)
        /*
         * La perte du contexte WebGL — P5-07, ADR-0003 point 5. Écoutée ICI,
         * dans la même passe synchrone que la création du renderer : un enfant
         * l'attacherait trop tard (course mesurée en P5-07).
         */
        gl.domElement.addEventListener('webglcontextlost', onContextLost, { once: true })
      }}
      camera={{
        position: initial.position as unknown as [number, number, number],
        fov: initial.fov,
        near: 0.1,
        far: 80,
      }}
    >
      <fog attach="fog" args={[PALETTE.background, 16, 42]} />
      <CameraRig state={state} free={free} animated={animated} orbit={tier !== 'lite'} />
      {/* Après le rig : la projection lit la pose que le rig vient de poser. */}
      <LabelProjector anchors={labelAnchors} zone={labelZone} />
      <NexusScene
        density={DENSITY[tier]}
        animated={ambient}
        hovered={hovered}
        focus={state.focus}
        onHover={onHover}
        onSelect={onSelect}
      />
      <ShaderWarmup onReady={quandPret} />
      {/* La sonde vient d'un état posé UNE fois (`useSonde`) : son identité ne
          change pas d'un rendu à l'autre, ce que la règle veut garantir. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      {Sonde && onReadings ? <Sonde onReadings={onReadings} /> : null}
    </Canvas>
  )
}

type Sonde = ComponentType<{ readonly onReadings: (readings: SceneReadings) => void }>

/**
 * La sonde de diagnostic, chargée **à la demande** (P5-08) : sans `?debug=scene`,
 * l'import n'est jamais résolu et un visiteur ordinaire n'en paie pas un octet.
 *
 * ⛔⛔ **Un `import()` résolu dans un effet, jamais `next/dynamic`.** La sonde se
 * rend DANS le `<Canvas>`, donc par le réconciliateur de R3F, pas par celui de
 * React DOM. Depuis Next 16.4, un composant `next/dynamic` s'y résout par `use()`
 * et ce réconciliateur le refuse (React #438) : la scène tombait, perdait son
 * contexte WebGL, et le panneau attendait des relevés qui ne venaient jamais
 * (#63). Un composant ordinaire, posé une fois chargé, ne demande rien au
 * réconciliateur.
 */
function useSonde(active: boolean): Sonde | null {
  const [sonde, setSonde] = useState<Sonde | null>(null)
  useEffect(() => {
    if (!active) return
    let vivant = true
    void import('./scene-diagnostics').then((module) => {
      // Un composant dans un état se pose par une fonction : sinon React l'appellerait.
      if (vivant) setSonde(() => module.DiagnosticsProbe)
    })
    return () => {
      vivant = false
    }
  }, [active])
  return active ? sonde : null
}
