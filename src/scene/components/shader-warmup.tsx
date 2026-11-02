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
 * parmi les enfants. ⛔ Être après eux dans l'arbre ne suffit pas quand ils
 * naissent d'un `setState` posé dans un effet — ils n'entrent au graphe qu'au
 * rendu suivant, et `compileAsync` compile une scène vide. Mesuré le 2026-11-02
 * sur le build de production : 0 programme lié sur 11 avant la première image,
 * soit une tâche longue de 185 ms sur une RTX 5050 (`carte-mere.md` §12.5) ;
 * d'où son placement dans `BoardScene`. Témoin : `scene-shader-warmup.spec.ts`.
 *
 * ⛔⛔ **Lier ne suffit pas** — mesuré le même jour sur la même machine, une fois
 * le placement corrigé : la première image restait une tâche de 130 ms, dont 85 %
 * dans `onFirstUse` de three (journaux, statut de liaison, uniforms, attributs :
 * des appels GL synchrones vers le processus GPU, dont le premier achève la
 * liaison côté pilote), que three ne fait qu'au premier dessin de chaque
 * programme, donc pour les 11 dans la même image. Les journaux sont coupés en
 * production à la source (`checkShaderErrors`, `scene-canvas.tsx`). ⭐ On les provoque ici (`getUniforms`), **un programme par tâche** :
 * chacun coûte quelques millisecondes, aucun ne fait plus de tâche longue.
 * ⚠️ Sans l'extension (le banc), la première lecture attend toutes les liaisons
 * d'un coup : le gain ne s'y mesure pas (`carte-mere.md` §12.5).
 * ⚠️ Repose sur deux internes de three 0.186 : `info.programs` est le cache vivant
 * (d'où la copie, qu'un `releaseProgram` en cours de route ne décale pas), et
 * `getUniforms` déclenche `onFirstUse`. Le témoin e2e rougit si le second cesse.
 */
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { WebGLProgram } from 'three'

/**
 * `isReady` existe à l'exécution (three 0.186 : vrai d'office sans l'extension, sinon
 * `COMPLETION_STATUS_KHR`), mais pas dans `@types/three`.
 */
type Programme = WebGLProgram & { isReady(): boolean }

/**
 * Rend la main au navigateur : la suite part dans une tâche à elle. ⛔ Pas `setTimeout(0)` : en
 * chaîne, il est bridé à 4 ms dès le cinquième, soit ≈ 25 ms de plus avant la première image.
 */
function tacheSuivante() {
  return new Promise<void>((fin) => {
    const canal = new MessageChannel()
    canal.port1.onmessage = () => fin()
    canal.port2.postMessage(null)
  })
}

/**
 * `onReadyChange(true)` une fois la compilation finie, `onReadyChange(false)` au démontage : la
 * scène qui le remonte (un plan de l'autre langue, une carte reconstruite) ne rend rien avant
 * d'avoir compilé à nouveau — sans quoi ses programmes, rendus par le `dispose` de l'ancienne
 * carte, seraient liés en synchrone à la première image.
 * ⛔ `onReadyChange` doit être STABLE (un `setState`) : une fonction neuve à chaque rendu
 * relancerait la compilation, et repasserait la scène à « pas prête », à chaque rendu.
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
    void (async () => {
      // Une compilation ou une lecture qui échoue ne laisse pas la scène à jamais « pas prête » :
      // la première image refera le travail, au pire en synchrone.
      try {
        await gl.compileAsync(scene, camera)
        for (const programme of [...(gl.info.programs ?? [])]) {
          if (annule || gl.getContext().isContextLost()) return
          // ⛔ Seulement un programme LIÉ (un tardif ne l'est peut-être pas) : lire les autres
          // forcerait leur liaison, en synchrone.
          if (!(programme as Programme).isReady()) continue
          programme.getUniforms()
          await tacheSuivante()
        }
      } catch {
        // voir plus haut
      }
      if (!annule) onReadyChange(true)
    })()
    return () => {
      annule = true
      onReadyChange(false)
    }
  }, [get, onReadyChange])

  return null
}
