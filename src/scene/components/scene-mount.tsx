'use client'

/**
 * Le montage de la scène — ADR-0003, points 2 et 3.
 *
 * Trois propriétés, et chacune est une exigence écrite ailleurs :
 *
 * 1. **Import dynamique, `ssr: false`.** Three.js ne doit pas entrer dans le
 *    chunk initial ; le serveur n'a rien à rendre d'un canvas.
 * 2. **Après `idle`.** Le canvas n'entre jamais dans le chemin critique du LCP :
 *    il attend que le navigateur n'ait plus rien d'utile à faire.
 * 3. **`aria-hidden`, non focusable, aucun texte.** Rien n'y est écrit qui
 *    n'existe pas dans le DOM.
 *
 * ⭐ `data-scene-root` n'est pas décoratif : le banc E2E doit pouvoir désigner
 * CETTE couche et aucune autre. Un sélecteur `[aria-hidden="true"]` en attrape
 * d'autres dans la page — mesuré, il a fait passer au vert un contrôle qui ne
 * regardait pas la scène.
 *
 * ⛔ Et une quatrième propriété, qui ne se voit qu'à l'usage : au palier `none`, **rien
 * n'est importé du tout**. Ni canvas, ni contexte, ni octet de three. C'est la
 * décision de `shouldMountScene`, prise dans `capability/` pour être éprouvée
 * par assertion — ce fichier-ci est hors couverture, tenu par le banc E2E.
 */
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'

import { readCapability } from '@/scene/capability/adapter'
import {
  SCENE_WAITING,
  type SceneFailure,
  type SceneMountState,
  sceneFailed,
  sceneReady,
} from '@/scene/capability/mount-state'
import { resolveCapability, shouldMountScene } from '@/scene/capability/resolve'

import { SceneBoundary } from './scene-boundary'
import styles from './scene-mount.module.css'

const SceneCanvas = dynamic(() => import('./scene-canvas'), { ssr: false })

/**
 * `requestIdleCallback` n'existe pas sur Safari avant la version 18.2. Le repli
 * n'est pas cosmétique : sans lui, la scène ne se monterait **jamais** sur ces
 * navigateurs, et rien ne le dirait — la page resterait simplement documentaire.
 *
 * ⛔ **Le repli attend aussi longtemps que l'échéance de `requestIdleCallback`,
 * et pas moins.** Une première écriture le posait à 200 ms : dix fois plus tôt,
 * sans le moindre signal d'inactivité, et précisément sur les navigateurs et les
 * appareils les plus lents — c'est-à-dire ceux dont la fenêtre de LCP est la plus
 * longue. Un repli plus pressé que ce qu'il remplace n'est pas un repli.
 */
const ECHEANCE_MS = 2_000

function auRepos(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: ECHEANCE_MS })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(callback, ECHEANCE_MS)
  return () => window.clearTimeout(id)
}

export function SceneMount() {
  const [etat, setEtat] = useState<SceneMountState>(SCENE_WAITING)

  /*
   * ⭐ La bascule est **une seule fonction pour les trois causes**, parce que le
   * palier d'arrivée est le même (ADR-0003 point 5). Ce qui diffère est
   * l'endroit où la défaillance se voit : la frontière d'erreur pour ce qui
   * jette au rendu, un écouteur du DOM pour la perte de contexte.
   */
  const abandonner = useCallback((cause: SceneFailure) => {
    setEtat((precedent) => sceneFailed(precedent, cause))
  }, [])

  const surPerteDeContexte = useCallback(() => {
    abandonner('context-lost')
  }, [abandonner])

  useEffect(
    () =>
      /*
       * ⛔⛔ **La LECTURE elle-même attend, pas seulement le montage.** Une
       * première écriture appelait `readCapability` tout de suite et ne différait
       * que le `setState` — or cette lecture **crée un vrai contexte WebGL** et le
       * relâche, ce qui coûte des dizaines de millisecondes d'initialisation
       * pilote sur un appareil modeste, en pleine hydratation. Elle le faisait
       * même pour qui a demandé `save-data` et ne verra jamais la scène : les deux
       * promesses de cette tâche — « jamais dans le chemin critique » et « le
       * palier `none` ne paie rien » — n'étaient donc vraies qu'à moitié.
       */
      auRepos(() => {
        const lu = resolveCapability(readCapability(window))
        if (shouldMountScene(lu)) setEtat((precedent) => sceneReady(precedent, lu))
      }),
    [],
  )

  /*
   * ⛔ Une scène abandonnée disparaît **entièrement**, enveloppe comprise : c'est
   * ce que veut dire « basculer en `none` ». Laisser la couche vide en place
   * donnerait un palier `none` qui ne ressemble pas à celui d'un visiteur sans
   * WebGL — et le banc qui prouve l'absence désigne précisément cette enveloppe.
   */
  if (etat.phase !== 'mounted') return null

  return (
    <div aria-hidden="true" data-scene-root className={styles.decor}>
      <SceneBoundary onFailure={abandonner}>
        <SceneCanvas capability={etat.capability} onContextLost={surPerteDeContexte} />
      </SceneBoundary>
    </div>
  )
}
