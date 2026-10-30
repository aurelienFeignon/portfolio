'use client'

/**
 * Les étiquettes de la carte suivent la caméra — sans rien écrire dans la scène (P8-15g, §8).
 *
 * Les étiquettes sont du HTML, rendu par `SceneMount` **hors** de la racine de scène (ADR-0003,
 * ADR-0004 : aucun texte peint). Ce composant ne fait que les **placer** : la vue dit lesquelles
 * montrer (`labelsForView`), chaque image projette leurs ancres, écarte celles qui sortent de la
 * zone libre ou se chevauchent (`placeLabels`), et écrit position et visibilité dans le DOM.
 *
 * ⭐ Écrit directement dans le DOM, jamais par un état React : un `setState` à chaque image
 * re-rendrait le montage entier soixante fois par seconde.
 * ⭐ Les tailles se mesurent une fois — à chaque changement de la liste ou du canvas —, pas à
 * chaque image : `offsetWidth` force une mise en page.
 */
import { useFrame } from '@react-three/fiber'
import { type RefObject, useMemo, useRef } from 'react'
import { type Camera, Vector3 } from 'three'

import type { BoardFile } from '@/scene/state/board-render/file-format'
import {
  type BoardLabel,
  labelsForView,
  type PlacedCandidate,
  placeLabels,
} from '@/scene/state/board-render/labels'
import type { BoardTarget } from '@/scene/state/board-render/targets'
import { labelPlacement, type Rect } from '@/scene/state/camera-motion'
import type { SceneFocus } from '@/scene/state/scene-state'

/** Les éléments des étiquettes, par identifiant (`boardLabelId`), que `SceneMount` enregistre. */
export type LabelElements = Map<string, HTMLElement>

interface Size {
  readonly width: number
  readonly height: number
}

/** Une étiquette demandée, avec sa case de placement réutilisée d'une image à l'autre. */
interface Slot {
  readonly label: BoardLabel
  readonly candidate: { -readonly [K in keyof PlacedCandidate]: PlacedCandidate[K] }
}

/** Ce que le projecteur garde d'une image à l'autre — muté dans `useFrame`, jamais au rendu. */
interface Memo {
  labels: readonly BoardLabel[] | null
  slots: readonly Slot[]
  /** Les tailles rendues, mesurées à la demande ; vidées quand la liste ou le canvas change. */
  readonly sizes: Map<string, Size>
  width: number
  height: number
}

/** N'écrit que ce qui change : une caméra immobile ne salit rien. */
function write(element: HTMLElement, transform: string | null, visible: boolean): void {
  if (transform !== null && element.style.transform !== transform)
    element.style.transform = transform
  if (element.dataset['visible'] !== String(visible)) element.dataset['visible'] = String(visible)
}

/**
 * Une image : projette, départage, écrit — hors du composant, et c'est voulu : ces éléments ne
 * sont pas de l'état React, et leur mutation **est** l'API (même raisonnement que `get()` pour la
 * caméra en P5-06).
 */
function project(
  memo: Memo,
  labels: readonly BoardLabel[],
  elements: LabelElements,
  camera: Camera,
  size: Size,
  zone: Rect,
  point: Vector3,
): void {
  if (memo.labels !== labels || memo.width !== size.width || memo.height !== size.height) {
    // Une autre liste (vue, survol, locale) ou un autre canvas : des tailles peut-être autres.
    memo.sizes.clear()
    memo.width = size.width
    memo.height = size.height
    if (memo.labels !== labels) {
      memo.labels = labels
      memo.slots = labels.map((label) => ({
        label,
        candidate: { id: label.id, x: 0, y: 0, width: 0, height: 0, priority: label.priority },
      }))
    }
  }
  // ⛔ Le rig vient de déplacer la caméra : sans cette ligne, la projection lirait la pose de
  // l'image PRÉCÉDENTE — un retard d'une image, visible en transition.
  camera.updateMatrixWorld()
  /*
   * ⭐ Toutes les LECTURES de taille d'abord, toutes les écritures ensuite : entrelacées, chaque
   * `offsetWidth` forcerait le navigateur à recalculer la mise en page que l'écriture précédente
   * vient de salir.
   */
  const shown: PlacedCandidate[] = []
  for (const { label, candidate } of memo.slots) {
    const element = elements.get(label.id)
    if (element === undefined) continue
    let measured = memo.sizes.get(label.id)
    if (measured === undefined) {
      measured = { width: element.offsetWidth, height: element.offsetHeight }
      memo.sizes.set(label.id, measured)
    }
    const ndc = point.set(...label.anchor).project(camera)
    const at = labelPlacement([ndc.x, ndc.y, ndc.z], size.width, size.height, zone, measured)
    candidate.x = at.x
    candidate.y = at.y
    candidate.width = measured.width
    candidate.height = measured.height
    if (at.visible) shown.push(candidate)
  }
  const visible = placeLabels(shown, zone)
  // Toutes les étiquettes du DOM : celles que la vue ne demande pas se cachent.
  for (const [id, element] of elements) {
    const slot = memo.slots.find((s) => s.label.id === id)
    const transform =
      slot === undefined
        ? null
        : `translate3d(${slot.candidate.x.toFixed(1)}px, ${slot.candidate.y.toFixed(1)}px, 0)`
    write(element, transform, visible.has(id))
  }
}

export function LabelProjector({
  file,
  focus,
  hovered,
  elements,
  zone,
}: {
  readonly file: BoardFile
  readonly focus: SceneFocus
  readonly hovered: BoardTarget | null
  readonly elements: RefObject<LabelElements>
  /** Où les étiquettes peuvent se poser ; `null` tant qu'elle n'est pas mesurée. */
  readonly zone: Rect | null
}) {
  const point = useRef(new Vector3())
  const memo = useRef<Memo>({ labels: null, slots: [], sizes: new Map(), width: 0, height: 0 })
  // La liste ne change qu'avec la vue, le survol ou le plan — pas à chaque image.
  const labels = useMemo(() => labelsForView(file, focus, hovered), [file, focus, hovered])

  useFrame(({ camera, size }) => {
    if (zone === null) return
    project(memo.current, labels, elements.current, camera, size, zone, point.current)
  })

  return null
}
