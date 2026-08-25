/**
 * P5-06 — le cadrage quand l'écran n'est pas en 16:9.
 *
 * Le dossier de scène §6 calcule les quatre cadrages **pour un rapport 16:9** et
 * prescrit, en deçà, d'augmenter le `fov` plutôt que de reculer la caméra — pour
 * ne pas réintroduire le mur dans le champ. Ce module applique la règle aux
 * quatre cadrages ; ce banc la tient.
 */
import { describe, expect, it } from 'vitest'

import {
  FOV_MAX_DEG,
  REFERENCE_ASPECT,
  fovForAspect,
  horizontalFovDeg,
} from '@/scene/state/framing'

/** Le cadrage d'accueil, celui dont la perte se voit le plus. */
const ACCUEIL = 36

describe('correction du champ selon le format', () => {
  it('ne touche à rien en 16:9, le format pour lequel les cadrages sont calculés', () => {
    expect(fovForAspect(ACCUEIL, REFERENCE_ASPECT)).toBe(ACCUEIL)
  })

  it('⛔ ne RÉDUIT jamais le champ sur un écran plus large que 16:9', () => {
    // Un ultra-large voit déjà plus que la référence horizontalement. Resserrer le
    // `fov` vertical pour « compenser » lui retirerait de la hauteur — donc le
    // plateau et le mur — sans que rien ne le demande.
    expect(fovForAspect(ACCUEIL, 21 / 9)).toBe(ACCUEIL)
  })

  it('préserve le champ HORIZONTAL quand l’écran se resserre', () => {
    // C'est la propriété, pas le nombre : à 4:3, le champ horizontal doit valoir
    // ce qu'il valait en 16:9. Affirmer une valeur de `fov` vertical n'aurait
    // gardé que le symptôme.
    const attendu = horizontalFovDeg(ACCUEIL, REFERENCE_ASPECT)
    const corrige = fovForAspect(ACCUEIL, 4 / 3)

    expect(horizontalFovDeg(corrige, 4 / 3)).toBeCloseTo(attendu, 6)
    expect(corrige).toBeGreaterThan(ACCUEIL)
  })

  it('⛔⛔ PLAFONNE, parce que l’arithmétique seule donne un œil de poisson', () => {
    // iPhone 14 en portrait : 390 × 844, soit un rapport de 0,462. Préserver tout
    // le champ horizontal y demanderait **103°** de champ vertical — une
    // déformation que personne ne veut voir, et qui réintroduirait le décor que
    // les cadrages excluent volontairement.
    const portrait = 390 / 844

    expect(fovForAspect(ACCUEIL, portrait)).toBe(FOV_MAX_DEG)
  })

  it('⛔ le plafond ne RABAISSE pas un cadrage déjà plus large que lui', () => {
    // Sinon un cadrage volontairement très ouvert serait resserré par une règle
    // censée n'élargir que sous 16:9.
    const tresOuvert = FOV_MAX_DEG + 10

    expect(fovForAspect(tresOuvert, REFERENCE_ASPECT)).toBe(tresOuvert)
    expect(fovForAspect(tresOuvert, 0.5)).toBe(tresOuvert)
  })

  it('reste continue : un écart minime de format ne fait pas sauter le cadrage', () => {
    const juste = fovForAspect(ACCUEIL, REFERENCE_ASPECT - 0.001)

    expect(juste).toBeGreaterThan(ACCUEIL)
    expect(juste).toBeLessThan(ACCUEIL + 0.1)
  })

  it('vaut pour le cadrage le plus tendu, celui d’Expériences', () => {
    // Le dossier note que ce cadrage n'a que 10 % de marge verticale et prescrit
    // 38° sous 16:9. La règle générale doit passer par là, à peu près.
    expect(fovForAspect(34, 4 / 3)).toBeGreaterThan(38)
  })
})
