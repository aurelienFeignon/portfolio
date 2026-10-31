'use client'

/**
 * Le `<canvas>` React Three Fiber — **le seul endroit du site qui touche Three.js**.
 *
 * Il porte la carte mère (D14, P8-15) : le plan de carte de la locale, dessiné
 * par `BoardScene`, et le rig de caméra qui suit la route. Ni texte, ni information : les étiquettes de
 * la carte sont du HTML rendu **hors** du canvas, par `SceneMount` (ADR-0003) — la
 * scène ne fait que leur donner leur position (`LabelProjector`).
 *
 * ⛔ `drei` s'importe composant par composant, jamais en entier (ADR-0016) — et
 * la carte n'en importe aucun.
 */
import { Canvas } from '@react-three/fiber'
import { type ComponentType, type RefObject, useCallback, useEffect, useState } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'

import type { Locale } from '@/i18n/locales'
import type { Capability } from '@/scene/capability/resolve'
import type { BoardTarget } from '@/scene/state/board-render/targets'
import type { Rect } from '@/scene/state/camera-motion'
import type { SceneReadings } from '@/scene/state/diagnostics'
import { PALETTE } from '@/scene/state/layout'
import type { SceneState } from '@/scene/state/scene-state'

import { BoardScene } from './board/board-scene'
import { type LabelElements, LabelProjector } from './board/label-projector'
import { useBoardFile } from './board/use-board-file'
import { CameraRig } from './camera-rig'
import { ShaderWarmup } from './shader-warmup'

export default function SceneCanvas({
  capability,
  locale,
  state,
  free,
  visible,
  hovered,
  labelElements,
  labelZone,
  onHover,
  onSelect,
  onContextLost,
  onReadings,
}: {
  readonly capability: Capability
  /** La locale de la page : la scène charge le plan de carte de celle-ci, jamais d'une autre. */
  readonly locale: Locale
  readonly state: SceneState
  /** La zone de l'écran que le panneau de lecture laisse à la scène. */
  readonly free: Rect | null
  /** Faux sur une fiche : la scène est cachée et ne calcule plus d'image. */
  readonly visible: boolean
  /** La cible survolée de la carte (P8-15f), que `SceneMount` rattache à la route. */
  readonly hovered: BoardTarget | null
  /** Les étiquettes HTML de la carte, par identifiant, que la scène place à chaque image. */
  readonly labelElements: RefObject<LabelElements>
  /** Où les étiquettes peuvent se poser : hors du panneau, sous l'en-tête. */
  readonly labelZone: Rect | null
  readonly onHover: (target: BoardTarget | null) => void
  /** Un clic dans la carte : le chemin où aller, que `SceneMount` pousse dans le routeur. */
  readonly onSelect: (href: string) => void
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
  /*
   * Le plan de carte de la locale (P8-15c), qui porte les cadrages précalculés.
   * ⭐ Le canvas est créé SANS l'attendre — seul le contexte WebGL prend de
   * l'avance —, mais il ne rend aucune image avant son arrivée : `ShaderWarmup`
   * n'est monté qu'avec le plan.
   */
  const plan = useBoardFile(locale)
  // Aucune image avant que les shaders soient compilés (`ShaderWarmup`).
  const [shadersPrets, setShadersPrets] = useState(false)
  const quandPret = useCallback(() => setShadersPrets(true), [])
  const pret = shadersPrets && plan !== null

  return (
    <Canvas
      /*
       * ⭐ `always` seulement quand l'ambiance a quelque chose à montrer :
       * - scène cachée (fiche), shaders en compilation ou plan de carte pas encore
       *   arrivé : `never`, aucune image ;
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
      /*
       * ⛔ Ni position ni `fov` ici : la caméra est créée avant que le plan
       * n'arrive. Le rig pose l'une et l'autre à sa première image, qui précède
       * toute image rendue (`frameloop` reste `never` jusque-là).
       */
      camera={{ near: 0.1, far: 400 }}
    >
      {/* Le brouillard retient le fond de la carte ; le rig règle sa portée sur la distance
          de cadrage (`fogRange`), ces valeurs ne valent que pour la toute première image. */}
      <fog attach="fog" args={[PALETTE.background, 36, 82]} />
      {plan === null ? null : (
        /*
         * ⭐ Review Focus 2 : le rig est monté À L'ARRIVÉE du plan, avec l'état
         * COURANT — une navigation pendant le chargement est donc déjà prise en
         * compte, et la caméra part de son cadrage, sans transition depuis celui
         * du montage.
         * ⛔ Rig et projection montés ENSEMBLE et dans cet ordre : la projection
         * lit la pose que le rig vient de poser, et `useFrame` les appelle dans
         * l'ordre où ils se sont abonnés.
         * ⭐ La carte et la compilation de ses shaders viennent avec le plan :
         * `ShaderWarmup` se place APRÈS la carte, pour que ses effets trouvent les
         * maillages déjà dans le graphe à compiler.
         */
        <>
          <CameraRig
            state={state}
            cameras={plan.cameras}
            free={free}
            animated={animated}
            orbit={tier !== 'lite'}
          />
          <LabelProjector
            file={plan}
            focus={state.focus}
            hovered={hovered}
            elements={labelElements}
            zone={labelZone}
          />
          <BoardScene
            file={plan}
            tier={tier}
            animated={ambient}
            locale={locale}
            hovered={hovered}
            focus={state.focus}
            onHover={onHover}
            onSelect={onSelect}
          />
          <ShaderWarmup onReady={quandPret} />
        </>
      )}
      {/* La sonde vient d'un état posé UNE fois (`useSonde`) : son identité ne
          change pas d'un rendu à l'autre, ce que la règle veut garantir. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      {Sonde && onReadings ? <Sonde onReadings={onReadings} /> : null}
    </Canvas>
  )
}

type SondeComposant = ComponentType<{ readonly onReadings: (readings: SceneReadings) => void }>

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
function useSonde(active: boolean): SondeComposant | null {
  const [sonde, setSonde] = useState<SondeComposant | null>(null)
  useEffect(() => {
    if (!active) return
    let vivant = true
    import('./scene-diagnostics').then(
      (module) => {
        // Un composant dans un état se pose par une fonction : sinon React l'appellerait.
        if (vivant) setSonde(() => module.DiagnosticsProbe)
      },
      // ⭐ Un chunk introuvable (déploiement entre deux visites) remonte à
      // `SceneBoundary` — l'erreur levée dans un updater l'est au rendu —, comme
      // le faisait `next/dynamic` : jamais un panneau qui attend en silence.
      (erreur: unknown) => {
        if (vivant)
          setSonde(() => {
            throw erreur
          })
      },
    )
    return () => {
      vivant = false
    }
  }, [active])
  return sonde
}
