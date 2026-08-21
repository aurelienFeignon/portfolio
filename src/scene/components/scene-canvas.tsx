'use client'

/**
 * Le `<canvas>` React Three Fiber — **le seul endroit du site qui touche Three.js**.
 *
 * ⚠️ Il est vide à dessein : P5-04 livre le **montage**, P5-05 livrera la scène.
 * Un canvas qui ne rend rien prouve exactement ce que cette tâche doit prouver —
 * que le moteur démarre, hors du chemin critique, sans rien coûter à qui ne peut
 * pas le voir.
 *
 * ⛔ `drei` s'importe composant par composant, jamais en entier (ADR-0016) : un
 * garde ESLint et son banc le tiennent, et le budget en dépend (802,8 Ko contre
 * 0,9 par composant).
 */
import { Canvas } from '@react-three/fiber'

import type { Capability } from '@/scene/capability/resolve'

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
      camera={{ position: [0, 0.8, 1.6], fov: 36, near: 0.05, far: 12 }}
    />
  )
}
