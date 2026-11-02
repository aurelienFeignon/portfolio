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
 * ⚠️ **Sans effet mesurable dans le banc** : son Chromium n'offre pas
 * l'extension, et la compilation y reste synchrone (`nexus-prototype.md` §6.3).
 * Le gain sur un appareil réel n'est pas encore vérifié.
 *
 * Ce composant se monte dans le MÊME rendu que les objets à compiler : React
 * les ajoute au graphe avant d'exécuter les effets, quelle que soit leur place
 * parmi les enfants. ⛔ Être après
 * eux dans l'arbre ne suffit pas quand ils naissent d'un `setState` posé dans un
 * effet — ils n'entrent au graphe qu'au rendu suivant, et `compileAsync`
 * compile une scène vide (mesuré le 2026-11-02 : 0 programme lié sur 11 avant
 * la première image, d'où son placement dans `BoardScene`).
 */
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

/**
 * `onReadyChange(true)` une fois la compilation finie, `onReadyChange(false)` au démontage : la
 * scène qui le remonte (un plan de l'autre langue, une carte reconstruite) ne rend rien avant
 * d'avoir compilé à nouveau — sans quoi ses programmes, rendus par le `dispose` de l'ancienne
 * carte, seraient liés en synchrone à la première image.
 */
export function ShaderWarmup({
  onReadyChange,
}: {
  readonly onReadyChange: (ready: boolean) => void
}) {
  const get = useThree((state) => state.get)

  useEffect(() => {
    let annule = false
    const { gl, scene, camera } = get()
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (!annule) onReadyChange(true)
      })
    return () => {
      annule = true
      onReadyChange(false)
    }
  }, [get, onReadyChange])

  return null
}
