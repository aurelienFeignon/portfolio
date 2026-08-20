/**
 * L'adaptateur : la seule partie de `capability/` qui **lit** le navigateur.
 *
 * ⭐ Il reçoit sa fenêtre en **argument** plutôt que d'atteindre la globale.
 * Une fonction qui lit `window` directement n'est éprouvable que dans un
 * environnement qui le fournit — et jsdom ne fournit précisément pas WebGL, donc
 * le seul cas qu'un banc pourrait produire serait `none`. En passant la fenêtre,
 * les six axes se décrivent, et le palier se vérifie sur des combinaisons réelles.
 *
 * ⚠️ Deux des six mesures n'existent que sur Chromium (`deviceMemory`,
 * `connection`). Elles rendent `null` ailleurs, et `resolveCapabilityTier`
 * traite `null` comme **inconnu**, jamais comme bas.
 */
import type { CapabilityInput } from './resolve'

/** La forme réellement lue, plutôt que le `Window` entier — ce qui est lu se voit. */
export interface CapabilitySource {
  readonly matchMedia: (query: string) => { readonly matches: boolean }
  readonly navigator: {
    readonly hardwareConcurrency?: number | undefined
    readonly deviceMemory?: number | undefined
    readonly connection?: { readonly saveData?: boolean | undefined } | undefined
  }
  readonly document: { createElement: (tag: 'canvas') => unknown }
}

/**
 * ⛔ **Le contexte obtenu est immédiatement rendu.** Un contexte WebGL retenu
 * compte dans la limite du navigateur (autour de 16 sur la plupart) et, sur
 * mobile, en réserver un pour une détection revient à le retirer à la scène
 * qu'on s'apprête à monter.
 */
function detecterWebgl(document: CapabilitySource['document']): CapabilityInput['webgl'] {
  let canvas: { getContext?: (type: string) => unknown } | null = null
  try {
    canvas = document.createElement('canvas') as { getContext?: (type: string) => unknown }
  } catch {
    return 'none'
  }

  /** Rend le contexte aussitôt obtenu — voir le commentaire ci-dessus. */
  const relacher = (contexte: unknown): void => {
    const extension = (contexte as { getExtension?: (nom: string) => unknown }).getExtension?.(
      'WEBGL_lose_context',
    ) as { loseContext?: () => void } | null | undefined
    extension?.loseContext?.()
  }

  const obtenir = (type: 'webgl2' | 'webgl'): unknown => {
    try {
      return canvas?.getContext?.(type) ?? null
    } catch {
      // Certains navigateurs LÈVENT au lieu de rendre `null` quand WebGL est
      // désactivé par configuration ; les deux disent la même chose.
      return null
    }
  }

  for (const [type, palier] of [
    ['webgl2', 'webgl2'],
    ['webgl', 'webgl1'],
  ] as const) {
    const contexte = obtenir(type)
    if (contexte !== null) {
      relacher(contexte)
      return palier
    }
  }

  return 'none'
}

function detecterPointeur(source: CapabilitySource): CapabilityInput['pointer'] {
  if (source.matchMedia('(pointer: fine)').matches) return 'fine'
  if (source.matchMedia('(pointer: coarse)').matches) return 'coarse'
  return 'none'
}

/** Traduit un navigateur en entrée de décision. Ne décide de rien lui-même. */
export function readCapability(source: CapabilitySource): CapabilityInput {
  const { navigator } = source

  return {
    webgl: detecterWebgl(source.document),
    pointer: detecterPointeur(source),
    prefersReducedMotion: source.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: navigator.connection?.saveData === true,
    deviceMemoryGb: navigator.deviceMemory ?? null,
    logicalCores: navigator.hardwareConcurrency ?? null,
  }
}
