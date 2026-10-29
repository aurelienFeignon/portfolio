/**
 * Le mouvement ambiant de NEXUS, éprouvé sans navigateur : le temps des shaders,
 * l'avance des rotations, la surbrillance et le grossissement au survol.
 */
import { describe, expect, it } from 'vitest'

import type { Section } from '@/routing/sections'
import { type AmbientState, ambientFrame, FROZEN_TIME_S } from '@/scene/state/ambient-motion'
import { IMAGE_MAX_S } from '@/scene/state/camera-motion'
import { HOVER_SCALE } from '@/scene/state/layout'

const REPOS: AmbientState = {
  timeS: 0,
  highlight: { experiences: 0, projects: 0, skills: 0 },
  scale: { experiences: 1, projects: 1, skills: 1 },
}

type Entree = Parameters<typeof ambientFrame>[1]

const image = (state: AmbientState, patch: Partial<Entree> = {}) =>
  ambientFrame(state, {
    deltaS: 1 / 60,
    animated: true,
    hovered: null,
    focus: 'overview',
    ...patch,
  })

/** `n` images de `deltaS` chacune, depuis `state`. */
const images = (state: AmbientState, n: number, patch: Partial<Entree> = {}) => {
  let s = state
  for (let i = 0; i < n; i += 1) s = image(s, patch).state
  return s
}

describe('le temps des shaders', () => {
  it('⛔⛔ s’ACCUMULE image par image — il ne se lit sur aucune horloge (P6-11)', () => {
    // Une fiche fait passer la boucle par `never`, et `setFrameloop` remet
    // l'horloge de R3F à zéro. Le temps de scène, lui, reprend où il était.
    const avant = images(REPOS, 120)
    expect(avant.timeS).toBeCloseTo(2, 9)
    const apres = image(avant).state
    expect(apres.timeS).toBeCloseTo(2 + 1 / 60, 9)
  })

  it('⛔ une image figée (onglet masqué) ne compte que pour la durée maximale', () => {
    const { state, stepS } = image(REPOS, { deltaS: 30 })
    expect(stepS).toBe(IMAGE_MAX_S)
    expect(state.timeS).toBe(IMAGE_MAX_S)
  })

  it('sous reduced-motion, les shaders voient une heure FIXE, et le temps ne court pas', () => {
    const { state, shaderTimeS } = image({ ...REPOS, timeS: 5 }, { animated: false })
    expect(shaderTimeS).toBe(FROZEN_TIME_S)
    expect(state.timeS).toBe(5)
  })

  it('en mouvement, les shaders voient le temps accumulé', () => {
    expect(image({ ...REPOS, timeS: 7 }).shaderTimeS).toBeCloseTo(7 + 1 / 60, 9)
  })
})

describe('la surbrillance et le survol', () => {
  const survol = (section: Section) => ({ hovered: section })

  it('rejoignent leur but sans dépendre de la cadence — 20 i/s comme 60', () => {
    const a60 = images(REPOS, 60, { ...survol('projects'), deltaS: 1 / 60 })
    const a20 = images(REPOS, 20, { ...survol('projects'), deltaS: 1 / 20 })
    expect(a20.highlight.projects).toBeCloseTo(a60.highlight.projects, 9)
    expect(a20.scale.projects).toBeCloseTo(a60.scale.projects, 9)
    // Une seconde : il reste e^(−4) de l'écart en surbrillance, e^(−6) en taille.
    expect(1 - a60.highlight.projects).toBeCloseTo(Math.exp(-4), 9)
    expect(HOVER_SCALE - a60.scale.projects).toBeCloseTo((HOVER_SCALE - 1) * Math.exp(-6), 9)
  })

  it('le focus allume l’univers, sans le grossir — seul le survol grossit', () => {
    const s = images(REPOS, 600, { focus: 'skills' })
    expect(s.highlight.skills).toBeCloseTo(1, 6)
    expect(s.scale.skills).toBe(1)
    expect(s.highlight.projects).toBe(0)
  })

  it('sous reduced-motion, tout saute à son but en une image', () => {
    const { state } = image(REPOS, { ...survol('experiences'), animated: false })
    expect(state.highlight.experiences).toBe(1)
    expect(state.scale.experiences).toBe(HOVER_SCALE)
  })

  it('⭐ une image figée ne fait pas sauter le survol à son but', () => {
    const { state } = image(REPOS, { ...survol('skills'), deltaS: 30 })
    expect(state.highlight.skills).toBeCloseTo(1 - Math.exp(-4 * IMAGE_MAX_S), 9)
  })

  it('ne modifie pas l’état reçu', () => {
    const avant = structuredClone(REPOS)
    image(REPOS, survol('projects'))
    expect(REPOS).toEqual(avant)
  })
})
