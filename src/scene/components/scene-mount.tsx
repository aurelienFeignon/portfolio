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
import { useEffect, useState } from 'react'

import { readCapability } from '@/scene/capability/adapter'
import { type Capability, resolveCapability, shouldMountScene } from '@/scene/capability/resolve'

import styles from './scene-mount.module.css'

const SceneCanvas = dynamic(() => import('./scene-canvas'), { ssr: false })

/**
 * `requestIdleCallback` n'existe pas sur Safari avant la version 18.2. Le repli
 * n'est pas cosmétique : sans lui, la scène ne se monterait **jamais** sur ces
 * navigateurs, et rien ne le dirait — la page resterait simplement documentaire.
 */
function auRepos(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: 2_000 })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(callback, 200)
  return () => window.clearTimeout(id)
}

export function SceneMount() {
  const [capability, setCapability] = useState<Capability | null>(null)

  useEffect(() => {
    const lu = resolveCapability(readCapability(window))
    if (!shouldMountScene(lu)) return undefined

    return auRepos(() => setCapability(lu))
  }, [])

  if (capability === null) return null

  return (
    <div aria-hidden="true" data-scene-root className={styles.decor}>
      <SceneCanvas capability={capability} />
    </div>
  )
}
