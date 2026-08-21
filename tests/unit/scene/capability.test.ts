/**
 * P5-03 — les quatre paliers de capacité d'ADR-0003, décidés par une fonction pure.
 *
 * ⭐ **La fonction ne lit rien.** Toute API navigateur est lue par l'adaptateur,
 * qui est la seule partie non testable sans DOM. C'est ce qui permet d'éprouver
 * ici les combinaisons qu'aucun banc ne peut produire à la demande — un appareil
 * sans WebGL2, une mémoire de 2 Go, `save-data` actif.
 *
 * ⛔ **L'ordre de résolution EST la décision.** Les conditions d'ADR-0003 se
 * chevauchent : un mobile qui demande `reduced-motion` satisfait à la fois
 * « lite » et « reduced ». La fonction retient toujours le palier le **plus
 * bas** — refuser du mouvement à qui en demande moins est correct, servir une
 * scène animée à un appareil qui ne la tient pas ne l'est pas.
 */
import { describe, expect, it } from 'vitest'

import {
  type CapabilityInput,
  resolveCapability,
  resolveCapabilityTier,
  shouldMountScene,
} from '@/scene/capability/resolve'

/** Un appareil de bureau capable : le point de départ de chaque cas. */
const CAPABLE: CapabilityInput = {
  webgl: 'webgl2',
  pointer: 'fine',
  prefersReducedMotion: false,
  saveData: false,
  deviceMemoryGb: 8,
  logicalCores: 8,
}

const avec = (patch: Partial<CapabilityInput>): CapabilityInput => ({ ...CAPABLE, ...patch })

describe('resolveCapabilityTier', () => {
  it('rend « full » sur un appareil capable', () => {
    expect(resolveCapabilityTier(CAPABLE)).toBe('full')
  })

  describe('« none » — le site reste documentaire, la scène ne coûte rien', () => {
    it.each([
      ['aucun WebGL', avec({ webgl: 'none' })],
      ['save-data demandé', avec({ saveData: true })],
    ])('%s', (_libelle, input) => {
      expect(resolveCapabilityTier(input)).toBe('none')
    })

    it('l’emporte sur tout le reste, même sur un appareil par ailleurs capable', () => {
      expect(
        resolveCapabilityTier(avec({ saveData: true, webgl: 'webgl2', deviceMemoryGb: 16 })),
      ).toBe('none')
    })
  })

  describe('« lite » — scène décorative, sur un appareil qui ne tient pas plus', () => {
    it.each([
      ['WebGL1 seul', avec({ webgl: 'webgl1' })],
      ['pointeur grossier, donc tactile', avec({ pointer: 'coarse' })],
      ['aucun pointeur', avec({ pointer: 'none' })],
      ['mémoire faible', avec({ deviceMemoryGb: 2 })],
    ])('%s', (_libelle, input) => {
      expect(resolveCapabilityTier(input)).toBe('lite')
    })
  })

  describe('« reduced » — la scène est rendue, le mouvement ne l’est pas', () => {
    it.each([
      ['mouvement réduit demandé', avec({ prefersReducedMotion: true })],
      ['appareil moyen par la mémoire', avec({ deviceMemoryGb: 4 })],
      ['appareil moyen par les cœurs', avec({ logicalCores: 2 })],
    ])('%s', (_libelle, input) => {
      expect(resolveCapabilityTier(input)).toBe('reduced')
    })
  })

  describe('⛔ le palier le plus BAS l’emporte quand deux conditions se chevauchent', () => {
    it('un mobile qui demande du mouvement réduit reste « lite », pas « reduced »', () => {
      expect(resolveCapabilityTier(avec({ pointer: 'coarse', prefersReducedMotion: true }))).toBe(
        'lite',
      )
    })

    it('un appareil sans WebGL qui demande du mouvement réduit reste « none »', () => {
      expect(resolveCapabilityTier(avec({ webgl: 'none', prefersReducedMotion: true }))).toBe(
        'none',
      )
    })
  })

  describe('⛔⛔ une mesure ABSENTE n’est pas une mesure BASSE', () => {
    /*
     * `navigator.deviceMemory` n'existe que sur les navigateurs Chromium. Firefox
     * et Safari ne l'implémentent pas — et les traiter comme « 0 Go » enverrait
     * TOUS leurs visiteurs en « lite » sur un défaut d'instrument, pas de machine.
     */
    it('une mémoire inconnue ne dégrade rien à elle seule', () => {
      expect(resolveCapabilityTier(avec({ deviceMemoryGb: null }))).toBe('full')
    })

    it('un nombre de cœurs inconnu ne dégrade rien à lui seul', () => {
      expect(resolveCapabilityTier(avec({ logicalCores: null }))).toBe('full')
    })

    it('mais les autres axes continuent de décider', () => {
      expect(resolveCapabilityTier(avec({ deviceMemoryGb: null, webgl: 'webgl1' }))).toBe('lite')
    })
  })
})

describe('⛔⛔ resolveCapability — le mouvement ne se déduit pas du palier', () => {
  /*
   * Le défaut que ces cas ferment : `pointer !== 'fine'` décide avant tout le
   * reste, donc un mobile tombait en `lite` sans que `prefersReducedMotion` ne
   * soit jamais évalué. ADR-0003 n'interdit pas le mouvement au palier `lite` —
   * un iPhone avec « Réduire les animations » recevait une scène animée.
   */
  it('honore la préférence sur un mobile, là où le palier seul la perdait', () => {
    expect(resolveCapability(avec({ pointer: 'coarse', prefersReducedMotion: true }))).toEqual({
      tier: 'lite',
      motion: 'instant',
    })
  })

  it('l’honore aussi au palier le plus bas, où plus aucune condition ne la porterait', () => {
    expect(resolveCapability(avec({ webgl: 'none', prefersReducedMotion: true }))).toEqual({
      tier: 'none',
      motion: 'instant',
    })
  })

  it.each([
    ['un poste capable', CAPABLE, 'full'],
    ['un appareil moyen', avec({ logicalCores: 2 }), 'reduced'],
  ])('laisse « animated » sur %s qui ne demande rien', (_libelle, input, tier) => {
    expect(resolveCapability(input)).toEqual({ tier, motion: 'animated' })
  })

  it('garde le palier `reduced` d’ADR-0003 quand la préférence vient d’un poste capable', () => {
    // Le tableau d'ADR-0003 fait de `reduced-motion` une condition de palier :
    // la préférence coupe aussi l'ambiance, pas seulement les transitions.
    expect(resolveCapability(avec({ prefersReducedMotion: true }))).toEqual({
      tier: 'reduced',
      motion: 'instant',
    })
  })
})

describe('shouldMountScene', () => {
  it.each(['full', 'reduced', 'lite'] as const)('monte au palier « %s »', (tier) => {
    expect(shouldMountScene({ tier, motion: 'animated' })).toBe(true)
  })

  it('⛔ ne monte RIEN au palier « none » — pas même un canvas vide', () => {
    // Le sens du palier est qu'aucun octet de three ne soit téléchargé : un
    // appareil qui a demandé `save-data` ne paie pas un chunk pour ne rien voir.
    expect(shouldMountScene({ tier: 'none', motion: 'instant' })).toBe(false)
  })

  it('ne regarde pas la préférence de mouvement — elle ne décide pas du montage', () => {
    expect(shouldMountScene({ tier: 'full', motion: 'instant' })).toBe(true)
  })
})
