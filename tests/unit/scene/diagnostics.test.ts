/**
 * P5-08 — ce que le panneau de diagnostic a le droit d'affirmer.
 *
 * ⭐ La décision d'affichage vit ici, et non dans le composant : `src/scene/
 * components/**` est hors couverture, et la règle centrale de ce module — *une
 * mesure absente ne s'affiche pas comme un zéro* — est exactement celle que
 * P5-03 avait payée sur `navigator.deviceMemory`.
 */
import { describe, expect, it } from 'vitest'

import { shouldShowDiagnostics } from '@/scene/state/debug-flag'
import {
  SAMPLE_INTERVAL_MS,
  type SceneReadings,
  diagnosticLines,
  shouldSample,
} from '@/scene/state/diagnostics'

const RELEVES: SceneReadings = {
  drawCalls: 30,
  triangles: 4_114,
  geometries: 12,
  textures: 0,
  programs: 14,
  framesRendered: 3,
  lastFrameMs: 2.34,
  jsHeapMb: 48,
}

const valeur = (readings: SceneReadings, label: string): string | undefined =>
  diagnosticLines(readings).find((ligne) => ligne.label === label)?.value

describe('activation du panneau', () => {
  it.each([
    ['?debug=scene', true],
    ['?other=1&debug=scene', true],
    ['?debug=autre', false],
    ['?debug=', false],
    ['', false],
    ['?scene=debug', false],
  ])('%s → %s', (search, attendu) => {
    expect(shouldShowDiagnostics(search)).toBe(attendu)
  })

  it('⛔ ne s’active pas sur une valeur qui CONTIENT « scene »', () => {
    // Un `includes` aurait suffi à faire passer les cas ci-dessus, et aurait
    // ouvert le panneau sur n'importe quelle URL portant le mot.
    expect(shouldShowDiagnostics('?debug=scenes-de-menage')).toBe(false)
  })
})

describe('relevés affichés', () => {
  it('rend une ligne par mesure, dans un ordre stable', () => {
    const lignes = diagnosticLines(RELEVES)

    expect(lignes.map((ligne) => ligne.label)).toEqual([
      'draw calls (toutes passes)',
      'triangles (toutes passes)',
      'géométries',
      'textures',
      'programmes',
      'images rendues',
      'dernière image',
      'tas JS',
    ])
  })

  it('sépare les milliers, parce que 4114 et 41140 se ressemblent trop', () => {
    // Espace fine insécable, écrite en échappement : un séparateur invisible dans
    // le source se relit comme une espace ordinaire — et ESLint le refuse.
    expect(valeur(RELEVES, 'triangles (toutes passes)')).toBe('4\u202f114')
  })

  it('arrondit le coût d’une image au dixième de milliseconde', () => {
    expect(valeur(RELEVES, 'dernière image')).toBe('2,3 ms')
  })

  it('⛔⛔ une mesure ABSENTE s’affiche « — », jamais « 0 »', () => {
    // Même faute qu'en P5-03 : `performance.memory` n'existe que sur Chromium, et
    // afficher 0 Mo de tas sur Firefox annoncerait une machine sans mémoire au
    // lieu d'un navigateur sans l'API.
    const sansMesure: SceneReadings = { ...RELEVES, jsHeapMb: null, programs: null }

    expect(valeur(sansMesure, 'tas JS')).toBe('—')
    expect(valeur(sansMesure, 'programmes')).toBe('—')
  })

  it('⛔ un vrai zéro reste un zéro : l’absence ne l’avale pas', () => {
    // La réciproque du test précédent, et elle compte autant : la scène n'a
    // aucune texture, et c'est une information, pas un trou de mesure.
    expect(valeur(RELEVES, 'textures')).toBe('0')
  })

  it('dit « aucune » tant qu’aucune image n’a été mesurée', () => {
    // ⭐ En `frameloop="demand"`, ce cas est NORMAL : la scène ne rend qu'à la
    // demande. « 0,0 ms » y ressemblerait à une image gratuite.
    const avantPremiereImage: SceneReadings = { ...RELEVES, framesRendered: 0, lastFrameMs: null }

    expect(valeur(avantPremiereImage, 'dernière image')).toBe('aucune')
    expect(valeur(avantPremiereImage, 'images rendues')).toBe('0')
  })
})

describe('cadence des relevés', () => {
  it('remonte toujours le premier : sinon le panneau resterait vide', () => {
    expect(shouldSample(null, 0)).toBe(true)
  })

  it('espace les suivants d’au moins l’intervalle', () => {
    expect(shouldSample(1_000, 1_000 + SAMPLE_INTERVAL_MS - 1)).toBe(false)
    expect(shouldSample(1_000, 1_000 + SAMPLE_INTERVAL_MS)).toBe(true)
  })
})
