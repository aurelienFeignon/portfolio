/**
 * P5-06 — le cadrage quand l'écran n'est pas en 16:9.
 *
 * Le dossier de scène §6 calcule les quatre cadrages **pour un rapport 16:9** et
 * prescrit, en deçà, d'augmenter le `fov` plutôt que de reculer la caméra — pour
 * ne pas réintroduire le mur dans le champ. Ce module applique la règle aux
 * quatre cadrages ; ce banc la tient.
 */
import { describe, expect, it } from 'vitest'

import { FOV_MAX_DEG, REFERENCE_ASPECT, fitFov, horizontalFovDeg } from '@/scene/state/framing'

/** Le cadrage d'accueil, celui dont la perte se voit le plus. */
const ACCUEIL = 36

describe('correction du champ selon le format', () => {
  it('ne touche à rien en 16:9, le format pour lequel les cadrages sont calculés', () => {
    expect(fitFov(ACCUEIL, REFERENCE_ASPECT).fov).toBe(ACCUEIL)
  })

  it('⛔ ne RÉDUIT jamais le champ sur un écran plus large que 16:9', () => {
    // Un ultra-large voit déjà plus que la référence horizontalement. Resserrer le
    // `fov` vertical pour « compenser » lui retirerait de la hauteur — donc le
    // plateau et le mur — sans que rien ne le demande.
    expect(fitFov(ACCUEIL, 21 / 9).fov).toBe(ACCUEIL)
  })

  it('préserve le champ HORIZONTAL quand l’écran se resserre', () => {
    // C'est la propriété, pas le nombre : à 4:3, le champ horizontal doit valoir
    // ce qu'il valait en 16:9. Affirmer une valeur de `fov` vertical n'aurait
    // gardé que le symptôme.
    const attendu = horizontalFovDeg(ACCUEIL, REFERENCE_ASPECT)
    const corrige = fitFov(ACCUEIL, 4 / 3).fov

    expect(horizontalFovDeg(corrige, 4 / 3)).toBeCloseTo(attendu, 6)
    expect(corrige).toBeGreaterThan(ACCUEIL)
  })

  it('⛔⛔ PLAFONNE, parce que l’arithmétique seule donne un œil de poisson', () => {
    // iPhone 14 en portrait : 390 × 844, soit un rapport de 0,462. Préserver tout
    // le champ horizontal y demanderait **103°** de champ vertical — une
    // déformation que personne ne veut voir, et qui réintroduirait le décor que
    // les cadrages excluent volontairement.
    const portrait = 390 / 844

    expect(fitFov(ACCUEIL, portrait).fov).toBe(FOV_MAX_DEG)
  })

  it('⛔ le plafond ne RABAISSE pas un cadrage déjà plus large que lui', () => {
    // Sinon un cadrage volontairement très ouvert serait resserré par une règle
    // censée n'élargir que sous 16:9.
    const tresOuvert = FOV_MAX_DEG + 10

    expect(fitFov(tresOuvert, REFERENCE_ASPECT).fov).toBe(tresOuvert)
    expect(fitFov(tresOuvert, 0.5).fov).toBe(tresOuvert)
  })

  it('reste continue : un écart minime de format ne fait pas sauter le cadrage', () => {
    const juste = fitFov(ACCUEIL, REFERENCE_ASPECT - 0.001).fov

    expect(juste).toBeGreaterThan(ACCUEIL)
    expect(juste).toBeLessThan(ACCUEIL + 0.1)
  })

  it('vaut pour le cadrage le plus tendu, celui d’Expériences', () => {
    // Le dossier note que ce cadrage n'a que 10 % de marge verticale et prescrit
    // 38° sous 16:9. La règle générale doit passer par là, à peu près.
    expect(fitFov(34, 4 / 3).fov).toBeGreaterThan(38)
  })
})

describe('fitFov — le champ requis, plafonné, et le recul qui rend le reste', () => {
  const half = (deg: number) => Math.tan((deg * Math.PI) / 360)

  it('en 16:9 sur toute la hauteur : le cadrage tel quel, sans recul', () => {
    expect(fitFov(ACCUEIL, REFERENCE_ASPECT)).toEqual({ fov: ACCUEIL, k: 1 })
  })

  it('une zone moins haute que le canvas demande un champ plus haut', () => {
    const { fov, k } = fitFov(30, REFERENCE_ASPECT, 0.8)
    expect(half(fov)).toBeCloseTo(half(30) / 0.8)
    expect(k).toBe(1)
  })

  it('au-delà du plafond : le champ s’arrête au plafond et la caméra recule de ce qui manque', () => {
    const { fov, k } = fitFov(ACCUEIL, REFERENCE_ASPECT, 0.3)
    expect(fov).toBe(FOV_MAX_DEG)
    // L'emprise est rendue : tan(champ plafonné / 2) × k = tan(champ requis / 2).
    expect(half(fov) * k).toBeCloseTo(half(ACCUEIL) / 0.3)
  })

  it('le plus exigeant des deux, largeur ou hauteur, l’emporte', () => {
    const large = fitFov(30, 1, 0.9, Infinity).fov
    expect(large).toBe(fitFov(30, 1, 1, Infinity).fov)
    const haut = fitFov(30, 2, 0.5, Infinity).fov
    expect(half(haut)).toBeCloseTo(half(30) / 0.5)
  })
})
