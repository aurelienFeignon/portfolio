'use client'

/**
 * Le `<canvas>` React Three Fiber — **le seul endroit du site qui touche Three.js**.
 *
 * Il porte la scène de P5-05 — le bureau réel décrit par `layout.ts` — et rien
 * d'autre : ni texte, ni information, ni cible focusable (ADR-0003).
 *
 * ⛔ `drei` s'importe composant par composant, jamais en entier (ADR-0016) : un
 * garde ESLint et son banc le tiennent, et le budget en dépend (802,8 Ko contre
 * 0,9 par composant).
 */
import { Canvas, useThree } from '@react-three/fiber'
import { type ReactNode, useLayoutEffect } from 'react'
import { ACESFilmicToneMapping, PCFSoftShadowMap, PerspectiveCamera, SRGBColorSpace } from 'three'

import type { Capability } from '@/scene/capability/resolve'
import { fovForAspect } from '@/scene/state/framing'
import { CAMERAS } from '@/scene/state/layout'

import { Desk } from './desk'

/**
 * Le cadrage suit le format de la fenêtre — P5-06.
 *
 * ⛔⛔ **Les `fov` de `layout.ts` sont calculés pour 16:9 et sont VERTICAUX.** Sur
 * un écran plus étroit, le champ horizontal se referme tout seul : un iPhone en
 * portrait ne voyait qu'un morceau d'écran central là où l'accueil doit montrer
 * le bureau entier. La règle vit dans `framing.ts`, pure et éprouvée ; ici, on
 * ne fait que l'appliquer.
 *
 * ⭐ `useLayoutEffect` et non `useEffect` : la correction doit être en place
 * **avant** la première image, sinon le premier rendu affiche le mauvais cadrage
 * puis saute.
 *
 * ⛔ Et `invalidate()` est obligatoire : en `frameloop="demand"`, changer le `fov`
 * ne provoque aucune image. Le cadrage serait corrigé dans l'objet caméra, et
 * faux à l'écran — un défaut qu'aucune assertion sur la caméra ne verrait.
 */
function CameraFraming({ fovAt16by9 }: { readonly fovAt16by9: number }) {
  /*
   * ⚠️ **La caméra est lue par `get()`, et non par `useThree((s) => s.camera)`.**
   * Le compilateur React refuse la mutation d'une valeur rendue par un hook —
   * « This value cannot be modified » — et il a raison dans le cas général : une
   * valeur réactive mutée en place échappe au rendu. Ici, l'objet caméra de
   * `three` n'est pas un état React : c'est un objet impératif dont la mutation
   * **est** l'API. Le lire par l'accesseur du store dit exactement cela, plutôt
   * que de désactiver une règle qui protège partout ailleurs.
   */
  const get = useThree((state) => state.get)
  const size = useThree((state) => state.size)

  useLayoutEffect(() => {
    const { camera, invalidate } = get()
    if (!(camera instanceof PerspectiveCamera) || size.height === 0) return
    camera.fov = fovForAspect(fovAt16by9, size.width / size.height)
    camera.updateProjectionMatrix()
    invalidate()
  }, [get, size.width, size.height, fovAt16by9])

  return null
}

export default function SceneCanvas({
  capability,
  onContextLost,
  probe,
}: {
  readonly capability: Capability
  readonly onContextLost: () => void
  /*
   * ⭐ La sonde de diagnostic est **reçue**, pas importée (P5-08). `renderer.info`
   * n'est lisible que de l'intérieur du canvas, mais le panneau qui l'affiche ne
   * peut pas y vivre — le canvas est `aria-hidden` et n'écrit aucun texte. La
   * faire descendre en prop garde le code de debug hors de ce fichier et hors du
   * chemin de rendu ordinaire : sans `?debug=scene`, `probe` vaut `undefined` et
   * rien de tout cela n'est chargé.
   */
  readonly probe?: ReactNode
}) {
  return (
    <Canvas
      // ⭐ `demand` : la scène est immobile entre deux transitions. Une boucle
      // qui tourne à 60 images par seconde pour rien vide une batterie sans que
      // personne ne voie la différence.
      frameloop="demand"
      // Plafonné à 2 : sur un écran à densité 3, rendre à 3× coûte 2,25 fois plus
      // de pixels pour une différence invisible sur des primitives.
      dpr={[1, 2]}
      gl={{ antialias: capability.tier === 'full', powerPreference: 'low-power' }}
      /*
       * ⛔ Les ombres coûtent plus cher que la géométrie — le dossier de scène le
       * dit après mesure : 4 114 triangles, c'est 3 % du budget, et « la
       * contrainte réelle sera le coût des ombres ». Elles sont donc coupées au
       * palier `lite`, où l'écran ne les montrerait de toute façon pas.
       */
      shadows={capability.tier === 'lite' ? false : { type: PCFSoftShadowMap }}
      onCreated={({ gl, camera }) => {
        /*
         * Sans courbe de tonalité, les hautes lumières de la dalle blanche
         * écrêtent net et tout le reste s'écrase vers le gris : c'est la
         * première cause d'une scène three.js délavée.
         *
         * ⭐ **L'exposition est réglée à l'œil, et c'est la seule des quatre
         * valeurs d'éclairage qui n'ait AUCUNE contrainte physique derrière
         * elle** — le dossier de scène la nomme « le seul cadran vraiment
         * subjectif ». 1,15 → **1,89** le 2026-08-25, au curseur dans
         * `preview.html`. La valeur de 1,15 n'était pas mesurée : elle
         * compensait ACES « d'environ 15 % », ce qui est un raisonnement, pas un
         * regard.
         */
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.89
        // Sans lui, tout le travail de palette est faux d'une conversion gamma.
        gl.outputColorSpace = SRGBColorSpace
        /*
         * ⛔ **La cible du cadrage était lue puis ignorée.** `CameraSpec` porte
         * trois champs et ce fichier n'en employait que deux : sans `lookAt`,
         * R3F vise l'origine du monde, ce qui donne 26,6° de plongée au lieu des
         * 17,9° demandés — un quart du champ vertical. Le rig de caméra est
         * P6-04 ; le cadrage INITIAL, lui, doit être celui qu'on a calculé.
         * Relevé en revue.
         */
        camera.lookAt(...(CAMERAS.accueil.target as unknown as [number, number, number]))
        /*
         * La perte du contexte WebGL — P5-07, ADR-0003 point 5.
         *
         * ⛔⛔ **Aucune frontière d'erreur ne peut voir ceci** : le navigateur
         * retire le contexte par un **événement du DOM**, jamais par une
         * exception de rendu. Sans cette écoute, la scène resterait montée sur
         * un canvas définitivement noir — un décor mort que rien ne signale, et
         * un contexte retenu de plus sur un appareil qui vient d'en manquer.
         *
         * ⛔⛔ **Ici, et non dans un composant enfant.** Un enfant du canvas
         * n'attache son écouteur qu'au rendu de l'arbre R3F, c'est-à-dire APRÈS
         * la création du contexte : il reste une fenêtre pendant laquelle le
         * contexte existe et personne ne l'écoute. Mesurée — le banc E2E la
         * traversait sous charge, et l'échec **se déplaçait**, signature d'une
         * course. `onCreated` s'exécute dans la même passe synchrone que la
         * création du renderer : aucun événement ne peut s'y glisser.
         *
         * ⭐ `once` remplace le nettoyage, et le remplace exactement : la
         * bascule en `none` est terminale (`mount-state.ts`), donc une seconde
         * perte n'aurait rien à dire. L'écouteur se retire de lui-même après la
         * première, et si le canvas meurt sans avoir rien perdu, il meurt avec
         * lui — R3F en construit un neuf à chaque montage, jamais deux écoutes
         * sur le même élément.
         *
         * ⚠️ `three` installe son propre écouteur et y appelle
         * `preventDefault()`, ce qui demande au navigateur de préparer une
         * restauration. Nous ne l'attendons pas : le parent démonte le canvas,
         * ce qui libère le renderer et rend la restauration sans objet.
         * Réessayer tout seul sur un appareil qui vient de perdre son contexte
         * est exactement le cycle qu'ADR-0003 cherche à éviter.
         */
        gl.domElement.addEventListener('webglcontextlost', onContextLost, { once: true })
      }}
      camera={{
        position: CAMERAS.accueil.position as unknown as [number, number, number],
        fov: CAMERAS.accueil.fov,
        // Un intervalle serré préserve la précision du tampon de profondeur, dont
        // dépend la lisibilité des dalles collées à 13 mm de leur châssis.
        near: 0.05,
        far: 12,
      }}
    >
      <CameraFraming fovAt16by9={CAMERAS.accueil.fov} />
      {probe}
      <Desk capability={capability} />
    </Canvas>
  )
}
