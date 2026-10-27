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
import { useEffect, useRef } from 'react'
import { PerspectiveCamera } from 'three'

import { getCameraTarget } from '@/scene/state/camera-target'
import {
  clampOrbit,
  easeInOutCubic,
  framingFor,
  interpolatePose,
  orbitAround,
  parallaxFor,
  type Pose,
  poseOf,
  type Rect,
  transitionProgress,
} from '@/scene/state/camera-motion'
import { fovForAspect } from '@/scene/state/framing'
import { ORBIT_LIMITS, PARALLAX, transitionMs } from '@/scene/state/layout'
import type { SceneState } from '@/scene/state/scene-state'

export function CameraRig({
  state,
  free,
  animated,
  orbit,
}: {
  readonly state: SceneState
  readonly free: Rect | null
  readonly animated: boolean
  /** Faux sur un pointeur grossier : le tactile défile la page, il ne tourne pas la scène. */
  readonly orbit: boolean
}) {
  const get = useThree((s) => s.get)
  const goal = getCameraTarget(state)

  const shown = useRef<Pose>(poseOf(goal))
  const from = useRef<Pose>(poseOf(goal))
  const started = useRef<number | null>(null)
  const orbitGoal = useRef({ yawDeg: 0, pitchDeg: 0 })
  const orbitNow = useRef({ yawDeg: 0, pitchDeg: 0 })
  const parallax = useRef({ yawDeg: 0, pitchDeg: 0 })

  // Un nouvel état : la transition repart d'où la caméra EST.
  useEffect(() => {
    from.current = shown.current
    started.current = null
    orbitGoal.current = { yawDeg: 0, pitchDeg: 0 }
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
      orbitGoal.current = clampOrbit(
        orbitGoal.current.yawDeg - dx * 0.18,
        orbitGoal.current.pitchDeg + dy * 0.12,
        ORBIT_LIMITS,
      )
      get().invalidate()
    }
    const up = () => {
      last = null
    }
    // ⭐ La souris quitte la fenêtre (ou la fenêtre le focus) : la scène se redresse,
    // au lieu de rester inclinée vers le dernier bord touché.
    const recentrer = () => {
      parallax.current = { yawDeg: 0, pitchDeg: 0 }
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

  useFrame(({ clock, size, invalidate }, delta) => {
    const { camera } = get()
    if (!(camera instanceof PerspectiveCamera)) return

    const now = clock.elapsedTime * 1000
    if (started.current === null) started.current = now
    const duration = transitionMs(!animated)
    const t = easeInOutCubic(transitionProgress(now - started.current, duration))
    const pose = interpolatePose(from.current, poseOf(goal), t)
    shown.current = pose

    // L'orbite rattrape sa consigne avec amortissement ; sans mouvement, elle saute.
    // La consigne est la somme du glisser et de la parallaxe, bornée ensemble.
    const consigne = clampOrbit(
      orbitGoal.current.yawDeg + parallax.current.yawDeg,
      orbitGoal.current.pitchDeg + parallax.current.pitchDeg,
      ORBIT_LIMITS,
    )
    const k = animated ? Math.min(1, delta * 5) : 1
    orbitNow.current = {
      yawDeg: orbitNow.current.yawDeg + (consigne.yawDeg - orbitNow.current.yawDeg) * k,
      pitchDeg: orbitNow.current.pitchDeg + (consigne.pitchDeg - orbitNow.current.pitchDeg) * k,
    }
    const position = orbitAround(
      pose.position,
      pose.target,
      orbitNow.current.yawDeg,
      orbitNow.current.pitchDeg,
    )

    camera.position.set(...position)
    camera.lookAt(...pose.target)

    const framing = framingFor(free, size.width, size.height)
    camera.fov = fovForAspect(pose.fov, framing.aspect)
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
    const moving =
      t < 1 ||
      Math.abs(consigne.yawDeg - orbitNow.current.yawDeg) > 0.01 ||
      Math.abs(consigne.pitchDeg - orbitNow.current.pitchDeg) > 0.01
    if (moving) invalidate()
  })

  return null
}
