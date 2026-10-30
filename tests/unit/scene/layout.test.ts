/**
 * Les constantes de la scène, et les invariants qu'un type ne peut pas exprimer.
 *
 * ⭐ Depuis le retrait de NEXUS (P8-15h), les univers, le noyau et les gros plans
 * calculés autour de lui n'existent plus : leurs assertions sont parties avec eux.
 * Les cadrages de la carte mère sont calculés par `make board` et tenus par
 * `board/cameras.test.ts`. Restent ici le mouvement, la palette et la densité par
 * palier — qui ne fait que décroître, sans jamais changer la composition.
 */
import { describe, expect, it } from 'vitest'

import { BOARD_DENSITY, ORBIT_LIMITS, PALETTE, PARALLAX, transitionMs } from '@/scene/state/layout'

describe('durée de transition', () => {
  it('coupe le mouvement à zéro quand il est refusé, plutôt que de l’accélérer', () => {
    expect(transitionMs(true)).toBe(0)
    expect(transitionMs(false)).toBeGreaterThan(1000)
  })
})

describe('orbite et densité', () => {
  it('l’orbite est bornée, et plus en lacet qu’en tangage', () => {
    expect(ORBIT_LIMITS.yawDeg).toBeGreaterThan(0)
    expect(ORBIT_LIMITS.pitchDeg).toBeGreaterThan(0)
    expect(ORBIT_LIMITS.pitchDeg).toBeLessThan(ORBIT_LIMITS.yawDeg)
  })

  it('la parallaxe est un frémissement : bien moins que l’orbite, sur les deux axes', () => {
    expect(PARALLAX.yawDeg).toBeGreaterThan(0)
    expect(PARALLAX.pitchDeg).toBeGreaterThan(0)
    expect(PARALLAX.yawDeg).toBeLessThan(ORBIT_LIMITS.yawDeg / 3)
    expect(PARALLAX.pitchDeg).toBeLessThan(ORBIT_LIMITS.pitchDeg / 3)
  })

  it('la densité de la carte ne fait que décroître de `full` à `lite`', () => {
    const paliers = [BOARD_DENSITY.full, BOARD_DENSITY.reduced, BOARD_DENSITY.lite]
    for (const cle of ['passives', 'pulses'] as const) {
      const valeurs = paliers.map((densite) => densite[cle])
      expect(valeurs).toEqual([...valeurs].sort((a, b) => b - a))
      expect(new Set(valeurs).size, cle).toBe(valeurs.length)
    }
  })

  it('⛔ `lite` garde des impulsions — moins, jamais aucune ; seuls les petits composants partent', () => {
    expect(BOARD_DENSITY.lite.pulses).toBeGreaterThan(0)
    expect(BOARD_DENSITY.lite.passives).toBe(0)
  })
})

describe('la palette', () => {
  it('est celle des tokens de `globals.css`', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync('src/app/globals.css', 'utf8').toLowerCase()
    expect(css).toContain(`--color-background: ${PALETTE.background.toLowerCase()}`)
    expect(css).toContain(`--color-panel: ${PALETTE.surface.toLowerCase()}`)
    expect(css).toContain(`--color-accent: ${PALETTE.cyan.toLowerCase()}`)
    expect(css).toContain(`--color-violet: ${PALETTE.violet.toLowerCase()}`)
    expect(css).toContain(`--color-sky: ${PALETTE.sky.toLowerCase()}`)
    expect(css).toContain(`--color-amber: ${PALETTE.amber.toLowerCase()}`)
    expect(css).toContain(`--color-teal: ${PALETTE.teal.toLowerCase()}`)
    expect(css).toContain(`--color-text: ${PALETTE.text.toLowerCase()}`)
  })
})
