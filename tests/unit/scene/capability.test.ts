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

import { type CapabilityInput, resolveCapabilityTier } from '@/scene/capability/resolve'

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
