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

/**
 * ⛔⛔ **Le mouvement ne se déduit PAS du palier, et c'est un défaut corrigé.**
 *
 * La première écriture ne rendait que le palier. Or `pointer !== 'fine'` décide
 * avant tout le reste : un mobile tombait en `lite`, et la demande de mouvement
 * réduit n'était **jamais évaluée**. ADR-0003 ne garantit l'absence de mouvement
 * qu'au palier `reduced` — il définit `lite` comme « scène décorative non
 * interactive, **ou** visuel statique », ce qui autorise une décoration animée.
 * Un iPhone avec « Réduire les animations » recevait donc une scène animée,
 * pendant que la même préférence était honorée sur un poste fixe.
 *
 * ⭐⭐ **Une préférence d'accessibilité et un coût matériel sont deux axes
 * orthogonaux ; les projeter sur un seul ordinal en perd un.** Le palier dit ce
 * que l'appareil peut rendre, `motion` dit ce que la personne accepte de voir —
 * et l'ordre d'arbitrage du projet met l'accessibilité avant la richesse de la
 * scène.
 */
export type MotionPreference = 'animated' | 'instant'

export interface Capability {
  readonly tier: CapabilityTier
  readonly motion: MotionPreference
}

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

/**
 * La décision complète : ce que l'appareil peut rendre, **et** ce que la
 * personne accepte de voir.
 *
 * ⭐ `motion` est lu **directement** dans l'entrée, sans passer par le palier :
 * c'est ce qui garantit qu'aucune branche de capacité ne peut l'avaler. Un
 * consommateur qui n'écoute que le palier laisserait la préférence sur le
 * carreau à chaque fois que l'appareil est par ailleurs limité.
 */
export function resolveCapability(input: CapabilityInput): Capability {
  return {
    tier: resolveCapabilityTier(input),
    motion: input.prefersReducedMotion ? 'instant' : 'animated',
  }
}

/**
 * Faut-il monter la scène ?
 *
 * ⭐ La question est posée **ici**, et non dans le composant de montage, parce
 * que `src/scene/components` est exclu de la mesure de couverture — il est tenu
 * par le banc E2E. Une décision écrite là-bas ne serait éprouvée que par un
 * navigateur ; écrite ici, elle l'est aussi par assertion.
 *
 * ⛔ `none` n'est pas « une scène vide » : c'est **aucun canvas, aucun contexte
 * WebGL, aucun octet de three téléchargé**. La différence est tout le sens du
 * palier (ADR-0003) — un appareil qui a demandé `save-data` ne doit pas payer le
 * chunk pour ne rien voir.
 */
export function shouldMountScene(capability: Capability): boolean {
  return capability.tier !== 'none'
}
