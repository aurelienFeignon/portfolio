'use client'

/**
 * Les étiquettes des univers suivent la caméra — sans rien écrire dans la scène.
 *
 * Les étiquettes sont du HTML, rendu par `SceneMount` **hors** de la racine de
 * scène (ADR-0003, ADR-0004 : aucun texte peint dans une texture). Ce composant
 * ne fait que les **placer** : à chaque image, il projette l'ancre de chaque
 * univers et écrit la position dans le style de l'élément.
 *
 * ⭐ Écrit directement dans le DOM, jamais par un état React : un `setState` à
 * chaque image re-rendrait le montage entier soixante fois par seconde.
 */
import { useFrame } from '@react-three/fiber'
import { type RefObject, useRef } from 'react'
import { type Camera, Vector3 } from 'three'

import { SECTIONS, type Section } from '@/routing/sections'
import { labelPlacement, type Rect } from '@/scene/state/camera-motion'
import { labelAnchor } from '@/scene/state/layout'

export type LabelAnchors = Partial<Record<Section, HTMLElement | null>>

/**
 * Écrit la position de chaque étiquette — hors du composant, et c'est voulu :
 * comme pour les constructeurs de `builders.ts`, ces éléments ne sont pas de
 * l'état React, et leur mutation **est** l'API (même raisonnement que `get()`
 * pour la caméra en P5-06).
 */
function placeLabels(
  anchors: LabelAnchors,
  camera: Camera,
  width: number,
  height: number,
  free: Rect | null,
  point: Vector3,
): void {
  // ⛔ Le rig vient de déplacer la caméra : sa matrice monde n'est recalculée
  // qu'au rendu, donc projeter sans cette ligne placerait l'étiquette sur la
  // pose de l'image PRÉCÉDENTE — un retard d'une image, visible en transition.
  camera.updateMatrixWorld()
  for (const section of SECTIONS) {
    const element = anchors[section]
    if (!element) continue
    const ndc = point.set(...labelAnchor(section)).project(camera)
    const { x, y, visible } = labelPlacement([ndc.x, ndc.y, ndc.z], width, height, free)
    element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    element.dataset['visible'] = String(visible)
  }
}

export function LabelProjector({
  anchors,
  free,
}: {
  readonly anchors: RefObject<LabelAnchors>
  readonly free: Rect | null
}) {
  const point = useRef(new Vector3())

  useFrame(({ camera, size }) => {
    placeLabels(anchors.current, camera, size.width, size.height, free, point.current)
  })

  return null
}
