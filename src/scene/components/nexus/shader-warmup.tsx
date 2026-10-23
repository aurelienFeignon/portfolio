'use client'

/**
 * La compilation des shaders, AVANT la première image.
 *
 * ⛔⛔ **Mesuré le 2026-10-23** (`nexus-prototype.md` §6) : la première image de
 * NEXUS portait une tâche longue d'environ 1 s dans le chunk de three, et
 * « Other » montait de 465 à 3 500 ms sur l'accueil mobile. Le bureau n'avait
 * qu'un ou deux programmes de shader ; NEXUS en a huit, et le premier rendu les
 * compile et les lie de façon **synchrone**, en bloquant le thread principal.
 *
 * ⭐ `compileAsync` les lance tous, puis attend leur fin **sans bloquer** quand le
 * navigateur offre `KHR_parallel_shader_compile` — la compilation se fait dans
 * le processus GPU, le thread principal ne fait que sonder toutes les 10 ms.
 * Tant qu'elle n'est pas finie, le canvas ne rend RIEN (`frameloop="never"`) :
 * une image demandée trop tôt rattraperait la compilation en synchrone, et tout
 * le gain serait perdu.
 *
 * Ce composant se place APRÈS la scène dans l'arbre : ses effets s'exécutent
 * après ceux des objets, qui sont donc déjà dans le graphe à compiler.
 */
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export function ShaderWarmup({ onReady }: { readonly onReady: () => void }) {
  const get = useThree((state) => state.get)

  useEffect(() => {
    let annule = false
    const { gl, scene, camera } = get()
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (!annule) onReady()
      })
    return () => {
      annule = true
    }
  }, [get, onReady])

  return null
}
