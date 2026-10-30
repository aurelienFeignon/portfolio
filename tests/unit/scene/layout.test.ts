/**
 * D11 — le plan de NEXUS, et les invariants qu'un type ne peut pas exprimer.
 *
 * ⭐ Le bureau de D10 était un lieu mesuré, et son banc recomptait des cotes. NEXUS
 * est une composition : ce banc garde les RAPPORTS qui la font tenir — chaque
 * gros plan vise son univers, le noyau reste dans le champ, les univers ne se
 * chevauchent pas, la densité ne fait que décroître avec le palier.
 */
import { describe, expect, it } from 'vitest'

import { SECTIONS } from '@/routing/sections'
import {
  CAMERAS,
  CORE_RADIUS,
  DENSITY,
  ORBIT_LIMITS,
  PALETTE,
  PARALLAX,
  UNIVERSES,
  closeUp,
  labelAnchor,
  transitionMs,
} from '@/scene/state/layout'

const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0))

describe('les univers', () => {
  it('il y en a un par section, et pas un de plus', () => {
    expect(Object.keys(UNIVERSES).sort()).toEqual([...SECTIONS].sort())
  })

  it('sont loin du noyau et loin les uns des autres — aucune sphère de sélection ne se chevauche', () => {
    const positions = SECTIONS.map((section) => UNIVERSES[section])
    for (const universe of positions) {
      expect(distance(universe.position, [0, 0, 0])).toBeGreaterThan(
        universe.hitRadius + CORE_RADIUS * 2.5,
      )
    }
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const a = positions[i]!
        const b = positions[j]!
        expect(distance(a.position, b.position)).toBeGreaterThan(a.hitRadius + b.hitRadius)
      }
    }
  })

  it('portent chacun leur teinte — trois faisceaux, trois couleurs', () => {
    expect(new Set(SECTIONS.map((section) => UNIVERSES[section].tone)).size).toBe(SECTIONS.length)
  })

  it('accrochent leur étiquette au-dessus d’eux, hors de la sphère de sélection du voisin', () => {
    for (const section of SECTIONS) {
      const { position, hitRadius } = UNIVERSES[section]
      const ancre = labelAnchor(section)
      expect(ancre[0]).toBe(position[0])
      expect(ancre[2]).toBe(position[2])
      expect(ancre[1]).toBeGreaterThan(position[1] + hitRadius * 0.5)
      for (const autre of SECTIONS.filter((candidat) => candidat !== section)) {
        expect(distance(ancre, UNIVERSES[autre].position)).toBeGreaterThan(
          UNIVERSES[autre].hitRadius,
        )
      }
    }
  })
})

describe('les cadrages', () => {
  it('la vue d’ensemble ne cadre aucun univers et voit le noyau de face', () => {
    expect(CAMERAS.accueil.focusNodeId).toBeUndefined()
    expect(CAMERAS.accueil.position[2]).toBeGreaterThan(0)
  })

  it('chaque gros plan nomme son univers, et les trois sont distincts', () => {
    const cibles = [CAMERAS.experiences, CAMERAS.projets, CAMERAS.competences].map(
      (camera) => camera.focusNodeId,
    )
    expect(new Set(cibles)).toEqual(new Set(SECTIONS))
  })

  for (const section of SECTIONS) {
    describe(section, () => {
      const camera = closeUp(section)
      const universe = UNIVERSES[section].position

      it('vise un point à moins d’une unité de l’univers', () => {
        expect(distance(camera.target, universe)).toBeLessThan(1)
      })

      it('se tient hors de la sphère de sélection de l’univers, et hors du noyau', () => {
        expect(distance(camera.position, universe)).toBeGreaterThan(
          UNIVERSES[section].hitRadius * 1.5,
        )
        expect(distance(camera.position, [0, 0, 0])).toBeGreaterThan(CORE_RADIUS * 3)
      })

      it('garde le noyau devant elle — il reste dans le champ, en retrait', () => {
        // Le noyau est du côté de la visée : produit scalaire positif entre la
        // direction de visée et la direction du noyau.
        const visee = camera.target.map((v, i) => v - (camera.position[i] ?? 0))
        const versNoyau = camera.position.map((v) => -v)
        const scalaire = visee.reduce((somme, v, i) => somme + v * (versNoyau[i] ?? 0), 0)
        expect(scalaire).toBeGreaterThan(0)
      })
    })
  }

  it('les gros plans de `CAMERAS` sont ceux que `closeUp` calcule — rien n’est recopié', () => {
    expect(CAMERAS.experiences).toEqual(closeUp('experiences'))
    expect(CAMERAS.projets).toEqual(closeUp('projects'))
    expect(CAMERAS.competences).toEqual(closeUp('skills'))
  })
})

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

  it('la densité ne fait que décroître de `full` à `lite`, et ne s’annule jamais', () => {
    const paliers = [DENSITY.full, DENSITY.reduced, DENSITY.lite]
    for (const cle of ['particles', 'shells'] as const) {
      const valeurs = paliers.map((densite) => densite[cle])
      expect(valeurs).toEqual([...valeurs].sort((a, b) => b - a))
      expect(Math.min(...valeurs)).toBeGreaterThan(0)
    }
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
