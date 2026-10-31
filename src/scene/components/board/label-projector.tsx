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
 * ⭐ Les tailles se mesurent une fois — pour une étiquette nouvelle (ou dont l'élément ou le
 * texte a changé), à chaque changement du canvas ou des polices —, pas à chaque image :
 * `offsetWidth` force une mise en page.
 * ⭐ Et rien n'est refait quand rien n'a bougé : caméra, canvas, zone et liste identiques à la
 * dernière projection, l'image ne relit ni n'écrit rien (`placeLabels` y est un point fixe).
 */
import { useFrame, useThree } from '@react-three/fiber'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import { type Camera, Matrix4, Vector3 } from 'three'

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
  /** L'élément et le texte mesurés : une liste nouvelle ne remesure que ce qui en diffère. */
  element: HTMLElement | null
  text: string | null
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
  /** Ce que la dernière projection a lu ; tout identique, l'image n'a rien à refaire. */
  readonly last: {
    camera: Camera | null
    readonly world: Matrix4
    readonly projection: Matrix4
    zone: Rect | null
    /** Le nombre d'éléments enregistrés : une étiquette montée après la liste se projette. */
    elements: number
    /** Faux pour forcer la prochaine projection (tailles oubliées par les polices). */
    valid: boolean
  }
}

const slotOf = (label: BoardLabel): Slot => ({
  label,
  candidate: { id: label.id, x: 0, y: 0, width: 0, height: 0, priority: label.priority },
  width: -1,
  height: -1,
  element: null,
  text: null,
  writtenX: Number.NaN,
  writtenY: Number.NaN,
})

/**
 * La case de `label` pour une liste nouvelle : celle de la liste d'avant, taille comprise, si
 * l'étiquette y était avec le même élément et le même texte ; une case neuve (à mesurer) sinon.
 * ⭐ La position écrite, elle, est oubliée : la case reprend sa place à la première image.
 */
function slotFor(label: BoardLabel, before: Slot | undefined, elements: LabelElements): Slot {
  const slot = slotOf(label)
  const element = elements.get(label.id)
  if (
    before !== undefined &&
    before.width >= 0 &&
    element !== undefined &&
    element === before.element &&
    element.textContent === before.text
  ) {
    slot.width = before.width
    slot.height = before.height
    slot.element = before.element
    slot.text = before.text
  }
  return slot
}

/** Oublie les tailles mesurées : la prochaine projection les relira. */
function forgetSizes(memo: Memo): void {
  for (const slot of memo.slots.values()) slot.width = -1
}

/** Vrai si rien de ce que lit la projection n'a changé depuis la dernière ; sinon, le retient. */
function unchanged(
  memo: Memo,
  labels: readonly BoardLabel[],
  elements: LabelElements,
  camera: Camera,
  width: number,
  height: number,
  zone: Rect,
): boolean {
  const { last } = memo
  const same =
    last.valid &&
    memo.labels === labels &&
    memo.width === width &&
    memo.height === height &&
    last.zone === zone &&
    last.elements === elements.size &&
    last.camera === camera &&
    last.world.equals(camera.matrixWorld) &&
    last.projection.equals(camera.projectionMatrix)
  if (!same) {
    last.valid = true
    last.camera = camera
    last.world.copy(camera.matrixWorld)
    last.projection.copy(camera.projectionMatrix)
    last.zone = zone
    last.elements = elements.size
  }
  return same
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
  // ⛔ Le rig vient de déplacer la caméra : sans cette ligne, la projection lirait la pose de
  // l'image PRÉCÉDENTE — un retard d'une image, visible en transition.
  camera.updateMatrixWorld()
  if (unchanged(memo, labels, elements, camera, width, height, zone)) return
  if (memo.labels !== labels) {
    // Une autre liste (vue, survol) : seules les étiquettes nouvelles, ou dont l'élément ou le
    // texte a changé, sont à remesurer.
    memo.labels = labels
    const before = memo.slots
    memo.slots = new Map(
      labels.map((label) => [label.id, slotFor(label, before.get(label.id), elements)]),
    )
  }
  if (memo.width !== width || memo.height !== height) {
    memo.width = width
    memo.height = height
    forgetSizes(memo)
  }
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
      slot.element = element
      slot.text = element.textContent
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
    last: {
      camera: null,
      world: new Matrix4(),
      projection: new Matrix4(),
      zone: null,
      elements: 0,
      valid: false,
    },
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
      // Rien d'autre n'a bougé : sans cela, la prochaine image se croirait à jour.
      memo.current.last.valid = false
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
