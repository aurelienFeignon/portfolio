'use client'

/**
 * Les étiquettes de la carte suivent la caméra — sans rien écrire dans la scène (P8-15g, §8).
 *
 * Les étiquettes sont du HTML, rendu par `SceneMount` **hors** de la racine de scène (ADR-0003,
 * ADR-0004 : aucun texte peint). Ce composant ne fait que les **placer** : la vue dit lesquelles
 * montrer (`labelsForView`), chaque image projette leurs ancres, ramène dans la zone libre celles
 * dont l'ancre y est, écarte les autres et les moins prioritaires d'un chevauchement
 * (`placeLabels`, avec hystérésis), et écrit position et visibilité dans le DOM.
 *
 * ⭐ Écrit directement dans le DOM, jamais par un état React : un `setState` à chaque image
 * re-rendrait le montage entier soixante fois par seconde.
 * ⭐ Les tailles se mesurent une fois — à chaque changement de la liste, du canvas ou des
 * polices —, pas à chaque image : `offsetWidth` force une mise en page.
 */
import { useFrame, useThree } from '@react-three/fiber'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import { type Camera, Vector3 } from 'three'

import type { BoardFile } from '@/scene/state/board-render/file-format'
import {
  type BoardLabel,
  labelsForView,
  type PlacedCandidate,
  placeLabels,
  toScreen,
} from '@/scene/state/board-render/labels'
import type { BoardTarget } from '@/scene/state/board-render/targets'
import type { Rect } from '@/scene/state/camera-motion'
import type { SceneFocus } from '@/scene/state/scene-state'

/** Les éléments des étiquettes, par identifiant (`boardLabelId`), que `SceneMount` enregistre. */
export type LabelElements = Map<string, HTMLElement>

/** Une étiquette demandée : sa case de placement, et ce qui a été écrit en dernier. */
interface Slot {
  readonly label: BoardLabel
  readonly candidate: PlacedCandidate
  /** La taille rendue ; `-1` tant qu'elle n'est pas mesurée. */
  width: number
  height: number
  /** La dernière position écrite, pour ne refaire la chaîne `transform` que si elle bouge. */
  writtenX: number
  writtenY: number
}

/** Ce que le projecteur garde d'une image à l'autre — muté hors du rendu, jamais pendant. */
interface Memo {
  labels: readonly BoardLabel[] | null
  slots: Map<string, Slot>
  /** Les candidates de l'image, tableau réutilisé (trié sur place par `placeLabels`). */
  readonly shown: PlacedCandidate[]
  /** Les visibles de l'image précédente (hystérésis) et de l'image courante, échangés. */
  previous: Set<string>
  current: Set<string>
  width: number
  height: number
}

const slotOf = (label: BoardLabel): Slot => ({
  label,
  candidate: { id: label.id, x: 0, y: 0, width: 0, height: 0, priority: label.priority },
  width: -1,
  height: -1,
  writtenX: Number.NaN,
  writtenY: Number.NaN,
})

/** Oublie les tailles mesurées : la prochaine image les relira. */
function forgetSizes(memo: Memo): void {
  for (const slot of memo.slots.values()) slot.width = -1
}

/**
 * Une image : projette, ramène dans la zone, départage, écrit — hors du composant, et c'est
 * voulu : ces éléments ne sont pas de l'état React, et leur mutation **est** l'API (même
 * raisonnement que `get()` pour la caméra en P5-06). ⭐ Rien n'est alloué à l'image courante,
 * hors la chaîne `transform` d'une étiquette qui a bougé.
 */
function project(
  memo: Memo,
  labels: readonly BoardLabel[],
  elements: LabelElements,
  camera: Camera,
  width: number,
  height: number,
  zone: Rect,
  point: Vector3,
): void {
  if (memo.labels !== labels) {
    // Une autre liste (vue, survol, locale) : des textes peut-être autres, donc à remesurer.
    memo.labels = labels
    memo.slots = new Map(labels.map((label) => [label.id, slotOf(label)]))
  }
  if (memo.width !== width || memo.height !== height) {
    memo.width = width
    memo.height = height
    forgetSizes(memo)
  }
  // ⛔ Le rig vient de déplacer la caméra : sans cette ligne, la projection lirait la pose de
  // l'image PRÉCÉDENTE — un retard d'une image, visible en transition.
  camera.updateMatrixWorld()
  /*
   * ⭐ Toutes les LECTURES de taille d'abord, toutes les écritures ensuite : entrelacées, chaque
   * `offsetWidth` forcerait le navigateur à recalculer la mise en page que l'écriture précédente
   * vient de salir.
   */
  const { shown } = memo
  shown.length = 0
  for (const slot of memo.slots.values()) {
    const element = elements.get(slot.label.id)
    if (element === undefined) continue
    if (slot.width < 0) {
      slot.width = element.offsetWidth
      slot.height = element.offsetHeight
    }
    const c = slot.candidate
    c.width = slot.width
    c.height = slot.height
    const ndc = point
      .set(slot.label.anchor[0], slot.label.anchor[1], slot.label.anchor[2])
      .project(camera)
    if (toScreen(c, ndc.x, ndc.y, ndc.z, width, height)) shown.push(c)
  }
  placeLabels(shown, zone, memo.previous, memo.current)
  // Les visibles de cette image deviennent la référence de l'hystérésis ; l'autre ensemble resservira.
  const visible = memo.current
  memo.current = memo.previous
  memo.previous = visible
  // Toutes les étiquettes du DOM : celles que la vue ne demande pas se cachent.
  for (const [id, element] of elements) {
    const slot = memo.slots.get(id)
    const shownNow = visible.has(id)
    if (slot !== undefined && shownNow) {
      const { x, y } = slot.candidate
      // ⭐ Au dixième de pixel, comme l'écriture : une caméra immobile ne construit rien.
      if (
        Math.round(x * 10) !== Math.round(slot.writtenX * 10) ||
        Math.round(y * 10) !== Math.round(slot.writtenY * 10)
      ) {
        slot.writtenX = x
        slot.writtenY = y
        element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      }
    }
    const flag = shownNow ? 'true' : 'false'
    if (element.dataset['visible'] !== flag) element.dataset['visible'] = flag
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
  const memo = useRef<Memo>({
    labels: null,
    slots: new Map(),
    shown: [],
    previous: new Set(),
    current: new Set(),
    width: 0,
    height: 0,
  })
  const invalidate = useThree((state) => state.invalidate)
  // La liste ne change qu'avec la vue, le survol ou le plan — pas à chaque image.
  const labels = useMemo(() => labelsForView(file, focus, hovered), [file, focus, hovered])

  /*
   * Une police arrivée après la première mesure change la largeur des étiquettes : on oublie les
   * tailles, et on demande une image (en boucle `demand`, rien d'autre ne la rendrait).
   */
  useEffect(() => {
    const fonts = typeof document === 'undefined' ? undefined : document.fonts
    if (fonts === undefined) return
    let alive = true
    const remeasure = () => {
      if (!alive) return
      forgetSizes(memo.current)
      invalidate()
    }
    void fonts.ready.then(remeasure)
    fonts.addEventListener('loadingdone', remeasure)
    return () => {
      alive = false
      fonts.removeEventListener('loadingdone', remeasure)
    }
  }, [invalidate])

  useFrame(({ camera, size }) => {
    if (zone === null) return
    project(
      memo.current,
      labels,
      elements.current,
      camera,
      size.width,
      size.height,
      zone,
      point.current,
    )
  })

  return null
}
