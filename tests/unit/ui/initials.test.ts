/**
 * Initiales d'un nom affiché (P4-08).
 */
import { describe, expect, it } from 'vitest'

import { initials } from '@/ui/initials'

describe('initiales', () => {
  it('prend la première lettre de chaque mot', () => {
    expect(initials('Aurélien Feignon')).toBe('AF')
  })

  it('met en capitales', () => {
    expect(initials('aurélien feignon')).toBe('AF')
  })

  it('s’arrête à deux lettres', () => {
    // L'icône fait 32 px : trois lettres y seraient illisibles.
    expect(initials('Jean Sébastien Bach')).toBe('JS')
  })

  it('accepte un nom d’un seul mot', () => {
    expect(initials('Prince')).toBe('P')
  })

  it('ignore les espaces surnuméraires', () => {
    expect(initials('  Aurélien   Feignon ')).toBe('AF')
  })

  it('rend une chaîne vide pour un nom vide, plutôt que de lever', () => {
    // Le cas ne peut pas venir du dictionnaire — le test de non-régression
    // refuse les valeurs vides — mais une fonction qui lève ici casserait le
    // build pour une icône.
    expect(initials('   ')).toBe('')
  })
})
