'use client'

/**
 * Un module chargé à la demande **depuis l'arbre du `<Canvas>`** : `load` est appelé dans un
 * effet, son résultat posé dans un état, et rendu tant que `key` n'a pas changé.
 *
 * ⛔⛔ **Un `import()` résolu dans un effet, jamais `next/dynamic`.** Ce qui se rend DANS le
 * `<Canvas>` passe par le réconciliateur de R3F, pas par celui de React DOM. Depuis Next 16.4, un
 * composant `next/dynamic` s'y résout par `use()` et ce réconciliateur le refuse (React #438) :
 * la scène tombait, perdait son contexte WebGL, et le panneau de diagnostic attendait des
 * relevés qui ne venaient jamais (#63). Un module ordinaire, posé une fois chargé, ne demande
 * rien au réconciliateur. Le plan de carte (`use-board-file.ts`) et la sonde de diagnostic
 * (`scene-canvas.tsx`) passent tous deux par ici pour cette raison.
 *
 * ⭐ **`null` tant que rien n'est arrivé — et tant que ce qui est arrivé n'a pas été chargé pour
 * la `key` courante** : un changement de clé (une autre locale) ne montre jamais, même une image,
 * le résultat de l'ancienne.
 *
 * ⭐ **Une erreur de chargement est relancée AU RENDU** (l'updater qui lève) : c'est là que
 * `SceneBoundary` la voit. Un chunk introuvable (déploiement entre deux visites) ou un plan
 * périmé donne une page sans scène, jamais une scène qui attend en silence.
 *
 * `load` doit être stable pour une même `key` (une fonction de module, ou dérivée de `key`) ;
 * `null` ne charge rien.
 */
import { useEffect, useState } from 'react'

export function useLazyImport<T, K>(load: (() => Promise<T>) | null, key: K): T | null {
  const [loaded, setLoaded] = useState<{ readonly key: K; readonly value: T } | null>(null)
  useEffect(() => {
    if (load === null) return
    let vivant = true
    load().then(
      // Un objet, jamais la valeur nue : une fonction (un composant) serait prise pour un updater.
      (value) => {
        if (vivant) setLoaded({ key, value })
      },
      (erreur: unknown) => {
        if (vivant)
          setLoaded(() => {
            throw erreur
          })
      },
    )
    return () => {
      vivant = false
    }
  }, [load, key])
  return loaded !== null && Object.is(loaded.key, key) ? loaded.value : null
}
