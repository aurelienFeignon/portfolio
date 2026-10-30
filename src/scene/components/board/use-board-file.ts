'use client'

/**
 * Le plan de carte de la locale affichée, chargé dans son propre chunk (P8-15c).
 *
 * ⛔⛔ **Un `import()` résolu dans un effet, jamais `next/dynamic`** : ce hook sert dans
 * l'arbre du `<Canvas>`, rendu par le réconciliateur de R3F, qui refuse le `use()` de
 * `next/dynamic` (React #438, voir `useSonde` dans `scene-canvas.tsx`).
 *
 * ⭐ **`null` tant que le fichier n'est pas arrivé** — et tant que celui qui est arrivé n'est
 * pas celui de la locale demandée : un changement de langue ne montre jamais, même une image,
 * le plan de l'autre.
 *
 * ⭐ **Une erreur de chargement est relancée AU RENDU** (l'updater qui lève) : c'est là que
 * `SceneBoundary` la voit. Un chunk manquant ou un plan périmé (`StaleBoardFileError`) donne
 * une page sans scène, jamais une scène qui attend en silence.
 */
import { useEffect, useState } from 'react'

import type { Locale } from '@/i18n/locales'
import type { BoardFile } from '@/scene/state/board-render/file-format'
import { boardFileLoader } from '@/scene/state/board-render/load'

interface Charge {
  readonly locale: Locale
  readonly file: BoardFile
}

export function useBoardFile(locale: Locale): BoardFile | null {
  const [charge, setCharge] = useState<Charge | null>(null)
  useEffect(() => {
    let vivant = true
    boardFileLoader(locale)().then(
      (file) => {
        if (vivant) setCharge({ locale, file })
      },
      (erreur: unknown) => {
        if (vivant)
          setCharge(() => {
            throw erreur
          })
      },
    )
    return () => {
      vivant = false
    }
  }, [locale])
  return charge !== null && charge.locale === locale ? charge.file : null
}
