'use client'

/**
 * Le panneau de diagnostic — P5-08.
 *
 * Deux pièces, et elles ne peuvent pas vivre au même endroit :
 *
 * - `DiagnosticsProbe` est **dans** le canvas, parce que `renderer.info` n'est
 *   lisible que de là ;
 * - `DiagnosticsPanel` est **hors** du canvas, parce que le canvas est
 *   `aria-hidden` et n'écrit aucun texte (ADR-0003) — et parce qu'un parcours E2E
 *   exige que `[data-scene-root]` ne contienne pas un caractère.
 *
 * ⭐ Il existe à cause d'un manque que P5-07 a nommé : rien ne distingue à
 * l'écran une scène qui n'a jamais monté d'une scène tombée. C'est le premier
 * endroit où l'état réel se lit.
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

import {
  type SceneReadings,
  diagnosticLines,
  shouldSample,
  summarizeLongTasks,
} from '@/scene/state/diagnostics'

import styles from './scene-diagnostics.module.css'

/** `performance.memory` n'existe que sur Chromium — d'où `null`, jamais `0`. */
/** L'instant où le palier a été décidé (`tier-mark.ts`) — le départ du chronomètre. */
function decisionDeMontage(): number {
  return (
    performance.getEntriesByType('mark').find((repere) => repere.name.startsWith('scene:tier:'))
      ?.startTime ?? 0
  )
}

function tasJsMo(): number | null {
  const memoire = (performance as { memory?: { usedJSHeapSize?: number } }).memory
  return memoire?.usedJSHeapSize === undefined
    ? null
    : Math.round(memoire.usedJSHeapSize / 1024 / 1024)
}

/**
 * La sonde, dans le canvas.
 *
 * ⛔⛔ **Elle PREND LA MAIN sur le rendu, et c'est le seul moyen de mesurer le
 * coût d'une image.** Dès qu'un `useFrame` déclare une priorité positive, R3F
 * cesse de rendre lui-même : c'est la manière documentée de reprendre la boucle,
 * et c'est ce qui permet d'encadrer `gl.render` par deux horloges. Un `delta` de
 * `useFrame` ne mesurerait pas le coût mais **l'intervalle** entre deux images —
 * en `demand`, plusieurs secondes de sommeil se liraient comme une image
 * catastrophique.
 *
 * ⚠️ **Conséquence assumée : la scène observée n'est pas exactement celle qu'on
 * observe.** Le chemin de rendu change quand le panneau est monté. C'est le prix
 * de la mesure, et il ne concerne personne d'autre : le panneau n'existe que sur
 * `?debug=scene`, donc le rendu d'un visiteur ordinaire n'est jamais dévié.
 */
export function DiagnosticsProbe({
  onReadings,
}: {
  readonly onReadings: (readings: SceneReadings) => void
}) {
  const dernierReleve = useRef<number | null>(null)
  const coutDerniereImage = useRef<number | null>(null)
  const premiereImage = useRef<number | null>(null)
  const materiel = useRef<{ gpu: string | null; parallelCompile: boolean | null }>({
    gpu: null,
    parallelCompile: null,
  })
  const tachesLongues = useRef<Array<{ startTime: number; duration: number }> | null>(null)
  const { gl, scene, camera, invalidate } = useThree()

  /*
   * ⛔⛔ **Sans ceci, le panneau reste vide pour toujours — et ce n'est pas un
   * bug d'affichage, c'est la conséquence directe de `frameloop="demand"`.** Le
   * canvas rend son image au montage ; la sonde, chargée dynamiquement, arrive
   * APRÈS. Plus rien ne demande d'image, donc `useFrame` n'est jamais appelé, et
   * le panneau affiche indéfiniment « aucune image mesurée » au-dessus d'une
   * scène parfaitement rendue.
   *
   * ⭐⭐ *Un observateur ne peut pas mesurer une scène qui dort sans la
   * réveiller.* Il demande donc une image — une seule. Les suivantes viendront
   * de ce que la scène rend de toute façon : un redimensionnement aujourd'hui,
   * les transitions de P6-04 demain. Invalider en boucle transformerait `demand`
   * en `always`, c'est-à-dire détruirait la propriété qu'on cherche à observer.
   */
  useEffect(() => invalidate(), [invalidate])

  /*
   * ⭐ NEXUS (`nexus-prototype.md` §6) : ce que le banc sans GPU ne peut pas
   * dire. La carte et l'extension se lisent une fois ; les tâches longues
   * s'observent depuis le début de la page (`buffered`) et ne sont imputées à
   * la scène qu'à partir de sa décision de montage.
   */
  useEffect(() => {
    const contexte = gl.getContext()
    const infos = contexte.getExtension('WEBGL_debug_renderer_info')
    materiel.current = {
      gpu: infos ? String(contexte.getParameter(infos.UNMASKED_RENDERER_WEBGL)) : null,
      parallelCompile: contexte.getExtension('KHR_parallel_shader_compile') !== null,
    }
    if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) return
    tachesLongues.current = []
    const observateur = new PerformanceObserver((liste) => {
      for (const tache of liste.getEntries()) {
        tachesLongues.current?.push({ startTime: tache.startTime, duration: tache.duration })
      }
    })
    observateur.observe({ type: 'longtask', buffered: true })
    return () => observateur.disconnect()
  }, [gl])

  useFrame(() => {
    const debut = performance.now()
    gl.render(scene, camera)
    coutDerniereImage.current = performance.now() - debut
    // La première image se compte jusqu'à la FIN de son rendu : c'est là que le
    // pilote compile, et que se paie le coût mesuré au banc.
    if (premiereImage.current === null) premiereImage.current = performance.now()

    const maintenant = performance.now()
    if (!shouldSample(dernierReleve.current, maintenant)) return
    dernierReleve.current = maintenant

    onReadings({
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      programs: gl.info.programs?.length ?? null,
      framesRendered: gl.info.render.frame,
      lastFrameMs: coutDerniereImage.current,
      jsHeapMb: tasJsMo(),
      gpu: materiel.current.gpu,
      parallelCompile: materiel.current.parallelCompile,
      firstFrameMs:
        premiereImage.current === null ? null : premiereImage.current - decisionDeMontage(),
      longTasks:
        tachesLongues.current === null
          ? null
          : summarizeLongTasks(tachesLongues.current, decisionDeMontage()),
    })
  }, 1)

  return null
}

/**
 * Le panneau, hors du canvas.
 *
 * ⭐ `aria-hidden` : ce sont des nombres de débogage, pas du contenu. Les
 * annoncer à un lecteur d'écran ajouterait du bruit à une page dont
 * l'accessibilité est tenue à 0 violation — et le panneau n'apparaît que si
 * quelqu'un l'a explicitement demandé dans l'URL.
 */
export function DiagnosticsPanel({ readings }: { readonly readings: SceneReadings | null }) {
  return (
    <aside aria-hidden="true" data-scene-diagnostics className={styles.panneau}>
      {readings === null ? (
        /*
         * ⭐ Cet état N'EST PAS un remplissage : c'est le seul affichage qui
         * distingue « la scène n'a pas encore rendu » de « la scène est tombée ».
         * Sans lui, le panneau vide se lirait comme un panneau cassé.
         */
        <p className={styles.attente}>scène montée, aucune image mesurée</p>
      ) : (
        <dl className={styles.liste}>
          {diagnosticLines(readings).map((ligne) => (
            <div key={ligne.label} className={styles.ligne}>
              <dt>{ligne.label}</dt>
              <dd>{ligne.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  )
}
