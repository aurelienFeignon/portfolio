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
import { type ReactNode, type RefObject, useCallback, useState } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'

import type { Section } from '@/routing/sections'
import type { Capability } from '@/scene/capability/resolve'
import type { Rect } from '@/scene/state/camera-motion'
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
  header,
  onHover,
  onSelect,
  onContextLost,
  probe,
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
  /** La hauteur de l'en-tête : aucune étiquette ne se pose dessous. */
  readonly header: number
  readonly onHover: (section: Section | null) => void
  readonly onSelect: (section: Section) => void
  readonly onContextLost: () => void
  /*
   * ⭐ La sonde de diagnostic est **reçue**, pas importée (P5-08) : sans
   * `?debug=scene`, `probe` vaut `undefined` et rien n'en est chargé.
   */
  readonly probe?: ReactNode
}) {
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
      <LabelProjector anchors={labelAnchors} free={free} header={header} />
      <NexusScene
        density={DENSITY[tier]}
        animated={ambient}
        hovered={hovered}
        focus={state.focus}
        onHover={onHover}
        onSelect={onSelect}
      />
      <ShaderWarmup onReady={quandPret} />
      {probe}
    </Canvas>
  )
}
