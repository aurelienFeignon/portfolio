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
 *    la cible, dans `ORBIT_LIMITS`. C'est un état de présentation — il revient à
 *    zéro à chaque changement de route, et n'entre jamais dans l'URL.
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
  type Pose,
  poseOf,
  type Rect,
  transitionProgress,
} from '@/scene/state/camera-motion'
import { fovForAspect } from '@/scene/state/framing'
import { ORBIT_LIMITS, transitionMs } from '@/scene/state/layout'
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
    element.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      element.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [orbit, get])

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
    const k = animated ? Math.min(1, delta * 5) : 1
    orbitNow.current = {
      yawDeg: orbitNow.current.yawDeg + (orbitGoal.current.yawDeg - orbitNow.current.yawDeg) * k,
      pitchDeg:
        orbitNow.current.pitchDeg + (orbitGoal.current.pitchDeg - orbitNow.current.pitchDeg) * k,
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
      Math.abs(orbitGoal.current.yawDeg - orbitNow.current.yawDeg) > 0.01 ||
      Math.abs(orbitGoal.current.pitchDeg - orbitNow.current.pitchDeg) > 0.01
    if (moving) invalidate()
  })

  return null
}
