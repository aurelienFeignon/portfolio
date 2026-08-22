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
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'

import type { Capability } from '@/scene/capability/resolve'
import { CAMERAS } from '@/scene/state/layout'

import { Desk } from './desk'

export default function SceneCanvas({ capability }: { readonly capability: Capability }) {
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
      onCreated={({ gl }) => {
        /*
         * Sans courbe de tonalité, les hautes lumières de la dalle blanche
         * écrêtent net et tout le reste s'écrase vers le gris : c'est la
         * première cause d'une scène three.js délavée. ACES assombrit d'environ
         * 15 %, que l'exposition compense.
         */
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.15
        // Sans lui, tout le travail de palette est faux d'une conversion gamma.
        gl.outputColorSpace = SRGBColorSpace
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
      <Desk capability={capability} />
    </Canvas>
  )
}
