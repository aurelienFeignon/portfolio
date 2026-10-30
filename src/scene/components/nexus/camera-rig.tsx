'use client'

/**
 * Le rig de caméra — P6-04, le premier appelant de `getCameraTarget`.
 *
 * ```text
 * URL ─▶ resolveSceneState ─▶ SceneState ─▶ getCameraTarget ─▶ ce rig ─▶ caméra
 * ```
 *
 * Trois responsabilités, et aucune décision : les calculs vivent dans
 * `camera-motion.ts`, éprouvés sans navigateur.
 *
 * 1. **La transition**, interruptible : un nouvel état repart de la pose
 *    AFFICHÉE, jamais de la pose de départ de la précédente.
 * 2. **L'orbite bornée** : un glisser à la souris fait tourner la vue autour de
 *    la cible, et la **parallaxe** l'incline de quelques degrés vers le pointeur,
 *    sans glisser — le tout dans `ORBIT_LIMITS`. C'est un état de présentation :
 *    l'orbite revient à zéro à chaque changement de route, et rien n'entre
 *    jamais dans l'URL.
 * 3. **Le cadrage dans la zone libre** : le panneau de lecture occupe une partie
 *    de l'écran, la scène se centre dans le reste (`framingFor`).
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { PerspectiveCamera } from 'three'

import { getCameraTarget } from '@/scene/state/camera-target'
import {
  dragOrbit,
  framingFor,
  ORBIT_REST,
  type OrbitAngles,
  parallaxFor,
  type Pose,
  poseOf,
  type Rect,
  rigFrame,
} from '@/scene/state/camera-motion'
import { type CameraSpec, ORBIT_LIMITS, PARALLAX, type ViewId } from '@/scene/state/layout'
import type { SceneState } from '@/scene/state/scene-state'

export function CameraRig({
  state,
  cameras,
  free,
  animated,
  orbit,
}: {
  readonly state: SceneState
  /** Les cadrages du plan de carte de la locale (P8-15c) ; la cible en est une instance. */
  readonly cameras: Readonly<Record<ViewId, CameraSpec>>
  readonly free: Rect | null
  readonly animated: boolean
  /** Faux sur un pointeur grossier : le tactile défile la page, il ne tourne pas la scène. */
  readonly orbit: boolean
}) {
  const get = useThree((s) => s.get)
  const goal = getCameraTarget(state, cameras)

  const shown = useRef<Pose>(poseOf(goal))
  const from = useRef<Pose>(poseOf(goal))
  const elapsed = useRef(0)
  const wasMoving = useRef(false)
  const drag = useRef<OrbitAngles>(ORBIT_REST)
  const orbitNow = useRef<OrbitAngles>(ORBIT_REST)
  const parallax = useRef<OrbitAngles>(ORBIT_REST)

  /*
   * Un nouvel état : la transition repart d'où la caméra EST.
   * ⛔ `useLayoutEffect`, pas `useEffect` (P6-12) : un effet passif peut s'exécuter
   * APRÈS une image, qui lirait alors le nouvel objectif avec l'ancien départ —
   * une transition déjà finie (`t = 1`) devenait une coupe. L'effet de mise en
   * page s'exécute au commit, avant toute image.
   */
  useLayoutEffect(() => {
    from.current = shown.current
    elapsed.current = 0
    drag.current = ORBIT_REST
    get().invalidate()
  }, [goal, get])

  // Le glisser, écouté sur le canvas lui-même.
  useEffect(() => {
    if (!orbit) return
    const element = get().gl.domElement
    let last: { x: number; y: number } | null = null
    const down = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      last = { x: event.clientX, y: event.clientY }
    }
    const move = (event: PointerEvent) => {
      /*
       * ⭐ La parallaxe suit la souris seule : au tactile, le doigt fait défiler
       * la page, et un stylet qui survole ne doit pas faire tanguer la scène.
       * Et jamais sous `prefers-reduced-motion` — un mouvement que personne n'a
       * demandé est précisément ce que cette préférence refuse.
       * ⛔ Et figée pendant un glisser : la parallaxe suit le pointeur vers la
       * droite quand le glisser tourne la vue vers la gauche — les deux se
       * contrariaient, et le geste paraissait freiné.
       */
      if (animated && event.pointerType === 'mouse' && last === null) {
        parallax.current = parallaxFor(
          (event.clientX / window.innerWidth) * 2 - 1,
          1 - (event.clientY / window.innerHeight) * 2,
          PARALLAX,
        )
        get().invalidate()
      }
      if (last === null) return
      const dx = event.clientX - last.x
      const dy = event.clientY - last.y
      last = { x: event.clientX, y: event.clientY }
      drag.current = dragOrbit(drag.current, dx, dy, ORBIT_LIMITS)
      get().invalidate()
    }
    const up = () => {
      last = null
    }
    // ⭐ La souris quitte la fenêtre (ou la fenêtre le focus) : la scène se redresse,
    // au lieu de rester inclinée vers le dernier bord touché.
    const recentrer = () => {
      parallax.current = ORBIT_REST
      get().invalidate()
    }
    const sortie = (event: PointerEvent) => {
      if (event.relatedTarget === null) recentrer()
    }
    element.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointerout', sortie)
    window.addEventListener('blur', recentrer)
    return () => {
      element.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointerout', sortie)
      window.removeEventListener('blur', recentrer)
    }
  }, [orbit, animated, get])

  useFrame(({ size, invalidate }, delta) => {
    const { camera } = get()
    if (!(camera instanceof PerspectiveCamera)) return

    const framing = framingFor(free, size.width, size.height)
    // Tout le calcul de l'image est pur (`rigFrame`, éprouvé sans navigateur) :
    // le rig ne fait que l'appliquer.
    const image = rigFrame({
      from: from.current,
      goal: poseOf(goal),
      elapsedMs: elapsed.current,
      orbitNow: orbitNow.current,
      drag: drag.current,
      parallax: parallax.current,
      limits: ORBIT_LIMITS,
      deltaS: delta,
      wasMoving: wasMoving.current,
      animated,
      aspect: framing.aspect,
    })
    shown.current = image.shown
    orbitNow.current = image.orbit
    elapsed.current = image.elapsedMs
    wasMoving.current = image.moving

    camera.position.set(...image.position)
    camera.lookAt(...image.shown.target)
    camera.fov = image.fov
    if (framing.offsetX === 0 && framing.offsetY === 0) camera.clearViewOffset()
    else
      camera.setViewOffset(
        size.width,
        size.height,
        framing.offsetX,
        framing.offsetY,
        size.width,
        size.height,
      )
    camera.updateProjectionMatrix()

    // ⭐ En `demand`, c'est le rig qui demande l'image suivante tant qu'il bouge.
    if (image.moving) invalidate()

    /*
     * ⭐ Pour le banc E2E, sans pixel : l'état que le rig a REÇU — il diverge de
     * l'URL si le rig devient sourd — et la transition de route seule, orbite et
     * parallaxe exclues. ⚠️ Sur une fiche (`never`), ils gardent la dernière image.
     */
    const dataset = get().gl.domElement.dataset
    if (dataset['cameraFocus'] !== state.focus) dataset['cameraFocus'] = state.focus
    const enTransition = String(image.transitioning)
    if (dataset['cameraTransition'] !== enTransition) dataset['cameraTransition'] = enTransition
  })

  return null
}
