/**
 * Les quatre paliers de capacité d'ADR-0003, décidés **sans lire quoi que ce soit**.
 *
 * ⭐ Cette fonction est pure, et c'est ce qui la rend éprouvable : les
 * combinaisons qui décident du palier — un appareil sans WebGL2, une mémoire de
 * 2 Go, `save-data` actif — ne se produisent pas sur commande dans un banc. La
 * lecture des API du navigateur est isolée dans `adapter.ts`, qui est la seule
 * partie qu'un test ne peut pas couvrir en totalité.
 */

/** Du plus capable au moins coûteux. L'ordre du tableau **est** la hiérarchie. */
export const CAPABILITY_TIERS = ['full', 'reduced', 'lite', 'none'] as const

export type CapabilityTier = (typeof CAPABILITY_TIERS)[number]

export interface CapabilityInput {
  /** `none` couvre autant l'absence de WebGL que l'échec de création du contexte. */
  readonly webgl: 'none' | 'webgl1' | 'webgl2'
  /** `matchMedia('(pointer: fine)')` et compagnie : un pointeur grossier signe un écran tactile. */
  readonly pointer: 'fine' | 'coarse' | 'none'
  readonly prefersReducedMotion: boolean
  /** `navigator.connection.saveData` : une demande explicite d'économiser, pas une supposition. */
  readonly saveData: boolean
  /**
   * ⛔ `null` signifie **inconnu**, jamais « faible ». `navigator.deviceMemory`
   * n'existe que sur Chromium : Firefox et Safari ne l'implémentent pas, et
   * confondre l'absence de mesure avec une mesure basse enverrait tous leurs
   * visiteurs en `lite` sur un défaut d'instrument plutôt que de machine.
   */
  readonly deviceMemoryGb: number | null
  /** Même règle : `navigator.hardwareConcurrency` peut manquer, et manquer n'est pas valoir peu. */
  readonly logicalCores: number | null
}

/**
 * Seuils. Ils ne sont pas dans ADR-0003, qui dit « mémoire faible » et « appareil
 * moyen » sans les chiffrer — ils sont donc **posés ici**, à l'endroit où ils
 * s'appliquent, plutôt que dispersés dans les conditions.
 *
 * ⚠️ `navigator.deviceMemory` est volontairement grossier : la spécification le
 * borne à [0,25 ; 8] et l'arrondit à une puissance de deux, pour ne pas devenir
 * un signal d'empreinte. Un seuil plus fin que ces paliers ne mesurerait rien.
 */
const MEMOIRE_FAIBLE_GO = 2
const MEMOIRE_MOYENNE_GO = 4
const COEURS_MOYENS = 4

/** `true` seulement si la mesure existe **et** se situe sous le seuil. */
const sousSeuil = (mesure: number | null, seuil: number): boolean =>
  mesure !== null && mesure <= seuil

/**
 * ⛔ **L'ordre des retours est la décision, pas une commodité d'écriture.** Les
 * conditions d'ADR-0003 se chevauchent : un mobile qui demande `reduced-motion`
 * satisfait à la fois « lite » et « reduced ». On retient toujours le palier le
 * plus bas — refuser du mouvement à qui en demande moins est correct ; servir
 * une scène animée à un appareil qui ne la tient pas ne l'est pas.
 */
export function resolveCapabilityTier(input: CapabilityInput): CapabilityTier {
  if (input.webgl === 'none' || input.saveData) return 'none'

  if (
    input.webgl === 'webgl1' ||
    input.pointer !== 'fine' ||
    sousSeuil(input.deviceMemoryGb, MEMOIRE_FAIBLE_GO)
  ) {
    return 'lite'
  }

  if (
    input.prefersReducedMotion ||
    sousSeuil(input.deviceMemoryGb, MEMOIRE_MOYENNE_GO) ||
    sousSeuil(input.logicalCores, COEURS_MOYENS)
  ) {
    return 'reduced'
  }

  return 'full'
}
