/**
 * P5-07 — ce qu'une défaillance de la scène fait à son montage.
 *
 * ⭐ Cette décision est ici, et non dans `SceneMount`, pour la même raison que
 * `shouldMountScene` : `src/scene/components/**` est exclu de la mesure de
 * couverture, tenu par le seul banc E2E. Une règle écrite là-bas ne serait
 * éprouvée que par un navigateur — or celle qui suit protège contre un cycle
 * qu'un banc E2E ne produira jamais sur commande.
 */
import { describe, expect, it } from 'vitest'

import type { Capability } from '@/scene/capability/resolve'
import { SCENE_WAITING, sceneFailed, sceneReady } from '@/scene/capability/mount-state'

const CAPABLE: Capability = { tier: 'full', motion: 'animated' }

describe('montage de la scène', () => {
  it('passe de l’attente au montage quand la capacité est lue', () => {
    expect(sceneReady(SCENE_WAITING, CAPABLE)).toEqual({ phase: 'mounted', capability: CAPABLE })
  })

  it('abandonne depuis le montage, en nommant la cause', () => {
    const monte = sceneReady(SCENE_WAITING, CAPABLE)

    expect(sceneFailed(monte, 'context-lost')).toEqual({
      phase: 'abandoned',
      failure: 'context-lost',
    })
  })

  it('abandonne depuis l’attente, un état qu’aucun appelant ne produit encore', () => {
    /*
     * ⚠️ **Aucun chemin n'y mène aujourd'hui**, et il faut le dire plutôt que de
     * laisser croire le contraire : la frontière d'erreur n'est rendue qu'une
     * fois l'état `mounted`, donc toute défaillance en part. Le réducteur reste
     * total pour que l'ajout d'un appelant — une surveillance qui commencerait
     * avant le montage — ne rencontre pas un état muet.
     */
    expect(sceneFailed(SCENE_WAITING, 'chunk')).toEqual({ phase: 'abandoned', failure: 'chunk' })
  })

  it('⛔ ne ressuscite JAMAIS une scène abandonnée', () => {
    // C'est la propriété que ce module existe pour tenir. Sans elle, un appareil
    // dont le contexte se perd en boucle — celui-là même qu'ADR-0003 protège —
    // reçoit un cycle montage / perte / montage sans fin : la lecture de capacité
    // est différée par `requestIdleCallback`, et React la rejoue à chaque
    // remontage, StrictMode compris.
    const abandonnee = sceneFailed(sceneReady(SCENE_WAITING, CAPABLE), 'context-lost')

    expect(sceneReady(abandonnee, CAPABLE)).toBe(abandonnee)
  })

  it('⛔ garde la PREMIÈRE cause, pas la dernière', () => {
    // Une perte de contexte suit souvent l'erreur qui l'a provoquée. C'est la
    // première qui explique quelque chose ; l'écraser rendrait le diagnostic
    // faux au moment précis où il servirait.
    const abandonnee = sceneFailed(SCENE_WAITING, 'render')

    expect(sceneFailed(abandonnee, 'context-lost')).toBe(abandonnee)
  })
})
