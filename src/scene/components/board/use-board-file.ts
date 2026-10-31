'use client'

/**
 * Le plan de carte de la locale affichée, chargé dans son propre chunk (P8-15c), par
 * `useLazyImport` — qui dit pourquoi un effet et non `next/dynamic`, et comment une erreur de
 * chargement atteint `SceneBoundary` (un chunk manquant, un plan périmé : `StaleBoardFileError`).
 *
 * ⭐ **`null` tant que le fichier n'est pas arrivé** — et tant que celui qui est arrivé n'est
 * pas celui de la locale demandée (la clé de `useLazyImport`) : un changement de langue ne
 * montre jamais, même une image, le plan de l'autre.
 */
import { useMemo } from 'react'

import type { Locale } from '@/i18n/locales'
import type { BoardFile } from '@/scene/state/board-render/file-format'
import { boardFileLoader } from '@/scene/state/board-render/load'

import { useLazyImport } from '../use-lazy-import'

export function useBoardFile(locale: Locale): BoardFile | null {
  const load = useMemo(() => boardFileLoader(locale), [locale])
  return useLazyImport(load, locale)
}
